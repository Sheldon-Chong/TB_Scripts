include('global-test.js');
include('reactive-ui.js');

function showColorPicker(
  onColorPick?: (value: ColorPickerValue) => void,
  onColorDrag?: (value: ColorPickerValue) => void,
): void {
  include(specialFolders.userScripts + '/widgets/ColorPicker.js');
  const picker: ColorPickerComponents = Function('return this;')().__proto__.__TBColorPicker;
  if (!picker || typeof picker.openDialog !== 'function') throw new Error('Could not load widgets/ColorPicker.js from the user scripts folder.');
  picker.openDialog({ core: getCore(), ComboBox: QComboBox, math: Math }, { onColorPick, onColorDrag });
}

function showNestedDialog(): void {
  const $ = getCore();
  $.log('start');

  // State
  var count = createSignal(0);

  var countLabel = new $.QLabel('');

  count.subscribe(function (n) {
    countLabel.text = 'Count: ' + n;
  });

  // Reusable component
  function CounterControls(): any {
    return (
      <row spacing={8}>
        <widget value={countLabel} />

        <button
          text="Increment"
          color="#4CAF50"
          onClick={function () {
            count.set(count.get() + 1);
          }}
        />
      </row>
    );
  }

  // Nested UI
  var dialog = new $.QDialog();

  dialog.windowTitle = 'Nested Components';
  dialog.minimumWidth = 340;

  var tree = (
    <column parent={dialog} spacing={12}>
      <label text="Reactive JSX UI" />

      <CounterControls />

      <row>
        <button
          text="Reset"
          onClick={function () {
            count.set(0);
          }}
        />
      </row>
      <row>
        <progressBar value={count} minimum={0} maximum={10} />
        <button
          text="Close"
          onClick={() => {
            $.log('Closing dialog');
            dialog.close();
          }}
        />
      </row>
    </column>
  );

  dialog.exec();
}

function testLayout(): void {
  var $ = getCore();

  var dialog = new $.QDialog();
  dialog.windowTitle = 'Layout Test';
  dialog.minimumWidth = 340;

  var layout = new $.QVBoxLayout(dialog);

  var label = new $.QLabel('Can you see me?');

  layout.addWidget(label, 0, $.Qt.AlignmentFlag.AlignLeft);

  dialog.exec();
}
function showCurrentFrameWindow(): void {
  const $ = getCore();
  const dialog = new $.QDialog();
  dialog.setWindowFlags($.Qt.Dialog | $.Qt.WindowStaysOnTopHint);
  dialog.windowTitle = 'Frame Monitor';
  dialog.minimumWidth = 560;

  const frameText = createSignal('Current Frame: ' + frame.current());

  const extender = 'D:/YT projects/Coding/Frame extender/2026-extender';
  const defaultFileB = 'D:/YT projects/Coding/ToonBoom/Test - Copy/Test.xstage';
  const status = createSignal('');
  const preview = createSignal('');
  const cacheStatus = createSignal('');
  const cacheProgress = createSignal(0);
  const diffSummary = createSignal('');
  const canCopyCurrent = createSignal(false);
  const canCopyReference = createSignal(false);

  interface DrawingPreview {
    node: string;
    drawing: string;
    element: string;
    referenceOnly: boolean;
    left?: string;
    right?: string;
    leftError?: string;
    rightError?: string;
  }

  interface ExposureChange {
    start: number;
    end: number;
    color: 'Red' | 'Green';
    originals: Array<{ element: string; drawing: string }>;
  }

  interface FrameDifference {
    node: string;
    color: 'Red' | 'Green' | 'Pink';
    images: DrawingPreview[];
  }

  interface DiffReport {
    pairs: DrawingPreview[];
    exposureChanges: Record<string, ExposureChange[]>;
    assetIssues: number;
    timing?: DiffTiming;
    error?: string;
  }

  interface DiffTiming {
    diffSeconds: number;
    previewSeconds: number;
  }

  interface SavedDiffCache {
    version: number;
    scene: string;
    reference: string;
    full?: DiffReport;
    marked?: Record<number, FrameDifference[]>;
    selection?: { request: string; report: DiffReport };
  }

  const metadata = $.SceneKit.metadata;
  const cacheKey = 'frameMonitor.diffCache';
  const initialScene = $.Utils.getCurrentXstagetoast();
  const restored = restoreCache();

  let previewComparison = '';
  let diffsByFrame: Record<number, FrameDifference[]> = {};
  let cachedSelection: SavedDiffCache['selection'];
  let cachedComparison = '';
  let cachedReport: DiffReport | undefined;
  let cachedByNode: Record<string, Record<string, DrawingPreview>> = Object.create(null);
  let cachedOriginals: Record<string, DrawingPreview> = Object.create(null);
  let cachedExposures: Record<string, ExposureChange[]> = Object.create(null);
  let cachedNavigation: Record<number, FrameDifference[]> | undefined;
  let cacheProcess: QProcess | undefined;
  let displayedDiffs: FrameDifference[] = [];

  function pathKey(path: string): string {
    const normalized = path
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/{2,}/g, '/');
    return /^[a-z]:/i.test(normalized) || /^[/\\]{2}/.test(path)
      ? normalized.toLowerCase()
      : normalized;
  }

  function restoreCache(): SavedDiffCache | undefined {
    function matching(snapshot: SavedDiffCache | undefined): snapshot is SavedDiffCache {
      return (
        !!snapshot &&
        snapshot.version === 1 &&
        typeof snapshot.scene === 'string' &&
        pathKey(snapshot.scene) === pathKey(initialScene) &&
        typeof snapshot.reference === 'string'
      );
    }

    // Look up the string entry directly before falling back to metadata enumeration.
    try {
      const entry = $.scene.metadata(cacheKey, 'string');
      if (entry && entry.value != null) {
        const candidate = JSON.parse(String(entry.value)) as SavedDiffCache;
        if (matching(candidate)) return candidate;
      }
    } catch (error) {
      $.log('Could not read the Frame Monitor cache by name: ' + String(error));
    }
    try {
      const candidate = metadata.getJson<SavedDiffCache>(cacheKey);
      return matching(candidate) ? candidate : undefined;
    } catch (error) {
      $.log('Could not restore the Frame Monitor cache: ' + String(error));
      return undefined;
    }
  }

  function comparisonKey(scene: string, reference: string): string {
    return JSON.stringify([pathKey(scene), pathKey(reference)]);
  }

  function useCachedReport(comparison: string, report: DiffReport): void {
    cachedComparison = comparison;
    cachedReport = report;
    cachedByNode = Object.create(null);
    cachedOriginals = Object.create(null);
    cachedExposures = report.exposureChanges;
    cachedNavigation = undefined;
    for (const pair of report.pairs) {
      if (pair.referenceOnly) {
        cachedOriginals[originalKey(pair.node, pair)] = pair;
      } else {
        if (!cachedByNode[pair.node]) cachedByNode[pair.node] = Object.create(null);
        cachedByNode[pair.node][pair.drawing] = pair;
      }
    }
  }

  function storeCache(scene: string, reference: string): void {
    if (pathKey($.Utils.getCurrentXstagetoast()) !== pathKey(scene)) return;
    const comparison = comparisonKey(scene, reference);
    const snapshot: SavedDiffCache = { version: 1, scene, reference };
    if (cachedComparison === comparison) snapshot.full = cachedReport;
    if (previewComparison === comparison) {
      snapshot.marked = diffsByFrame;
      snapshot.selection = cachedSelection;
    }
    try {
      metadata.setJson(cacheKey, snapshot);
    } catch (error) {
      $.log('Could not save the Frame Monitor cache: ' + String(error));
    }
  }

  function referencePath(): string {
    return fileB.value.text.trim().replace(/\\/g, '/');
  }

  function pickDirectory(): void {
    const current = referencePath();
    const directory = $.FileDialog.getExistingDirectory(
      current.slice(0, current.lastIndexOf('/') + 1),
      'Pick File B Directory',
      dialog,
    );
    if (!directory) return;

    const folder = directory.replace(/\\/g, '/').replace(/\/$/, '');
    const files = $.FileUtils.listFiles(folder, ['*.xstage']);
    if (files.length === 1) {
      fileB.value.text = folder + '/' + files[0];
      return;
    }

    const paths =
      $.FileDialog.getOpenFileNames(
        directory,
        'Harmony Scenes (*.xstage)',
        'Choose File B',
        dialog,
      ) || [];
    if (paths.length === 1) fileB.value.text = paths[0];
    else if (paths.length > 1) status.set('Choose one .xstage file for File B.');
  }

  function startPreviewProcess(scenePath: string, reference: string, request: string): QProcess {
    if (!/\.xstage$/i.test(reference) || !$.Utils.pathExiststoast(reference)) {
      throw new Error('Choose an existing .xstage file for File B.');
    }
    return $.ProcessKit.start(extender + '/.venv/Scripts/python.exe', [
      '-B',
      $.specialFolders.userScripts + '/drawing-diff-previews.py',
      extender + '/xstage-tool/src',
      scenePath,
      reference,
      request,
    ]);
  }

  function logDiffTiming(scope: string, timing: DiffTiming | undefined, started: number): void {
    const elapsed = ((new Date().getTime() - started) / 1000).toFixed(3);
    const details = timing
      ? 'diff ' +
        timing.diffSeconds.toFixed(3) +
        ' s, previews ' +
        timing.previewSeconds.toFixed(3) +
        ' s, '
      : '';
    $.log('[Drawing diff] ' + scope + ': ' + details + 'process ' + elapsed + ' s.');
  }

  function compareSelection(scenePath: string, reference: string, request: string): DiffReport {
    // Keep the request beside the scene file that Python opens.
    const normalizedScene = scenePath.replace(/\\/g, '/');
    const folder = normalizedScene.slice(0, normalizedScene.lastIndexOf('/') + 1);
    if (!folder)
      throw new Error('Could not locate the current scene folder for the comparison request.');
    const nonce = new Date().getTime() + '-' + Math.random().toString(36).slice(2);
    const name = 'harmony-diff-request-' + nonce + '.json';
    const path = folder + name;
    const file = new $.PermanentFile(path);
    if (file.exists() || !file.open(2)) {
      throw new Error('Could not create the drawing comparison request beside the scene: ' + path);
    }

    try {
      // Keep filenames intact even if Harmony writes the text using a local code page.
      const asciiRequest = request.replace(
        /[^\x00-\x7f]/g,
        (character) => '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4),
      );
      try {
        file.write(asciiRequest);
      } finally {
        file.close();
      }
      if (!file.exists() || $.FileUtils.readFrom(path) !== asciiRequest) {
        throw new Error('Harmony could not read back the drawing comparison request: ' + path);
      }

      const process = startPreviewProcess(scenePath, reference, '@' + name);
      const waiting = new Date().getTime();
      const finished = process.waitForFinished(120000);
      const elapsed = new Date().getTime() - waiting;
      if (!finished && elapsed >= 59500) {
        process.kill();
        process.waitForFinished(2000);
        throw new Error('The drawing comparison did not finish within 60 seconds.');
      }

      const output = process.readAllStandardOutput().toString().trim();
      if (output) {
        try {
          return JSON.parse(output) as DiffReport;
        } catch (error) {
          // A process that stops early can leave an incomplete report.
        }
      }
      const stderr =
        typeof process.readAllStandardError === 'function'
          ? process.readAllStandardError().toString().trim()
          : '';
      const detail =
        stderr ||
        (!finished && typeof process.errorString === 'function' ? process.errorString() : '');
      throw new Error(
        'The drawing comparison returned no valid report after ' +
          (elapsed / 1000).toFixed(3) +
          ' s' +
          (detail ? '. ' + detail : '.'),
      );
    } finally {
      if (!file.remove() && file.exists())
        $.log('Could not remove the temporary drawing comparison request.');
    }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function previewImage(url?: string): string {
    return url
      ? '<img src="' + escapeHtml(url) + '" width="256" height="144" />'
      : 'Preview unavailable';
  }

  function originalKey(node: string, drawing: { element: string; drawing: string }): string {
    return JSON.stringify([node, drawing.element, drawing.drawing]);
  }

  function deletedPreview(
    node: string,
    change: ExposureChange,
    originals: Record<string, DrawingPreview>,
  ): FrameDifference {
    return {
      node,
      color: 'Red',
      images: change.originals.map(
        (drawing) =>
          originals[originalKey(node, drawing)] || {
            node,
            element: drawing.element,
            drawing: drawing.drawing,
            referenceOnly: true,
          },
      ),
    };
  }

  function exposureAt(ranges: ExposureChange[], current: number): ExposureChange | undefined {
    let low = 0;
    let high = ranges.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const range = ranges[mid];
      if (current < range.start) high = mid - 1;
      else if (current > range.end) low = mid + 1;
      else return range;
    }
    return undefined;
  }

  function frameDifference(
    node: string,
    drawing: string,
    range: ExposureChange | undefined,
    pair: DrawingPreview | undefined,
    originals: Record<string, DrawingPreview>,
  ): FrameDifference | undefined {
    if (range && range.color === 'Red' && !drawing) {
      return deletedPreview(node, range, originals);
    }
    const color = range && range.color === 'Green' && drawing ? 'Green' : pair ? 'Pink' : undefined;
    if (color) return { node, color, images: pair ? [pair] : [] };
    return undefined;
  }

  function cachedDifference(node: string, column: string, f: number): FrameDifference | undefined {
    const drawing = $.column.getEntry(column, 1, f) || '';
    const ranges = cachedExposures[node];
    const changes = cachedByNode[node];
    return frameDifference(
      node,
      drawing,
      ranges && exposureAt(ranges, f),
      changes && changes[drawing],
      cachedOriginals,
    );
  }

  function cachedNodes(): string[] {
    return Object.keys(cachedByNode).concat(
      Object.keys(cachedExposures).filter((node) => !cachedByNode[node]),
    );
  }

  function navigationDiffs(comparison: string): Record<number, FrameDifference[]> | undefined {
    if (
      previewComparison === comparison &&
      (cachedComparison !== comparison ||
        Object.keys(diffsByFrame).some((key) => diffsByFrame[Number(key)].length))
    )
      return diffsByFrame;
    if (cachedComparison !== comparison) return undefined;
    if (cachedNavigation) return cachedNavigation;

    const indexed: Record<number, FrameDifference[]> = {};
    const lastFrame = $.frame.numberOf();
    for (const node of cachedNodes()) {
      const column = $.node.linkedColumn(node, 'DRAWING.ELEMENT');
      if (!column) continue;
      const ranges = cachedByNode[node] ? [{ start: 1, end: lastFrame }] : cachedExposures[node];
      for (const range of ranges) {
        for (let f = range.start; f <= Math.min(range.end, lastFrame); f++) {
          const diff = cachedDifference(node, column, f);
          if (!diff) continue;
          if (!indexed[f]) indexed[f] = [];
          indexed[f].push(diff);
        }
      }
    }
    cachedNavigation = indexed;
    return indexed;
  }

  function refreshPreview(): void {
    const comparison = comparisonKey($.Utils.getCurrentXstagetoast(), referencePath());
    const current = frame.current();
    let differences = previewComparison === comparison ? (diffsByFrame[current] || []).slice() : [];
    if (cachedComparison === comparison) {
      for (const node of cachedNodes()) {
        if (differences.some((item) => item.node === node)) continue;
        const column = $.node.linkedColumn(node, 'DRAWING.ELEMENT');
        if (!column) continue;
        const diff = cachedDifference(node, column, current);
        if (diff) differences.push(diff);
      }
    }
    const selected = $.selection.selectedNodes();
    const focused = differences.filter(
      (diff) => Array.prototype.indexOf.call(selected, diff.node) !== -1,
    );
    if (focused.length) differences = focused;
    displayedDiffs = differences;
    canCopyCurrent.set(!!clipboardImage('left'));
    canCopyReference.set(!!clipboardImage('right'));
    preview.set(
      differences
        .map((diff) => {
          const description =
            diff.color === 'Red'
              ? 'Exposure deleted'
              : diff.color === 'Green'
                ? 'Exposure added'
                : 'Drawing modified';
          return (
            '<p><b>' +
            description +
            '</b> · ' +
            escapeHtml(diff.node) +
            '</p>' +
            diff.images
              .map((image) => {
                if (diff.color === 'Red') {
                  return (
                    '<p>Original in File B · ' +
                    escapeHtml(image.drawing) +
                    '</p>' +
                    previewImage(image.right)
                  );
                }
                return (
                  '<p>' +
                  escapeHtml(image.drawing) +
                  '</p>' +
                  '<table cellspacing="8"><tr><th>Current scene</th><th>Reference</th></tr><tr><td>' +
                  previewImage(image.left) +
                  '</td><td>' +
                  previewImage(image.right) +
                  '</td></tr></table>'
                );
              })
              .join('')
          );
        })
        .join(''),
    );
  }

  function clipboardImage(side: 'left' | 'right'): DrawingPreview | undefined {
    for (const diff of displayedDiffs) {
      for (const image of diff.images) {
        if (image[side]) return image;
      }
    }
    return undefined;
  }

  function copyPreview(side: 'left' | 'right'): void {
    const image = clipboardImage(side);
    if (!image) return;
    try {
      const process = $.ProcessKit.start(extender + '/.venv/Scripts/python.exe', [
        '-B',
        $.specialFolders.userScripts + '/drawing-diff-previews.py',
        '--copy-image',
        image[side],
      ]);
      if (!process.waitForFinished(8000)) {
        process.kill();
        throw new Error('Image copy timed out.');
      }
      const result = JSON.parse(process.readAllStandardOutput().toString());
      if (!result.copied) throw new Error(result.error || 'Clipboard copy failed.');
      status.set(
        'Copied ' +
          image.drawing +
          (side === 'left' ? ' from the current scene.' : ' from File B.'),
      );
    } catch (error) {
      status.set('Could not copy the preview. See Message Log.');
      $.log(String(error));
    }
  }

  function updateDiffSummary(): void {
    const comparison = comparisonKey($.Utils.getCurrentXstagetoast(), referencePath());
    const counts = { Pink: 0, Red: 0, Green: 0 };
    const differences = navigationDiffs(comparison);
    if (differences) {
      for (const key of Object.keys(differences)) {
        for (const diff of differences[Number(key)]) counts[diff.color]++;
      }
    }
    const total = counts.Pink + counts.Red + counts.Green;
    diffSummary.set(
      total +
        ' tracked diffs · ' +
        counts.Green +
        ' added · ' +
        counts.Red +
        ' deleted · ' +
        counts.Pink +
        ' modified',
    );
  }

  function navigateDiff(direction: 1 | -1): void {
    const comparison = comparisonKey($.Utils.getCurrentXstagetoast(), referencePath());
    const differences = navigationDiffs(comparison);
    if (!differences) {
      status.set('No saved diffs for this comparison. Refresh the cache or mark a selection.');
      return;
    }

    const order: Record<string, number> = Object.create(null);
    for (let i = 0; i < $.Timeline.numLayers; i++) {
      const path = $.Timeline.layerToNode(i);
      if (path && order[path] === undefined) order[path] = i;
    }
    const current = frame.current();
    const selected = $.selection.selectedNodes();
    const selectedLayer = order[selected[0]];
    const anchor =
      selectedLayer === undefined ? (direction === 1 ? -1 : $.Timeline.numLayers) : selectedLayer;
    let target: { node: string; layer: number; frame: number } | undefined;
    for (const key of Object.keys(differences)) {
      const f = Number(key);
      for (const diff of differences[f]) {
        const layer = order[diff.node];
        if (layer === undefined) continue;
        if ((f - current || layer - anchor) * direction <= 0) continue;
        if (!target || (f - target.frame || layer - target.layer) * direction < 0) {
          target = { node: diff.node, layer, frame: f };
        }
      }
    }
    if (!target) {
      status.set(direction === 1 ? 'No next difference.' : 'No previous difference.');
      return;
    }
    $.selection.clearSelection();
    $.selection.addNodeToSelection(target.node);
    $.frame.setCurrent(target.frame);
    status.set('Frame ' + target.frame + ' · ' + target.node);
    refreshPreview();
  }

  function cacheAllDrawingDiffs(): void {
    if (cacheProcess) return;

    const scenePath = $.Utils.getCurrentXstagetoast();
    const reference = referencePath();
    const pairs: DrawingPreview[] = [];
    let exposures: typeof cachedExposures = Object.create(null);
    let pending = '';
    let total = 0;
    let processed = 0;
    let failed = 0;
    let assetIssues = 0;
    let timing: DiffTiming | undefined;
    let complete = false;
    let failure = '';
    cacheProgress.set(0);
    cacheStatus.set('Finding drawing differences…');
    const started = new Date().getTime();

    try {
      const process = startPreviewProcess(scenePath, reference, '--all');
      cacheProcess = process;

      function receiveProgress(): void {
        if (cacheProcess !== process) return;
        pending += process.readAllStandardOutput().toString();
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.error) failure = event.error;
            if (typeof event.total === 'number') {
              total = event.total;
              cacheStatus.set('0 / ' + total + ' drawing diffs processed');
            }
            if (event.pair) {
              const pair: DrawingPreview = event.pair;
              pairs.push(pair);
              if (!pair.right || (!pair.referenceOnly && !pair.left)) failed++;
              if (pair.leftError) $.log(pair.leftError);
              if (pair.rightError) $.log(pair.rightError);
              processed++;
              cacheProgress.set(total ? Math.round((100 * processed) / total) : 0);
              cacheStatus.set(processed + ' / ' + total + ' drawing diffs processed');
            }
            if (event.complete) {
              complete = true;
              assetIssues = event.assetIssues;
              exposures = event.exposureChanges;
              timing = event.timing;
            }
          } catch (error) {
            failure = String(error);
          }
        }
      }

      process.readyReadStandardOutput.connect(receiveProgress);
      process.finished.connect(function () {
        if (cacheProcess !== process) return;
        receiveProgress();
        cacheProcess = undefined;
        if (failure || !complete || processed !== total) {
          cacheStatus.set('Preview cache could not finish. See Message Log.');
          $.log(failure || 'The preview process ended before reporting completion.');
          return;
        }
        logDiffTiming('Full scene', timing, started);
        const comparison = comparisonKey(scenePath, reference);
        useCachedReport(comparison, { pairs, exposureChanges: exposures, assetIssues, timing });
        if (previewComparison === comparison) {
          previewComparison = '';
          diffsByFrame = {};
          cachedSelection = undefined;
        }
        storeCache(scenePath, reference);
        cacheProgress.set(100);
        cacheStatus.set(
          processed +
            ' / ' +
            total +
            ' drawing diffs processed' +
            (failed ? ' · ' + failed + ' with unavailable previews' : '') +
            (assetIssues ? ' · ' + assetIssues + ' asset issues' : ''),
        );
        updateDiffSummary();
        refreshPreview();
      });
      process.errorOccurred.connect(function () {
        if (cacheProcess !== process) return;
        cacheProcess = undefined;
        cacheStatus.set('Could not run the preview cache process.');
      });
      receiveProgress();
    } catch (error) {
      const process = cacheProcess;
      cacheProcess = undefined;
      if (process) process.kill();
      cacheStatus.set(error.message || 'Could not start the preview cache. See Message Log.');
      $.log(String(error));
    }
  }

  function markDrawingChanges(): void {
    if (cacheProcess) {
      status.set('Wait for the preview cache to finish before marking drawings.');
      return;
    }
    const selected = $.TimelineKit.getSelection();
    if (!selected || !selected.selectedNodes.length) {
      status.set('Select drawing layers and frames first.');
      return;
    }

    try {
      const currentScene = $.Utils.getCurrentXstagetoast();
      const reference = referencePath();
      const comparison = comparisonKey(currentScene, reference);
      const requested: Record<string, string[]> = Object.create(null);
      const cells: Array<{ layer: number; node: string; frame: number; drawing: string }> = [];
      for (const layer of selected.selectedNodes) {
        requested[layer.nodePath] = [];
        const drawingColumn = $.node.linkedColumn(layer.nodePath, 'DRAWING.ELEMENT');
        if (!drawingColumn) continue;

        const names: Record<string, boolean> = Object.create(null);
        for (let f = selected.startFrame; f <= selected.endFrame; f++) {
          const drawing = $.column.getEntry(drawingColumn, 1, f) || '';
          if (drawing) names[drawing] = true;
          cells.push({ layer: layer.index, node: layer.nodePath, frame: f, drawing });
        }
        requested[layer.nodePath] = Object.keys(names);
      }
      if (!cells.length) {
        status.set('Select drawing layers and frames first.');
        return;
      }

      const request = JSON.stringify({
        drawings: requested,
        start: selected.startFrame,
        end: selected.endFrame,
      });
      let report = cachedComparison === comparison ? cachedReport : undefined;
      if (
        !report &&
        previewComparison === comparison &&
        cachedSelection &&
        cachedSelection.request === request
      ) {
        report = cachedSelection.report;
      }
      if (!report) {
        const started = new Date().getTime();
        report = compareSelection(currentScene, reference, request);
        if (report.error) throw new Error(report.error);
        logDiffTiming('Selection', report.timing, started);
        cachedSelection = { request, report };
      } else {
        $.log('[Drawing diff] Selection: reused cached results.');
        if (previewComparison !== comparison) cachedSelection = undefined;
      }

      const changedByNode: Record<string, Record<string, DrawingPreview>> = Object.create(null);
      const originals: Record<string, DrawingPreview> = Object.create(null);
      let unavailable = 0;
      for (const pair of report.pairs) {
        if (pair.referenceOnly) {
          originals[originalKey(pair.node, pair)] = pair;
        } else {
          if (!changedByNode[pair.node]) changedByNode[pair.node] = Object.create(null);
          changedByNode[pair.node][pair.drawing] = pair;
        }
        for (const error of [pair.leftError, pair.rightError]) {
          if (error) {
            unavailable++;
            $.log(error);
          }
        }
      }

      if (previewComparison !== comparison) diffsByFrame = {};
      previewComparison = comparison;
      for (const key of Object.keys(diffsByFrame)) {
        const f = Number(key);
        if (f < selected.startFrame || f > selected.endFrame) continue;
        diffsByFrame[f] = diffsByFrame[f].filter((diff) => !requested[diff.node]);
      }

      const exposureChanges: Record<string, ExposureChange[]> = report.exposureChanges;
      const markerChanges: Array<{
        layer: number;
        frame: number;
        color: frameMarkerColor;
        id?: number;
      }> = [];
      for (const cell of cells) {
        const changes = changedByNode[cell.node];
        const pair = changes && changes[cell.drawing];
        const ranges = Object.prototype.hasOwnProperty.call(exposureChanges, cell.node)
          ? exposureChanges[cell.node]
          : [];
        const range = exposureAt(ranges, cell.frame);
        const diff = frameDifference(cell.node, cell.drawing, range, pair, originals);
        if (!diff) continue;
        const color = diff.color;

        if (!diffsByFrame[cell.frame]) diffsByFrame[cell.frame] = [];
        diffsByFrame[cell.frame].push(diff);
        const marker = $.Timeline.getFrameMarker(cell.layer, cell.frame);
        if (!marker || marker.id === -1 || marker.type !== color) {
          markerChanges.push({
            layer: cell.layer,
            frame: cell.frame,
            color,
            id: marker && marker.id >= 0 ? marker.id : undefined,
          });
        }
      }

      let marked = 0;
      if (markerChanges.length) {
        $.scene.beginUndoRedoAccum('Mark Drawing Changes');
        try {
          for (const change of markerChanges) {
            const applied =
              change.id === undefined
                ? $.Timeline.createFrameMarker(change.layer, change.color, change.frame) >= 0
                : $.Timeline.changeFrameMarkerType(change.layer, change.id, change.color);
            if (applied) marked++;
          }
          storeCache(currentScene, reference);
        } finally {
          $.scene.endUndoRedoAccum();
        }
      } else storeCache(currentScene, reference);

      updateDiffSummary();
      refreshPreview();
      status.set(
        marked +
          ' markers updated' +
          (report.assetIssues ? ' · ' + report.assetIssues + ' asset issues' : '') +
          (unavailable ? ' · ' + unavailable + ' PNG conversions failed. See Message Log.' : ''),
      );
    } catch (error) {
      status.set(error.message || 'Drawing comparison failed. See Message Log.');
      $.log(String(error));
    }
  }

  const fileB = (
    <lineEdit
      text={restored ? restored.reference : defaultFileB}
      onTextChanged={() => {
        updateDiffSummary();
        refreshPreview();
      }}
      stretch={1}
    />
  );

  if (restored) {
    const comparison = comparisonKey(initialScene, restored.reference);
    if (restored.full) {
      useCachedReport(comparison, restored.full);
      cacheProgress.set(100);
      cacheStatus.set('Saved cache loaded · ' + restored.full.pairs.length + ' drawing diffs');
    }
    if (restored.marked) {
      previewComparison = comparison;
      diffsByFrame = restored.marked;
      cachedSelection = restored.selection;
      if (!restored.full) cacheStatus.set('Saved selection diffs loaded.');
    }
  }

  <column parent={dialog}>
    <label text={frameText} />
    <row>
      <label text="File B" />
      {fileB}
      <pushButton text="Pick Directory" onClicked={pickDirectory} />
    </row>
    <row>
      <pushButton text="Mark Drawing Changes" onClicked={markDrawingChanges} stretch={1} />
      <pushButton text="Refresh Diff Cache" onClicked={cacheAllDrawingDiffs} stretch={1} />
    </row>
    <progressBar value={cacheProgress} minimum={0} maximum={100} />
    <label text={cacheStatus} />
    <label text={status} />
    <textEdit
      html={preview}
      readOnly={true}
      minimumHeight={240}
      stretch={1}
      styleSheet="QTextEdit { background-color: #edf0f3; color: #242a33; }"
    />
    <row>
      <pushButton
        text="Copy Current Image"
        enabled={canCopyCurrent}
        onClicked={() => copyPreview('left')}
        stretch={1}
      />
      <pushButton
        text="Copy File B Image"
        enabled={canCopyReference}
        onClicked={() => copyPreview('right')}
        stretch={1}
      />
    </row>
    <label text={diffSummary} />
    <row>
      <pushButton text="←" toolTip="Previous Diff" onClicked={() => navigateDiff(-1)} stretch={1} />
      <pushButton text="→" toolTip="Next Diff" onClicked={() => navigateDiff(1)} stretch={1} />
    </row>
  </column>;

  const notifier = new SceneChangeNotifier(dialog);
  const updateFrame = function () {
    frameText.set('Current Frame: ' + frame.current());
    refreshPreview();
  };

  notifier.currentFrameChanged.connect(updateFrame);
  notifier.selectionChanged.connect(refreshPreview);
  dialog.finished.connect(function () {
    notifier.currentFrameChanged.disconnect(updateFrame);
    notifier.selectionChanged.disconnect(refreshPreview);
    const process = cacheProcess;
    cacheProcess = undefined;
    if (process) process.kill();
  });

  dialog.resize(600, 440);
  updateDiffSummary();
  refreshPreview();
  dialog.show();
}
