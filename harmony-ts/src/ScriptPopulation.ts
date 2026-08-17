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
  };

  const dialog = WidgetKit.createComponent(dialogDef, null) as QDialog;
  MessageLog.trace(`[ScriptPopulation.ts] ${QDialog.length}`);

  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);

  // Capture the Toon Boom main window before the dialog opens so the toast
  // anchors to it instead of the dialog.
  const mainWindow = QApplication.activeWindow();

  const nameLabel = WidgetKit.findWidgetByName(dialog, 'nameLabel') as QLabel;
  const notesLabel = WidgetKit.findWidgetByName(dialog, 'notesRowLabel') as QTextEdit;
  const applyButton = WidgetKit.findWidgetByName(dialog, 'applyButton') as QPushButton;
  const resetButton = WidgetKit.findWidgetByName(dialog, 'resetButton') as QPushButton;
  const indexLabel = WidgetKit.findWidgetByName(dialog, 'indexLabel') as QLabel;

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

  dialog.styleSheet = `
    QDialog { background-color: #2d2d2d; }
    QTableWidget {
      background-color: #1f1f1f;
      gridline-color: #2d2d2d;
      color: #ffffff;
      border: none;
      font-size: 11pt;
    }
    QHeaderView::section {
      background-color: #2d2d2d;
      color: #bbbbbb;
      font-weight: bold;
      border: none;
      padding: 4px;
    }
    QTableWidget::item {
      padding: 2px 4px;
    }
  `;

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
  layout.setContentsMargins(12, 12, 12, 12);
  layout.spacing = 8;

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
  layout.addWidget(table, 1, 0);

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

  const deleteMarkersOfSelection = G.Utils.bind(function () {
    const sel = new this.G.oSelection();
    scene.beginUndoRedoAccum('delete markers');
    for (var i = sel.startFrame; i < sel.endFrame + 1; i++) {
      const marker = this.G.TimelineKit.getTimelineMarkersPresentAtFrame(i)[0];
      if (marker) TimelineMarker.deleteMarker(marker);
    }
    scene.endUndoRedoAccum();
  }, this);

  const deleteAllMarkers = G.Utils.bind(function () {
    scene.beginUndoRedoAccum('delete all markers');
    const allMarkers = this.G.TimelineKit.getAllMarkers();
    for (var i = 0; i < allMarkers.length; i++) {
      TimelineMarker.deleteMarker(allMarkers[i]);
    }
    scene.endUndoRedoAccum();
  }, this);

  const importScript = G.Utils.bind(function () {
    scene.beginUndoRedoAccum('import script');
    MessageLog.trace(`[ScriptPopulation.ts] ${'import script'}`);
    scene.endUndoRedoAccum();
  }, this);

  try {
    const operationsBar = WidgetKit.createComponent({
      type: QWidget,
      layout: QHBoxLayout,
      layoutProps: { contentsMargins: [0, 0, 0, 0], spacing: 8 },
      children: [
        WidgetKit.button({
          text: 'Delete Markers in Selection',
          objectName: 'deleteButton',
          onClick: deleteMarkersOfSelection,
        }).create(),
        WidgetKit.button({
          text: 'Delete All Markers',
          objectName: 'deleteButton',
          onClick: deleteAllMarkers,
        }).create(),
        WidgetKit.button({
          text: 'Import Script',
          objectName: 'importButton',
          onClick: importScript,
        }).create(),
      ],
    });
    layout.addWidget(operationsBar, 0, Qt.AlignmentFlag.AlignRight);
  } catch (error) {
    MessageLog.trace(
      `[ScriptPopulation.ts] ${error.message} ${error.fileName} ${error.lineNumber}`,
    );
  }

  // FAST: Updates only row background colors without rebuilding rows
  function highlightCurrentFrame() {
    try {
      if (selfUpdating) return;

      const currentFrame = frame.current();
      const activeRowBrush = new QBrush(new QColor('#3a3a3a'));
      const defaultRowBrush = new QBrush(new QColor('#1f1f1f'));

      const markers = TimelineMarker.getAllMarkers();
      if (markers.length !== table.rowCount) return;

      table.updatesEnabled = false;
      for (var i = 0; i < markers.length; i++) {
        const isActiveFrame = markers[i].frame === currentFrame;
        const brush = isActiveFrame ? activeRowBrush : defaultRowBrush;

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

  const notifier = new SceneChangeNotifier(dialog);

  // Rebuild rows only on structural changes (add, remove, edit markers)
  notifier.sceneMarkersChanged.connect(refresh);

  // Fast path: Only repaint background colors when scrubbing frames
  notifier.currentFrameChanged.connect(highlightCurrentFrame);

  dialog.closeEvent = function (event: any) {
    notifier.sceneMarkersChanged.disconnect(refresh);
    notifier.currentFrameChanged.disconnect(highlightCurrentFrame);
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
