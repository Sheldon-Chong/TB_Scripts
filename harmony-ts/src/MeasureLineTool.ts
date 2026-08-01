include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include('globals.js');
include('KeyframeProfiles.js');
include(specialFolders.userScripts + '/FrameSnapping.js');
_.CameraSwipe = CameraSwipe;
_.FrameSnapping = FrameSnapping;
G.FrameSnapping = FrameSnapping;

//////////////////////////////////////////////////////////
// captureGlobals — copies all needed globals onto an
// object so they survive Harmony's tool-callback scope
// chain breakage.  Call once in your constructor.
//////////////////////////////////////////////////////////

// Qt globals provided by Harmony's QtScript runtime
declare var QApplication: any;
declare var QFrame: any;
declare var QTimer: any;

function captureGlobals(target: any) {
  // 1. Flatten all _ namespace properties (Vec2, LayerManager, etc.)
  for (var key in _) {
    if (Object.prototype.hasOwnProperty.call(_, key)) {
      target[key] = _[key];
    }
  }
  // 2. Standalone Harmony globals
  target.scene = scene;
  target.MessageLog = MessageLog;
  target.Tools = Tools;
  target.preferences = preferences;
  // 3. JS built-ins
  target.JSON = JSON;
  // 4. Qt widget classes
  target.QWidget = QWidget;
  target.Qt = Qt;
  target.QApplication = QApplication;
  target.QCheckBox = QCheckBox;
  target.QVBoxLayout = QVBoxLayout;
  target.QHBoxLayout = QHBoxLayout;
  target.QLabel = QLabel;
  target.QFrame = QFrame;
  target.QTimer = QTimer;
  // 5. Included script globals
  target.Shapes = Shapes;
  target.Maths = Maths;
  target.CameraSwipe = CameraSwipe;
  target.FrameSnapping = FrameSnapping;
  target.G = G;
  target.registerAction = registerAction;
  // 6. Overwrite _.Math (which is the Maths utility) with real JS Math
  target.Math = Math;
  // 7. Static class members that methods reference by name
  target.COLORS = MeasureLineTool.COLORS;
}

interface HarmonyTool {}

/**
 * MeasureLineTool → Camera Swipe
 *
 * Mouse down: marks first point.
 * Drag: draws a line overlay from start to current position.
 * Mouse up: applies a camera swipe in the direction of the line.
 *   - Direction = normalized vector from start → end
 *   - Magnitude scales with line length (longer line = bigger swipe)
 *   - Hold Shift to snap to 45° increments
 */
class MeasureLineTool implements HarmonyTool {
  name: string = 'com.toonboom.measureLineTool';
  displayName: string = 'Measure Line Tool';
  icon: string = 'MyTool.png';
  toolType: string = 'drawing';
  canBeOverridenBySelectOrTransformTool: boolean = false;
  options: { snapToBoundary: boolean } = { snapToBoundary: true };
  resourceFolder: string = 'resources';
  defaultOptions: { snapToBoundary: boolean } = { snapToBoundary: true };

  public _: HarmonyGlobals = _;
  // All globals are populated by captureGlobals() in the constructor.
  // The explicit assignments below are fallbacks in case captureGlobals
  // hasn't run yet (they get overwritten by the capture).
  public Shapes = Shapes;
  public Maths = Maths;
  public Math = Math;

  constructor() {
    captureGlobals(this);
  }

  /** Pixels-per-unit scaling for swipe magnitude (higher = more dramatic). */
  public swipeScale: number = 80;
  /** Extra ease frames added to both ease-out and ease-in phases. */
  /** Camera peg node path. */
  public cameraPegPath: string = 'Top/Camera-P';

  static COLORS = {
    lineDefault: { r: 0, g: 200, b: 255, a: 200 }, // cyan line
    lineSnapped: { r: 0, g: 255, b: 0, a: 200 }, // green when holding shift (horizontal/vertical snap)
  };

  preferenceName() {
    return this.name + '.settings';
  }

  loadFromPreferences() {
    try {
      var v = this.preferences.getString(
        this.preferenceName(),
        this.JSON.stringify(this.defaultOptions),
      );
      this.options = this.JSON.parse(v);
    } catch (e) {
      this.options = this.defaultOptions;
    }
  }

  storeToPreferences() {
    this.preferences.setString(this.preferenceName(), this.JSON.stringify(this.options));
  }

  onRegister() {
    this.MessageLog.trace('Registered tool: MeasureLineTool');
    this.loadFromPreferences();
  }

  onCreate(ctx: any) {
    ctx.origin = null;
  }

  /**
   * onMouseDown — marks the first point.
   */
  onMouseDown(ctx: any): boolean {
    try {
      this.MessageLog.trace(new this.Vec2(1).toString());
      this.MessageLog.trace(
        'MeasureLineTool: mouse down at ' + this.JSON.stringify(ctx.currentPoint),
      );

      // Store the starting point
      ctx.origin = ctx.currentPoint;

      return true;
    } catch (e) {
      this.MessageLog.trace('MeasureLineTool onMouseDown error: ' + e.toString());
      return false;
    }
  }

  /**
   * onMouseMove — draws a line from the origin (first point)
   * to the current mouse position on the canvas.
   */
  onMouseMove(ctx: any): boolean {
    if (!ctx.origin) return true;

    try {
      var overlayPaths: any[] = [];

      var start = ctx.origin;
      var end = ctx.currentPoint;

      // Shift snaps to horizontal / vertical / 45°
      if (ctx.shiftPressed) {
        var dx = end.x - start.x;
        var dy = end.y - start.y;
        var angle = this.Math.atan2(dy, dx);

        // Snap to nearest 45° increment
        var snapAngle = this.Math.round(angle / (this.Math.PI / 4)) * (this.Math.PI / 4);
        var dist = this.Math.sqrt(dx * dx + dy * dy);
        end = {
          x: start.x + this.Math.cos(snapAngle) * dist,
          y: start.y + this.Math.sin(snapAngle) * dist,
        };
      }

      // Draw the measurement line
      var lineColor = ctx.shiftPressed ? this.COLORS.lineSnapped : this.COLORS.lineDefault;

      var line = new this.Shapes.Line({
        start: start,
        end: end,
        color: lineColor,
      });

      overlayPaths.push({
        path: line.toPath(),
        color: line.color,
      });

      // Draw small circles at start and end points
      var dotRadius = 4;
      var startDot = new this.Shapes.Rectangle({
        center: start,
        width: dotRadius * 2,
        height: dotRadius * 2,
        color: { r: 255, g: 255, b: 255, a: 200 },
      });
      var endDot = new this.Shapes.Rectangle({
        center: end,
        width: dotRadius * 2,
        height: dotRadius * 2,
        color: { r: 0, g: 200, b: 255, a: 200 },
      });

      overlayPaths.push({
        path: startDot.toPath(),
        color: startDot.color,
      });
      overlayPaths.push({
        path: endDot.toPath(),
        color: endDot.color,
      });

      // Cache distance/angle for onMouseUp toast
      ctx.lastDistance = this.Maths.distance2d(start, end);
      ctx.lastAngle = this.Math.atan2(end.y - start.y, end.x - start.x);

      ctx.overlay = { paths: overlayPaths };
    } catch (e) {
      this.MessageLog.trace('MeasureLineTool onMouseMove error: ' + e.toString());
      this.MessageLog.trace(e.stack);
      this.MessageLog.trace(this.JSON.stringify(e));
    }

    return true;
  }

  /**
   * onMouseUp — applies a camera swipe using the direction vector
   * from the drawn line, then resets the context.
   */
  onMouseUp(ctx: any): boolean {
    if (!ctx.origin) return true;

    try {
      var start = ctx.origin;
      var end = ctx.currentPoint;
      var dist = ctx.lastDistance || 0;
      var angleRad = ctx.lastAngle || 0;
      var angleDeg = this.Math.round((angleRad * 180) / this.Math.PI);

      // Only apply swipe if the line has meaningful length
      if (dist > 2) {
        // Direction: normalized vector from start → end
        var dirVec = new this.Vec2(end).subtract(start).normalized();

        // Scale magnitude by line length relative to swipeScale
        var magnitude = dist / this.swipeScale;

        var camPeg = this.LayerManager.getNodeLayer(this.cameraPegPath) as oPegNode;
        if (!camPeg) {
          this.MessageLog.trace(
            "MeasureLineTool: Camera peg '" + this.cameraPegPath + "' not found in scene.",
          );
        } else {
          var pos = camPeg.position as oPathColumn3D;
          var sel = new this.oSelection();
          var startFrame = sel.startFrame;

          // Snap to nearest boundary frame if option is enabled
          if (this.options.snapToBoundary) {
            startFrame = this.FrameSnapping.getNearestBoundaryFrame(startFrame) - 1;
          }

          this.scene.beginUndoRedoAccum('Camera Swipe');
          this.CameraSwipe.applyCameraSwipe(pos, startFrame, dirVec, 0);
          this.scene.endUndoRedoAccum();

          var msg =
            'Swipe: ' +
            this.Math.round(dist) +
            'px @ ' +
            angleDeg +
            '\u00B0  |  mag: ' +
            magnitude.toFixed(2);
          this.MessageLog.trace('MeasureLineTool: ' + msg);
          this.showMeasureToast(msg, 1500);
        }
      }
    } catch (e) {
      this.MessageLog.trace('MeasureLineTool onMouseUp error: ' + e.toString());
      this.MessageLog.trace(e.stack);
      this.MessageLog.trace(this.JSON.stringify(e));
    }

    // Reset
    ctx.origin = null;
    ctx.lastDistance = null;
    ctx.lastAngle = null;
    ctx.overlay = {};

    return true;
  }

  onResetTool(ctx: any) {
    ctx.origin = null;
    ctx.lastDistance = null;
    ctx.lastAngle = null;
    ctx.overlay = {};
  }

  /**
   * Shows a floating toast widget with the measurement info.
   */
  showMeasureToast(labelText: string, duration: number) {
    var toast = new this.QWidget();
    toast.setWindowFlags(
      this.Qt.WindowStaysOnTopHint | this.Qt.FramelessWindowHint | this.Qt.ToolTip,
    );

    var styleSheet =
      'QWidget { background-color: rgba(30,30,30,0.85); color: #00ccff; ' +
      'border-radius: 8px; padding: 8px 14px; ' +
      'font-family: Arial; font-size: 11pt; font-weight: bold; }';
    toast.setStyleSheet(styleSheet);

    var layout = new this.QHBoxLayout(toast);
    layout.addWidget(new this.QLabel(labelText), 0, 0);

    toast.setAttribute(this.Qt.WA_DeleteOnClose);

    var win = this.QApplication.activeWindow();
    if (win && win.geometry) {
      var geom = win.geometry;
      toast.move(geom.x() + 10, geom.y() + 10);
    }

    toast.show();

    var timer = new this.QTimer();
    timer.singleShot = true;
    timer.timeout.connect(function () {
      toast.close();
    });
    timer.start(duration || 1500);
  }

  loadPanel(dialog: any, responder: any) {
    try {
      var snapCheckbox = new this.QCheckBox('Snap to nearest boundary (every 32 frames)');
      snapCheckbox.setChecked(this.options.snapToBoundary);
      snapCheckbox.toggled.connect(this, function (checked: boolean) {
        this.options.snapToBoundary = checked;
        this.storeToPreferences();
        responder.settingsChanged();
      });

      var layout = new this.QVBoxLayout(dialog);
      layout.setContentsMargins(8, 8, 8, 8);
      layout.addWidget(snapCheckbox, 0, 0);
      layout.addStretch(1);

      this.ui = { snapCheckbox: snapCheckbox };
    } catch (e) {
      this.MessageLog.trace('MeasureLineTool loadPanel error: ' + e.toString());
    }
  }

  refreshPanel(dialog: any, responder: any) {
    try {
      var ui = this.ui;
      if (ui && ui.snapCheckbox) {
        ui.snapCheckbox.setChecked(this.options.snapToBoundary);
      }
    } catch (e) {
      this.MessageLog.trace('MeasureLineTool refreshPanel error: ' + e.toString());
    }
  }
}

//////////////////////////////////////////////////////////
// Declaration merging — tells TypeScript about all the
// dynamically-captured properties from captureGlobals()
//////////////////////////////////////////////////////////

interface MeasureLineTool {
  MessageLog: any;
  JSON: any;
  Vec2: any;
  preferences: any;
  scene: any;
  LayerManager: any;
  oSelection: any;
  FrameSnapping: any;
  CameraSwipe: any;
  COLORS: typeof MeasureLineTool.COLORS;
  QWidget: any;
  Qt: any;
  QApplication: any;
  QCheckBox: any;
  QVBoxLayout: any;
  QHBoxLayout: any;
  QLabel: any;
  QFrame: any;
  QTimer: any;
  ui: any;
}

//////////////////////////////////////////////////////////
// Registration at startup — runs when the script file is
// loaded (before UI init), so the Tool Properties panel
// can find loadPanel / refreshPanel.
//////////////////////////////////////////////////////////

var _measureLineToolId: any = null;

(function () {
  try {
    var toolInstance = new MeasureLineTool();
    _measureLineToolId = Tools.registerTool(toolInstance);

    MessageLog.trace('MeasureLineTool registered with ID: ' + _measureLineToolId);

    // Expose on global _ namespace so other scripts (e.g. floating panel) can access it
    (_ as any)._measureLineToolId = _measureLineToolId;

    scene.setMetadata({
      name: 'Measure Line Tool',
      type: 'int',
      creator: 'Harmony Premium',
      version: '1.0',
      value: `${_measureLineToolId}`,
    });

    MessageLog.trace('>>' + Number(scene.metadata('Measure Line Tool', 'int').value));

    // Register a keyboard shortcut so the tool can be re-activated
    registerAction({
      name: 'Measure Line Tool',
      icon: 'earth.png',
      callback: function () {
        Tools.setCurrentTool(_measureLineToolId);
      },
      shortcut: 'Ctrl+Alt+M',
    });

    MessageLog.trace('MeasureLineTool registered with ID: ' + _measureLineToolId);
  } catch (e) {
    MessageLog.trace('Error initializing MeasureLineTool: ' + e.toString());
    MessageLog.trace(e.stack);
  }
})();

//////////////////////////////////////////////////////////
// evalData — called by buttonlist.xml on button click.
// Tool is already registered; just activate it.
//////////////////////////////////////////////////////////

function evaluateAndRun() {
  if (_measureLineToolId) {
    Tools.setCurrentTool(_measureLineToolId);
  }
}
