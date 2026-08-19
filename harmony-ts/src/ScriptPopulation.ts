include('globals.js');

interface dialogLine {
  profile: string;
  dialogue: string;
}

// Type union for parsed items
type ParsedItem = dialogLine | string;

interface ParsedScriptResult {
  grouped: Array<dialogLine | string[]>;
  dialogueOnly: dialogLine[];
  nonDialogueOnly: string[][];
}

namespace ScriptPopulation {
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

  export function addExposure() {
    var marker = TimelineMarker.getAllMarkers()[0];

    scene.beginUndoRedoAccum('add exposure');

    const sel = new G.oSelection();
    G.TimelineKit.rippleShiftMarkers(frame.current(), 1, 'add');
    Action.perform('selectAll()', 'timelineView');
    Action.perform('onActionAddExposure()', 'timelineView');
    frame.setCurrent(sel.startFrame + 1);

    scene.endUndoRedoAccum();
  }

  export function removeExposure() {
    var marker = TimelineMarker.getAllMarkers()[0];

    scene.beginUndoRedoAccum('remove exposure');

    const sel = new G.oSelection();
    G.TimelineKit.rippleShiftMarkers(frame.current(), 1, 'delete');
    Action.perform('selectAll()', 'timelineView');
    Action.perform('onActionRemoveExposure()', 'timelineView');

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

  const dialog = new QDialog();
  dialog.windowTitle = 'Timeline Markers';
  dialog.setWindowFlags(Qt.WindowStaysOnTopHint);
  dialog.resize(560, 340);

  dialog.styleSheet = `
    QDialog { background-color: #2d2d2d; }
    QTabWidget::pane {
      border: 1px solid #555555;
      border-radius: 4px;
    }
    QTabBar::tab {
      background-color: #2d2d2d;
      color: #bbbbbb;
      padding: 6px 16px;
      border: 1px solid #555555;
      border-bottom: none;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    QTabBar::tab:selected {
      background-color: #1f1f1f;
      color: #ffffff;
    }
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
    ScriptPopulation.populateScript(G.Utils.prompt('test'));
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

  try {
    // Build the "Options" menu button (the C++ QPushButton::setMenu pattern).
    // Harmony exposes menu support on QToolButton, so we use InstantPopup to
    // get the same "click the button to open a menu" behavior.
    const optionsButton = new QToolButton(dialog);
    optionsButton.text = '☰';
    optionsButton.objectName = 'optionsButton';
    optionsButton.styleSheet =
      'QToolButton { font-size: 12pt; color: #ffffff; background-color: #555555; border: 1px solid #777777; border-radius: 8px; padding: 6px; }';
    optionsButton.popupMode = QToolButton.InstantPopup;

    // Build the menu from a list of sections; each section is a list of
    // [label, callback] pairs and is separated by a menu separator.
    const optionsMenu = WidgetKit.optionsMenu(optionsButton, [
      [
        ['Delete Markers in Selection', deleteMarkersOfSelection],
        ['Delete All Markers', deleteAllMarkers],
      ],
      [
        ['Import Script', importScript],
        ['Compile Script', compileScript],
      ],
    ]);

    // Attach the menu to the button.
    optionsButton.setMenu(optionsMenu);

    // "Add exposure" and "Remove exposure" stay as standalone buttons.
    const operationsBar = WidgetKit.createComponent({
      type: QWidget,
      layout: QHBoxLayout,
      layoutProps: { contentsMargins: [0, 0, 0, 0], spacing: 8 },
      children: [
        optionsButton,
        WidgetKit.button({
          text: 'Add exposure',
          objectName: 'addExposureButton',
          onClick: ScriptPopulation.addExposure,
        }).create(),
        WidgetKit.button({
          text: 'Remove exposure',
          objectName: 'removeExposureButton',
          onClick: ScriptPopulation.removeExposure,
        }).create(),
      ],
    });
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
  }) as QWidget;
  tabs.addTab(listenerTab, 'Listener');

  const nameLabel = WidgetKit.findWidgetByName(listenerTab, 'nameLabel') as QLineEdit;
  const notesLabel = WidgetKit.findWidgetByName(listenerTab, 'notesRowLabel') as QTextEdit;
  const applyButton = WidgetKit.findWidgetByName(listenerTab, 'applyButton') as QPushButton;
  const resetButton = WidgetKit.findWidgetByName(listenerTab, 'resetButton') as QPushButton;

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
      this.G.Widgets.showToast(`Applied ${markerName}: ${markerNotes}`, 1500, dialog);
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

  // Updates the listener tab fields; shared by the single frame listener below.
  function updateListenerFields() {
    try {
      const marker = getCurrentMarker();
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
    applyFilters();
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

  // The one and only frame-change listener.
  function onFrameChanged() {
    highlightCurrentFrame();
    updateListenerFields();
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
