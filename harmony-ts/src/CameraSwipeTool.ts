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
    const selection = new G.oSelection();
    const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
    const pos = camPeg.position as oPathColumn3D;

    G.KeyframeGeneratorKit.generateShake(pos, selection.startFrame, selection.endFrame, 10, 3);
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

function register() {
  var COLORS = {
    lineDefault: { r: 0, g: 200, b: 255, a: 200 },
    lineSnapped: { r: 0, g: 255, b: 0, a: 200 },
  };

  var _cameraSwipeToolId: any = null;

  // Capture user-defined globals that Harmony's C++ dispatcher can't see
  _cameraSwipeToolId = SceneKit.registerTool({
    _: G,
    Shapes: Shapes,
    Maths: Maths,
    COLORS: COLORS,

    name: MEASURE_LINE_TOOL_ID,
    displayName: 'Camera Swipe Tool',
    icon: 'MyTool.png',
    toolType: 'drawing',
    canBeOverridenBySelectOrTransformTool: false,
    options: { snapToBoundary: true },
    resourceFolder: 'resources',
    defaultOptions: { snapToBoundary: true },

    swipeScale: 80,
    cameraPegPath: 'Top/Camera-P',

    preferenceName: function () {
      return `${this.name}.settings`;
    },

    loadFromPreferences: function () {
      try {
        var v = preferences.getString(this.preferenceName(), JSON.stringify(this.defaultOptions));
        this.options = JSON.parse(v);
      } catch (e) {
        this.options = this.defaultOptions;
      }
    },

    storeToPreferences: function () {
      preferences.setString(this.preferenceName(), JSON.stringify(this.options));
    },

    onRegister: function () {
      MessageLog.trace('Registered tool: CameraSwipeTool');
      this.loadFromPreferences();
    },

    onCreate: function (ctx: any) {
      ctx.origin = null;
    },

    onMouseDown: function (ctx: any): boolean {
      try {
        MessageLog.trace(new G.Vec2(1).toString());
        MessageLog.trace(`CameraSwipeTool: mouse down at ${JSON.stringify(ctx.currentPoint)}`);
        ctx.origin = ctx.currentPoint;
        return true;
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool onMouseDown error: ${e.toString()}`);
        return false;
      }
    },

    onMouseMove: function (ctx: any): boolean {
      if (!ctx.origin) return true;

      try {
        var overlayPaths: any[] = [];
        var start = ctx.origin;
        var end = ctx.currentPoint;

        if (ctx.shiftPressed) {
          var dx = end.x - start.x;
          var dy = end.y - start.y;
          var angle = Math.atan2(dy, dx);
          var snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          var dist = Math.sqrt(dx * dx + dy * dy);
          end = {
            x: start.x + Math.cos(snapAngle) * dist,
            y: start.y + Math.sin(snapAngle) * dist,
          };
        }

        var lineColor = ctx.shiftPressed ? this.COLORS.lineSnapped : this.COLORS.lineDefault;

        var line = new G.Shapes.Line({ start: start, end: end, color: lineColor });
        overlayPaths.push({ path: line.toPath(), color: line.color });

        var dotRadius = 4;
        var startDot = new G.Shapes.Rectangle({
          center: start,
          width: dotRadius * 2,
          height: dotRadius * 2,
          color: { r: 255, g: 255, b: 255, a: 200 },
        });
        var endDot = new G.Shapes.Rectangle({
          center: end,
          width: dotRadius * 2,
          height: dotRadius * 2,
          color: { r: 0, g: 200, b: 255, a: 200 },
        });
        overlayPaths.push({ path: startDot.toPath(), color: startDot.color });
        overlayPaths.push({ path: endDot.toPath(), color: endDot.color });

        ctx.lastDistance = this.Maths.distance2d(start, end);
        ctx.lastAngle = Math.atan2(end.y - start.y, end.x - start.x);

        ctx.overlay = { paths: overlayPaths };
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool onMouseMove error: ${e.toString()}`);
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }

      return true;
    },

    onMouseUp: function (ctx: any): boolean {
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
    },

    onResetTool: function (ctx: any) {
      ctx.origin = null;
      ctx.lastDistance = null;
      ctx.lastAngle = null;
      ctx.overlay = {};
    },

    showMeasureToast: function (labelText: string, duration: number) {
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
    },

    loadPanel: function (dialog: any, responder: any) {
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
    },

    refreshPanel: function (dialog: any, responder: any) {
      try {
        var ui = this.ui;
        if (ui && ui.snapCheckbox) {
          ui.snapCheckbox.setChecked(this.options.snapToBoundary);
        }
      } catch (e) {
        MessageLog.trace(`CameraSwipeTool refreshPanel error: ${e.toString()}`);
      }
    },
  });

  registerAction({
    name: 'Camera Swipe Tool',
    icon: 'earth.png',
    callback: activateCameraSwipeTool,
    shortcut: 'Ctrl+Alt+M',
    category: 'custom',
  });
  registerAction({
    name: 'Apply shake',
    icon: 'earth.png',
    callback: activateApplyShakeTool,
    shortcut: 'Ctrl+Alt+M',
    category: 'custom',
  });
  registerAction({
    name: 'Apply Zoom',
    icon: 'earth.png',
    callback: activateApplyZoomTool,
    shortcut: 'Ctrl+Alt+M',
    category: 'custom',
  });

  updateToolbars();
  // Tools.setCurrentTool(MEASURE_LINE_TOOL_ID);

  MessageLog.trace('CameraSwipeTool evaluateAndRun triggered');
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
