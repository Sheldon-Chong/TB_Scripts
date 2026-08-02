include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include('globals.js');
include('KeyframeProfiles.js');
include(specialFolders.userScripts + '/FrameSnapping.js');
_.CameraSwipe = CameraSwipe;
_.FrameSnapping = FrameSnapping;
G.FrameSnapping = FrameSnapping;

// Qt globals provided by Harmony's QtScript runtime
declare var QApplication: any;
declare var QTimer: any;

//////////////////////////////////////////////////////////
// MeasureLineTool — plain object literal, registered
// directly with Tools.registerTool().  No class, no IIFE,
// so all globals (Math, _, scene, MessageLog, etc.) are
// accessible through the normal scope chain.
//////////////////////////////////////////////////////////

var COLORS = {
  lineDefault: { r: 0, g: 200, b: 255, a: 200 },
  lineSnapped: { r: 0, g: 255, b: 0, a: 200 },
};

var _measureLineToolId: any = null;

_measureLineToolId = Tools.registerTool({
  // Capture user-defined globals that Harmony's C++ dispatcher can't see
  _: _,
  Shapes: Shapes,
  Maths: Maths,
  COLORS: COLORS,

  name: 'com.toonboom.measureLineTool',
  displayName: 'Measure Line Tool',
  icon: 'MyTool.png',
  toolType: 'drawing',
  canBeOverridenBySelectOrTransformTool: false,
  options: { snapToBoundary: true },
  resourceFolder: 'resources',
  defaultOptions: { snapToBoundary: true },

  swipeScale: 80,
  cameraPegPath: 'Top/Camera-P',

  preferenceName: function () {
    return this.name + '.settings';
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
    MessageLog.trace('Registered tool: MeasureLineTool');
    this.loadFromPreferences();
  },

  onCreate: function (ctx: any) {
    ctx.origin = null;
  },

  onMouseDown: function (ctx: any): boolean {
    try {
      MessageLog.trace(new this._.Vec2(1).toString());
      MessageLog.trace('MeasureLineTool: mouse down at ' + JSON.stringify(ctx.currentPoint));
      ctx.origin = ctx.currentPoint;
      return true;
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseDown error: ' + e.toString());
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

      var line = new this._.Shapes.Line({ start: start, end: end, color: lineColor });
      overlayPaths.push({ path: line.toPath(), color: line.color });

      var dotRadius = 4;
      var startDot = new this._.Shapes.Rectangle({
        center: start,
        width: dotRadius * 2,
        height: dotRadius * 2,
        color: { r: 255, g: 255, b: 255, a: 200 },
      });
      var endDot = new this._.Shapes.Rectangle({
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
      MessageLog.trace('MeasureLineTool onMouseMove error: ' + e.toString());
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
        var dirVec = new this._.Vec2(end).subtract(start).normalized();
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

          if (this.options.snapToBoundary) {
            startFrame = this._.FrameSnapping.getNearestBoundaryFrame(startFrame) - 1;
          }

          scene.beginUndoRedoAccum('Camera Swipe');
          this._.CameraSwipe.applyCameraSwipe(pos, startFrame, dirVec, 0);
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
      }
    } catch (e) {
      MessageLog.trace('MeasureLineTool onMouseUp error: ' + e.toString());
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
      MessageLog.trace('MeasureLineTool loadPanel error: ' + e.toString());
    }
  },

  refreshPanel: function (dialog: any, responder: any) {
    try {
      var ui = this.ui;
      if (ui && ui.snapCheckbox) {
        ui.snapCheckbox.setChecked(this.options.snapToBoundary);
      }
    } catch (e) {
      MessageLog.trace('MeasureLineTool refreshPanel error: ' + e.toString());
    }
  },
});

//////////////////////////////////////////////////////////
// Post-registration setup
//////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////
// evalData — called by buttonlist.xml on button click.
// Tool is already registered; just activate it.
//////////////////////////////////////////////////////////

function evaluateAndRun() {
  if (_measureLineToolId) {
    Tools.setCurrentTool(_measureLineToolId);
  }
}
