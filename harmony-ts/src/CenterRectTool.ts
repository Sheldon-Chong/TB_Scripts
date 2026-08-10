// CenterRectTool.ts — draws a rectangle from the center of the field.
// The rectangle is centered at (0, 0) and grows symmetrically;
// the mouse position defines the half-width and half-height.

include('globals.js');
include(specialFolders.userScripts + '/KeyframeGenerator.js');
this.__proto__.G.KeyframeGeneratorKit = KeyframeGeneratorKit;

function activateCenterRectTool() {
  try {
    MessageLog.trace('CenterRectTool action triggered');
    Tools.setCurrentTool('com.toonboom.centerRectTool');
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}

const CENTER_RECT_TOOL_ID = 'com.toonboom.centerRectTool';

function registerRect() {
  var _centerRectToolId: any = null;

  class CenterRectTool {
    _: any;
    Shapes: any;

    COLORS = {
      rect: { r: 0, g: 200, b: 255, a: 200 }, // cyan
      rectActive: { r: 0, g: 255, b: 0, a: 255 }, // green
    };

    name: string = CENTER_RECT_TOOL_ID;
    displayName: string = 'Center Rectangle Tool';
    icon: string = 'MyTool.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = false;
    options: any = {};
    resourceFolder: string = 'resources';
    defaultOptions: any = {};

    // Captured once on the first drag — never changes, so shake magnitude
    // stays consistent even if the camera drifts to extreme positions.
    _pxPerFieldUnit: number | null = null;

    constructor(deps: { _: any; Shapes: any }) {
      this._ = deps._;
      this.Shapes = deps.Shapes;
    }

    onRegister(): void {
      MessageLog.trace('Registered tool: CenterRectTool');
    }

    onCreate(ctx: any): void {
      ctx._rectCenter = null;
    }

    // ---- helpers ----

    onMouseDown(ctx: any): boolean {
      try {
        // Use click position as rectangle center — always visible and consistent.
        ctx._rectCenter = ctx.currentPoint;
        return true;
      } catch (e) {
        MessageLog.trace('CenterRectTool onMouseDown error: ' + e.toString());
        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx._rectCenter) return true;

      try {
        var cs = ctx._rectCenter;
        var cm = ctx.currentPoint;

        // Compute screen-space half-extents (pixels) — always matches the visual drag.
        var shw = Math.abs(cm.screenX - cs.screenX);
        var shh = Math.abs(cm.screenY - cs.screenY);

        // Compute zoom scale from screen ↔ field ratio (for shake conversion).
        var fdx = cm.x - cs.x;
        var fdy = cm.y - cs.y;
        var fieldDist = Math.sqrt(fdx * fdx + fdy * fdy);
        var screenDist = Math.sqrt(shw * shw + shh * shh);
        ctx._pxPerFieldUnit = fieldDist > 0.001 ? screenDist / fieldDist : 1;

        // Draw overlay in field coordinates.
        var center = new G.Vec2(cs);
        var mouse = new G.Vec2(cm);
        var half = mouse.subtract(center);
        var start = center.subtract(half);
        var end = center.add(half);

        // Store half-extents for onMouseUp (field coords, consistent within this drag).
        ctx._halfX = half.x;
        ctx._halfY = half.y;

        // Capture zoom ratio once (first meaningful drag) so shake conversion
        // never drifts even if the camera position explodes later.
        if (this._pxPerFieldUnit === null && fieldDist > 0.5) {
          this._pxPerFieldUnit = screenDist / fieldDist;
          MessageLog.trace(
            '[CenterRectTool.ts] locked pxPerFieldUnit = ' + this._pxPerFieldUnit.toFixed(2),
          );
        }

        var isActive = fieldDist > 2;
        var color = isActive ? this.COLORS.rectActive : this.COLORS.rect;

        var rect = new G.Shapes.Rectangle({ start: start, end: end, color: color });
        ctx.overlay = { paths: [{ path: rect.toPath(), color: rect.color }] };
      } catch (e) {
        MessageLog.trace('CenterRectTool onMouseMove error: ' + e.toString());
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx._rectCenter) return true;

      try {
        // Use screen-space drag (viewport — always correct) converted to
        // field units via the locked pxPerFieldUnit from the first drag.
        var cs = ctx._rectCenter;
        var cm = ctx.currentPoint;
        var shw = Math.abs(cm.screenX - cs.screenX);
        var shh = Math.abs(cm.screenY - cs.screenY);
        var ratio = this._pxPerFieldUnit || 174; // fallback for typical Harmony zoom
        var halfX = shw / ratio;
        var halfY = shh / ratio;

        var w = halfX * 2;
        var h = halfY * 2;

        MessageLog.trace(
          'CenterRectTool: rect ' + w.toFixed(1) + ' x ' + h.toFixed(1) + ' field units',
        );

        const sensitivity = 2.5;
        var shakeAmount = new G.Vec2(halfX, halfY).multiply(sensitivity);
        var decay = 3;

        var camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
        if (!camPeg) {
          MessageLog.trace('CenterRectTool: Camera peg not found.');
        } else {
          var pos = camPeg.position as oPathColumn3D;
          var sel = new G.oSelection();
          var startFrame = sel.startFrame;
          var endFrame = sel.endFrame;

          scene.beginUndoRedoAccum('Center Rect Shake');
          G.KeyframeGeneratorKit.generateShake(pos, startFrame, endFrame, shakeAmount, decay);
          scene.endUndoRedoAccum();
        }
      } catch (e) {
        MessageLog.trace('CenterRectTool onMouseUp error: ' + e.toString());
        MessageLog.trace(e.stack);
        MessageLog.trace(JSON.stringify(e));
      }
      G.TimelineKit.setCurrentFrame(new G.oSelection().startFrame);

      ctx._rectCenter = null;
      ctx.overlay = {};

      return true;
    }

    onResetTool(ctx: any): void {
      ctx._rectCenter = null;
      ctx.overlay = {};
    }
  }

  _centerRectToolId = SceneKit.registerTool(new CenterRectTool({ _: G, Shapes: Shapes }));

  registerAction({
    name: 'Center Rectangle Tool',
    icon: 'earth.png',
    callback: activateCenterRectTool,
    shortcut: 'Ctrl+Alt+R',
    category: 'custom',
  });

  updateToolbars();

  MessageLog.trace('CenterRectTool evaluateAndRun triggered');
}

function evaluateAndRunCenterRectTool() {
  try {
    MessageLog.trace('CenterRectTool evaluateAndRun triggered');
    Tools.setCurrentTool(CENTER_RECT_TOOL_ID);
  } catch (e) {
    MessageLog.trace('error: ' + e.toString() + ' | stack: ' + (e.stack || 'none'));
  }
}
