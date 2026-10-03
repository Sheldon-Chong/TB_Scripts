// ApplyShakeTool.ts — draws a rectangle from the center of the field.
// The rectangle is centered at (0, 0) and grows symmetrically;
// the mouse position defines the half-width and half-height.

include('global-test.js');

include(specialFolders.userScripts + '/KeyframeGenerator.js');

function createApplyShakeToolKit(Core: HarmonyCore, KeyframeGenerator: KeyframeGeneratorKitType) {
  var TOOL_ID = 'com.toonboom.applyShakeTool';

  class ApplyShakeTool {
    COLORS = {
      rect: { r: 0, g: 200, b: 255, a: 200 },
      rectActive: { r: 0, g: 255, b: 0, a: 255 },
    };

    name: string = TOOL_ID;
    displayName: string = 'Apply Shake Tool';
    icon: string = 'MyTool.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = false;
    options: any = {};
    resourceFolder: string = 'resources';
    defaultOptions: any = {};

    _pxPerFieldUnit: number | null = 174;

    preferenceName(): string {
      return this.name + '.settings';
    }

    loadFromPreferences(): void {}

    storeToPreferences(): void {}

    loadPanel(dialog: any, responder: any): void {}

    refreshPanel(dialog: any, responder: any): void {}

    onRegister(): void {
      Core.MessageLog.trace('Registered tool: ApplyShakeTool');
    }

    onCreate(ctx: any): void {
      ctx._rectCenter = null;
    }

    onMouseDown(ctx: any): boolean {
      try {
        ctx._rectCenter = ctx.currentPoint;
        return true;
      } catch (e: any) {
        Core.MessageLog.trace('ApplyShakeTool onMouseDown error: ' + e.toString());
        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx._rectCenter) {
        return true;
      }

      try {
        var centerPoint = ctx._rectCenter;
        var currentPoint = ctx.currentPoint;
        var screenWidth = Math.abs(currentPoint.screenX - centerPoint.screenX);
        var screenHeight = Math.abs(currentPoint.screenY - centerPoint.screenY);
        var fieldX = currentPoint.x - centerPoint.x;
        var fieldY = currentPoint.y - centerPoint.y;
        var fieldDistance = Math.sqrt(fieldX * fieldX + fieldY * fieldY);
        var screenDistance = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);

        ctx._pxPerFieldUnit = fieldDistance > 0.001 ? screenDistance / fieldDistance : 1;

        var center = new Core.Vec2(centerPoint);
        var mouse = new Core.Vec2(currentPoint);
        var half = mouse.subtract(center);
        var rect = new Core.Shapes.Rectangle({
          start: center.subtract(half),
          end: center.add(half),
          color: fieldDistance > 2 ? this.COLORS.rectActive : this.COLORS.rect,
        });

        if (this._pxPerFieldUnit === null && fieldDistance > 0.5) {
          this._pxPerFieldUnit = screenDistance / fieldDistance;
        }

        ctx.overlay = { paths: [{ path: rect.toPath(), color: rect.color }] };
      } catch (e: any) {
        Core.MessageLog.trace('ApplyShakeTool onMouseMove error: ' + e.toString());
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx._rectCenter) {
        return true;
      }

      try {
        var centerPoint = ctx._rectCenter;
        var currentPoint = ctx.currentPoint;
        var screenWidth = Math.abs(currentPoint.screenX - centerPoint.screenX);
        var screenHeight = Math.abs(currentPoint.screenY - centerPoint.screenY);
        var ratio = this._pxPerFieldUnit || 174;
        var halfX = screenWidth / ratio;
        var halfY = screenHeight / ratio;
        var shakeAmount = new Core.Vec2(halfX, halfY).multiply(2.5);
        var selection = Core.TimelineKit.getSelection();
        var startFrame = selection.startFrame;
        var endFrame = selection.endFrame;

        if (endFrame - startFrame < 5) {
          endFrame = startFrame + 5;
        }

        var camPeg = Core.LayerManager.getNodeLayer('Top/Camera-P');
        if (!camPeg) {
          Core.MessageLog.trace('ApplyShakeTool: Camera peg not found.');
        } else {
          Core.scene.beginUndoRedoAccum('Apply Shake');
          try {
            KeyframeGenerator.generateShake(camPeg.position, startFrame, endFrame, shakeAmount, 3);
          } finally {
            Core.scene.endUndoRedoAccum();
          }
        }
      } catch (e: any) {
        Core.MessageLog.trace('ApplyShakeTool onMouseUp error: ' + e.toString());
      }

      Core.TimelineKit.setCurrentFrame(Core.TimelineKit.getSelection().startFrame);
      ctx._rectCenter = null;
      ctx.overlay = {};
      return true;
    }

    onResetTool(ctx: any): void {
      ctx._rectCenter = null;
      ctx.overlay = {};
    }
  }

  var ApplyShakeToolKit = {
    activate(): void {
      Core.MessageLog.trace('ApplyShakeTool action triggered');
      Core.Tools.setCurrentTool(TOOL_ID);
    },

    register(): void {
      Core.SceneKit!.registerTool(new ApplyShakeTool());

      Core.Toolbar!.registerAction({
        name: 'Apply Shake Tool',
        icon: Core.specialFolders.userScripts + '/script-icons/apply_shake_tool.png',
        callback: function () {
          Core.Tools.setCurrentTool(TOOL_ID);
        },
        shortcut: 'Ctrl+Alt+R',
        category: 'custom',
      });
    },
  };

  return ApplyShakeToolKit;
}

type ApplyShakeToolKitType = ReturnType<typeof createApplyShakeToolKit>;
