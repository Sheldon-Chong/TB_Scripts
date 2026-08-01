include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include('globals.js');
include('KeyframeProfiles.js');
include(specialFolders.userScripts + '/FrameSnapping.js');
_.CameraSwipe = CameraSwipe;
_.FrameSnapping = FrameSnapping;
G.FrameSnapping = FrameSnapping;

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
  // Store captured globals so they're accessible in mouse callbacks
  public Shapes = Shapes;
  public Maths = Maths;
  public Math = Math;

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
      MessageLog.trace(new this._.Vec2(1).toString());
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
      ctx.lastAngle = this.Math.atan2(end.y - start.y, end.x - start.x);

      ctx.overlay = { paths: overlayPaths };
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseMove error: ' + e.toString());
      MessageLog.trace(e.stack);
      MessageLog.trace(JSON.stringify(e));
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
        var dirVec = new this._.Vec2(end).subtract(start).normalized();

        // Scale magnitude by line length relative to swipeScale
        var magnitude = dist / this.swipeScale;

        var camPeg = this._.LayerManager.getNodeLayer(this.cameraPegPath) as oPegNode;
        if (!camPeg) {
          MessageLog.trace(
            "MeasureLineTool: Camera peg '" + this.cameraPegPath + "' not found in scene.",
          );
        } else {
          var pos = camPeg.position as oPathColumn3D;
          var sel = new this._.oSelection();
          var startFrame = sel.startFrame;

          // Snap to nearest boundary frame if option is enabled
          if (this.options.snapToBoundary) {
            startFrame = this._.FrameSnapping.getNearestBoundaryFrame(startFrame) - 1;
          }

          scene.beginUndoRedoAccum('Camera Swipe');
          this._.CameraSwipe.applyCameraSwipe(pos, startFrame, dirVec, 0);
          scene.endUndoRedoAccum();

          var msg =
            'Swipe: ' +
            this.Math.round(dist) +
            'px @ ' +
            angleDeg +
            '\u00B0  |  mag: ' +
            magnitude.toFixed(2);
          MessageLog.trace('MeasureLineTool: ' + msg);
          this.showMeasureToast(msg, 1500);
        }
      }
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseUp error: ' + e.toString());
      MessageLog.trace(e.stack);
      MessageLog.trace(JSON.stringify(e));
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

  loadPanel(dialog: any, responder: any) {
    try {
      var snapCheckbox = new QCheckBox('Snap to nearest boundary (every 32 frames)');
      snapCheckbox.setChecked(this.options.snapToBoundary);
      snapCheckbox.toggled.connect(this, function (checked: boolean) {
        this.options.snapToBoundary = checked;
        this.storeToPreferences();
        responder.settingsChanged();
      });

      var layout = new QVBoxLayout(dialog);
      layout.setContentsMargins(8, 8, 8, 8);
      layout.addWidget(snapCheckbox, 0, 0);
      layout.addStretch(1);

      // Store reference so refreshPanel can find the widgets
      (this as any).ui = { snapCheckbox: snapCheckbox };
    } catch (e) {
      MessageLog.trace('MeasureLineTool loadPanel error: ' + e.toString());
    }
  }

  refreshPanel(dialog: any, responder: any) {
    try {
      var ui = (this as any).ui;
      if (ui && ui.snapCheckbox) {
        ui.snapCheckbox.setChecked(this.options.snapToBoundary);
      }
    } catch (e) {
      MessageLog.trace('MeasureLineTool refreshPanel error: ' + e.toString());
    }
  }
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
    _._measureLineToolId = _measureLineToolId;

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
