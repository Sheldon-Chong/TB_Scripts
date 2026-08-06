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

//////////////////////////////////////////////////////////
// Floating panel — a persistent, stay-on-top window with
// a single button that activates the MeasureLineTool.
//////////////////////////////////////////////////////////

// process.exit(0);
// include('globals.js');

// include('MeasureLineTool.js');

include('globals.js');
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
  var activateBtn = _.Utils.styledButton({
    label: opts.buttonLabel,
    color: opts.buttonColor,
    width: opts.width - 32,
    height: 38,
    onClick: function () {
      try {
        Tools.setCurrentTool('com.toonboom.measureLineTool');
        // G.Scene.switchTool('com.toonboom.measureLineTool');
        MessageLog.trace('[MeasureLineToolPanel.ts] ' + '>activated MeasureLineTool');
      } catch (e) {
        MessageLog.trace('MeasureLineToolPanel: error activating tool: ' + e);
      }
    },
  });
  mainLayout.addWidget(activateBtn, 0, Qt.AlignmentFlag.AlignCenter);
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
