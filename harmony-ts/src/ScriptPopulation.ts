include('globals.js');
include(specialFolders.userScripts + '/StoryboardTools/core.js');

include(specialFolders.userScripts + '/core/UI/WidgetKit.js');

this.__proto__.StoryboardTools = StoryboardTools;

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
    MessageLog.trace(`[ScriptPopulation.ts] defined`);
  }
}

function runListener() {
  // Kept as a button entry point; the listener UI now lives in the "Listener"
  // tab of the Timeline Markers dialog (showMarkerList).
  showMarkerList();
}

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

class TimelineMarkersDialog {
  // --- Shared state (previously closure locals in showMarkerList) ---
  dialog: any;
  tabs: QTabWidget;
  table: QTableWidget;
  textEditComponent: QTextEdit;
  nameFilter: QLineEdit;
  notesFilter: QLineEdit;
  nameLabel: QLineEdit;
  notesLabel: QTextEdit;
  closestLeftCheckbox: QCheckBox;

  cachedMarkers: any[] = [];
  selfUpdating = false;
  closestLeftMode = false;
  notifier: SceneChangeNotifier;

  // Script tab state
  activeMatchedMarker: any = null;
  activeRedDialogue: dialogueLine | null = null;
  activeRedDialogueLineIndex = -1;
  cachedFontMetrics: QFontMetrics;
  floatingPanel: QWidget;
  insertPanel: QWidget;
  insertButton: QPushButton;

  // Table column indexes
  COL_NOTES = 2;
  COL_NAME = 1;
  COL_COLOR = 0;

  // Bound notifier handlers, kept so closeEvent can disconnect the same fn.
  boundRefresh: () => void;
  boundOnFrameChanged: () => void;
  boundUpdateListenerFields: () => void;

  constructor() {
    this.dialog = new G.Widgets.Dialog({ title: 'Timeline Markers' });

    const layout = new QVBoxLayout(this.dialog);
    layout.setContentsMargins(0, 0, 0, 0);
    layout.spacing = 0;

    this.tabs = new QTabWidget();
    layout.addWidget(this.tabs, 1, 0);
  }

  show() {
    this.buildMarkersTab();
    this.buildScriptTab();
    this.buildProfileEditorTab();
    this.buildListenerTab();
    this.refresh();
    this.wireNotifier();
    this.dialog.show();
  }

  colorToHex(color: any): string {
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

  getSelectedRowIndices(): number[] {
    const selectedItems = this.table.selectedItems();
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

  // getCurrentMarker(): oTimelineMarker | undefined {
  //   return G.TimelineKit.getTimelineMarkersPresentAtFrame(frame.current())[0];
  // }

  getCurrentMarker = G.Utils.bindAction(() => {
    MessageLog.trace(`[ScriptPopulation.ts] ${TimelineMarker}`);
    return G.TimelineKit.getTimelineMarkersPresentAtFrame(frame.current())[0];
  }, this);

  matchesFilter(value: string, query: string): boolean {
    if (!query) return true;
    return value.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  }

  refreshMarkerCache() {
    this.cachedMarkers = TimelineMarker.getAllMarkers();
  }

  updateMarker(marker: oTimelineMarker) {
    this.selfUpdating = true;
    try {
      scene.beginUndoRedoAccum('Update Marker');
      TimelineMarker.setMarker(marker);
      scene.endUndoRedoAccum();
    } catch (e) {
      MessageLog.trace('[ScriptPopulation.ts] Error updating marker: ' + e.message);
    }
    this.selfUpdating = false;
  }

  applyFilters() {
    const nameQuery = this.nameFilter.text;
    const notesQuery = this.notesFilter.text;
    const markers = TimelineMarker.getAllMarkers();

    this.table.updatesEnabled = false;
    for (var i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const nameMatch = this.matchesFilter(marker.name || '', nameQuery);
      const notesMatch = this.matchesFilter(marker.notes || '', notesQuery);
      this.table.setRowHidden(i, !(nameMatch && notesMatch));
    }
    this.table.updatesEnabled = true;
  }

  buildProfileEditorTab() {
    const drawingTypesFile = `${specialFolders.userConfig}/drawingTypes.d/drawingTypes.xml`;

    function normalizeColor(value: string): string {
      const trimmed = (value || '').trim();
      const withoutHash = trimmed[0] === '#' ? trimmed.slice(1) : trimmed;
      const clean = withoutHash.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
      return clean ? '#' + clean.toUpperCase() : '#FFFFFF';
    }

    function readDrawingTypes(): Array<{ profile: string; color: string }> {
      const xmlText = G.FileUtils.readFrom(drawingTypesFile);
      if (!xmlText) return [];

      const doc = G.Utils.readXmlFile(xmlText);
      if (doc.error) {
        MessageLog.trace('[ScriptPopulation.ts] ' + doc.error);
        return [];
      }

      const root = doc.children[0];
      const nodes = root ? root.children : [];
      const items: Array<{ profile: string; color: string }> = [];

      for (let i = 0; i < nodes.length; i++) {
        const attrs = nodes[i].attributes || {};
        const text = String(attrs.text || '').trim();
        const timelineColor = String(attrs.timelineColor || '#FFFFFF');
        const color = normalizeColor(timelineColor).replace(/^#/, '').slice(0, 6);

        if (text) {
          items.push({
            profile: text,
            color: '#' + color.toUpperCase(),
          });
        }
      }

      return items;
    }

    function createColorCell(initialColor: string) {
      const cellWidget = new QWidget();
      const layout = new QHBoxLayout(cellWidget);
      layout.setContentsMargins(2, 2, 2, 2);
      layout.spacing = 4;

      const colorButton = new QPushButton(cellWidget);
      colorButton.setFixedSize(24, 20);
      colorButton.setStyleSheet(
        'background-color: ' +
          normalizeColor(initialColor) +
          '; border: 1px solid #666; border-radius: 4px;',
      );

      const colorText = new QLineEdit(normalizeColor(initialColor), cellWidget);
      colorText.maximumWidth = 90;
      colorText.setStyleSheet(
        'background-color: #1f1f1f; color: white; border: 1px solid #4a4a4a; border-radius: 4px; padding: 2px;',
      );

      colorButton.clicked.connect(() => {
        const current = new QColor(normalizeColor(initialColor));
        const chosen = QColorDialog.getColor(current, cellWidget);

        if (!chosen.isValid()) return;

        const hex = '#' + chosen.name().slice(1, 7).toUpperCase();
        colorText.text = hex;
        colorButton.setStyleSheet(
          'background-color: ' +
            normalizeColor(hex) +
            '; border: 1px solid #666; border-radius: 4px;',
        );
      });

      colorText.textChanged.connect((value: string) => {
        const normalized = normalizeColor(value);
        colorButton.setStyleSheet(
          'background-color: ' + normalized + '; border: 1px solid #666; border-radius: 4px;',
        );
      });

      layout.addWidget(colorButton, 0, 0);
      layout.addWidget(colorText, 1, 0);

      return {
        widget: cellWidget,
        text: colorText,
      };
    }

    const profileTab = new QWidget();
    const layout = new QVBoxLayout(profileTab);
    layout.setContentsMargins(12, 12, 12, 12);
    layout.spacing = 8;

    const table = new QTableWidget();
    table.columnCount = 2;
    table.setHorizontalHeaderLabels(['Profile', 'Color']);
    table.selectionMode = QAbstractItemView.SingleSelection;
    table.selectionBehavior = QAbstractItemView.SelectRows;

    const rowEditors: Array<{ profile: QLineEdit; color: QLineEdit }> = [];

    const data = readDrawingTypes();
    for (let i = 0; i < data.length; i++) {
      const rowIndex = table.rowCount;
      table.insertRow(rowIndex);

      const profileField = new QLineEdit(data[i].profile);
      profileField.setStyleSheet(
        'background-color: #1f1f1f; color: white; border: 1px solid #4a4a4a; border-radius: 4px; padding: 4px;',
      );
      table.setCellWidget(rowIndex, 0, profileField);

      const colorCell = createColorCell(data[i].color);
      table.setCellWidget(rowIndex, 1, colorCell.widget);

      rowEditors.push({
        profile: profileField,
        color: colorCell.text,
      });
    }

    const saveButton = new QPushButton('Save');
    saveButton.setStyleSheet(
      'background-color: #2e7d32; color: white; border: none; border-radius: 6px; padding: 6px 12px;',
    );

    saveButton.clicked.connect(() => {
      try {
        const xmlRows = [];
        for (let i = 0; i < rowEditors.length; i++) {
          const profile = (rowEditors[i].profile.text || '').trim();
          const color = normalizeColor(rowEditors[i].color.text || '#FFFFFF')
            .replace(/^#/, '')
            .slice(0, 6);

          if (!profile) continue;

          xmlRows.push(
            `  <DrawingType text="${profile}" pixmapFile="retakeIBPixmap.svg" commandIcon="retakeIBButton.svg" flipIcon="retakeIBFlip.svg" onionIcon="retakeIBOnion.svg" timelineColor="#${color}FF" />`,
          );
        }

        const xml = ['<DrawingTypes>', ...xmlRows, '</DrawingTypes>'].join('\n');
        G.FileUtils.writeTo(drawingTypesFile, xml);
        MessageLog.trace(
          `[ScriptPopulation.ts] Saved ${xmlRows.length} drawing types to ${drawingTypesFile}`,
        );
      } catch (error) {
        MessageLog.trace(
          `[ScriptPopulation.ts] ${error.message} | ${error.fileName} | ${error.lineNumber}`,
        );
      }
    });

    layout.addWidget(table, 1, 0);
    layout.addWidget(saveButton, 0, Qt.AlignmentFlag.AlignRight);
    this.tabs.addTab(profileTab, 'Profile Editor');
    return profileTab;
  }

  buildMarkersTab() {
    const markersTab = new QWidget();
    const markersTabLayout = new QVBoxLayout(markersTab);
    markersTabLayout.setContentsMargins(12, 12, 12, 12);
    markersTabLayout.spacing = 8;
    this.tabs.addTab(markersTab, 'Markers');

    // QTableWidget Setup
    this.table = new QTableWidget();
    this.table.columnCount = 3;

    this.table.setHorizontalHeaderLabels(['', 'Name', 'Notes']);
    this.table.setStyleSheet(
      'QTableWidget::item:selected { background-color: #464545; color: #ffffff; }',
    );

    this.table.selectionMode = QAbstractItemView.ExtendedSelection;
    this.table.selectionBehavior = QAbstractItemView.SelectRows;

    const header = this.table.horizontalHeader();
    header.setSectionResizeMode(this.COL_COLOR, QHeaderView.Fixed);
    header.setSectionResizeMode(this.COL_NAME, QHeaderView.Interactive);
    header.setSectionResizeMode(this.COL_NOTES, QHeaderView.Stretch);
    header.minimumSectionSize = 1;
    this.table.setColumnWidth(this.COL_COLOR, 10);
    this.table.setColumnWidth(this.COL_NAME, 50);

    this.table.verticalHeader().setVisible(false);
    markersTabLayout.addWidget(this.table, 1, 0);

    // --- Column-specific filters ---
    const filterBar = new QWidget();
    filterBar.styleSheet = 'background-color: transparent; border: none;';
    const filterLayout = new QHBoxLayout(filterBar);
    filterLayout.setContentsMargins(0, 0, 0, 0);
    filterLayout.spacing = 8;

    this.nameFilter = new QLineEdit();
    this.nameFilter.placeholderText = 'Filter Name...';
    this.nameFilter.styleSheet =
      'font-size: 11pt; color: #e0e0e0; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 6px; padding: 4px;';

    this.notesFilter = new QLineEdit();
    this.notesFilter.placeholderText = 'Filter Notes...';
    this.notesFilter.styleSheet = this.nameFilter.styleSheet;

    filterLayout.addWidget(this.nameFilter, 1, 0);
    filterLayout.addWidget(this.notesFilter, 1, 0);
    markersTabLayout.addWidget(filterBar, 0, 0);

    this.nameFilter.textChanged.connect(() => this.applyFilters());
    this.notesFilter.textChanged.connect(() => this.applyFilters());

    // Handle in-place cell editing directly on the QTableWidget
    this.table.itemChanged.connect((item: QTableWidgetItem) => {
      if (this.selfUpdating) return;

      const row = item.row();
      const markers = TimelineMarker.getAllMarkers();
      const marker = markers[row];
      if (!marker) return;

      const col = item.column();
      if (col === this.COL_NAME) {
        // Name Column
        if (marker.name !== item.text()) {
          marker.name = item.text();
          this.updateMarker(marker);
        }
      } else if (col === this.COL_NOTES) {
        // Notes Column
        if (marker.notes !== item.text()) {
          marker.notes = item.text();
          this.updateMarker(marker);
        }
      }
    });

    /* Script Population Actions */

    const deleteMarkersOfSelection = G.Utils.bindAction(() => {
      const sel = new G.oSelection();
      for (var i = sel.startFrame; i < sel.endFrame + 1; i++) {
        const marker = G.TimelineKit.getTimelineMarkersPresentAtFrame(i)[0];
        if (marker) TimelineMarker.deleteMarker(marker);
      }
    }, []);

    const deleteAllMarkers = G.Utils.bindAction(() => {
      const allMarkers = G.TimelineKit.getAllMarkers();
      for (var i = 0; i < allMarkers.length; i++) {
        TimelineMarker.deleteMarker(allMarkers[i]);
      }
    }, []);

    const importScript = G.Utils.bindAction(() => {
      const text = StoryboardTools.insertDialogPrompt({
        message: 'Paste script text here:',
        title: 'Import Script',
        defaultProfile: '',
        defaultDialogue: '',
      })?.dialogue;
      StoryboardTools.populateScript(text || '');
    }, []);

    const compileScript = G.Utils.bindAction(function () {
      const markers = G.TimelineKit.getAllMarkers();
      const compiledScript = markers
        .filter((marker) => marker.name && marker.notes)
        .map((marker) => `${marker.name}:: ${marker.notes}`)
        .join('\n');
      G.Utils.prompt('Compiled Script', 'Compiled Script', compiledScript);
      MessageLog.trace(`[ScriptPopulation.ts] compile script: ${compiledScript}`);
    }, []);

    /* Script Population Menu */

    try {
      const optionsButton = new G.Widgets.UI_QToolButton(this.dialog);
      const optionsMenu = WidgetKit.optionsMenu(optionsButton, [
        [
          ['Delete Markers in Selection', deleteMarkersOfSelection],
          ['Delete All Markers', deleteAllMarkers],
          ['Cut section', () => StoryboardTools.cutSection()],
          ['Paste Section', () => StoryboardTools.pasteSection()],
          ['Paste Markers Only', () => StoryboardTools.pasteMarkersOnly()],
        ],
        [
          ['Import Script', importScript],
          ['Compile Script', compileScript],
        ],
        [['Extend To Boundary', () => StoryboardTools.extendToBoundary()]],
      ]);

      // Attach the menu to the button.
      optionsButton.setMenu(optionsMenu);

      // Build the operations bar (menu button + action buttons) with buildTree.
      const operationsBar = G.Widgets.buildTree(
        {
          optionsButton: optionsButton,
          rippleShiftMarkersLeftBtn: new G.Widgets.Button({
            text: '<',
            objectName: 'removeExposureButton',
            width: 40,
            onClick: G.Utils.bindAction(() => {
              const sel = new G.oSelection();

              G.TimelineKit.rippleShiftMarkers(sel.startFrame, sel.length, 'delete');
            }),
          }),
          rippleShiftMarkersRightBtn: new G.Widgets.Button({
            text: '>',
            objectName: 'addExposureButton',
            width: 40,
            onClick: G.Utils.bindAction(() => {
              scene.beginUndoRedoAccum('Ripple Shift Markers Right');
              G.TimelineKit.rippleShiftMarkers(frame.current() - 1, 1, 'add');
              scene.endUndoRedoAccum();
            }),
          }),

          removeExposureButton: new G.Widgets.Button({
            text: '-',
            objectName: 'removeExposureButton',
            onClick: StoryboardTools.removeExposure,
          }),
          addExposureButton: new G.Widgets.Button({
            text: '+',
            objectName: 'addExposureButton',
            onClick: StoryboardTools.addExposure,
          }),
          insertDialogButton: new G.Widgets.Button({
            text: 'Insert Dialog',
            objectName: 'insertDialogButton',
            onClick: G.Utils.bindAction(
              function () {
                const output = StoryboardTools.insertDialogPrompt({
                  onOk: (result) => {
                    if (result) {
                      const sel = new G.oSelection();
                      const frameNum = sel.startFrame;
                      const profile = result.profile;
                      const dialogue = result.dialogue;
                      StoryboardTools.addExposure();
                      MessageLog.trace(`[ScriptPopulation.ts] ${'inserted'}`);
                      StoryboardTools.addDialogueMarker(result, frameNum + 1);
                      MessageLog.trace(
                        `[ScriptPopulation.ts] Inserted dialog at frame ${frameNum}: ${profile}:: ${dialogue}`,
                      );
                    }
                  },
                });
                MessageLog.trace(`[ScriptPopulation.ts] ${JSON.stringify(output, null, 2)}`);
              },
              [G, StoryboardTools],
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

    this.table.contextMenuPolicy = Qt.CustomContextMenu;
    this.table.customContextMenuRequested.connect((pos: QPoint) => {
      // Map coordinates to find which row was right-clicked
      const item = this.table.itemAt(pos);
      if (!item) return; // Right-clicked on empty table area

      const row = item.row();
      const markers = TimelineMarker.getAllMarkers();
      const marker = markers[row];
      if (!marker) return;

      // Create the QMenu container
      const menu = new QMenu(this.dialog);

      // Define Menu Actions
      const jumpAction = menu.addAction('Jump to Marker Frame');
      const deleteAction = menu.addAction('Delete Marker');

      // Map global position for spawning the menu
      const globalPos = this.table.viewport().mapToGlobal(pos);
      const selectedAction = menu.exec(globalPos);

      // Handle selected menu action
      if (selectedAction === jumpAction) {
        if (marker.frame !== undefined) {
          G.TimelineKit.setCurrentFrame(marker.frame);
        }
      } else if (selectedAction === deleteAction) {
        const selectedRows = this.getSelectedRowIndices();
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
        this.refresh();
      }
    });

    this.table.iconSize = new QSize(40, 40);
    this.table.cellDoubleClicked.connect((row: number, column: number) => {
      const markers = TimelineMarker.getAllMarkers();
      const marker = markers[row];

      if (!marker) return;

      if (column === this.COL_COLOR) {
        MessageLog.trace(`[ScriptPopulation.ts] ${'click'}`);
        if (marker.frame !== undefined) {
          G.TimelineKit.setCurrentFrame(marker.frame);
        }
      } else if (column === this.COL_NAME) {
        MessageLog.trace('Clicked marker name: ' + marker.name);
      }
    });
  }

  buildScriptTab() {
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

    this.textEditComponent = WidgetKit.findWidgetByName(ScriptTab, 'scriptTextEdit') as QTextEdit;

    // Debounced highlight timer ("typing stopped")
    var highlightTimer = new QTimer();
    highlightTimer.singleShot = true;

    highlightTimer.timeout.connect(() => {
      this.applyScriptHighlights();
    });

    // Trigger highlight processing only when user STOPS typing for 350ms
    this.textEditComponent.textChanged.connect(() => {
      highlightTimer.start(350);
    });

    // Optimized cursor / panel hover
    this.cachedFontMetrics = new QFontMetrics(this.textEditComponent.font);

    this.floatingPanel = new QWidget(this.textEditComponent);
    var panelLayout = new QHBoxLayout(this.floatingPanel);
    panelLayout.setContentsMargins(0, 0, 0, 0);
    panelLayout.setSpacing(4);
    this.floatingPanel.hide();

    const createPanelButton = (text: string, onClick: () => void): QPushButton => {
      const btn = new QPushButton(this.floatingPanel);
      btn.text = text;
      btn.setFixedSize(20, 20);
      btn.setStyleSheet(
        'background-color: #007acc; color: white; border: none; border-radius: 3px; font-size: 10pt; padding: 0px;',
      );
      btn.clicked.connect(onClick);
      panelLayout.addWidget(btn, 0, 0);
      return btn;
    };

    createPanelButton('▶', () => {
      if (this.activeMatchedMarker && this.activeMatchedMarker.frame !== undefined) {
        frame.setCurrent(this.activeMatchedMarker.frame);
      }
    });
    createPanelButton('★', () => {
      MessageLog.trace('Button 2');
    });
    createPanelButton('⚙', () => {
      MessageLog.trace('Button 3');
    });

    // Set fixed size ONCE during setup to avoid adjustSize() layout thrashing on cursor move
    this.floatingPanel.setFixedSize(68, 20);

    // Insert toolbar for unmatched (red) dialogue
    this.insertPanel = new QWidget(this.textEditComponent);
    var insertPanelLayout = new QHBoxLayout(this.insertPanel);
    insertPanelLayout.setContentsMargins(0, 0, 0, 0);
    insertPanelLayout.setSpacing(4);
    this.insertPanel.hide();

    this.insertButton = new QPushButton(this.insertPanel);
    this.insertButton.text = 'Insert';
    this.insertButton.setFixedSize(56, 20);
    this.insertButton.setStyleSheet(
      'background-color: #8b0000; color: white; border: none; border-radius: 3px; font-size: 10pt; padding: 0px;',
    );
    insertPanelLayout.addWidget(this.insertButton, 0, 0);
    this.insertPanel.setFixedSize(56, 20);

    this.insertButton.clicked.connect(() => this.insertDialogueMarker());

    this.textEditComponent.cursorPositionChanged.connect(() => this.checkCursorInHighlight());

    // Initial Pass
    this.refreshMarkerCache();
    this.applyScriptHighlights();
    this.tabs.addTab(ScriptTab, 'Script');
  }

  togglePanel(visible: boolean, x?: number, y?: number) {
    if (visible && x !== undefined && y !== undefined) {
      this.floatingPanel.move(x, y);
      this.floatingPanel.show();
      this.floatingPanel.raise();
    } else {
      this.floatingPanel.hide();
    }
  }

  toggleInsertPanel(visible: boolean, x?: number, y?: number) {
    if (visible && x !== undefined && y !== undefined) {
      this.insertPanel.move(x, y);
      this.insertPanel.show();
      this.insertPanel.raise();
    } else {
      this.insertPanel.hide();
    }
  }

  applyScriptHighlights() {
    this.textEditComponent.blockSignals(true);

    this.refreshMarkerCache(); // Fetch from Harmony C++ once per pause

    var existingDialogueList = this.cachedMarkers.map(function (marker) {
      return {
        profile: marker.name,
        dialogue: marker.notes,
      };
    });

    var text = this.textEditComponent.plainText;
    var lines = text.split(/\r?\n/);

    // Run LCS Diff
    var diffs = StoryboardTools.diffScriptAgainstExpected(lines, existingDialogueList);

    var cursor = this.textEditComponent.textCursor();
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

    var doc = this.textEditComponent.document;
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
    this.textEditComponent.setTextCursor(cursor);

    this.textEditComponent.blockSignals(false);
  }

  // Finds the frame of the marker for the closest dialogue line that appears
  // before the given script line. Returns null when none is found.
  findPreviousDialogueMarkerFrame(lineIndex: number): number | null {
    const text = this.textEditComponent.plainText;
    const lines = text.split(/\r?\n/);

    for (var i = lineIndex - 1; i >= 0; i--) {
      const parsed = StoryboardTools.parseDialog(lines[i]);
      if (!parsed) continue;

      for (var j = this.cachedMarkers.length - 1; j >= 0; j--) {
        const marker = this.cachedMarkers[j];
        if (
          StoryboardTools.isDialogueEqual(parsed, {
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
  insertDialogueMarker() {
    if (!this.activeRedDialogue) return;
    try {
      const prevMarkerFrame = this.findPreviousDialogueMarkerFrame(this.activeRedDialogueLineIndex);
      const insertionFrame = prevMarkerFrame !== null ? prevMarkerFrame + 1 : frame.current();

      MessageLog.trace(
        `[ScriptPopulation.ts] active red dialogue ${JSON.stringify(this.activeRedDialogue, null, 2)} at line ${this.activeRedDialogueLineIndex}`,
      );
      StoryboardTools.addExposure(insertionFrame, 1);
      TimelineMarker.createMarker({
        frame: insertionFrame,
        color: '#ffffff',
        name: this.activeRedDialogue.profile,
        notes: this.activeRedDialogue.dialogue,
        length: 0,
      });

      this.refreshMarkerCache();
      this.applyScriptHighlights();
      this.refresh();
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error inserting dialogue marker: ${e.message}`);
    }
  }

  checkCursorInHighlight() {
    var cursor = this.textEditComponent.textCursor();
    var charIndex = cursor.position();
    var currentBlock = cursor.block();
    var lineText = currentBlock.text();
    var prefixLength = lineText.indexOf('::');

    var isInHighlight = false;
    var isInRed = false;
    this.activeMatchedMarker = null;
    this.activeRedDialogue = null;
    this.activeRedDialogueLineIndex = -1;

    if (prefixLength !== -1) {
      var blockStart = currentBlock.position();
      var prefixEnd = blockStart + prefixLength;

      if (charIndex >= blockStart && charIndex <= prefixEnd) {
        var parsedLine = StoryboardTools.parseDialog(lineText);

        if (parsedLine) {
          // Read from cachedMarkers array, NEVER call G.TimelineKit here!
          var match = this.cachedMarkers.find(function (m) {
            if (!m.name || m.name.trim() !== parsedLine.profile.trim()) {
              return false;
            }
            return (
              (m.notes || '').trim().replace(/\s+/g, ' ') ===
              parsedLine.dialogue.trim().replace(/\s+/g, ' ')
            );
          });

          var cursorRect = this.textEditComponent.cursorRect(cursor);
          var textAscent = this.cachedFontMetrics.ascent();
          var textVisualCenterY = cursorRect.top() + Math.floor(textAscent / 2);
          var panelY = textVisualCenterY - 10;

          if (match) {
            isInHighlight = true;
            this.activeMatchedMarker = match;

            var panelX = cursorRect.left() - 75; // Account for full panel width (68px + margin)
            if (panelX < 2) panelX = 2;

            this.togglePanel(true, panelX, panelY);
          } else {
            // Red text: no matching marker found. Show the insert toolbar.
            isInRed = true;
            this.activeRedDialogue = parsedLine;
            this.activeRedDialogueLineIndex = currentBlock.blockNumber();

            var insertPanelX = cursorRect.left() - 60; // Account for insert panel width (56px + margin)
            if (insertPanelX < 2) insertPanelX = 2;

            this.toggleInsertPanel(true, insertPanelX, panelY);
          }
        }
      }
    }

    if (!isInHighlight) {
      this.togglePanel(false);
    }
    if (!isInRed) {
      this.toggleInsertPanel(false);
    }
  }

  buildListenerTab() {
    // Toggle for "closest left" mode: when enabled, the listener edits/reads the
    // marker nearest to the left of the playhead instead of requiring an exact
    // marker at the current frame.
    this.closestLeftCheckbox = new QCheckBox('Closest Left');
    this.closestLeftCheckbox.objectName = 'closestLeftCheckbox';
    this.closestLeftCheckbox.styleSheet = 'color: #e0e0e0; font-size: 11pt;';

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
            this.closestLeftCheckbox,
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
    this.tabs.addTab(listenerTab, 'Listener');

    this.nameLabel = WidgetKit.findWidgetByName(listenerTab, 'nameLabel') as QLineEdit;
    this.notesLabel = WidgetKit.findWidgetByName(listenerTab, 'notesRowLabel') as QTextEdit;
    const applyButton = WidgetKit.findWidgetByName(listenerTab, 'applyButton') as QPushButton;
    const resetButton = WidgetKit.findWidgetByName(listenerTab, 'resetButton') as QPushButton;

    this.closestLeftCheckbox.toggled.connect((checked: boolean) => {
      this.closestLeftMode = checked;
      this.updateListenerFields();
    });

    resetButton.clicked.connect(() => this.resetFields());
    applyButton.clicked.connect(G.Utils.bind(this.applyToMarker, this));

    // Initial sync of the listener fields.
    this.updateListenerFields();
  }

  // Applies faded styling to the listener fields when showing a closest-left
  // (non-exact) marker.
  applyListenerFaded(faded: boolean) {
    const nameNormal =
      'font-size: 14pt; color: #e0e0e0; background-color: #1e2a38; border: 1px solid #4a6b8a; border-radius: 8px; padding: 4px;';
    const nameFaded =
      'font-size: 14pt; color: #7a8a9a; background-color: #1a222c; border: 1px solid #3a4a5a; border-radius: 8px; padding: 4px;';
    const notesNormal =
      'font-size: 18pt; color: #ffffff; background-color: #1f1f1f; border: 1px solid #4a4a4a; border-radius: 8px; padding: 8px; margin: 0px;';
    const notesFaded =
      'font-size: 18pt; color: #9a9a9a; background-color: #181818; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px; margin: 0px;';

    this.nameLabel.styleSheet = faded ? nameFaded : nameNormal;
    this.notesLabel.styleSheet = faded ? notesFaded : notesNormal;
  }

  applyToMarker() {
    const markerName = this.nameLabel.text;
    const markerNotes = this.notesLabel.plainText;
    const currentFrame = frame.current();

    scene.beginUndoRedoAccum('Apply marker settings');
    let applied = false;
    try {
      const marker = this.closestLeftMode
        ? StoryboardTools.getClosestLeftMarker(currentFrame)
        : this.getCurrentMarker();

      if (marker) {
        marker.name = markerName;
        marker.notes = markerNotes;
        TimelineMarker.setMarker(marker);
        applied = true;
      } else if (!this.closestLeftMode) {
        G.TimelineKit.createMarker(currentFrame, markerName, '#ffffff', markerNotes, 0);
        applied = true;
      }
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error applying marker: ${e.message}`);
    }
    try {
      G.Widgets.showToast(
        applied ? `Applied ${markerName}: ${markerNotes}` : 'No marker to edit',
        1500,
        this.dialog,
      );
    } catch (e) {
      MessageLog.trace(`[ScriptPopulation.ts] Error showing toast: ${e.message}`);
    }
    scene.endUndoRedoAccum();
  }

  // Reset the fields back to the active (or closest-left) marker's values.
  resetFields() {
    this.updateListenerFields();
  }

  // Updates the listener tab fields; shared by the frame listener below.
  updateListenerFields() {
    try {
      const currentFrame = frame.current();
      const currentMarker = this.getCurrentMarker();

      if (currentMarker) {
        this.applyListenerFaded(false);
        this.nameLabel.text = currentMarker.name;
        this.notesLabel.plainText = currentMarker.notes;
        return;
      }

      if (this.closestLeftMode) {
        const closest = StoryboardTools.getClosestLeftMarker(currentFrame);
        if (closest) {
          this.applyListenerFaded(true);
          this.nameLabel.text = closest.name;
          this.notesLabel.plainText = closest.notes;
          return;
        }
      }

      this.applyListenerFaded(false);
      this.nameLabel.text = '';
      this.notesLabel.plainText = '';
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] ${frame.current()} | Error retrieving marker information. ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
  }

  // FAST: Updates only row background colors without rebuilding rows
  highlightCurrentFrame() {
    try {
      if (this.selfUpdating) return;

      const currentFrame = frame.current();
      const activeRowBrush = new QBrush(new QColor('#3a3a3a'));
      const closestLeftBrush = new QBrush(new QColor('#2e3b4e'));
      const defaultRowBrush = new QBrush(new QColor('#1f1f1f'));

      const markers = TimelineMarker.getAllMarkers();
      if (markers.length !== this.table.rowCount) return;

      // Highlight the closest-left marker's row (in a different color) when the
      // playhead is no longer exactly on a marker.
      const closestLeft = StoryboardTools.getClosestLeftMarker(currentFrame, markers);
      const closestLeftFrame =
        closestLeft && closestLeft.frame !== currentFrame ? closestLeft.frame : -1;

      this.table.updatesEnabled = false;
      for (var i = 0; i < markers.length; i++) {
        const isActiveFrame = markers[i].frame === currentFrame;
        const isClosestLeft = markers[i].frame === closestLeftFrame;
        const brush = isActiveFrame
          ? activeRowBrush
          : isClosestLeft
            ? closestLeftBrush
            : defaultRowBrush;

        const nameItem = this.table.item(i, this.COL_NAME);
        const notesItem = this.table.item(i, this.COL_NOTES);

        if (nameItem) nameItem.setBackground(brush);
        if (notesItem) notesItem.setBackground(brush);
      }
      this.table.updatesEnabled = true;
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error highlighting current frame: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
  }

  // SLOW: Rebuilds structural elements (only called when scene markers actually change)
  refresh() {
    if (this.selfUpdating) return;

    this.table.updatesEnabled = false;
    this.table.rowCount = 0;

    const currentFrame = frame.current();
    const activeRowColor = new QColor('#3a3a3a');
    const activeRowBrush = new QBrush(activeRowColor);

    const markers = TimelineMarker.getAllMarkers();
    this.table.rowCount = markers.length;

    for (var i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const isActiveFrame = marker.frame === currentFrame;

      // Swatch / Color Column (Read-Only)
      const colorItem = new QTableWidgetItem();
      colorItem.setSizeHint(new QSize(40, 40));
      colorItem.setFlags(colorItem.flags() & ~Qt.ItemIsEditable);

      // Swatch as an icon instead of a background: icons are drawn over the
      // selection highlight, so the color can't be overridden by :selected.
      const swatch = new QPixmap(40, 40);
      swatch.fill(new QColor(this.colorToHex(marker.color)));
      colorItem.setIcon(new QIcon(swatch));

      // Name Column (Editable)
      const nameItem = new QTableWidgetItem(marker.name || '');
      if (isActiveFrame) nameItem.setBackground(activeRowBrush);

      // Notes Column (Editable)
      const notesItem = new QTableWidgetItem(marker.notes || '');
      if (isActiveFrame) notesItem.setBackground(activeRowBrush);

      this.table.setItem(i, this.COL_COLOR, colorItem);
      this.table.setItem(i, this.COL_NAME, nameItem);
      this.table.setItem(i, this.COL_NOTES, notesItem);
    }
    this.table.updatesEnabled = true;
    this.applyFilters();
    this.highlightCurrentFrame();
  }

  // Scrolls the script editor to the dialogue line matching the current marker,
  // if one exists.
  scrollToCurrentMarkerDialogue() {
    try {
      const marker = this.getCurrentMarker();
      if (!marker || !marker.name) return;

      const text = this.textEditComponent.plainText;
      const lines = text.split(/\r?\n/);

      for (var i = 0; i < lines.length; i++) {
        const parsed = StoryboardTools.parseDialog(lines[i]);
        if (!parsed) continue;

        if (
          StoryboardTools.isDialogueEqual(parsed, {
            profile: marker.name,
            dialogue: marker.notes || '',
          })
        ) {
          const block = this.textEditComponent.document.findBlockByNumber(i);
          if (block.isValid()) {
            const cursor = this.textEditComponent.textCursor();
            cursor.setPosition(block.position());
            this.textEditComponent.setTextCursor(cursor);
            this.textEditComponent.ensureCursorVisible();
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

  // Scrolls the marker table to the row for the current playhead marker,
  // falling back to the closest marker to the left when there is no exact match.
  scrollToCurrentMarkerRow() {
    try {
      const currentFrame = frame.current();
      const markers = TimelineMarker.getAllMarkers();
      if (markers.length === 0) return;

      let targetIndex = -1;
      for (var i = 0; i < markers.length; i++) {
        if (markers[i].frame === currentFrame) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex === -1) {
        const closestLeft = StoryboardTools.getClosestLeftMarker(currentFrame, markers);
        if (closestLeft) {
          targetIndex = markers.indexOf(closestLeft);
        }
      }

      if (targetIndex !== -1) {
        // scrollToItem(QTableWidgetItem*) isn't a QtScript-registered type in
        // Harmony, so use setCurrentCell instead — it selects the row and
        // scrolls it into view (plain int arguments only).
        this.table.setCurrentCell(targetIndex, this.COL_NAME);
      }
    } catch (error) {
      MessageLog.trace(
        `[ScriptPopulation.ts] Error scrolling to current marker row: ${error.message} ${error.fileName} ${error.lineNumber}`,
      );
    }
  }

  // The one and only frame-change listener.
  onFrameChanged() {
    this.highlightCurrentFrame();
    this.updateListenerFields();
    this.scrollToCurrentMarkerDialogue();
    this.scrollToCurrentMarkerRow();
  }

  wireNotifier() {
    this.notifier = new SceneChangeNotifier(this.dialog);

    this.boundRefresh = () => this.refresh();
    this.boundOnFrameChanged = () => this.onFrameChanged();
    this.boundUpdateListenerFields = () => this.updateListenerFields();

    // Rebuild rows only on structural changes (add, remove, edit markers)
    this.notifier.sceneMarkersChanged.connect(this.boundRefresh);
    this.notifier.currentFrameChanged.connect(this.boundOnFrameChanged);
    this.notifier.selectionChanged.connect(this.boundUpdateListenerFields);

    this.dialog.closeEvent = (event: any) => {
      this.notifier.sceneMarkersChanged.disconnect(this.boundRefresh);
      this.notifier.currentFrameChanged.disconnect(this.boundOnFrameChanged);
      this.notifier.selectionChanged.disconnect(this.boundUpdateListenerFields);
      event.accept();
    };
  }
}

function showMarkerList() {
  new TimelineMarkersDialog().show();
  MessageLog.trace(`[ScriptPopulation.ts] ${'test'}`);
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
