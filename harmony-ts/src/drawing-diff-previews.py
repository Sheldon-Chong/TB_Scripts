"""Build preview pairs for the drawing names requested by the Harmony window."""

import json
import os
import subprocess
import sys
import tempfile
from functools import cache
from hashlib import file_digest
from pathlib import Path
from time import perf_counter
from urllib.parse import urlsplit
from urllib.request import url2pathname


def drawing_sources(document, scenes, requested):
    elements = {element.id: element for element in document.project.elements}
    sources = {}
    for scene in scenes:
        for layer in scene["layers"]:
            for node in layer["module_paths"]:
                node_path = f"{scene['name']}/{node}"
                if node_path not in requested:
                    continue
                for exposure in layer["exposures"]:
                    name = exposure["drawing"]
                    element = elements.get(exposure["element_id"])
                    if element is None or name not in requested[node_path]:
                        continue
                    label = element.element_name or element.element_folder or ""
                    sources.setdefault((node_path, label, name), {})[element.id] = element
    return sources


def compare_selection(left, right, requested, bounds):
    """Compare timing inside the selected cells and hash only requested drawings."""
    from xstage_tool.checker import _BITMAP_EXTENSIONS, _compare_layer, _content_changes, _layers

    issues = []

    @cache
    def bitmaps(folder):
        by_stem = {}
        for file in folder.iterdir():
            if file.suffix.lower() in _BITMAP_EXTENSIONS and file.is_file():
                by_stem.setdefault(file.stem, []).append(file)
        return by_stem

    def clip(layer):
        exposures = []
        for exposure in layer["exposures"] if layer else ():
            ranges = [
                (max(start, bounds[0]), min(end, bounds[1]))
                for start, end in exposure["ranges"] if start <= bounds[1] and end >= bounds[0]
            ]
            if ranges:
                exposures.append({**exposure, "ranges": ranges})
        return {"exposures": exposures}

    def index_project(project):
        document, scenes = project
        elements = {element.id: element for element in document.project.elements}

        def label(element_id):
            element = elements.get(element_id)
            return (element.element_name or element.element_folder or "") if element else ""

        def identity(element_id, name):
            return (label(element_id), name), None

        @cache
        def inspect(element_id, name):
            try:
                element = elements[element_id]
                path = element._drawing_path(name)
                if not path.is_file():
                    candidates = bitmaps(path.parent).get(path.stem, ())
                    if len(candidates) > 1:
                        raise ValueError("Multiple bitmap files match this drawing")
                    if candidates:
                        path = candidates[0]
                        if path.is_symlink() or not path.resolve().is_relative_to(document.path.parent):
                            raise ValueError("Bitmap drawing must be inside the project")
                with path.open("rb") as drawing:
                    return file_digest(drawing, "sha256").hexdigest()
            except (KeyError, OSError, ValueError) as exc:
                issues.append(str(exc))
                return None

        layers = {
            f"{scene['name']}/{node}": (scene["name"], node, layer)
            for scene in scenes for (kind, node), layer in _layers(scene).items()
            if kind == "node" and f"{scene['name']}/{node}" in requested
        }
        return layers, identity, inspect

    def references(layer, names, identity):
        matches = {}
        for exposure in layer["exposures"] if layer else ():
            name, element_id = exposure["drawing"], exposure["element_id"]
            if name in names and exposure["ranges"]:
                key, _ = identity(element_id, name)
                matches[key] = element_id
        return matches

    left_layers, left_identity, left_inspect = index_project(left)
    right_layers, right_identity, right_inspect = index_project(right)
    scene_diffs = {}
    for path, names in requested.items():
        left_entry, right_entry = left_layers.get(path), right_layers.get(path)
        if not left_entry and not right_entry:
            continue
        scene, node, _ = left_entry or right_entry
        left_layer = left_entry[2] if left_entry else None
        right_layer = right_entry[2] if right_entry else None
        ranges, _ = _compare_layer(clip(left_layer), clip(right_layer), left_identity, right_identity)

        # A drawing can be shifted outside the selected frames in File B.
        left_refs = references(left_layer, names, left_identity)
        right_refs = references(right_layer, names, right_identity)
        common = left_refs.keys() & right_refs.keys()
        drawings = _content_changes(
            {key: left_inspect(left_refs[key], key[1]) for key in common},
            {key: right_inspect(right_refs[key], key[1]) for key in common},
        )
        if ranges or drawings:
            scene_diffs.setdefault(scene, []).append({
                "kind": "node", "name": node, "drawings_changed": drawings, "ranges": ranges,
            })
    return {
        "scenes": [{"scene": scene, "layers": layers} for scene, layers in scene_diffs.items()],
        "asset_issues": issues,
    }


def preview_url(tvg_to_png, candidates, name, side):
    if len(candidates) != 1:
        raise ValueError(f"Expected one {side} element for {name}, found {len(candidates)}")
    source = next(iter(candidates.values()))._drawing_path(name)
    with source.open("rb") as drawing:
        digest = file_digest(drawing, "sha256").hexdigest()
    output = Path(tempfile.gettempdir()) / "harmony-drawing-diff" / f"{digest}.png"
    if not output.is_file():
        try:
            tvg_to_png(source, output)
        except FileExistsError:
            if not output.is_file():
                raise
    return output.as_uri()


def emit(event):
    print(json.dumps(event), flush=True)


def copy_image(url):
    location = urlsplit(url)
    if location.scheme != "file" or location.netloc or location.query or location.fragment:
        raise ValueError("Only local PNG previews can be copied.")
    image = Path(url2pathname(location.path))
    if not image.is_absolute() or image.suffix.lower() != ".png" or not image.is_file():
        raise ValueError("The preview PNG is missing. Refresh the diff cache and try again.")

    command = r"""
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$png = [IO.MemoryStream]::new([IO.File]::ReadAllBytes($env:HARMONY_DIFF_CLIPBOARD_IMAGE))
try {
    $bitmap = [Drawing.Bitmap]::new($png)
    try {
        $data = [Windows.Forms.DataObject]::new()
        $data.SetData('PNG', $false, $png)
        $data.SetData([Windows.Forms.DataFormats]::Bitmap, $true, $bitmap)
        [Windows.Forms.Clipboard]::SetDataObject($data, $true, 10, 100)
    } finally {
        $bitmap.Dispose()
    }
} finally {
    $png.Dispose()
}
"""
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-STA", "-Command", command],
        env={**os.environ, "HARMONY_DIFF_CLIPBOARD_IMAGE": str(image)},
        capture_output=True,
        text=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        timeout=6,
    )
    if result.returncode:
        raise OSError(result.stderr.strip() or "Could not copy the preview to the Windows clipboard.")
    return {"copied": True}


def main(extender_src, left_path, right_path, requested_json):
    sys.path.insert(0, extender_src)
    from xstage_tool import compare_projects, tvg_to_png
    from xstage_tool.xstage_models import load_xstage

    cache_all = requested_json == "--all"
    if requested_json.startswith("@"):
        request_path = Path(requested_json[1:])
        if not request_path.is_absolute():
            request_path = Path(left_path).absolute().parent / request_path
        requested_json = request_path.read_text(encoding="utf-8-sig")
    payload = {} if cache_all else json.loads(requested_json)
    bounds = (payload.get("start", 1), payload.get("end", float("inf")))
    requested = {} if cache_all else {
        node: set(names) for node, names in payload.get("drawings", payload).items()
    }
    right_requested = {node: set(names) for node, names in requested.items()}
    def load_project(path):
        document = load_xstage(path)
        return document, document.to_timeline_dict()["scenes"]

    started = perf_counter()
    if cache_all:
        report = compare_projects(left_path, right_path)
    else:
        left_project, right_project = load_project(left_path), load_project(right_path)
        report = compare_selection(left_project, right_project, requested, bounds)
    diff_seconds = perf_counter() - started
    preview_started = perf_counter()
    changes = {}
    exposure_changes = {}
    for scene in report["scenes"]:
        for layer in scene["layers"]:
            node = f"{scene['scene']}/{layer['name']}"
            if layer["kind"] != "node":
                continue
            if cache_all or node in requested:
                for interval in layer["ranges"]:
                    start = max(interval["start"], bounds[0])
                    end = min(interval["end"], bounds[1])
                    if start > end:
                        continue
                    left_exposed = bool(interval["change"]["left"])
                    right_exposed = bool(interval["change"]["right"])
                    if left_exposed != right_exposed:
                        originals = interval["change"]["right"] if right_exposed else []
                        exposure_changes.setdefault(node, []).append({
                            "start": start,
                            "end": end,
                            "color": "Green" if left_exposed else "Red",
                            "originals": originals,
                        })
                        for original in originals:
                            name = original["drawing"]
                            right_requested.setdefault(node, set()).add(name)
                            changes[node, original["element"], name, True] = None
            for change in layer["drawings_changed"]:
                name = change["drawing"]
                if cache_all:
                    requested.setdefault(node, set()).add(name)
                    right_requested.setdefault(node, set()).add(name)
                if name in requested.get(node, ()):
                    changes[node, change["element"], name, False] = None

    if cache_all:
        emit({"total": len(changes)})
    if changes and cache_all:
        left_project, right_project = load_project(left_path), load_project(right_path)
    left = drawing_sources(*left_project, requested) if changes else {}
    right = drawing_sources(*right_project, right_requested) if changes else {}
    pairs = []
    for node, element, name, reference_only in changes:
        key = (node, element, name)
        pair = {"node": node, "element": element, "drawing": name, "referenceOnly": reference_only}
        sides = (("right", right),) if reference_only else (("left", left), ("right", right))
        for side, sources in sides:
            try:
                pair[side] = preview_url(tvg_to_png, sources.get(key, {}), name, side)
            except (OSError, ValueError) as exc:
                pair[side + "Error"] = str(exc)
        if cache_all:
            emit({"pair": pair})
        else:
            pairs.append(pair)
    timing = {"diffSeconds": diff_seconds, "previewSeconds": perf_counter() - preview_started}
    if cache_all:
        return {
            "complete": True,
            "exposureChanges": exposure_changes,
            "assetIssues": len(report["asset_issues"]),
            "timing": timing,
        }
    return {
        "pairs": pairs,
        "exposureChanges": exposure_changes,
        "assetIssues": len(report["asset_issues"]),
        "timing": timing,
    }


if __name__ == "__main__":
    try:
        args = sys.argv[1:]
        result = copy_image(args[1]) if len(args) == 2 and args[0] == "--copy-image" else main(*args)
    except Exception as exc:
        result = {"error": str(exc)}
    emit(result)
