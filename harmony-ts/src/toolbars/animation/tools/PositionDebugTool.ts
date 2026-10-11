// PositionDebugTool.ts — Barebones diagnostic tool to investigate
// field-coordinate inflation in zoom/shake-style tools.
//
// Logs screen-space and field-space coordinates on every mouse event
// so you can compare normal vs inflated runs side by side.

include('globals.js');

const POSITION_DEBUG_TOOL_ID = 'com.toonboom.positionDebugTool';

function activatePositionDebugTool() {
  try {
    Tools.setCurrentTool('com.toonboom.positionDebugTool');
  } catch (e) {
    MessageLog.trace('PositionDebugTool activate error: ' + e.toString());
  }
}

function registerPositionDebugTool() {
  var _toolId: any = null;

  class PositionDebugTool {
    name: string = POSITION_DEBUG_TOOL_ID;
    displayName: string = 'Position Debug Tool';
    icon: string = 'earth.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = true;
    options: any = {};
    resourceFolder: string = 'resources';
    defaultOptions: any = {};

    onRegister(): void {
      MessageLog.trace('=== PositionDebugTool registered ===');
    }

    onCreate(ctx: any): void {
      ctx._dragCount = 0;
    }

    onMouseDown(ctx: any): boolean {
      var pt = ctx.currentPoint;
      MessageLog.trace(
        '▼ MOUSE DOWN | ' +
          'screen=(' +
          pt.screenX.toFixed(1) +
          ', ' +
          pt.screenY.toFixed(1) +
          ') | ' +
          'field=(' +
          pt.x.toFixed(4) +
          ', ' +
          pt.y.toFixed(4) +
          ')',
      );
      ctx._origin = pt;
      ctx._dragCount = 0;
      return true;
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx._origin) return true;

      ctx._dragCount++;
      var o = ctx._origin;
      var pt = ctx.currentPoint;

      // Screen-space delta
      var sdx = pt.screenX - o.screenX;
      var sdy = pt.screenY - o.screenY;
      var sdist = Math.sqrt(sdx * sdx + sdy * sdy);

      // Field-space delta
      var fdx = pt.x - o.x;
      var fdy = pt.y - o.y;
      var fdist = Math.sqrt(fdx * fdx + fdy * fdy);

      // pxPerFieldUnit ratio
      var ratio = fdist > 0.001 ? sdist / fdist : -1;

      // Only log every 10th move to avoid spam
      if (ctx._dragCount % 10 === 0 || sdist > 50) {
        MessageLog.trace(
          '  ↕ MOVE #' +
            ctx._dragCount +
            ' | ' +
            'screenΔ=(' +
            sdx.toFixed(1) +
            ', ' +
            sdy.toFixed(1) +
            ') sdist=' +
            sdist.toFixed(1) +
            ' | ' +
            'fieldΔ=(' +
            fdx.toFixed(4) +
            ', ' +
            fdy.toFixed(4) +
            ') fdist=' +
            fdist.toFixed(4) +
            ' | ' +
            'pxPerField=' +
            ratio.toFixed(2),
        );
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx._origin) return true;

      var o = ctx._origin;
      var pt = ctx.currentPoint;

      // Screen-space half-extents
      var shw = Math.abs(pt.screenX - o.screenX);
      var shh = Math.abs(pt.screenY - o.screenY);
      var sdist = Math.sqrt(shw * shw + shh * shh);

      // Field-space half-extents
      var fhw = Math.abs(pt.x - o.x);
      var fhh = Math.abs(pt.y - o.y);
      var fdist = Math.sqrt(fhw * fhw + fhh * fhh);

      // Ratio
      var ratio = fdist > 0.001 ? sdist / fdist : -1;

      // field coords * 3 (original broken approach)
      var oldStyleX = o.x * 3;
      var oldStyleY = o.y * 3;

      MessageLog.trace(
        '▲ MOUSE UP | ' +
          'drags=' +
          ctx._dragCount +
          ' | ' +
          'screenHalf=(' +
          shw.toFixed(1) +
          ', ' +
          shh.toFixed(1) +
          ') sdist=' +
          sdist.toFixed(1) +
          ' | ' +
          'fieldHalf=(' +
          fhw.toFixed(4) +
          ', ' +
          fhh.toFixed(4) +
          ') fdist=' +
          fdist.toFixed(4) +
          ' | ' +
          'pxPerField=' +
          ratio.toFixed(2) +
          ' | ' +
          'oldStyle(click*3)=(' +
          oldStyleX.toFixed(4) +
          ', ' +
          oldStyleY.toFixed(4) +
          ') | ' +
          'screen→field=(' +
          (shw / (ratio > 0 ? ratio : 174)).toFixed(4) +
          ', ' +
          (shh / (ratio > 0 ? ratio : 174)).toFixed(4) +
          ')',
      );

      ctx._origin = null;
      ctx._dragCount = 0;

      return true;
    }

    onResetTool(ctx: any): void {
      ctx._origin = null;
      ctx._dragCount = 0;
    }
  }

  _toolId = SceneKit.registerTool(new PositionDebugTool());

  registerAction({
    name: 'Position Debug Tool',
    icon: 'earth.png',
    callback: activatePositionDebugTool,
    category: 'custom',
  });
}
