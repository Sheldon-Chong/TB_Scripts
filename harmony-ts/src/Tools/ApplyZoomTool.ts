// ApplyZoomTool.ts — draws a rectangle from the center of the field.
// The rectangle is centered at (0, 0) and grows symmetrically;
// the mouse position defines the half-width and half-height.

include('globals.js');
include(specialFolders.userScripts + '/KeyframeGenerator.js');
this.__proto__.G.KeyframeGeneratorKit = KeyframeGeneratorKit;

function activateApplyZoomTool() {
  MessageLog.trace('[ApplyZoomTool.ts] ' + 'test');
  try {
    MessageLog.trace('ApplyZoomTool action triggered');
    Tools.setCurrentTool('com.toonboom.applyZoomTool');
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}

const APPLY_ZOOM_TOOL_ID = 'com.toonboom.applyZoomTool';

function registerApplyZoomTool() {
  var _applyZoomToolId: any = null;

  class ApplyZoomTool {
    _: any;
    Shapes: any;

    COLORS = {
      rect: { r: 0, g: 200, b: 255, a: 200 }, // cyan
      rectActive: { r: 0, g: 255, b: 0, a: 255 }, // green
    };

    name: string = APPLY_ZOOM_TOOL_ID;
    displayName: string = 'Apply Zoom Tool';
    icon: string = 'MyTool.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = false;
    options: any = {};
    resourceFolder: string = 'resources';
    defaultOptions: any = {};

    constructor(deps: { _: any; Shapes: any }) {
      this._ = deps._;
      this.Shapes = deps.Shapes;
    }

    onRegister(): void {
      MessageLog.trace('Registered tool: ApplyZoomTool');
    }

    onCreate(ctx: any): void {
      ctx._rectCenter = null;
    }

    // ---- helpers ----

    onMouseDown(ctx: any): boolean {
      try {
        ctx._rectCenter = ctx.currentPoint;
        return true;
      } catch (e) {
        MessageLog.trace('ApplyZoomTool onMouseDown error: ' + e.toString());
        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx._rectCenter) return true;

      try {
        var cs = ctx._rectCenter;
        var cm = ctx.currentPoint;

        // Draw overlay in field coordinates.
        var center = new G.Vec2(cs);
        var mouse = new G.Vec2(cm);
        var half = mouse.subtract(center);
        var start = center.subtract(half);
        var end = center.add(half);

        var fdx = cm.x - cs.x;
        var fdy = cm.y - cs.y;
        var fieldDist = Math.sqrt(fdx * fdx + fdy * fdy);
        var isActive = fieldDist > 2;
        var color = isActive ? this.COLORS.rectActive : this.COLORS.rect;

        // Store drag in screen pixels (scale-independent).
        // Screen Y is inverted (down = positive) but field Y goes up,
        // so we negate screenDY so dragging up on screen → positive field Y.
        ctx._dragX = cm.screenX - cs.screenX;
        ctx._dragY = cs.screenY - cm.screenY;

        var rect = new G.Shapes.Rectangle({ start: start, end: end, color: color });
        ctx.overlay = { paths: [{ path: rect.toPath(), color: rect.color }] };
      } catch (e) {
        MessageLog.trace('ApplyZoomTool onMouseMove error: ' + e.toString());
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx._rectCenter) return true;

      // Guard against click-without-drag (onMouseMove never fired)
      if (typeof ctx._dragX === 'undefined' || typeof ctx._dragY === 'undefined') {
        ctx._rectCenter = null;
        ctx.overlay = {};
        return true;
      }

      try {
        var camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
        if (!camPeg) {
          MessageLog.trace('ApplyZoomTool: Camera peg not found.');
        } else {
          var pos = camPeg.position as oPathColumn3D;
          var sel = new G.oSelection();
          var startFrame = sel.startFrame;
          var endFrame = sel.endFrame;

          // Direction: from camera toward the click point (the rectangle
          // is centered on the click, so that's where the zoom should go).
          // Magnitude: screen-pixel drag distance (scale-independent).
          // The two are combined so drag size controls intensity while
          // the click position controls direction.
          var baseX = pos.getXVal(startFrame);
          var baseY = pos.getYVal(startFrame);
          var dirX = ctx._rectCenter.x - baseX;
          var dirY = ctx._rectCenter.y - baseY;
          var dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
          var dragLen = Math.sqrt(ctx._dragX * ctx._dragX + ctx._dragY * ctx._dragY);

          var sensitivity = 0.08;
          var scale = dragLen * sensitivity;
          var xy: G.Vec2;
          if (dirLen > 0.001) {
            xy = new G.Vec2((dirX / dirLen) * scale, (dirY / dirLen) * scale);
          } else {
            xy = new G.Vec2(0, 0);
          }

          MessageLog.trace(
            '[ApplyZoomTool] clickDir=(' +
              dirX.toFixed(1) +
              ', ' +
              dirY.toFixed(1) +
              ') | dragPx=' +
              dragLen.toFixed(1) +
              ' | scale=' +
              scale.toFixed(3) +
              ' | xy=(' +
              xy.x.toFixed(2) +
              ', ' +
              xy.y.toFixed(2) +
              ')',
          );

          scene.beginUndoRedoAccum('Apply Zoom');

          startFrame = G.FrameSnapping.getNearestBoundaryFrame(startFrame) - 4;
          G.KeyframeGeneratorKit.generateZoom(pos, startFrame, endFrame, xy);
          G.TimelineKit.setCurrentFrame(startFrame);
          scene.endUndoRedoAccum();
        }
      } catch (e) {
        MessageLog.trace('ApplyZoomTool onMouseUp error: ' + e.toString());
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }
      G.TimelineKit.setCurrentFrame(new G.oSelection().startFrame);

      ctx._rectCenter = null;
      ctx._dragX = undefined;
      ctx._dragY = undefined;
      ctx.overlay = {};

      return true;
    }

    onResetTool(ctx: any): void {
      ctx._rectCenter = null;
      ctx._dragX = undefined;
      ctx._dragY = undefined;
      ctx.overlay = {};
    }
  }

  _applyZoomToolId = SceneKit.registerTool(new ApplyZoomTool({ _: G, Shapes: Shapes }));

  registerAction({
    name: 'Apply Zoom Tool',
    icon: 'earth.png',
    callback: activateApplyZoomTool,
    shortcut: 'Ctrl+Alt+R',
    category: 'custom',
  });
}

function evaluateAndRunApplyZoomTool() {
  try {
    MessageLog.trace('ApplyZoomTool evaluateAndRun triggered');
    Tools.setCurrentTool(APPLY_ZOOM_TOOL_ID);
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}
