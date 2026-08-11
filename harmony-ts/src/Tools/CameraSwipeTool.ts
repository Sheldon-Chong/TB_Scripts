// include(specialFolders.userScripts + '/core/Shapes.js');
// include(specialFolders.userScripts + '/core/Maths.js');
include('globals.js');
include('KeyframeProfiles.js');
include(specialFolders.userScripts + '/FrameSnapping.js');
this.__proto__.G.CameraSwipe = CameraSwipe;
this.__proto__.G.FrameSnapping = FrameSnapping;
// G.FrameSnapping = FrameSnapping;

// Qt globals provided by Harmony's QtScript runtime
// declare var QApplication: any;
// declare var QTimer: any;

//////////////////////////////////////////////////////////
// CameraSwipeTool — plain object literal, registered
// directly with Tools.registerTool().  No class, no IIFE,
// so all globals (Math, _, scene, MessageLog, etc.) are
// accessible through the normal scope chain.
//////////////////////////////////////////////////////////

// function testShake() {
//   scene.beginUndoRedoAccum('Shake Camera');

//   const selection = new G.oSelection();

//   const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
//   const pos = camPeg.position as oPathColumn3D;

//   generateShake(pos, selection.startFrame, selection.endFrame, 10, 3);

//   scene.endUndoRedoAccum();
// }

function activateCameraSwipeTool() {
  try {
    MessageLog.trace('CameraSwipeTool action triggered');
    Tools.setCurrentTool('com.toonboom.cameraSwipeTool');
  } catch (e) {
    MessageLog.trace(`error: ${e.toString()} | stack: ${e.stack || 'none'}`);
  }
}

include(specialFolders.userScripts + '/KeyframeGenerator.js');

this.__proto__.G.KeyframeGeneratorKit = KeyframeGeneratorKit;

function activateApplyShakeTool() {
  throw new Error('activateApplyShakeTool is disabled for now');

  return;
  try {
    const sel = new G.oSelection();
    const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
    const pos = camPeg.position as oPathColumn3D;

    G.KeyframeGeneratorKit.generateShake(pos, sel.startFrame, sel.endFrame, 10, 3);
    MessageLog.trace('Apply Shake action triggered');
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}

function activateApplyZoomTool() {
  try {
    MessageLog.trace('Apply Zoom action triggered');
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}

const MEASURE_LINE_TOOL_ID = 'com.toonboom.cameraSwipeTool';

function registerCameraSwipeTool() {
  var _cameraSwipeToolId: any = null;

  // CameraSwipeTool — class for proper `this` intellisense.
  // Compiled to ES5 prototype pattern; fully compatible with Harmony's QtScript runtime.
  class CameraSwipeTool {
    // Dependencies injected from register() scope
    _: any;
    Shapes: any;
    Maths: any;
    COLORS = {
      lineDefault: { r: 0, g: 200, b: 255, a: 200 }, // cyan – idle drag
      lineSnapped: { r: 255, g: 180, b: 0, a: 200 }, // amber – angle-locked
      lineActive: { r: 0, g: 255, b: 0, a: 255 }, // green – will apply
    };

    // Tool identity
    name: string = MEASURE_LINE_TOOL_ID;
    displayName: string = 'Camera Swipe Tool';
    icon: string = 'MyTool.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = false;
    options: { snapToBoundary: boolean };
    resourceFolder: string = 'resources';
    defaultOptions: { snapToBoundary: boolean };

    // Custom properties
    swipeScale: number = 80;
    cameraPegPath: string = 'Top/Camera-P';
    ui: { snapCheckbox: any } | undefined;

    constructor(deps: { _: any; Shapes: any; Maths: any }) {
      this._ = deps._;
      this.Shapes = deps.Shapes;
      this.Maths = deps.Maths;
      this.options = { snapToBoundary: true };
      this.defaultOptions = { snapToBoundary: true };
    }

    preferenceName(): string {
      return `${this.name}.settings`;
    }

    loadFromPreferences(): void {
      try {
        var v = preferences.getString(this.preferenceName(), JSON.stringify(this.defaultOptions));
        this.options = JSON.parse(v);
      } catch (e) {
        this.options = this.defaultOptions;
      }
    }

    storeToPreferences(): void {
      preferences.setString(this.preferenceName(), JSON.stringify(this.options));
    }

    onRegister(): void {
      MessageLog.trace('Registered tool: CameraSwipeTool');
      this.loadFromPreferences();
    }

    onCreate(ctx: any): void {
      ctx.origin = null;
    }

    onMouseDown(ctx: any): boolean {
      try {
        MessageLog.trace(new G.Vec2(1).toString());
        ctx.origin = ctx.currentPoint;
        return true;
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool onMouseDown error: ${e.toString()}`);
        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx.origin) return true;

      try {
        var overlayPaths: any[] = [];
        var start = ctx.origin;
        var end = ctx.currentPoint;

        // Compute zoom scale BEFORE shift-snap, using the original end point
        // (after snap, end is a Vec2 without screenX/screenY).
        var rawDiff = new G.Vec2(end).subtract(start);
        var rawFieldDist = rawDiff.length();
        var screenDist = new G.Vec2(end.screenX, end.screenY)
          .subtract(new G.Vec2(start.screenX, start.screenY))
          .length();
        var pxPerFieldUnit = rawFieldDist > 0.001 ? screenDist / rawFieldDist : 1;

        if (ctx.shiftPressed) {
          var angle = Math.atan2(rawDiff.y, rawDiff.x);
          var dist = rawDiff.length();

          // Snap to 16:9 aspect-ratio angles (1920×1080)
          var diag = Math.atan2(9, 16);
          var snapAngles = [
            0,
            diag,
            Math.PI / 2,
            Math.PI - diag,
            Math.PI,
            Math.PI + diag,
            (3 * Math.PI) / 2,
            2 * Math.PI - diag,
          ];

          var best = snapAngles[0];
          var bestDiff = Infinity;
          for (var i = 0; i < snapAngles.length; i++) {
            var d = Math.abs(angle - snapAngles[i]);
            var wrapD = Math.abs(angle - (snapAngles[i] - 2 * Math.PI));
            if (wrapD < d) d = wrapD;
            wrapD = Math.abs(angle - (snapAngles[i] + 2 * Math.PI));
            if (wrapD < d) d = wrapD;
            if (d < bestDiff) {
              bestDiff = d;
              best = snapAngles[i];
            }
          }
          var snapAngle = best;

          end = new G.Vec2(start).add(
            new G.Vec2(Math.cos(snapAngle), Math.sin(snapAngle)).scale(dist),
          );
        }

        // Derive field distance from the (possibly snapped) end point.
        var fieldVec = new G.Vec2(end).subtract(start);
        var fieldDist = fieldVec.length();
        var isActive = fieldDist > 2;

        // Green when active, blue/cyan otherwise (snapped or default)
        var lineColor = isActive
          ? this.COLORS.lineActive
          : ctx.shiftPressed
            ? this.COLORS.lineSnapped
            : this.COLORS.lineDefault;
        var dotColor = isActive ? this.COLORS.lineActive : this.COLORS.lineDefault;

        var line = new G.Shapes.Line({ start, end, color: lineColor });
        overlayPaths.push({ path: line.toPath(), color: line.color });

        var screenDotRadius = 6; // desired radius in screen pixels
        var dotRadius = screenDotRadius / pxPerFieldUnit;
        var dot = new G.Vec2(dotRadius * 2).toWidthHeight();

        var startDot = new G.Shapes.Rectangle({
          center: start,
          ...dot,
        });
        var endDot = new G.Shapes.Rectangle({
          center: end,
          ...dot,
        });
        var startDotColor = isActive ? this.COLORS.lineActive : this.COLORS.lineDefault;
        overlayPaths.push({ path: startDot.toPath(), color: startDotColor });
        overlayPaths.push({ path: endDot.toPath(), color: dotColor });

        ctx.lastDistance = fieldDist;
        ctx.lastAngle = Math.atan2(fieldVec.y, fieldVec.x);

        ctx.overlay = { paths: overlayPaths };
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool onMouseMove error: ${e.toString()}`);
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx.origin) return true;

      try {
        var start = ctx.origin;
        var end = ctx.currentPoint;
        var dist = ctx.lastDistance || 0;
        var angleRad = ctx.lastAngle || 0;
        var angleDeg = Math.round((angleRad * 180) / Math.PI);

        if (dist > 2) {
          var dirVec = new G.Vec2(end).subtract(start).normalized();
          var magnitude = dist / this.swipeScale;

          var camPeg = G.LayerManager.getNodeLayer(this.cameraPegPath) as oPegNode;
          if (!camPeg) {
            MessageLog.trace(
              `CameraSwipeTool: Camera peg '${this.cameraPegPath}' not found in scene.`,
            );
          } else {
            var pos = camPeg.position as oPathColumn3D;
            var sel = new G.oSelection();
            var startFrame = sel.startFrame;

            if (this.options.snapToBoundary) {
              startFrame = G.FrameSnapping.getNearestBoundaryFrame(startFrame) - 1;
            }

            scene.beginUndoRedoAccum('Camera Swipe');
            G.CameraSwipe.applyCameraSwipe(pos, startFrame, dirVec, 0);
            scene.endUndoRedoAccum();

            var msg = `Swipe: ${Math.round(dist)}px @ ${angleDeg}\u00B0  |  mag: ${magnitude.toFixed(2)}`;
            MessageLog.trace(`CameraSwipeTool: ${msg}`);
            this.showMeasureToast(msg, 1500);
          }
        }
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool onMouseUp error: ${e.toString()}`);
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }

      ctx.origin = null;
      ctx.lastDistance = null;
      ctx.lastAngle = null;
      ctx.overlay = {};

      return true;
    }

    onResetTool(ctx: any): void {
      ctx.origin = null;
      ctx.lastDistance = null;
      ctx.lastAngle = null;
      ctx.overlay = {};
    }

    showMeasureToast(labelText: string, duration: number): void {
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

    loadPanel(dialog: any, responder: any): void {
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

        this.ui = { snapCheckbox: snapCheckbox };
      } catch (e) {
        MessageLog.trace('CameraSwipeTool loadPanel error: ' + e.toString());
      }
    }

    refreshPanel(dialog: any, responder: any): void {
      try {
        var ui = this.ui;
        if (ui && ui.snapCheckbox) {
          ui.snapCheckbox.setChecked(this.options.snapToBoundary);
        }
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool refreshPanel error: ${e.toString()}`);
      }
    }
  }

  // Capture user-defined globals that Harmony's C++ dispatcher can't see
  _cameraSwipeToolId = SceneKit.registerTool(
    new CameraSwipeTool({ _: G, Shapes: Shapes, Maths: Maths }),
  );

  registerAction({
    name: 'Camera Swipe Tool',
    icon: 'earth.png',
    callback: activateCameraSwipeTool,
    shortcut: 'Ctrl+Alt+M',
    category: 'custom',
  });
}
//////////////////////////////////////////////////////////
// evalData — called by buttonlist.xml on button click.
// Tool is already registered; just activate it.
//////////////////////////////////////////////////////////

function evaluateAndRunCameraSwipeTool() {
  try {
    MessageLog.trace('CameraSwipeTool evaluateAndRun triggered');
    Tools.setCurrentTool(MEASURE_LINE_TOOL_ID);
  } catch (e) {
    MessageLog.trace(`error: ${e.toString()} | stack: ${e.stack || 'none'}`);
  }
}
