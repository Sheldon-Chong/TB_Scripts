include('globals.js');

function run9() {
  // --- barebones window ---
  var panel = new QWidget();
  panel.windowTitle = 'Test';
  panel.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.Dialog);
  panel.minimumWidth = 200;

  var layout = new QVBoxLayout(panel);
  layout.setContentsMargins(10, 10, 10, 10);

  var btnTest = new QPushButton('Test');
  btnTest.clicked.connect(function () {
    MessageLog.trace('Test button clicked');
  });
  layout.addWidget(btnTest, 0, 0);

  // pin widgets to prevent QtScript GC corruption
  (panel as any)._widgets = {
    layout: layout,
    btnTest: btnTest,
  };

  panel.show();
}

function cleanEnvironment() {
  var btnTest = new QPushButton('Test');
  btnTest.clicked.connect(function () {
    MessageLog.trace('Test button clicked');
  });
}

function copypasteTest() {
  scene.beginUndoRedoAccum('Paste Special Test');
  var pasteOptions = copyPaste.getCurrentPasteOptions();

  // 2. Set the drawing file mode string directly
  pasteOptions.drawingFileMode = 'ALWAYS_CREATE';

  // 3. Get the native array of nodes from the current selection
  var nodesArray = selection.selectedNodes();

  // CRITICAL FIX: Convert the JS Array into a native Harmony StringList
  // Harmony allows you to pass an array into StringList constructors or wrapper methods if available,
  // but if QScript/QtScript doesn't auto-cast it, we can use the specialized copy workflow.

  var startFrame = frame.current();
  var numFrames = frame.numberOf();

  // 4. Generate the valid DragObject exactly as shown in your DragObject documentation
  var myCopyOptions = copyPaste.getCurrentCreateOptions();

  // We pass nodesArray. Harmony's copy method expects a StringList.
  // If your environment throws an error on copy here, we must pass the direct node paths wrapper.
  var dragObject = copyPaste.copy(nodesArray, startFrame, numFrames, myCopyOptions);

  if (dragObject) {
    // 5. Execute the paste method matching the exact C++ signatures in your docs
    var success = copyPaste.paste(dragObject, nodesArray, startFrame, numFrames, pasteOptions);

    MessageLog.trace('[spoil.ts] Paste operation status: ' + success);
  } else {
    MessageLog.trace('[spoil.ts] Error: Failed to create a valid DragObject.');
  }
  scene.endUndoRedoAccum();
}

function run10() {
  const obj1 = {
    name: 'Object 1',
  };

  const obj2 = {
    name2: 'Object 2',
  };

  const objCombined = { ...obj1, ...obj2 };
  MessageLog.trace('[spoil.ts] ' + JSON.stringify(objCombined, null, 2));

  return;
  // copyPaste.usePasteSpecial(true);
  // copyPaste.setPasteSpecialDrawingFileMode('ALWAYS_CREATE');

  // return;
  var btnTest = new QPushButton('Test');
  btnTest.clicked.connect(function () {
    MessageLog.trace('Test button clicked');
  });
  MessageLog.trace('Test button created: ');

  const opts = {
    title: 'Measure Line',
    width: 220,
    buttonLabel: '📏 Measure Line',
    buttonColor: '#2196F3',
  };
  // return;

  var panel = new QWidget();
  panel.windowTitle = opts.title;
  panel.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.Dialog);
  panel.minimumWidth = opts.width;
  panel.maximumWidth = opts.width;
  // --- Main layout ---
  var mainLayout = new QVBoxLayout(panel);
  mainLayout.setContentsMargins(16, 14, 16, 14);
  mainLayout.spacing = 10;
  // --- Header label ---
  var headerLabel = new QLabel(opts.title);
  headerLabel.styleSheet =
    'font-size: 13pt; font-weight: bold; color: #e0e0e0; padding-bottom: 2px;';
  headerLabel.alignment = Qt.AlignmentFlag.AlignCenter;
  mainLayout.addWidget(headerLabel, 0, Qt.AlignmentFlag.AlignCenter);
  // --- Separator ---
  var separator = new QFrame();
  separator.frameShape = QFrame.HLine;
  separator.frameShadow = QFrame.Sunken;
  separator.setStyleSheet('QFrame { color: #555; }');
  mainLayout.addWidget(separator, 0, 0);
  // --- Activate button ---

  function testBtn(options: StyledButtonOptions) {
    var label = options.label;
    var onClick = options.onClick;
    var width = options.width !== undefined ? options.width : 100;
    var height = options.height !== undefined ? options.height : 30;
    var color = options.color !== undefined ? options.color : '#4CAF50';

    var button = new QPushButton(label);

    button.setFixedSize(width, height);
    button.setStyleSheet(
      'QPushButton {' +
        'background-color: ' +
        color +
        ';' +
        'color: white;' +
        'border: none;' +
        'border-radius: 4px;' +
        'padding: 6px 12px;' +
        'font-size: 14px;' +
        '}' +
        'QPushButton:hover {' +
        'background-color: ' +
        getHoverColor(color) +
        '}',
    );

    return button;
  }

  function test11() {}

  var activateBtn = testBtn({
    label: opts.buttonLabel,
    color: opts.buttonColor,
    width: opts.width - 32,
    height: 38,
    onClick: test11,
  });
  mainLayout.addWidget(activateBtn, 0, Qt.AlignmentFlag.AlignCenter);
  MessageLog.trace(
    `${JSON.stringify(Object.keys(activateBtn['clicked()']), null, 2)} | ${activateBtn['clicked()']} | ${activateBtn['clicked()'].connect}`,
  );
  // activateBtn['clicked()'].connect(() => {
  //   MessageLog.trace('Activate button clicked');
  // });
  activateBtn.clicked.connect(() => {
    MessageLog.trace('Activate button clicked');
    Tools.setCurrentTool('com.toonboom.cameraSwipeTool');
  });
  // --- Close button ---
  var closeBtn = _.Utils.styledButton({
    label: '✕ Close',
    color: '#555555',
    width: opts.width - 32,
    height: 28,
    onClick: function () {
      panel.hide();
    },
  });
  mainLayout.addWidget(closeBtn, 0, Qt.AlignmentFlag.AlignCenter);
  mainLayout.addStretch(1);
  // --- Style the panel background ---
  panel.styleSheet =
    'QWidget#measureLinePanel { background-color: #2d2d2d; border: 1px solid #666; border-radius: 8px; }';
  // panel.setObjectName('measureLinePanel');
  // --- Position: centre on active window, or top-left fallback ---
  var win = QApplication.activeWindow();
  if (win && win.geometry) {
    var geom = win.geometry;
    panel.move(
      geom.x() + Math.max(0, (geom.width() - opts.width) / 2),
      geom.y() + Math.max(0, (geom.height() - 200) / 2),
    );
  } else {
    panel.move(opts.x || 100, opts.y || 100);
  }

  panel.show();
  // CRITICAL: Keep all Qt widget wrappers alive by storing them on the panel.
  // If local vars go out of scope and GC collects the JS wrappers while the
  // C++ Qt objects still exist, QtScript's GC corrupts built-in globals like
  // Array, breaking ALL other loaded scripts (e.g. CameraSwipeTool).
  (panel as any)._widgets = {
    mainLayout: mainLayout,
    headerLabel: headerLabel,
    separator: separator,
    activateBtn: activateBtn,
    closeBtn: closeBtn,
  };
  // return panel;
}
