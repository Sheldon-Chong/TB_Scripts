include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include('globals.js');
include(specialFolders.userScripts + '/core/CameraSwipe.js');

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
  options: object = {};
  resourceFolder: string = 'resources';
  defaultOptions: object = {};

  public _: HarmonyGlobals = _;
  // Store captured globals so they're accessible in mouse callbacks
  public Shapes = Shapes;
  public Maths = Maths;

  /** Pixels-per-unit scaling for swipe magnitude (higher = more dramatic). */
  public swipeScale: number = 80;
  /** Extra ease frames added to both ease-out and ease-in phases. */
  public extraFrames: number = 0;
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
      var v = preferences.getString(this.preferenceName(), JSON.stringify(this.defaultOptions));
      this.options = JSON.parse(v);
    } catch (e) {
      this.options = this.defaultOptions;
    }
  }

  storeToPreferences() {
    preferences.setString(this.preferenceName(), JSON.stringify(this.options));
  }

  onRegister() {
    MessageLog.trace('Registered tool: MeasureLineTool');
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
      MessageLog.trace('MeasureLineTool: mouse down at ' + JSON.stringify(ctx.currentPoint));

      // Store the starting point
      ctx.origin = ctx.currentPoint;

      return true; // tool consumes the event
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseDown error: ' + e.toString());
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
        var angle = Math.atan2(dy, dx);

        // Snap to nearest 45° increment
        var snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        var dist = Math.sqrt(dx * dx + dy * dy);
        end = {
          x: start.x + Math.cos(snapAngle) * dist,
          y: start.y + Math.sin(snapAngle) * dist,
        };
      }

      // Draw the measurement line
      var lineColor = ctx.shiftPressed
        ? MeasureLineTool.COLORS.lineSnapped
        : MeasureLineTool.COLORS.lineDefault;

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
      ctx.lastAngle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.overlay = { paths: overlayPaths };
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseMove error: ' + e.toString());
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
      var angleDeg = Math.round((angleRad * 180) / Math.PI);

      // Only apply swipe if the line has meaningful length
      if (dist > 2) {
        // Direction: normalized vector from start → end
        var dirX = Math.cos(angleRad);
        var dirY = Math.sin(angleRad);

        // Scale magnitude by line length relative to swipeScale
        var magnitude = dist / this.swipeScale;

        var camPeg = this._.LayerManager.getNodeLayer(this.cameraPegPath);
        var pos = camPeg.position;
        var sel = new this._.oSelection();
        var startFrame = sel.startFrame;

        scene.beginUndoRedoAccum('Camera Swipe');
        this._.CameraSwipe.apply(pos, startFrame, [dirX, dirY], magnitude, this.extraFrames);
        scene.endUndoRedoAccum();

        var msg =
          'Swipe: ' +
          Math.round(dist) +
          'px @ ' +
          angleDeg +
          '\u00B0  |  mag: ' +
          magnitude.toFixed(2);
        MessageLog.trace('MeasureLineTool: ' + msg);
        this.showMeasureToast(msg, 1500);
      }
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseUp error: ' + e.toString());
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
    var toast = new QWidget();
    toast.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);

    var styleSheet =
      'QWidget { background-color: rgba(30,30,30,0.85); color: #00ccff; ' +
      'border-radius: 8px; padding: 8px 14px; ' +
      'font-family: Arial; font-size: 11pt; font-weight: bold; }';
    toast.setStyleSheet(styleSheet);

    var layout = new QHBoxLayout(toast);
    layout.addWidget(new QLabel(labelText), 0, 0);

    toast.setAttribute(Qt.WA_DeleteOnClose);

    var win = QApplication.activeWindow();
    if (win && win.geometry) {
      var geom = win.geometry;
      toast.move(geom.x() + 10, geom.y() + 10);
    }

    toast.show();

    var timer = new QTimer();
    timer.singleShot = true;
    timer.timeout.connect(function () {
      toast.close();
    });
    timer.start(duration || 1500);
  }

  loadPanel(dialog: any, responder: any) {}

  refreshPanel(dialog: any, responder: any) {}
}

//////////////////////////////////////////////////////////
// Registration — called when the script loads
//////////////////////////////////////////////////////////

function evalData() {
  try {
    var toolInstance = new MeasureLineTool();
    var tid = Tools.registerTool(toolInstance);

    // Auto-activate the tool on load
    Tools.setCurrentTool(tid);

    // Also register an action with a shortcut so you can re-activate it later
    registerAction({
      name: 'Measure Line Tool',
      icon: 'earth.png',
      callback: function () {
        Tools.setCurrentTool(tid);
      },
      shortcut: 'Ctrl+Alt+M',
    });

    MessageLog.trace('MeasureLineTool registered with ID: ' + tid);
  } catch (e) {
    MessageLog.trace('Error initializing MeasureLineTool: ' + e.toString());
    MessageLog.trace(e.stack);
  }
}
