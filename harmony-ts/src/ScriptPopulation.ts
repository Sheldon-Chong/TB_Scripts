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

function runListener() {
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
      contentsMargins: [24, 20, 24, 20],
      spacing: 6,
    },
    children: [
      {
        type: QLabel,
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
      {
        type: QWidget,
        props: {
          objectName: 'notesRow',
          styleSheet: 'background-color: transparent; border: none;',
        },
        layout: QHBoxLayout,
        layoutProps: {
          contentsMargins: [0, 0, 0, 0],
        },
        stretch: 1,
        children: [
          {
            type: QLineEdit,
            props: {
              objectName: 'notesLabel',
              text: '',
              alignment: Qt.AlignmentFlag.AlignLeft,
              styleSheet:
                'font-size: 18pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 8px; padding: 8px; margin: 0px;',
            },
          },
          {
            type: QPushButton,
            props: {
              objectName: 'notesButton',
              text: '...',
              fixedWidth: 40,
              styleSheet:
                'QPushButton { font-size: 14pt; color: #ffffff; background-color: #3a3a3a; border: 1px solid #555; border-radius: 8px; padding: 4px; }',
            },
          },
        ],
      },
      {
        type: QLabel,
        props: {
          objectName: 'indexLabel',
          text: 'test',
          wordWrap: true,
          maximumHeight: 40,
          textFormat: Qt.PlainText,
          styleSheet:
            'font-size: 14pt; color: #ffffff; background-color: #2a1e1e; border: 1px solid #6b4a4a; border-radius: 8px; padding: 4px;',
        },
      },
    ],
  };

  const dialog = Widgets.createComponent(dialogDef, null) as QDialog;
  MessageLog.trace(`[ScriptPopulation.ts] ${QDialog.length}`);

  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);

  const nameLabel = Widgets.findWidgetByName(dialog, 'nameLabel') as QLabel;
  const notesRow = Widgets.findWidgetByName(dialog, 'notesRow') as QWidget;
  const notesLabel = Widgets.findWidgetByName(dialog, 'notesLabel') as QLineEdit;
  const notesButton = Widgets.findWidgetByName(dialog, 'notesButton') as QPushButton;
  const indexLabel = Widgets.findWidgetByName(dialog, 'indexLabel') as QLabel;

  // QSizePolicy::Policy values (Harmony doesn't expose the QSizePolicy enum).
  const SizePolicy = {
    Fixed: 0,
    Minimum: 1,
    Maximum: 4,
    MinimumExpanding: 3,
    Preferred: 5,
    Expanding: 7,
    Ignored: 13,
  };

  // Make the notes row (and its contents) fill the remaining vertical space.
  try {
    notesRow.setSizePolicy(SizePolicy.Preferred, SizePolicy.Expanding);
    notesLabel.setSizePolicy(SizePolicy.Expanding, SizePolicy.Expanding);
    notesButton.setSizePolicy(SizePolicy.Fixed, SizePolicy.Expanding);
  } catch (e) {
    MessageLog.trace('[ScriptPopulation.ts] setSizePolicy unavailable: ' + e.message);
  }
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
        notesLabel.text = marker.notes;
      } else {
        nameLabel.text = '';
        notesLabel.text = '';
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
