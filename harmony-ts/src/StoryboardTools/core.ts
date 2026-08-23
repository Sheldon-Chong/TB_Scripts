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
MessageLog.trace(`[core.ts] ${'ttesdadasd'}`);

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

  export function resolveProfileColor(profileName: string): string | null {
    const profiles = readDrawingTypes();
    const profile = profiles?.find((p) => p.text === profileName);
    return profile ? profile.timelineColor.slice(0, 7) : null;
  }

  MessageLog.trace(`[ScriptPopulation.ts] DRAWING TYPES FILE:  ${drawingTypesFile}`);

  var xmlText = G.FileUtils.readFrom(drawingTypesFile);

  export function addDialogueMarker(dialogue: dialogueLine, frameNumber: number) {
    const color = resolveProfileColor(dialogue.profile) || '#ffffff';
    G.TimelineKit.createMarker(frameNumber, dialogue.profile, color, dialogue.dialogue, 0);
  }

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

    frame.setCurrent(sel.startFrame);

    MessageLog.trace(
      `[ScriptPopulation.ts] removeExposure frame=${targetFrame} current=${frame.current()} count=${numberOfFrames}`,
    );
    MessageLog.trace(`[ScriptPopulation.ts] ${'test'}`);

    var removeTimer = new QTimer();
    removeTimer.singleShot = true;
    removeTimer.timeout.connect(function () {
      MessageLog.trace(`[ScriptPopulation.ts] ${'test'}`);
      scene.beginUndoRedoAccum('remove exposure');

      G.TimelineKit.rippleShiftMarkers(targetFrame, numberOfFrames, 'delete');

      Action.perform('selectAll()', 'timelineView');
      for (var f = targetFrame; f < targetFrame + numberOfFrames; f++) {
        Action.perform('onActionRemoveExposure()', 'timelineView');
        MessageLog.trace(`[ScriptPopulation.ts] ${f}`);
      }

      scene.endUndoRedoAccum();
    });
    removeTimer.start(150);
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
