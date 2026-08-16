include('globals.js');

interface dialogLine {
  profile: string;
  dialogue: string;
}

// Type union for parsed items
type ParsedItem = dialogLine | string;

function parseDialog(line: string): dialogLine | null {
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

/**
 * Groups raw lines into a structured array of:
 * - `dialogLine` objects
 * - `string[]` arrays representing contiguous blocks of non-dialogue text/notes
 */
interface ParsedScriptResult {
  grouped: Array<dialogLine | string[]>;
  dialogueOnly: dialogLine[];
  nonDialogueOnly: string[][];
}

function groupScriptLines(lines: string[]): ParsedScriptResult {
  const grouped: Array<dialogLine | string[]> = [];
  const dialogueOnly: dialogLine[] = [];
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

// const profiles = {
//   "Sans":
// }

const drawingTypesFile =
  'C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Advanced\\full-2500-pref\\drawingTypes.d\\drawingTypes.xml';

function readDrawingTypes(): DrawingType[] | undefined {
  var xmlText = G.FileUtils.readFrom(drawingTypesFile);

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

function readXMLTest() {
  const items = readDrawingTypes();
  MessageLog.trace(`[ScriptPopulation.ts] ${JSON.stringify(items, null, 2)}`);
}

function populateScript() {
  const rawText = G.FileUtils.readFrom('D:\\YT projects\\Coding\\ToonBoom\\Test\\script_test.txt');

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

function testAddExposure() {
  var marker = TimelineMarker.getAllMarkers()[0];

  scene.beginUndoRedoAccum('add exposure');

  const sel = new G.oSelection();
  G.TimelineKit.rippleShiftMarkers(frame.current(), 1, 'add');
  Action.perform('selectAll()', 'timelineView');
  2;
  Action.perform('onActionAddExposure()', 'timelineView');
  frame.setCurrent(sel.startFrame + 1);

  const drawingLayer = G.LayerManager.getNodeLayer('Top/Drawing') as oDrawingNode;
  const id = drawingLayer.createDrawing('TestDrawing');
  drawingLayer.drawingElement.setKeyFrame(sel.startFrame + 1, id);

  scene.endUndoRedoAccum();
}
include(specialFolders.userScripts + '/core/UI/widgets.js');

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

  function button(settings: {
    text: string;
    objectName: string;
    bgColor?: string;
    borderColor?: string;
  }) {
    return {
      type: QPushButton,
      props: {
        objectName: settings.objectName,
        text: settings.text,
        styleSheet: `QPushButton { font-size: 14pt; color: #ffffff; background-color: ${settings.bgColor || '#555555'}; border: 1px solid ${settings.borderColor || '#777777'}; border-radius: 8px; padding: 6px; }`,
      },
    };
  }

  // Build the dialog with the createComponent helper
  const dialogDef = {
    type: QDialog,
    props: {
      windowTitle: 'Frame Listener',
      minimumWidth: 340,
      minimumHeight: 200,
      modal: false,
      styleSheet:
        'QDialog { background-color: #2d2d2d; border: 1px solid #555; border-radius: 6px; }',
    },
    layout: QVBoxLayout,
    layoutProps: {
      contentsMargins: [15, 20, 15, 20],
      spacing: 6,
    },
    children: [
      newRow({
        objectName: 'nameRow',
        component: {
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
      // {
      //   objectName: 'indexLabelRow',
      //   type: QHBoxLayout,
      //   layoutProps: {
      //     contentsMargins: [0, 0, 0, 0],
      //   }
      //   children: []
      // }
      // {
      //   type: QLabel,
      //   props: {
      //     objectName: 'indexLabel',
      //     text: 'test',
      //     wordWrap: true,
      //     maximumHeight: 40,
      //     textFormat: Qt.PlainText,
      //     styleSheet:
      //       'font-size: 14pt; color: #ffffff; background-color: #2a1e1e; border: 1px solid #6b4a4a; border-radius: 8px; padding: 4px;',
      //   },
      // },
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
          button({ text: 'Reset', objectName: 'resetButton' }),
          button({
            text: 'Apply',
            objectName: 'applyButton',
            bgColor: '#2e7d32',
            borderColor: '#4caf50',
          }),
        ],
      },
    ],
  };

  const dialog = Widgets.createComponent(dialogDef, null) as QDialog;
  MessageLog.trace(`[ScriptPopulation.ts] ${QDialog.length}`);

  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);

  // Capture the Toon Boom main window before the dialog opens so the toast
  // anchors to it instead of the dialog.
  const mainWindow = QApplication.activeWindow();

  const nameLabel = Widgets.findWidgetByName(dialog, 'nameLabel') as QLabel;
  const notesLabel = Widgets.findWidgetByName(dialog, 'notesRowLabel') as QTextEdit;
  const applyButton = Widgets.findWidgetByName(dialog, 'applyButton') as QPushButton;
  const resetButton = Widgets.findWidgetByName(dialog, 'resetButton') as QPushButton;
  const indexLabel = Widgets.findWidgetByName(dialog, 'indexLabel') as QLabel;

  function getCurrentMarker() {
    return G.TimelineKit.getTimelineMarkersPresentAtFrame(frame.current())[0];
  }

  function applyToMarker() {
    const markerName = nameLabel.text;
    const markerNotes = notesLabel.plainText;
    const currentFrame = frame.current();

    scene.beginUndoRedoAccum('Apply marker settings');
    try {
      const marker = getCurrentMarker();
      if (marker) {
        marker.name = markerName;
        marker.notes = markerNotes;
        TimelineMarker.setMarker(marker);
      } else {
        G.TimelineKit.createMarker(currentFrame, markerName, '#ffffff', markerNotes, 0);
      }
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error applying marker: ${e.message}`);
    }
    try {
      this.G.Widgets.showToast(`Applied ${markerName}: ${markerNotes}`, 1500, mainWindow);
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error showing toast: ${e.message}`);
    }
    scene.endUndoRedoAccum();
  }

  // Reset both fields back to the current marker's values.
  function resetFields() {
    const marker = getCurrentMarker();
    nameLabel.text = marker ? marker.name : '';
    notesLabel.plainText = marker ? marker.notes : '';
  }

  resetButton.clicked.connect(resetFields);
  applyButton.clicked.connect(G.Utils.bind(applyToMarker, this));

  // Register frame-change listeners (Labeler.ts pattern)
  const frameNotifier = new (SceneChangeNotifier as any)(dialog);
  this.G = G;

  this.profiles = readDrawingTypes();

  const frameChangedHandler = G.Utils.bind(function () {
    MessageLog.trace(`[ScriptPopulation.ts] ${JSON.stringify(this.profiles, null, 2)}`);
    try {
      const marker = this.G.TimelineKit.getTimelineMarkersPresentAtFrame(frame.current())[0];
      if (marker) {
        nameLabel.text = marker.name;
        notesLabel.plainText = marker.notes;
      } else {
        nameLabel.text = '';
        notesLabel.plainText = '';
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] ${frame.current()} | Error retrieving marker information. ${error.message}`,
      );
    }
  }, this);

  frameNotifier.currentFrameChanged.connect(frameChangedHandler);
  frameNotifier.selectionChanged.connect(frameChangedHandler);

  // De-register listeners when the dialog closes (Labeler.ts pattern)
  dialog.closeEvent = function (event: any) {
    frameNotifier.currentFrameChanged.disconnect(frameChangedHandler);
    frameNotifier.selectionChanged.disconnect(frameChangedHandler);
    event.accept();
  };

  dialog.show();
}

function showMarkerList() {
  // Normalise a Harmony marker colour (#RRGGBB or #RRGGBBAA) to #RRGGBB.
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

  const dialog = new QDialog();
  dialog.windowTitle = 'Timeline Markers';
  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);
  dialog.resize(560, 340);
  dialog.styleSheet = 'QDialog { background-color: #2d2d2d; }';

  const layout = new QVBoxLayout(dialog);
  layout.setContentsMargins(12, 12, 12, 12);
  layout.spacing = 4;

  // Header row (Color | Name | Notes).
  const header = new QWidget();
  const headerLayout = new QHBoxLayout(header);
  headerLayout.setContentsMargins(0, 0, 0, 0);
  headerLayout.spacing = 6;

  const colorHeader = new QLabel('Color');
  colorHeader.minimumWidth = 56;
  colorHeader.maximumWidth = 56;
  colorHeader.styleSheet = 'color: #bbbbbb; font-weight: bold;';

  const nameHeader = new QLabel('Name');
  nameHeader.minimumWidth = 150;
  nameHeader.maximumWidth = 150;
  nameHeader.styleSheet = 'color: #bbbbbb; font-weight: bold;';

  const notesHeader = new QLabel('Notes');
  notesHeader.styleSheet = 'color: #bbbbbb; font-weight: bold;';

  headerLayout.addWidget(colorHeader, 0, Qt.AlignmentFlag.AlignLeft);
  headerLayout.addWidget(nameHeader, 0, Qt.AlignmentFlag.AlignLeft);
  headerLayout.addWidget(notesHeader, 1, Qt.AlignmentFlag.AlignLeft);
  layout.addWidget(header, 0, 0);

  // Container that holds one row per marker.
  const rowsContainer = new QWidget();
  const rowsLayout = new QVBoxLayout(rowsContainer);
  rowsLayout.setContentsMargins(0, 0, 0, 0);
  rowsLayout.spacing = 0;

  // Scroll area so long marker lists can be scrolled.
  const scroll = new QScrollArea();
  scroll.widgetResizable = true;
  scroll.setWidget(rowsContainer);
  scroll.styleSheet = 'QScrollArea { background-color: #1f1f1f; border: none; }';
  layout.addWidget(scroll, 1, 0);

  var rowWidgets: QWidget[] = [];
  var selfUpdating = false;

  function updateMarker(marker: oTimelineMarker) {
    selfUpdating = true;
    try {
      TimelineMarker.setMarker(marker);
    } catch (e) {
      MessageLog.trace('[ScriptPopulation.ts] Error updating marker: ' + e.message);
    }
    selfUpdating = false;
  }

  function addRow(marker: oTimelineMarker) {
    const row = new QWidget();
    const rowLayout = new QHBoxLayout(row);
    rowLayout.setContentsMargins(0, 0, 0, 0);
    rowLayout.spacing = 6;

    // Colour circle, pinned inside a fixed-width cell so the columns line up.
    const swatch = new QLabel();
    swatch.setFixedSize(18, 18);
    swatch.styleSheet =
      'background-color: ' +
      colorToHex(marker.color) +
      '; border-radius: 9px; border: 1px solid #888888;';

    const swatchCell = new QWidget();
    swatchCell.minimumWidth = 56;
    swatchCell.maximumWidth = 56;
    const swatchLayout = new QHBoxLayout(swatchCell);
    swatchLayout.setContentsMargins(0, 0, 0, 0);
    swatchLayout.addWidget(swatch, 0, Qt.AlignmentFlag.AlignLeft);

    // Name (single line).
    const nameEdit = new QLineEdit();
    nameEdit.text = marker.name || '';
    nameEdit.minimumWidth = 150;
    nameEdit.maximumWidth = 150;
    nameEdit.styleSheet =
      'font-size: 13pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 4px; padding: 2px 6px;';

    // Notes (single line).
    const notesEdit = new QLineEdit();
    notesEdit.text = marker.notes || '';
    notesEdit.styleSheet =
      'font-size: 13pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 4px; padding: 2px 6px;';

    // Commit edits back to the marker when the field is finished editing.
    nameEdit.editingFinished.connect(function () {
      marker.name = nameEdit.text;
      updateMarker(marker);
    });
    notesEdit.editingFinished.connect(function () {
      marker.notes = notesEdit.text;
      updateMarker(marker);
    });

    rowLayout.addWidget(swatchCell, 0, Qt.AlignmentFlag.AlignLeft);
    rowLayout.addWidget(nameEdit, 0, Qt.AlignmentFlag.AlignLeft);
    rowLayout.addWidget(notesEdit, 1, Qt.AlignmentFlag.AlignLeft);

    rowsLayout.addWidget(row, 0, 0);
    rowWidgets.push(row);
  }

  function refresh() {
    if (selfUpdating) return;

    // Remove the previous rows (hide + delete via the WA_DeleteOnClose path).
    for (var r = 0; r < rowWidgets.length; r++) {
      rowWidgets[r].setAttribute(Qt.WA_DeleteOnClose);
      rowWidgets[r].close();
    }
    rowWidgets = [];

    const markers = TimelineMarker.getAllMarkers();
    for (var i = 0; i < markers.length; i++) {
      addRow(markers[i]);
    }
  }

  refresh();

  // Re-populate whenever timeline scene markers are added/deleted/changed.
  const notifier = new SceneChangeNotifier(dialog);
  notifier.sceneMarkersChanged.connect(refresh);

  dialog.closeEvent = function (event: any) {
    notifier.sceneMarkersChanged.disconnect(refresh);
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
