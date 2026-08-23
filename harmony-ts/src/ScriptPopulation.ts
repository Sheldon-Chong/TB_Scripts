include('globals.js');

interface DiffResult {
  lineIndex: number;
  lineText: string;
  isDialogue: boolean;
  /**
   * 'matched': Line matches an expected dialogue object in order
   * 'unexpected': Extra line in editor or does not match expected list (Highlight Red)
   * 'non-dialogue': Action text / non-dialogue line
   */
  status: 'matched' | 'unexpected' | 'non-dialogue';
  dialogueObj?: dialogueLine;
}

interface dialogueLine {
  profile: string;
  dialogue: string;
}

// Type union for parsed items
type ParsedItem = dialogueLine | string;

interface ParsedScriptResult {
  grouped: Array<dialogueLine | string[]>;
  dialogueOnly: dialogueLine[];
  nonDialogueOnly: string[][];
}

interface CutSection {
  drawingLayers: { [nodePath: string]: string[] };
  markers: Array<{
    frame: number;
    length: number;
    color: string;
    notes: string;
    name: string;
  }>;
  startFrame: number;
  endFrame: number;
}

namespace ScriptPopulation {
  export function insertDialogPrompt(settings: {
    message?: string;
    title?: string;
    defaultProfile?: string;
    defaultDialogue?: string;
    onOk?: (result: { profile: string; dialogue: string }) => void;
  }): { profile: string; dialogue: string } | null {
    var result = null;

    var dialog = new QDialog();
    dialog.windowTitle = settings.title || 'Input';
    dialog.setWindowFlags(Qt.WindowStaysOnTopHint);
    dialog.minimumWidth = 340;
    dialog.modal = true;
    dialog.styleSheet =
      'QDialog { background-color: #2d2d2d; border: 1px solid #555; border-radius: 6px; }';

    const ui = {
      label: new G.Widgets.Label({
        text: settings.message ?? 'Enter text:',
      }),
      profileInput: new G.Widgets.LineEdit({
        placeholderText: 'Profile',
        text: settings.defaultProfile || '',
      }),
      input: new G.Widgets.TextEdit({
        text: settings.defaultDialogue || '',
      }),
      buttons: {
        layout: QHBoxLayout,
        props: { styleSheet: 'background-color: #2d2d2d; border: none;' },
        layoutProps: { contentsMargins: [0, 0, 0, 0], spacing: 8 },
        cancel: new G.Widgets.Button({
          text: 'Cancel',
          objectName: 'cancelButton',
          onClick: function () {
            result = null;
            dialog.reject();
          },
        }),
        spacer: 1,
        ok: new G.Widgets.Button({
          text: 'OK',
          objectName: 'okButton',
          onClick: function () {
            result = {
              profile: ui.profileInput.text.trim(),
              dialogue: ui.input.plainText.trim(),
            };
            if (settings.onOk) {
              settings.onOk(result);
            }
            dialog.accept();
          },
        }),
      },
    };

    G.Widgets.buildTree(ui, dialog, {
      layoutType: QVBoxLayout,
      layoutProps: { contentsMargins: [24, 20, 24, 20], spacing: 18 },
    });

    dialog.exec();
    return result;
  }

  function normalizeStr(str: string): string {
    return (str || '').trim().replace(/\s+/g, ' ');
  }

  export function isDialogueEqual(a: dialogueLine, b: dialogueLine): boolean {
    return (
      normalizeStr(a.profile) === normalizeStr(b.profile) &&
      normalizeStr(a.dialogue) === normalizeStr(b.dialogue)
    );
  }

  // (Keep the rest of diffScriptAgainstExpected using this updated isDialogueEqual)

  /**
   * Computes sequence diff using Longest Common Subsequence (LCS).
   * Maps live editor lines against an expected dialogue array.
   */
  export function diffScriptAgainstExpected(
    editorLines: string[],
    expectedDialogue: dialogueLine[],
  ): DiffResult[] {
    // 1. Extract only valid dialogue entries from current editor lines with line tracking
    var editorDialogues: { lineIndex: number; lineText: string; parsed: dialogueLine }[] = [];

    for (var i = 0; i < editorLines.length; i++) {
      var parsed = parseDialog(editorLines[i]);
      if (parsed) {
        editorDialogues.push({
          lineIndex: i,
          lineText: editorLines[i],
          parsed: parsed,
        });
      }
    }

    var N = editorDialogues.length;
    var M = expectedDialogue.length;

    // 2. Build LCS Matrix (Replaced .fill() with ES5 nested loop)
    var dp: number[][] = [];
    for (var i = 0; i <= N; i++) {
      dp[i] = [];
      for (var j = 0; j <= M; j++) {
        dp[i][j] = 0;
      }
    }

    for (var i = 1; i <= N; i++) {
      for (var j = 1; j <= M; j++) {
        if (isDialogueEqual(editorDialogues[i - 1].parsed, expectedDialogue[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 3. Backtrack through matrix (Replaced .fill(false) with standard array populate)
    var matchedEditorIndices: boolean[] = [];
    for (var k = 0; k < N; k++) {
      matchedEditorIndices.push(false);
    }

    var i = N;
    var j = M;

    while (i > 0 && j > 0) {
      if (isDialogueEqual(editorDialogues[i - 1].parsed, expectedDialogue[j - 1])) {
        matchedEditorIndices[i - 1] = true;
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // 4. Map back to total full line results for editor highlighting
    var results: DiffResult[] = [];
    var dialogueCounter = 0;

    for (var lineIdx = 0; lineIdx < editorLines.length; lineIdx++) {
      var currentLineText = editorLines[lineIdx];
      var parsed = parseDialog(currentLineText);

      if (parsed) {
        var isMatched = matchedEditorIndices[dialogueCounter];
        results.push({
          lineIndex: lineIdx,
          lineText: currentLineText,
          isDialogue: true,
          status: isMatched ? 'matched' : 'unexpected',
          dialogueObj: parsed,
        });
        dialogueCounter++;
      } else {
        results.push({
          lineIndex: lineIdx,
          lineText: currentLineText,
          isDialogue: false,
          status: 'non-dialogue',
        });
      }
    }

    return results;
  }

  export function parseDialog(line: string): dialogueLine | null {
    const regex = /^(.+?)\s*::\s*(.+)$/;
    const match = line.match(regex);

    if (match) {
      return {
        profile: match[1].trim(),
        dialogue: match[2].trim(),
      };
    }
    return null;
  }

  const grouped: Array<dialogueLine | string[]> = [];
  export function groupScriptLines(lines: string[]): ParsedScriptResult {
    const dialogueOnly: dialogueLine[] = [];
    const nonDialogueOnly: string[][] = [];

    let nonDialogueBuffer: string[] = [];

    const flushBuffer = () => {
      if (nonDialogueBuffer.length > 0) {
        grouped.push(nonDialogueBuffer);
        nonDialogueOnly.push(nonDialogueBuffer); // Reference to the same group array
        nonDialogueBuffer = [];
      }
    };

    for (const line of lines) {
      const dialog = parseDialog(line);

      if (dialog) {
        flushBuffer();
        grouped.push(dialog);
        dialogueOnly.push(dialog);
      } else {
        nonDialogueBuffer.push(line);
      }
    }

    // Push any remaining non-dialogue lines at the end of the file
    flushBuffer();

    return {
      grouped,
      dialogueOnly,
      nonDialogueOnly,
    };
  }

  const drawingTypesFile = `${specialFolders.userConfig}/drawingTypes.d/drawingTypes.xml`;

  MessageLog.trace(`[ScriptPopulation.ts] DRAWING TYPES FILE:  ${drawingTypesFile}`);

  var xmlText = G.FileUtils.readFrom(drawingTypesFile);

  function readDrawingTypes(): DrawingType[] | undefined {
    if (!xmlText) {
      MessageLog.trace('[ScriptPopulation.ts] File could not be read or is empty.');
      return;
    }

    var doc = G.Utils.readXmlFile(xmlText);

    if (doc.error) {
      MessageLog.trace('[ScriptPopulation.ts] ' + doc.error);
      return;
    }

    var drawingTypesNode = doc.children[0];
    var drawingTypeNodes = drawingTypesNode ? drawingTypesNode.children : [];

    var items = [];
    for (var i = 0; i < drawingTypeNodes.length; i++) {
      items.push(drawingTypeNodes[i].attributes);
    }
    return items;
  }

  export function addExposure(frameNumber?: number, count?: number) {
    const sel = new G.oSelection();
    const targetFrame = (typeof frameNumber === 'number' ? frameNumber : frame.current()) + 1;
    const numberOfFrames = count !== null && count !== void 0 ? count : sel.length;

    MessageLog.trace(
      `[ScriptPopulation.ts] addExposure frame=${targetFrame} current=${frame.current()} count=${numberOfFrames}`,
    );
    scene.beginUndoRedoAccum('add exposure');

    Action.perform('selectAll()', 'timelineView');
    for (var f = targetFrame; f < targetFrame + numberOfFrames; f++) {
      Action.perform('onActionAddExposure()', 'timelineView');
      MessageLog.trace(`[ScriptPopulation.ts] ${f}`);
    }

    G.TimelineKit.rippleShiftMarkers(targetFrame - 1, numberOfFrames, 'add');
    frame.setCurrent(targetFrame);
    Action.perform('deleteSelection()', 'timelineView');
    MessageLog.trace(`[ScriptPopulation.ts] ${'test'}`);

    scene.endUndoRedoAccum();
  }

  export function removeExposure(frameNumber?: number, count?: number) {
    const sel = new G.oSelection();
    const targetFrame = typeof frameNumber === 'number' ? frameNumber : frame.current();
    const numberOfFrames = count !== null && count !== void 0 ? count : sel.length;

    MessageLog.trace(
      `[ScriptPopulation.ts] removeExposure frame=${targetFrame} current=${frame.current()} count=${numberOfFrames}`,
    );

    scene.beginUndoRedoAccum('remove exposure');

    G.TimelineKit.rippleShiftMarkers(targetFrame, numberOfFrames, 'delete');

    Action.perform('selectAll()', 'timelineView');
    for (var f = targetFrame; f < targetFrame + numberOfFrames; f++) {
      Action.perform('onActionRemoveExposure()', 'timelineView');
      MessageLog.trace(`[ScriptPopulation.ts] ${f}`);
    }

    frame.setCurrent(targetFrame);

    scene.endUndoRedoAccum();
  }

  /**
   * Return the marker at or immediately to the left of `targetFrame`.
   * If a marker sits exactly at `targetFrame`, it is returned; otherwise the
   * marker with the greatest frame less than `targetFrame`. Returns null when
   * no marker exists at or before the target frame.
   */
  export function getClosestLeftMarker(
    targetFrame: number,
    markers?: oTimelineMarker[],
  ): oTimelineMarker | null {
    const all: oTimelineMarker[] = markers || G.TimelineKit.getAllMarkers();
    let closest: oTimelineMarker | null = null;
    for (let i = 0; i < all.length; i++) {
      const marker = all[i];
      if (marker.frame <= targetFrame && (!closest || marker.frame > closest.frame)) {
        closest = marker;
      }
    }
    return closest;
  }

  function getCutSectionFromClipboard(): CutSection | undefined {
    try {
      const text = G.Utils.getClipboardText();
      if (!text) return undefined;
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.drawingLayers) return undefined;
      return parsed as CutSection;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Cut the current selection: capture its drawing exposures and markers, then
   * delete the markers in the range, ripple-shift the remaining markers left,
   * and remove one exposure per frame in the selection.
   */
  export function cutSection(): void {
    const sel = new G.oSelection();
    const start = sel.startFrame;
    const end = sel.endFrame;
    const length = end - start + 1;

    // 1. Capture the section.
    const drawingLayers: { [nodePath: string]: string[] } = {};
    for (const layer of G.LayerManager.getNodeLayers()) {
      if (layer instanceof G.oDrawingLayer) {
        drawingLayers[layer.nodePath] = layer.drawingElement.getKeyframeRange(start, end);
      }
    }

    const markers = G.TimelineKit.getMarkersFromRange(start, end);

    G.Utils.setClipboardText(
      JSON.stringify({
        drawingLayers: drawingLayers,
        markers: markers,
        startFrame: start,
        endFrame: end,
      }),
    );

    scene.beginUndoRedoAccum('cut section');
    try {
      // 2. Delete the markers inside the cut range.
      for (let i = 0; i < markers.length; i++) {
        TimelineMarker.deleteMarker(markers[i]);
      }

      // 3. Ripple-shift remaining markers left from the selection start.
      G.TimelineKit.rippleShiftMarkers(start, length, 'delete');

      // 4. Remove one exposure per frame in the selection.
      frame.setCurrent(start);
      for (let i = 0; i < length; i++) {
        Action.perform('selectAll()', 'timelineView');
        Action.perform('onActionRemoveExposure()', 'timelineView');
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error cutting section: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
    scene.endUndoRedoAccum();
  }

  /**
   * Paste a previously cut section, starting at the current selection's start
   * frame. Existing markers are ripple-shifted right and exposures are added to
   * make room before the stored drawings and markers are written back.
   */
  export function pasteSection(): void {
    const section = getCutSectionFromClipboard();
    if (!section) {
      MessageLog.trace('[ScriptPopulation.ts] No cut section found on the clipboard to paste.');
      return;
    }

    const sel = new G.oSelection();
    const targetStart = sel.startFrame;
    const frameOffset = targetStart - section.startFrame;
    const length = section.endFrame - section.startFrame + 1;

    scene.beginUndoRedoAccum('paste section');

    try {
      // 1. Ripple-shift markers right to make room.
      G.TimelineKit.rippleShiftMarkers(targetStart - 1, length, 'add');

      // 2. Add one exposure per frame in the section.
      frame.setCurrent(targetStart);
      for (let i = 0; i < length; i++) {
        Action.perform('selectAll()', 'timelineView');
        Action.perform('onActionAddExposure()', 'timelineView');
      }

      // 3. Paste drawing exposures.
      const nodePaths = Object.keys(section.drawingLayers);
      for (let i = 0; i < nodePaths.length; i++) {
        const nodePath = nodePaths[i];
        const frames = section.drawingLayers[nodePath];
        if (!frames) continue;

        const layer = G.LayerManager.getNodeLayer(nodePath);
        if (!layer || !(layer instanceof G.oDrawingLayer)) {
          MessageLog.trace(`[ScriptPopulation.ts] Skipping non-drawing layer: ${nodePath}`);
          continue;
        }

        for (let f = 0; f < frames.length; f++) {
          layer.drawingElement.setKeyFrame(targetStart + f, frames[f] || '');
        }
      }

      // 4. Paste markers.
      const markers = section.markers || [];
      for (let m = 0; m < markers.length; m++) {
        const marker = markers[m];
        const output = TimelineMarker.createMarker({
          frame: marker.frame + frameOffset,
          length: marker.length !== undefined ? marker.length : 0,
          color: marker.color || '#ffffff',
          name: marker.name || '',
          notes: marker.notes || '',
        });
        MessageLog.trace(`[ScriptPopulation.ts] output ${output}`);
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error pasting section: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }

    scene.endUndoRedoAccum();
  }

  /**
   * Paste only the markers from a cut section held on the clipboard, starting
   * at the current selection's start frame. Drawing exposures are left alone.
   */
  export function pasteMarkersOnly(): void {
    const section = getCutSectionFromClipboard();
    if (!section) {
      MessageLog.trace('[ScriptPopulation.ts] No cut section found on the clipboard to paste.');
      return;
    }

    const sel = new G.oSelection();
    const targetStart = sel.startFrame;
    const frameOffset = targetStart - section.startFrame;

    scene.beginUndoRedoAccum('paste markers');

    try {
      const markers = section.markers || [];
      for (let m = 0; m < markers.length; m++) {
        const marker = markers[m];
        TimelineMarker.createMarker({
          frame: marker.frame + frameOffset,
          length: marker.length !== undefined ? marker.length : 0,
          color: marker.color || '#ffffff',
          name: marker.name || '',
          notes: marker.notes || '',
        });
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error pasting markers: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }

    scene.endUndoRedoAccum();
  }

  /**
   * Move every marker to `frame * 32`, stretching the spacing between markers
   * out to the fixed 32-frame boundary.
   *
   * Markers are deleted first and then recreated at their new frames, so moves
   * never collide with markers that have not been moved yet. Target frames are
   * de-duplicated to avoid overlapping markers at the same frame.
   */
  export function extendToBoundary(): void {
    const markers = G.TimelineKit.getAllMarkers();

    const rebuilt: Array<{
      frame: number;
      length: number;
      color: string;
      name: string;
      notes: string;
    }> = [];
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      rebuilt.push({
        frame: marker.frame * 32,
        length: marker.length !== undefined ? marker.length : 0,
        color: marker.color || '#ffffff',
        name: marker.name || '',
        notes: marker.notes || '',
      });
    }

    // Recreate in frame order for a deterministic timeline layout.
    rebuilt.sort(function (a, b) {
      return a.frame - b.frame;
    });

    scene.beginUndoRedoAccum('extend to boundary');
    try {
      // Delete everything first so recreated markers never overlap an old one.
      for (let i = 0; i < markers.length; i++) {
        TimelineMarker.deleteMarker(markers[i]);
      }

      const usedFrames: { [frame: number]: boolean } = {};
      for (let i = 0; i < rebuilt.length; i++) {
        const m = rebuilt[i];
        if (usedFrames[m.frame]) {
          MessageLog.trace(
            `[ScriptPopulation.ts] Skipping marker "${m.name}" — frame ${m.frame} is already occupied.`,
          );
          continue;
        }
        usedFrames[m.frame] = true;
        TimelineMarker.createMarker({
          frame: m.frame,
          length: m.length,
          color: m.color,
          name: m.name,
          notes: m.notes,
        });
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error extending to boundary: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
    scene.endUndoRedoAccum();
  }

  export function populateScript(text: string) {
    const rawText = text;

    const profiles = readDrawingTypes();

    function getProfile(profileName: string): DrawingType | undefined {
      return profiles?.find((profile) => profile.text === profileName);
    }

    if (!rawText) {
      MessageLog.trace('[ScriptPopulation.ts] File could not be read or is empty.');
      return;
    }

    const lines = rawText.split(/\r?\n/);
    const scriptStructure = groupScriptLines(lines);

    MessageLog.trace(`[ScriptPopulation.ts] ${JSON.stringify(scriptStructure, null, 2)}`);
    MessageLog.trace(`[ScriptPopulation.ts] ${scriptStructure.grouped.length}`);
    MessageLog.trace(`[ScriptPopulation.ts] ${scriptStructure.dialogueOnly.length}`);
    MessageLog.trace(`[ScriptPopulation.ts] ${scriptStructure.nonDialogueOnly.length}`);

    scene.beginUndoRedoAccum('marker');
    try {
      const sel = new G.oSelection();
      for (var i = sel.startFrame; i < sel.startFrame + scriptStructure.dialogueOnly.length; i++) {
        const profile = getProfile(scriptStructure.dialogueOnly[i - sel.startFrame].profile);
        G.TimelineKit.createMarker(
          i,
          profile ? profile.text : '',
          profile ? profile.timelineColor.slice(0, 7) : '#ffffff',
          `${scriptStructure.dialogueOnly[i - sel.startFrame].dialogue}`,
          0,
        );
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error creating markers: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
    scene.endUndoRedoAccum();
  }
}

include(specialFolders.userScripts + '/core/UI/WidgetKit.js');

function testRequest() {
  if (typeof QNetworkAccessManager !== 'undefined') {
    MessageLog.trace(`[ScriptPopulation.ts] undefined`);

    var mgr = new QNetworkAccessManager();
    var req = new QNetworkRequest();
    req.setUrl(new QUrl('http://studioserver.local:8000/textbox/profiles'));
    mgr.finished.connect(function (reply) {
      MessageLog.trace(reply.readAll().toString());
    });
    mgr.get(req);
  } else {
    MessageLog.trace(`[ScriptPopulation.ts] defined`);
  }
}

function runListener() {
  // Kept as a button entry point; the listener UI now lives in the "Listener"
  // tab of the Timeline Markers dialog (showMarkerList).
  showMarkerList();
}

function showMarkerList() {
  function colorToHex(color: any): string {
    if (typeof color === 'string') {
      if (color.charAt(0) === '#') {
        return color.length >= 7 ? color.slice(0, 7) : color;
      }
      return color;
    }
    var n = Number(color);
    if (isFinite(n)) {
      var hex = (n & 0xffffff).toString(16);
      while (hex.length < 6) hex = '0' + hex;
      return '#' + hex;
    }
    return '#888888';
  }

  const dialog = new G.Widgets.Dialog({
    title: 'Timeline Markers',
  });

  function getSelectedRowIndices(): number[] {
    const selectedItems = table.selectedItems();
    const rowSet: { [key: number]: boolean } = {};

    for (var i = 0; i < selectedItems.length; i++) {
      rowSet[selectedItems[i].row()] = true;
    }

    // Convert object keys back to sorted numbers
    const rows: number[] = [];
    for (var r in rowSet) {
      rows.push(Number(r));
    }
    return rows;
  }

  const layout = new QVBoxLayout(dialog);
  layout.setContentsMargins(0, 0, 0, 0);
  layout.spacing = 0;

  // Tab menu: each tab is one "menu" (tool page). Add more tabs here later.
  const tabs = new QTabWidget();
  layout.addWidget(tabs, 1, 0);

  // "Markers" tab holds the marker list, its filters, and the operations bar.
  const markersTab = new QWidget();
  const markersTabLayout = new QVBoxLayout(markersTab);
  markersTabLayout.setContentsMargins(12, 12, 12, 12);
  markersTabLayout.spacing = 8;
  tabs.addTab(markersTab, 'Markers');

  // QTableWidget Setup
  const table = new QTableWidget();
  table.columnCount = 3;
  table.setHorizontalHeaderLabels(['Color', 'Name', 'Notes']);
  // table.selectionBehavior = QAbstractItemView.SelectRows;
  // table.selectionMode = QAbstractItemView.SingleSelection;

  table.selectionMode = QAbstractItemView.ExtendedSelection;
  table.selectionBehavior = QAbstractItemView.SelectRows;

  // Configure Column Resizing
  const header = table.horizontalHeader();
  header.setSectionResizeMode(0, QHeaderView.Fixed);
  header.setSectionResizeMode(1, QHeaderView.Interactive);
  header.setSectionResizeMode(2, QHeaderView.Stretch);
  table.setColumnWidth(0, 56);
  table.setColumnWidth(1, 150);

  table.verticalHeader().setVisible(false);
  markersTabLayout.addWidget(table, 1, 0);

  // --- Column-specific filters ---
  const filterBar = new QWidget();
  filterBar.styleSheet = 'background-color: transparent; border: none;';
  const filterLayout = new QHBoxLayout(filterBar);
  filterLayout.setContentsMargins(0, 0, 0, 0);
  filterLayout.spacing = 8;

  const nameFilter = new QLineEdit();
  nameFilter.placeholderText = 'Filter Name...';
  nameFilter.styleSheet =
    'font-size: 11pt; color: #e0e0e0; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 6px; padding: 4px;';

  const notesFilter = new QLineEdit();
  notesFilter.placeholderText = 'Filter Notes...';
  notesFilter.styleSheet = nameFilter.styleSheet;

  filterLayout.addWidget(nameFilter, 1, 0);
  filterLayout.addWidget(notesFilter, 1, 0);
  markersTabLayout.addWidget(filterBar, 0, 0);

  function matchesFilter(value: string, query: string): boolean {
    if (!query) return true;
    return value.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  }

  // Hides rows that don't match the active filters (AND semantics across columns).
  function applyFilters() {
    const nameQuery = nameFilter.text;
    const notesQuery = notesFilter.text;
    const markers = TimelineMarker.getAllMarkers();

    table.updatesEnabled = false;
    for (var i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const nameMatch = matchesFilter(marker.name || '', nameQuery);
      const notesMatch = matchesFilter(marker.notes || '', notesQuery);
      table.setRowHidden(i, !(nameMatch && notesMatch));
    }
    table.updatesEnabled = true;
  }

  nameFilter.textChanged.connect(applyFilters);
  notesFilter.textChanged.connect(applyFilters);

  var selfUpdating = false;

  function updateMarker(marker: oTimelineMarker) {
    selfUpdating = true;
    try {
      scene.beginUndoRedoAccum('Update Marker');
      TimelineMarker.setMarker(marker);
      scene.endUndoRedoAccum();
    } catch (e) {
      MessageLog.trace('[ScriptPopulation.ts] Error updating marker: ' + e.message);
    }
    selfUpdating = false;
  }

  // Handle in-place cell editing directly on the QTableWidget
  table.itemChanged.connect(function (item: QTableWidgetItem) {
    if (selfUpdating) return;

    const row = item.row();
    const markers = TimelineMarker.getAllMarkers();
    const marker = markers[row];
    if (!marker) return;

    const col = item.column();
    if (col === 1) {
      // Name Column
      if (marker.name !== item.text()) {
        marker.name = item.text();
        updateMarker(marker);
      }
    } else if (col === 2) {
      // Notes Column
      if (marker.notes !== item.text()) {
        marker.notes = item.text();
        updateMarker(marker);
      }
    }
  });

  this.__proto__.ScriptPopulation = ScriptPopulation;

  /* Script Population Actions */

  const deleteMarkersOfSelection = G.Utils.bindAction(() => {
    const sel = new G.oSelection();
    for (var i = sel.startFrame; i < sel.endFrame + 1; i++) {
      const marker = G.TimelineKit.getTimelineMarkersPresentAtFrame(i)[0];
      if (marker) TimelineMarker.deleteMarker(marker);
    }
  }, this);

  const deleteAllMarkers = G.Utils.bindAction(() => {
    const allMarkers = G.TimelineKit.getAllMarkers();
    for (var i = 0; i < allMarkers.length; i++) {
      TimelineMarker.deleteMarker(allMarkers[i]);
    }
  }, this);

  const importScript = G.Utils.bindAction(() => {
    const text = ScriptPopulation.insertDialogPrompt({
      message: 'Paste script text here:',
      title: 'Import Script',
      defaultProfile: '',
      defaultDialogue: '',
    })?.dialogue;
    ScriptPopulation.populateScript(text || '');
  }, this);

  const compileScript = G.Utils.bindAction(function () {
    const markers = G.TimelineKit.getAllMarkers();
    const compiledScript = markers
      .filter((marker) => marker.name && marker.notes)
      .map((marker) => `${marker.name}:: ${marker.notes}`)
      .join('\n');
    G.Utils.prompt('Compiled Script', 'Compiled Script', compiledScript);
    MessageLog.trace(`[ScriptPopulation.ts] compile script: ${compiledScript}`);
  }, this);

  /* Script Population Menu */

  try {
    const optionsButton = new G.Widgets.UI_QToolButton(dialog);
    const optionsMenu = WidgetKit.optionsMenu(optionsButton, [
      [
        ['Delete Markers in Selection', deleteMarkersOfSelection],
        ['Delete All Markers', deleteAllMarkers],
        ['Cut section', () => ScriptPopulation.cutSection()],
        ['Paste Section', () => ScriptPopulation.pasteSection()],
        ['Paste Markers Only', () => ScriptPopulation.pasteMarkersOnly()],
      ],
      [
        ['Import Script', importScript],
        ['Compile Script', compileScript],
      ],
      [['Extend To Boundary', () => ScriptPopulation.extendToBoundary()]],
    ]);

    // Attach the menu to the button.
    optionsButton.setMenu(optionsMenu);

    // Build the operations bar (menu button + action buttons) with buildTree.
    // Use a fresh QWidget as the root so buildTree doesn't replace markersTab's
    // existing layout; we then add the finished bar to markersTabLayout.
    const operationsBar = G.Widgets.buildTree(
      {
        optionsButton: optionsButton,
        addExposureButton: new G.Widgets.Button({
          text: 'Add exposure',
          objectName: 'addExposureButton',
          onClick: ScriptPopulation.addExposure,
        }),
        removeExposureButton: new G.Widgets.Button({
          text: 'Remove exposure',
          objectName: 'removeExposureButton',
          onClick: ScriptPopulation.removeExposure,
        }),
        insertDialogButton: new G.Widgets.Button({
          text: 'Insert Dialog',
          objectName: 'insertDialogButton',
          onClick: G.Utils.bindAction(
            function () {
              const output = ScriptPopulation.insertDialogPrompt({
                onOk: (result) => {
                  if (result) {
                    const sel = new G.oSelection();
                    const frameNum = sel.startFrame;
                    const profile = result.profile;
                    const dialogue = result.dialogue;
                    ScriptPopulation.addExposure();
                    MessageLog.trace(`[ScriptPopulation.ts] ${'inserted'}`);
                    G.TimelineKit.createMarker(frameNum + 1, profile, '#ffffff', dialogue, 0);
                    MessageLog.trace(
                      `[ScriptPopulation.ts] Inserted dialog at frame ${frameNum}: ${profile}:: ${dialogue}`,
                    );
                  }
                },
              });
              MessageLog.trace(`[ScriptPopulation.ts] ${JSON.stringify(output, null, 2)}`);
            },
            [G, ScriptPopulation],
          ),
        }),
      },
      new QWidget(),
      {
        layoutType: QHBoxLayout,
        layoutProps: { contentsMargins: [0, 0, 0, 0], spacing: 8 },
      },
    );

    markersTabLayout.addWidget(operationsBar, 0, Qt.AlignmentFlag.AlignRight);
  } catch (error) {
    MessageLog.trace(
      `[ScriptPopulation.ts] ${error.message} ${error.fileName} ${error.lineNumber}`,
    );
  }

  // --- "Listener" tab: name / notes editor (moved from runListener) ---
  const SizePolicy = {
    Fixed: 0,
    Minimum: 1,
    Maximum: 4,
    MinimumExpanding: 3,
    Preferred: 5,
    Expanding: 7,
    Ignored: 13,
  };

  function newRow(settings: { objectName: string; component: any; stretch?: number }) {
    const expand = (settings.stretch || 0) > 0;

    // When the row expands vertically, make the component fill it too.
    const componentDef = settings.component;
    if (expand) {
      componentDef.calls = (componentDef.calls || []).concat([
        { name: 'setSizePolicy', args: [SizePolicy.Expanding, SizePolicy.Expanding] },
      ]);
    }

    return {
      type: QWidget,
      props: {
        objectName: settings.objectName,
        styleSheet: 'background-color: transparent; border: none;',
      },
      layout: QHBoxLayout,
      layoutProps: {
        contentsMargins: [0, 0, 0, 0],
      },
      stretch: settings.stretch !== undefined ? settings.stretch : 0,
      calls: expand
        ? [{ name: 'setSizePolicy', args: [SizePolicy.Preferred, SizePolicy.Expanding] }]
        : undefined,
      children: [componentDef],
    };
  }

  const ScriptTab = WidgetKit.createComponent({
    type: QWidget,
    props: {
      styleSheet: 'background-color: #2d2d2d;',
    },
    layout: QVBoxLayout,
    layoutProps: {
      contentsMargins: [15, 20, 15, 20],
    },
    children: [
      newRow({
        objectName: 'scriptRow',
        stretch: 1,
        component: {
          type: QTextEdit,
          props: {
            objectName: 'scriptTextEdit',
            plainText: 'testing',
            lineWrapMode: QTextEdit.WidgetWidth,
            alignment: Qt.AlignmentFlag.AlignLeft,
            styleSheet:
              'font-size: 14pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 8px; padding: 8px; margin: 0px;',
          },
        },
      }),
    ],
  }) as QWidget;

  var textEditComponent = WidgetKit.findWidgetByName(ScriptTab, 'scriptTextEdit') as QTextEdit;

  // Function to process regex matching and formatting

  // ------------------------------
  // --- Debounce Utility for QtScript ---
  // ==========================================
  // 1. DEBOUNCED HIGHLIGHT TIMER ("Typing Stopped")
  // ==========================================
  var highlightTimer = new QTimer();
  highlightTimer.singleShot = true;

  highlightTimer.timeout.connect(function () {
    applyScriptHighlights();
  });

  // Trigger highlight processing only when user STOPS typing for 350ms
  textEditComponent.textChanged.connect(function () {
    highlightTimer.start(350);
  });
  // REMOVED: textEditComponent.textChanged.connect(applyScriptHighlights); <-- THIS WAS CAUSING THE LAG

  // Local Cache
  var cachedMarkers: any[] = [];

  function refreshMarkerCache() {
    cachedMarkers = G.TimelineKit.getAllMarkers();
  }

  function applyScriptHighlights() {
    textEditComponent.blockSignals(true);

    refreshMarkerCache(); // Fetch from Harmony C++ once per pause

    var existingDialogueList = cachedMarkers.map(function (marker) {
      return {
        profile: marker.name,
        dialogue: marker.notes,
      };
    });

    var text = textEditComponent.plainText;
    var lines = text.split(/\r?\n/);

    // Run LCS Diff
    var diffs = ScriptPopulation.diffScriptAgainstExpected(lines, existingDialogueList);

    var cursor = textEditComponent.textCursor();
    var savedPos = cursor.position();

    var validFormat = new QTextCharFormat();
    validFormat.setBackground(new QColor('yellow'));
    validFormat.setForeground(new QColor('black'));

    var redErrorFormat = new QTextCharFormat();
    redErrorFormat.setBackground(new QColor('#8b0000'));
    redErrorFormat.setForeground(new QColor('#ffffff'));

    var clearFormat = new QTextCharFormat();
    clearFormat.setBackground(new QColor('transparent'));
    clearFormat.setForeground(new QColor('#ffffff'));

    var doc = textEditComponent.document;
    for (var k = 0; k < diffs.length; k++) {
      var item = diffs[k];
      var block = doc.findBlockByNumber(item.lineIndex);

      if (block.isValid()) {
        var blockStart = block.position();
        var prefixLength = item.lineText.indexOf('::');

        cursor.setPosition(blockStart);
        cursor.setPosition(blockStart + block.length() - 1, QTextCursor.KeepAnchor);

        if (item.isDialogue && prefixLength !== -1) {
          cursor.mergeCharFormat(clearFormat);
          cursor.setPosition(blockStart);
          cursor.setPosition(blockStart + prefixLength, QTextCursor.KeepAnchor);
          cursor.mergeCharFormat(item.status === 'unexpected' ? redErrorFormat : validFormat);
        } else {
          cursor.mergeCharFormat(clearFormat);
        }
      }
    }

    // Restore cursor position
    cursor.clearSelection();
    cursor.setPosition(savedPos);
    textEditComponent.setTextCursor(cursor);

    textEditComponent.blockSignals(false);
  }

  // ==========================================
  // 2. OPTIMIZED CURSOR / PANEL HOVER
  // ==========================================
  var activeMatchedMarker: any = null;
  var cachedFontMetrics = new QFontMetrics(textEditComponent.font);

  var floatingPanel = new QWidget(textEditComponent);
  var panelLayout = new QHBoxLayout(floatingPanel);
  panelLayout.setContentsMargins(0, 0, 0, 0);
  panelLayout.setSpacing(4);
  floatingPanel.hide();

  function createPanelButton(text: string, onClick: () => void): QPushButton {
    var btn = new QPushButton(floatingPanel);
    btn.text = text;
    btn.setFixedSize(20, 20);
    btn.setStyleSheet(
      'background-color: #007acc; color: white; border: none; border-radius: 3px; font-size: 10pt; padding: 0px;',
    );
    btn.clicked.connect(onClick);
    panelLayout.addWidget(btn, 0, 0);
    return btn;
  }

  createPanelButton('▶', function () {
    if (activeMatchedMarker && activeMatchedMarker.frame !== undefined) {
      frame.setCurrent(activeMatchedMarker.frame);
    }
  });
  createPanelButton('★', function () {
    MessageLog.trace('Button 2');
  });
  createPanelButton('⚙', function () {
    MessageLog.trace('Button 3');
  });

  // Set fixed size ONCE during setup to avoid adjustSize() layout thrashing on cursor move
  floatingPanel.setFixedSize(68, 20);

  function togglePanel(visible: boolean, x?: number, y?: number) {
    if (visible && x !== undefined && y !== undefined) {
      floatingPanel.move(x, y);
      floatingPanel.show();
      floatingPanel.raise();
    } else {
      floatingPanel.hide();
    }
  }

  // ==========================================
  // 3. INSERT TOOLBAR FOR UNMATCHED (RED) DIALOGUE
  // ==========================================
  var activeRedDialogue: dialogueLine | null = null;
  var activeRedDialogueLineIndex: number = -1;

  var insertPanel = new QWidget(textEditComponent);
  var insertPanelLayout = new QHBoxLayout(insertPanel);
  insertPanelLayout.setContentsMargins(0, 0, 0, 0);
  insertPanelLayout.setSpacing(4);
  insertPanel.hide();

  var insertButton = new QPushButton(insertPanel);
  insertButton.text = 'Insert';
  insertButton.setFixedSize(56, 20);
  insertButton.setStyleSheet(
    'background-color: #8b0000; color: white; border: none; border-radius: 3px; font-size: 10pt; padding: 0px;',
  );
  insertPanelLayout.addWidget(insertButton, 0, 0);
  insertPanel.setFixedSize(56, 20);

  function toggleInsertPanel(visible: boolean, x?: number, y?: number) {
    if (visible && x !== undefined && y !== undefined) {
      insertPanel.move(x, y);
      insertPanel.show();
      insertPanel.raise();
    } else {
      insertPanel.hide();
    }
  }

  // Finds the frame of the marker for the closest dialogue line that appears
  // before the given script line. Returns null when none is found.
  function findPreviousDialogueMarkerFrame(lineIndex: number): number | null {
    const text = textEditComponent.plainText;
    const lines = text.split(/\r?\n/);

    for (var i = lineIndex - 1; i >= 0; i--) {
      const parsed = ScriptPopulation.parseDialog(lines[i]);
      if (!parsed) continue;

      for (var j = cachedMarkers.length - 1; j >= 0; j--) {
        const marker = cachedMarkers[j];
        if (
          ScriptPopulation.isDialogueEqual(parsed, {
            profile: marker.name,
            dialogue: marker.notes || '',
          })
        ) {
          return marker.frame;
        }
      }
    }
    return null;
  }

  // Adds an exposure right after the previous dialogue marker, then creates a
  // marker for the red (unmatched) dialogue in the freed slot.
  function insertDialogueMarker() {
    if (!activeRedDialogue) return;
    try {
      const prevMarkerFrame = findPreviousDialogueMarkerFrame(activeRedDialogueLineIndex);
      const insertionFrame = prevMarkerFrame !== null ? prevMarkerFrame + 1 : frame.current();

      MessageLog.trace(
        `[ScriptPopulation.ts] active red dialogue ${JSON.stringify(activeRedDialogue, null, 2)} at line ${activeRedDialogueLineIndex}`,
      );
      ScriptPopulation.addExposure(insertionFrame, 1);
      TimelineMarker.createMarker({
        frame: insertionFrame,
        color: '#ffffff',
        name: activeRedDialogue.profile,
        notes: activeRedDialogue.dialogue,
        length: 0,
      });

      refreshMarkerCache();
      applyScriptHighlights();
      refresh();
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error inserting dialogue marker: ${e.message}`);
    }
  }

  insertButton.clicked.connect(insertDialogueMarker);

  function checkCursorInHighlight() {
    var cursor = textEditComponent.textCursor();
    var charIndex = cursor.position();
    var currentBlock = cursor.block();
    var lineText = currentBlock.text();
    var prefixLength = lineText.indexOf('::');

    var isInHighlight = false;
    var isInRed = false;
    activeMatchedMarker = null;
    activeRedDialogue = null;
    activeRedDialogueLineIndex = -1;

    if (prefixLength !== -1) {
      var blockStart = currentBlock.position();
      var prefixEnd = blockStart + prefixLength;

      if (charIndex >= blockStart && charIndex <= prefixEnd) {
        var parsedLine = ScriptPopulation.parseDialog(lineText);

        if (parsedLine) {
          // Read from cachedMarkers array, NEVER call G.TimelineKit here!
          var match = cachedMarkers.find(function (m) {
            if (!m.name || m.name.trim() !== parsedLine.profile.trim()) {
              return false;
            }
            return (
              (m.notes || '').trim().replace(/\s+/g, ' ') ===
              parsedLine.dialogue.trim().replace(/\s+/g, ' ')
            );
          });

          var cursorRect = textEditComponent.cursorRect(cursor);
          var textAscent = cachedFontMetrics.ascent();
          var textVisualCenterY = cursorRect.top() + Math.floor(textAscent / 2);
          var panelY = textVisualCenterY - 10;

          if (match) {
            isInHighlight = true;
            activeMatchedMarker = match;

            var panelX = cursorRect.left() - 75; // Account for full panel width (68px + margin)
            if (panelX < 2) panelX = 2;

            togglePanel(true, panelX, panelY);
          } else {
            // Red text: no matching marker found. Show the insert toolbar.
            isInRed = true;
            activeRedDialogue = parsedLine;
            activeRedDialogueLineIndex = currentBlock.blockNumber();

            var insertPanelX = cursorRect.left() - 60; // Account for insert panel width (56px + margin)
            if (insertPanelX < 2) insertPanelX = 2;

            toggleInsertPanel(true, insertPanelX, panelY);
          }
        }
      }
    }

    if (!isInHighlight) {
      togglePanel(false);
    }
    if (!isInRed) {
      toggleInsertPanel(false);
    }
  }

  textEditComponent.cursorPositionChanged.connect(checkCursorInHighlight);

  // Initial Pass
  refreshMarkerCache();
  applyScriptHighlights();
  tabs.addTab(ScriptTab, 'Script');

  // ---------------------

  // Toggle for "closest left" mode: when enabled, the listener edits/reads the
  // marker nearest to the left of the playhead instead of requiring an exact
  // marker at the current frame.
  const closestLeftCheckbox = new QCheckBox('Closest Left');
  closestLeftCheckbox.objectName = 'closestLeftCheckbox';
  closestLeftCheckbox.styleSheet = 'color: #e0e0e0; font-size: 11pt;';

  const listenerTab = WidgetKit.createComponent({
    type: QWidget,
    props: {
      styleSheet: 'background-color: #2d2d2d;',
    },
    layout: QVBoxLayout,
    layoutProps: {
      contentsMargins: [15, 20, 15, 20],
      spacing: 6,
    },
    children: [
      newRow({
        component: {
          objectName: 'nameRow',
          type: QLineEdit,
          props: {
            objectName: 'nameLabel',
            text: '',
            wordWrap: true,
            textFormat: Qt.PlainText,
            styleSheet:
              'font-size: 14pt; color: #e0e0e0; background-color: #1e2a38; border: 1px solid #4a6b8a; border-radius: 8px; padding: 4px;',
            maximumHeight: 40,
          },
        },
      }),
      newRow({
        objectName: 'notesRow',
        stretch: 1,
        component: {
          type: QTextEdit,
          props: {
            objectName: 'notesRowLabel',
            plainText: 'Notes',
            lineWrapMode: QTextEdit.WidgetWidth,
            alignment: Qt.AlignmentFlag.AlignLeft,
            styleSheet:
              'font-size: 18pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 8px; padding: 8px; margin: 0px;',
          },
        },
      }),
      {
        type: QWidget,
        props: {
          objectName: 'buttonRow',
          styleSheet: 'background-color: transparent; border: none;',
        },
        layout: QHBoxLayout,
        layoutProps: {
          contentsMargins: [0, 0, 0, 0],
          spacing: 8,
        },
        children: [
          closestLeftCheckbox,
          WidgetKit.button({ text: 'Reset', objectName: 'resetButton' }),
          WidgetKit.button({
            text: 'Apply',
            objectName: 'applyButton',
            bgColor: '#2e7d32',
            borderColor: '#4caf50',
          }),
        ],
      },
    ],
  }) as QWidget;
  tabs.addTab(listenerTab, 'Listener');

  const nameLabel = WidgetKit.findWidgetByName(listenerTab, 'nameLabel') as QLineEdit;
  const notesLabel = WidgetKit.findWidgetByName(listenerTab, 'notesRowLabel') as QTextEdit;
  const applyButton = WidgetKit.findWidgetByName(listenerTab, 'applyButton') as QPushButton;
  const resetButton = WidgetKit.findWidgetByName(listenerTab, 'resetButton') as QPushButton;

  function getCurrentMarker() {
    return G.TimelineKit.getTimelineMarkersPresentAtFrame(frame.current())[0];
  }

  var closestLeftMode = false;

  // Applies faded styling to the listener fields when showing a closest-left
  // (non-exact) marker.
  function applyListenerFaded(faded: boolean) {
    const nameNormal =
      'font-size: 14pt; color: #e0e0e0; background-color: #1e2a38; border: 1px solid #4a6b8a; border-radius: 8px; padding: 4px;';
    const nameFaded =
      'font-size: 14pt; color: #7a8a9a; background-color: #1a222c; border: 1px solid #3a4a5a; border-radius: 8px; padding: 4px;';
    const notesNormal =
      'font-size: 18pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 8px; padding: 8px; margin: 0px;';
    const notesFaded =
      'font-size: 18pt; color: #9a9a9a; background-color: #181818; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px; margin: 0px;';

    nameLabel.styleSheet = faded ? nameFaded : nameNormal;
    notesLabel.styleSheet = faded ? notesFaded : notesNormal;
  }

  closestLeftCheckbox.toggled.connect(function (checked: boolean) {
    closestLeftMode = checked;
    updateListenerFields();
  });

  function applyToMarker() {
    const markerName = nameLabel.text;
    const markerNotes = notesLabel.plainText;
    const currentFrame = frame.current();

    scene.beginUndoRedoAccum('Apply marker settings');
    let applied = false;
    try {
      const marker = closestLeftMode
        ? ScriptPopulation.getClosestLeftMarker(currentFrame)
        : getCurrentMarker();

      if (marker) {
        marker.name = markerName;
        marker.notes = markerNotes;
        TimelineMarker.setMarker(marker);
        applied = true;
      } else if (!closestLeftMode) {
        G.TimelineKit.createMarker(currentFrame, markerName, '#ffffff', markerNotes, 0);
        applied = true;
      }
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error applying marker: ${e.message}`);
    }
    try {
      this.G.Widgets.showToast(
        applied ? `Applied ${markerName}: ${markerNotes}` : 'No marker to edit',
        1500,
        dialog,
      );
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error showing toast: ${e.message}`);
    }
    scene.endUndoRedoAccum();
  }

  // Reset the fields back to the active (or closest-left) marker's values.
  function resetFields() {
    updateListenerFields();
  }

  resetButton.clicked.connect(resetFields);
  applyButton.clicked.connect(G.Utils.bind(applyToMarker, this));

  // Updates the listener tab fields; shared by the frame listener below.
  function updateListenerFields() {
    try {
      const currentFrame = frame.current();
      const currentMarker = getCurrentMarker();

      if (currentMarker) {
        applyListenerFaded(false);
        nameLabel.text = currentMarker.name;
        notesLabel.plainText = currentMarker.notes;
        return;
      }

      if (closestLeftMode) {
        const closest = ScriptPopulation.getClosestLeftMarker(currentFrame);
        if (closest) {
          applyListenerFaded(true);
          nameLabel.text = closest.name;
          notesLabel.plainText = closest.notes;
          return;
        }
      }

      applyListenerFaded(false);
      nameLabel.text = '';
      notesLabel.plainText = '';
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] ${frame.current()} | Error retrieving marker information. ${error.message}`,
      );
    }
  }

  // Initial sync of the listener fields.
  updateListenerFields();

  // FAST: Updates only row background colors without rebuilding rows
  function highlightCurrentFrame() {
    try {
      if (selfUpdating) return;

      const currentFrame = frame.current();
      const activeRowBrush = new QBrush(new QColor('#3a3a3a'));
      const closestLeftBrush = new QBrush(new QColor('#2e3b4e'));
      const defaultRowBrush = new QBrush(new QColor('#1f1f1f'));

      const markers = TimelineMarker.getAllMarkers();
      if (markers.length !== table.rowCount) return;

      // Highlight the closest-left marker's row (in a different color) when the
      // playhead is no longer exactly on a marker.
      const closestLeft = ScriptPopulation.getClosestLeftMarker(currentFrame, markers);
      const closestLeftFrame =
        closestLeft && closestLeft.frame !== currentFrame ? closestLeft.frame : -1;

      table.updatesEnabled = false;
      for (var i = 0; i < markers.length; i++) {
        const isActiveFrame = markers[i].frame === currentFrame;
        const isClosestLeft = markers[i].frame === closestLeftFrame;
        const brush = isActiveFrame
          ? activeRowBrush
          : isClosestLeft
            ? closestLeftBrush
            : defaultRowBrush;

        const nameItem = table.item(i, 1);
        const notesItem = table.item(i, 2);

        if (nameItem) nameItem.setBackground(brush);
        if (notesItem) notesItem.setBackground(brush);
      }
      table.updatesEnabled = true;
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error highlighting current frame: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
  }

  table.contextMenuPolicy = Qt.CustomContextMenu;

  // 2. Connect to the customContextMenuRequested signal
  table.customContextMenuRequested.connect(function (pos: QPoint) {
    const G = this.G as HarmonyGlobals;
    // Map coordinates to find which row was right-clicked
    const item = table.itemAt(pos);
    if (!item) return; // Right-clicked on empty table area

    const row = item.row();
    const markers = TimelineMarker.getAllMarkers();
    const marker = markers[row];
    if (!marker) return;

    // Create the QMenu container
    const menu = new QMenu(dialog);

    // Define Menu Actions
    const jumpAction = menu.addAction('Jump to Marker Frame');
    const deleteAction = menu.addAction('Delete Marker');

    // Map global position for spawning the menu
    const globalPos = table.viewport().mapToGlobal(pos);
    const selectedAction = menu.exec(globalPos);

    // Handle selected menu action
    if (selectedAction === jumpAction) {
      if (marker.frame !== undefined) {
        G.TimelineKit.setCurrentFrame(marker.frame);
      }
    } else if (selectedAction === deleteAction) {
      const selectedRows = getSelectedRowIndices();
      const markers = TimelineMarker.getAllMarkers();

      scene.beginUndoRedoAccum('Delete Selected Markers');
      for (var i = 0; i < selectedRows.length; i++) {
        try {
          const r = selectedRows[i];
          if (markers[r]) {
            TimelineMarker.deleteMarker(markers[r]);
          }
        } catch (error) {
          MessageLog.trace(
            `[ScriptPopulation.ts] Error deleting marker at row ${selectedRows[i]}: ${error.message}`,
          );
        }
      }
      scene.endUndoRedoAccum();
      refresh();
    }
  });

  // SLOW: Rebuilds structural elements (only called when scene markers actually change)
  function refresh() {
    if (selfUpdating) return;

    table.updatesEnabled = false;
    table.rowCount = 0;

    const currentFrame = frame.current();
    const activeRowColor = new QColor('#3a3a3a');
    const activeRowBrush = new QBrush(activeRowColor);

    const markers = TimelineMarker.getAllMarkers();
    table.rowCount = markers.length;

    for (var i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const isActiveFrame = marker.frame === currentFrame;

      // Swatch / Color Column (Read-Only)
      const colorItem = new QTableWidgetItem();
      colorItem.setBackground(new QBrush(new QColor(colorToHex(marker.color))));
      colorItem.setFlags(colorItem.flags() & ~Qt.ItemIsEditable);
      table.setItem(i, 0, colorItem);

      // Name Column (Editable)
      const nameItem = new QTableWidgetItem(marker.name || '');
      if (isActiveFrame) nameItem.setBackground(activeRowBrush);
      table.setItem(i, 1, nameItem);

      // Notes Column (Editable)
      const notesItem = new QTableWidgetItem(marker.notes || '');
      if (isActiveFrame) notesItem.setBackground(activeRowBrush);
      table.setItem(i, 2, notesItem);
    }
    table.updatesEnabled = true;
    applyFilters();
    highlightCurrentFrame();
  }

  table.cellDoubleClicked.connect(
    G.Utils.bind(function (row: number, column: number) {
      const markers = TimelineMarker.getAllMarkers();
      const marker = markers[row];

      if (!marker) return;

      if (column === 0) {
        MessageLog.trace(`[ScriptPopulation.ts] ${'click'}`);
        if (marker.frame !== undefined) {
          this.G.TimelineKit.setCurrentFrame(marker.frame);
        }
      } else if (column === 1) {
        MessageLog.trace('Clicked marker name: ' + marker.name);
      }
    }, this),
  );

  refresh();

  // Single SceneChangeNotifier for the whole dialog, with a single frame-change
  // listener that updates both the table highlight and the listener tab fields.
  const notifier = new SceneChangeNotifier(dialog);

  // Rebuild rows only on structural changes (add, remove, edit markers)
  notifier.sceneMarkersChanged.connect(refresh);

  // Scrolls the script editor to the dialogue line matching the current marker,
  // if one exists.
  function scrollToCurrentMarkerDialogue() {
    try {
      const marker = getCurrentMarker();
      if (!marker || !marker.name) return;

      const text = textEditComponent.plainText;
      const lines = text.split(/\r?\n/);

      for (var i = 0; i < lines.length; i++) {
        const parsed = ScriptPopulation.parseDialog(lines[i]);
        if (!parsed) continue;

        if (
          ScriptPopulation.isDialogueEqual(parsed, {
            profile: marker.name,
            dialogue: marker.notes || '',
          })
        ) {
          const block = textEditComponent.document.findBlockByNumber(i);
          if (block.isValid()) {
            const cursor = textEditComponent.textCursor();
            cursor.setPosition(block.position());
            textEditComponent.setTextCursor(cursor);
            textEditComponent.ensureCursorVisible();
          }
          return;
        }
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error scrolling to marker dialogue: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
  }

  // The one and only frame-change listener.
  function onFrameChanged() {
    highlightCurrentFrame();
    updateListenerFields();
    scrollToCurrentMarkerDialogue();
  }
  notifier.currentFrameChanged.connect(onFrameChanged);

  // Selection changes refresh the listener fields too (not a frame listener).
  notifier.selectionChanged.connect(updateListenerFields);

  dialog.closeEvent = function (event: any) {
    notifier.sceneMarkersChanged.disconnect(refresh);
    notifier.currentFrameChanged.disconnect(onFrameChanged);
    notifier.selectionChanged.disconnect(updateListenerFields);
    event.accept();
  };

  dialog.show();
}
function deleteMarkers() {
  const sel = new G.oSelection();

  scene.beginUndoRedoAccum('delete markers');
  for (var i = sel.startFrame; i < sel.startFrame + sel.endFrame; i++) {
    const marker = G.TimelineKit.getTimelineMarkersPresentAtFrame(i)[0];
    if (marker) {
      TimelineMarker.deleteMarker(marker);
    }
  }
  scene.endUndoRedoAccum();
}
