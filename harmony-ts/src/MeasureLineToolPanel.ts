// include(specialFolders.userScripts + '/core/utils.js');
// include('globals.js');

// QtScript GC workaround: creating Qt widget wrappers and then letting
// their JS references go out of scope triggers a known QtScript engine bug
// where the GC corrupts built-in globals (like Array) for ALL loaded scripts.
// Pinning Array here is a safety measure.
// Array = Array;

//////////////////////////////////////////////////////////
// Interfaces — following patterns established in utils.ts
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// Floating panel — a persistent, stay-on-top window with
// a single button that activates the MeasureLineTool.
//////////////////////////////////////////////////////////

// process.exit(0);
// include('globals.js');

// include('MeasureLineTool.js');
include('globals.js');

interface FloatingPanelOptions {
  /** Window title shown in the title bar. */
  title?: string;
  /** Panel width in pixels (default 220). */
  width?: number;
  /** Label text on the activate button. */
  buttonLabel?: string;
  /** Button background colour (hex, default '#2196F3'). */
  buttonColor?: string;
  /** Initial X position on screen (default centres on active window). */
  x?: number;
  /** Initial Y position on screen (default centres on active window). */
  y?: number;
}

function showMeasureLinePanel(options?: FloatingPanelOptions): QWidget {
  // evaluateAndRunMeasureLineTool();
  // registerMeasureLineTool();
  // return;
  var opts: FloatingPanelOptions = {
    title: 'Measure Line',
    width: 220,
    buttonLabel: '📏 Measure Line',
    buttonColor: '#2196F3',
  };
  // Capture _ for use in Qt signal callbacks (QtScript context loses the _ global)
  // --- Create the panel window ---
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
  // Array, breaking ALL other loaded scripts (e.g. MeasureLineTool).
  (panel as any)._widgets = {
    mainLayout: mainLayout,
    headerLabel: headerLabel,
    separator: separator,
    activateBtn: activateBtn,
    closeBtn: closeBtn,
  };
  return panel;
}

function run() {
  showMeasureLinePanel();
}
