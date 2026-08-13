// ApplyZoomTool.ts — draws diagonal zoom arrows around the click point.
// The arrows point inward (zoom in) or outward (zoom out) based on
// the vertical drag direction.

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

/**
 * Builds overlay path entries for an arrow pointing from `start` to `end`.
 * Produces a shaft plus two arrowhead lines, each as a { path, color }
 * entry suitable for ctx.overlay.paths.
 */
function createArrowPaths(
  start: any,
  end: any,
  color: { r: number; g: number; b: number; a: number },
): { path: any; color: { r: number; g: number; b: number; a: number } }[] {
  var dir = end.subtract(start);
  var len = dir.length();
  if (len < 0.001) {
    return [];
  }

  var unit = dir.scale(1 / len);
  var perp = new G.Vec2(-unit.y, unit.x);

  // Arrowhead sized relative to the arrow length, with sane bounds.
  var headLength = Math.min(0.2, Math.max(6, len * 0.3));
  var headWidth = headLength * 0.5;

  var headBase = end.subtract(unit.scale(headLength));
  var leftTip = headBase.add(perp.scale(headWidth));
  var rightTip = headBase.subtract(perp.scale(headWidth));

  var paths: { path: any; color: { r: number; g: number; b: number; a: number } }[] = [];

  paths.push({
    path: new G.Shapes.Line({ start: start, end: end, color: color }).toPath(),
    color: color,
  });
  paths.push({
    path: new G.Shapes.Line({ start: end, end: leftTip, color: color }).toPath(),
    color: color,
  });
  paths.push({
    path: new G.Shapes.Line({ start: end, end: rightTip, color: color }).toPath(),
    color: color,
  });

  return paths;
}

this.__proto__.createArrowPaths = createArrowPaths;

function registerApplyZoomTool() {
  var _applyZoomToolId: any = null;

  class ApplyZoomTool {
    _: any;
    Shapes: any;

    COLORS = {
      rect: { r: 0, g: 200, b: 255, a: 200 }, // cyan
      rectActiveZoomIn: { r: 0, g: 255, b: 0, a: 255 }, // green
      rectActiveZoomOut: { r: 255, g: 0, b: 0, a: 255 }, // red
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

        var fdx = cm.x - cs.x;
        var fdy = cm.y - cs.y;
        var fieldDist = Math.sqrt(fdx * fdx + fdy * fdy);
        var isActive = fieldDist > 2;

        ctx._dragX = cm.screenX - cs.screenX;
        ctx._dragY = cs.screenY - cm.screenY;
        MessageLog.trace(`[ApplyZoomTool.ts] ${ctx._dragX}, ${ctx._dragY}`);

        const zoomInOrOut = ctx._dragY < 0 ? 'Zoom Out' : 'Zoom In';

        var color =
          zoomInOrOut === 'Zoom In' ? this.COLORS.rectActiveZoomIn : this.COLORS.rectActiveZoomOut;

        // Draw diagonal arrows along the four corners of the drag box.
        // Zoom In: arrows point toward the center. Zoom Out: arrows point outward.
        var overlayPaths: any[] = [];
        var halfX = half.x;
        var halfY = half.y;
        var corners = [
          new G.Vec2(center.x + halfX, center.y + halfY),
          new G.Vec2(center.x - halfX, center.y + halfY),
          new G.Vec2(center.x - halfX, center.y - halfY),
          new G.Vec2(center.x + halfX, center.y - halfY),
        ];

        var zoomIn = zoomInOrOut === 'Zoom In';
        var cornerDist = half.length();
        if (cornerDist < 0.001) {
          ctx.overlay = { paths: [] };
          return true;
        }

        // Keep converging arrowheads from overlapping at the center by
        // stopping each zoom-in arrow this many units short of the center.
        var arrowGap = Math.min(20, Math.max(8, cornerDist * 0.15));
        if (arrowGap >= cornerDist) {
          arrowGap = cornerDist * 0.5;
        }

        for (var i = 0; i < corners.length; i++) {
          var outward = corners[i].subtract(center).normalized();
          var arrowStart = zoomIn ? corners[i] : center;
          var arrowEnd = zoomIn ? center.add(outward.scale(arrowGap)) : corners[i];
          var arrowStrokes = createArrowPaths(arrowStart, arrowEnd, color);
          for (var j = 0; j < arrowStrokes.length; j++) {
            overlayPaths.push(arrowStrokes[j]);
          }
        }

        ctx.overlay = { paths: overlayPaths };
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
          // Magnitude: fixed value (drag distance is intentionally ignored).
          var baseX = pos.getXVal(startFrame);
          var baseY = pos.getYVal(startFrame);
          var dirX = ctx._rectCenter.x - baseX;
          var dirY = ctx._rectCenter.y - baseY;
          var dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

          var scale = 8;
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
              ') | scale=' +
              scale.toFixed(3) +
              ' | xy=(' +
              xy.x.toFixed(2) +
              ', ' +
              xy.y.toFixed(2) +
              ')',
          );

          scene.beginUndoRedoAccum('Apply Zoom');

          startFrame = G.FrameSnapping.getNearestBoundaryFrame(startFrame) - 4;
          const zoomInOrOut = ctx._dragY < 0 ? 'Zoom Out' : 'Zoom In';
          const zoomOut = zoomInOrOut === 'Zoom Out';
          G.KeyframeGeneratorKit.generateZoom(pos, startFrame, endFrame, xy, zoomOut);
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
    icon: `${specialFolders.userScripts}\\script-icons\\apply_zoom_tool.png`,
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
