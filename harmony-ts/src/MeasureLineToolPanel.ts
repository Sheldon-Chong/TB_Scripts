include(specialFolders.userScripts + '/core/utils.js');
include('globals.js');

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

var _measureLinePanel: QWidget | null = null;

function showMeasureLinePanel(options?: FloatingPanelOptions): QWidget {
  // If panel already exists, just bring it to front
  if (_measureLinePanel) {
    _measureLinePanel.raise();
    _measureLinePanel.show();
    return _measureLinePanel;
  }

  var opts: FloatingPanelOptions = Object._.Utils.merge(
    {
      title: 'Measure Line',
      width: 220,
      buttonLabel: '📏 Measure Line',
      buttonColor: '#2196F3',
    },
    options || {},
  );

  // Capture _ for use in Qt signal callbacks (QtScript context loses the _ global)
  var _global = _;

  // --- Create the panel window ---
  var panel = new QWidget();
  panel.windowTitle = opts.title;
  panel.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.Dialog);
  panel.minimumWidth = opts.width;
  panel.maximumWidth = opts.width;
  panel.setAttribute(Qt.WA_DeleteOnClose);

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
  var activateBtn = styledButton({
    label: opts.buttonLabel,
    color: opts.buttonColor,
    width: opts.width - 32,
    height: 38,
    onClick: function () {
      try {
        MessageLog.trace('MeasureLineToolPanel: activating tool...');
        var toolId = Number(scene.metadata('Measure Line Tool', 'int').value);
        if (toolId) {
          Tools.setCurrentTool(toolId);
          MessageLog.trace('MeasureLineToolPanel: activated tool (id=' + toolId + ')');
        } else {
          MessageLog.trace('MeasureLineToolPanel: tool not yet registered.');
        }
      } catch (e) {
        MessageLog.trace('MeasureLineToolPanel: error activating tool: ' + e);
      }
    },
  });

  mainLayout.addWidget(activateBtn, 0, Qt.AlignmentFlag.AlignCenter);

  // --- Close button ---
  var closeBtn = styledButton({
    label: '✕ Close',
    color: '#555555',
    width: opts.width - 32,
    height: 28,
    onClick: function () {
      panel.close();
      _measureLinePanel = null;
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
  _measureLinePanel = panel;

  return panel;
}

function run() {
  if (_measureLinePanel && _measureLinePanel.isVisible()) {
    _measureLinePanel.close();
    _measureLinePanel = null;
  } else {
    showMeasureLinePanel();
  }
}
