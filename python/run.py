import tkinter as tk
from tkinter import filedialog
import xml.etree.ElementTree as ET
import json
import os


# Select a file to open (generic)
def select_file(title, filetypes):
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(
        title=title,
        filetypes=filetypes
    )
    return file_path


# Select a file to save to
def select_save_file(title, defaultextension, filetypes):
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.asksaveasfilename(
        title=title,
        defaultextension=defaultextension,
        filetypes=filetypes
    )
    return file_path


def process_elements_for_xml(xml_path, elements, out_path=None):
    """
    Parse xml_path once, apply modifications for each element in elements list,
    then write out_path (or xml_path_modified).
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()

    for el_data in elements:
        element_name_str = str(el_data.get("element_name", ""))
        if not element_name_str:
            print("Skipping element without 'element_name'.")
            continue

        # find target element
        target_element = None
        for elem in root.findall(".//element"):
            if elem.get("elementName") == element_name_str:
                target_element = elem
                break

        if target_element is None:
            print(f"Element with name {element_name_str} not found in {xml_path}.")
            continue

        drawings_elem = target_element.find("drawings")
        if drawings_elem is None:
            print(f"No <drawings> found in target element {element_name_str}.")
            continue

        # Build mapping drawing_name -> profile
        try:
            drawing_profile_map = {d["drawing_name"]: d["profile"] for d in el_data["drawings"]}
        except Exception as e:
            print(f"Invalid 'drawings' data for element {element_name_str}: {e}")
            continue

        modified = 0
        for dwg in drawings_elem.findall("dwg"):
            name = dwg.get("name")
            if name in drawing_profile_map:
                dwg.set("customKey", drawing_profile_map[name])
                modified += 1

        print(f"Updated {modified} drawings for element {element_name_str} in {os.path.basename(xml_path)}")

    # Save modified XML
    if out_path is None:
        out_path = xml_path.replace(".xstage", "_modified.xstage")
    tree.write(out_path, encoding="utf-8", xml_declaration=True)
    print(f"Modified file saved as: {out_path}")
    try:
        os.startfile(out_path)
    except Exception:
        # non-Windows or os.startfile not available -> ignore
        pass


def build_elements_list_from_data(data):
    """
    Accept either:
      - old style: data is a dict with keys 'element_name' and 'drawings'
      - new style: data is a dict whose keys are element names and whose values are dicts
    Returns a list of element-data dicts.
    """
    elements = []

    # old single-object style
    if isinstance(data, dict) and "element_name" in data and "drawings" in data:
        elements.append(data)
        return elements

    # new multi-key style: each top-level key should map to an element object
    if isinstance(data, dict):
        for key, val in data.items():
            if not isinstance(val, dict):
                print(f"Skipping top-level key '{key}': not an object.")
                continue
            if "drawings" in val:
                el = dict(val)  # copy
                if "element_name" not in el:
                    el["element_name"] = key
                elements.append(el)
            else:
                # also allow entries that themselves are the single-object format
                if "element_name" in val and "drawings" in val:
                    elements.append(val)
                else:
                    print(f"Skipping key '{key}': missing 'drawings'.")
    return elements


if __name__ == "__main__":
    # Select JSON file
    json_path = select_file("Select JSON data file", [("JSON files", "*.json"), ("All files", "*.*")])
    if not json_path:
        print("No JSON file selected.")
        exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    elements = build_elements_list_from_data(data)
    if not elements:
        print("No elements found in JSON.")
        exit(1)

    # Group elements by xml_path (element-level project_path or top-level project_path)
    xml_groups = {}
    # if top-level data has a project_path, use it as fallback
    top_level_project = data.get("project_path") if isinstance(data, dict) else None

    # If any element lacks project_path, we'll prompt user once later
    need_prompt_for_missing = any(not el.get("project_path") for el in elements)

    default_xml_for_missing = None
    if need_prompt_for_missing and not top_level_project:
        default_xml_for_missing = select_file("Select .xstage file (used for elements missing project_path)",
                                             [("Harmony XStage files", "*.xstage"), ("All files", "*.*")])
        if not default_xml_for_missing:
            print("No .xstage file selected for missing project_path entries. Exiting.")
            exit(1)

    for el in elements:
        xml_path = el.get("project_path") or top_level_project or default_xml_for_missing
        if not xml_path:
            print(f"Skipping element {el.get('element_name')}: no project_path available.")
            continue
        xml_groups.setdefault(xml_path, []).append(el)

    # Process each xstage once, applying all element changes that target it
    for xml_path, group in xml_groups.items():
        print(f"Processing {len(group)} element(s) in {xml_path}")
        process_elements_for_xml(xml_path, group)
