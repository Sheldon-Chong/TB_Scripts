include('global-test.js');

include(specialFolders.userScripts + '/FrameSnapping.js');

include(specialFolders.userScripts + '/KeyframeGenerator.js');

function createCameraSwipeToolKit(Core: HarmonyCore) {
  /*
   * These are created here because Core exists here.
   */
  var FrameSnapping = getFrameSnappingKit(Core);

  var KeyframeGenerator = getKeyframeGeneratorKit(Core);

  var TOOL_ID = 'com.toonboom.cameraSwipeTool';

  class CameraSwipeTool {
    COLORS = {
      lineDefault: {
        r: 0,
        g: 200,
        b: 255,
        a: 200,
      },

      lineSnapped: {
        r: 255,
        g: 180,
        b: 0,
        a: 200,
      },

      lineActive: {
        r: 0,
        g: 255,
        b: 0,
        a: 255,
      },
    };

    name: string = TOOL_ID;

    displayName: string = 'Camera Swipe Tool';

    icon: string = 'MyTool.png';

    toolType: string = 'scenePlanning';

    canBeOverridenBySelectOrTransformTool: boolean = false;

    options: {
      snapToBoundary: boolean;
    };

    defaultOptions: {
      snapToBoundary: boolean;
    };

    resourceFolder: string = 'resources';

    swipeScale: number = 80;

    cameraPegPath: string = 'Top/Camera-P';

    ui:
      | {
          snapCheckbox: any;
          optionsButton: any;
        }
      | undefined;

    constructor() {
      this.options = {
        snapToBoundary: true,
      };

      this.defaultOptions = {
        snapToBoundary: true,
      };
    }

    preferenceName(): string {
      return this.name + '.settings';
    }

    loadFromPreferences(): void {
      try {
        var value = Core.preferences.getString(
          this.preferenceName(),

          Core.JSON.stringify(this.defaultOptions),
        );

        this.options = Core.JSON.parse(value);
      } catch (e) {
        this.options = this.defaultOptions;
      }
    }

    storeToPreferences(): void {
      Core.preferences.setString(
        this.preferenceName(),

        Core.JSON.stringify(this.options),
      );

      Core.MessageLog.trace(
        '[CameraSwipeTool] Stored snapToBoundary=' + this.options.snapToBoundary,
      );
    }

    onRegister(): void {
      Core.MessageLog.trace('Registered tool: CameraSwipeTool');

      this.loadFromPreferences();
    }

    onCreate(ctx: any): void {
      ctx.origin = null;
    }

    onMouseDown(ctx: any): boolean {
      try {
        Core.MessageLog.trace(new Core.Vec2(1).toString());

        ctx.origin = ctx.currentPoint;

        return true;
      } catch (e: any) {
        Core.MessageLog.trace('CameraSwipeTool onMouseDown error: ' + e.toString());

        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx.origin) {
        return true;
      }

      try {
        var overlayPaths: any[] = [];

        var start = ctx.origin;

        var end = ctx.currentPoint;

        var rawDiff = new Core.Vec2(end).subtract(start);

        var rawFieldDist = rawDiff.length();

        var screenDist = new Core.Vec2(end.screenX, end.screenY)
          .subtract(new Core.Vec2(start.screenX, start.screenY))
          .length();

        var pxPerFieldUnit = rawFieldDist > 0.001 ? screenDist / rawFieldDist : 1;

        if (ctx.shiftPressed) {
          var angle = Math.atan2(rawDiff.y, rawDiff.x);

          var dist = rawDiff.length();

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

            if (wrapD < d) {
              d = wrapD;
            }

            wrapD = Math.abs(angle - (snapAngles[i] + 2 * Math.PI));

            if (wrapD < d) {
              d = wrapD;
            }

            if (d < bestDiff) {
              bestDiff = d;

              best = snapAngles[i];
            }
          }

          end = new Core.Vec2(start).add(new Core.Vec2(Math.cos(best), Math.sin(best)).scale(dist));
        }

        var fieldVec = new Core.Vec2(end).subtract(start);

        var fieldDist = fieldVec.length();

        var isActive = fieldDist > 2;

        var lineColor = isActive
          ? this.COLORS.lineActive
          : ctx.shiftPressed
            ? this.COLORS.lineSnapped
            : this.COLORS.lineDefault;

        var dotColor = isActive ? this.COLORS.lineActive : this.COLORS.lineDefault;

        var line = new Core.Shapes.Line({
          start: start,

          end: end,

          color: lineColor,
        });

        overlayPaths.push({
          path: line.toPath(),

          color: line.color,
        });

        var screenDotRadius = 6;

        var dotRadius = screenDotRadius / pxPerFieldUnit;

        var dot = new Core.Vec2(dotRadius * 2).toWidthHeight();

        var startDot = new Core.Shapes.Rectangle({
          center: start,

          width: dot.width,

          height: dot.height,
        });

        var endDot = new Core.Shapes.Rectangle({
          center: end,

          width: dot.width,

          height: dot.height,
        });

        overlayPaths.push({
          path: startDot.toPath(),

          color: isActive ? this.COLORS.lineActive : this.COLORS.lineDefault,
        });

        overlayPaths.push({
          path: endDot.toPath(),

          color: dotColor,
        });

        ctx.lastDistance = fieldDist;

        ctx.lastAngle = Math.atan2(fieldVec.y, fieldVec.x);

        ctx.overlay = {
          paths: overlayPaths,
        };
      } catch (e: any) {
        Core.MessageLog.trace('CameraSwipeTool onMouseMove error: ' + e.toString());
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx.origin) {
        return true;
      }

      try {
        var start = ctx.origin;

        var end = ctx.currentPoint;

        var dist = ctx.lastDistance || 0;

        var angleRad = ctx.lastAngle || 0;

        var angleDeg = Math.round((angleRad * 180) / Math.PI);

        if (dist > 2) {
          var dirVec = new Core.Vec2(end).subtract(start).normalized();

          var magnitude = dist / this.swipeScale;

          var camPeg = Core.LayerManager.getNodeLayer(this.cameraPegPath);

          if (!camPeg) {
            Core.MessageLog.trace(
              "CameraSwipeTool: Camera peg '" + this.cameraPegPath + "' not found.",
            );
          } else {
            var pos = camPeg.position;

            var currentFrame = Core.frame.current();

            var startFrame = currentFrame;

            if (this.options.snapToBoundary) {
              startFrame = FrameSnapping.getNearestBoundaryFrame(currentFrame) - 1;
            }

            Core.scene.beginUndoRedoAccum('Camera Swipe');

            try {
              /*
               * Use your CameraSwipe implementation here.
               *
               * If CameraSwipe has also been converted into
               * a Core/factory module, reference that captured
               * object here instead.
               */
              Core.CameraSwipe.applyCameraSwipe(pos, startFrame, dirVec, 0);
            } finally {
              Core.scene.endUndoRedoAccum();
            }

            var msg =
              'Swipe: ' +
              Math.round(dist) +
              'px @ ' +
              angleDeg +
              '\u00B0 | mag: ' +
              magnitude.toFixed(2);

            Core.MessageLog.trace(msg);

            Core.TimelineKit.setCurrentFrame(startFrame - 4);

            this.showMeasureToast(msg, 1500);
          }
        }
      } catch (e: any) {
        Core.MessageLog.trace('CameraSwipeTool onMouseUp error: ' + e.toString());
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
      Core.Utils.toast(
        labelText,
        {
          x: 10,
          y: 10,
        },
        duration,
        '#333333',
      );
    }
  }

  var CameraSwipeToolKit = {
    /*
     * Activate the already registered tool.
     */
    activate(): void {
      Core.MessageLog.trace('CameraSwipeTool action triggered');

      /*
       * Core.Tools is the native Harmony Tools API.
       */
      Core.Tools.setCurrentTool(TOOL_ID);
    },

    /*
     * Register the Scene Planning tool itself,
     * then register the toolbar action.
     */
    register(): void {
      Core.SceneKit.registerTool(new CameraSwipeTool());

      Core.Toolbar.registerAction({
        name: 'Camera Swipe Tool',

        icon: Core.specialFolders.userScripts + '/script-icons/apply_swipe_tool.png',

        callback: function () {
          CameraSwipeToolKit.activate();
        },

        shortcut: 'Ctrl+Alt+M',

        category: 'custom',
      });
    },

    /*
     * Optional public access to the constructor.
     */
    CameraSwipeTool: CameraSwipeTool,

    /*
     * Optional dependencies if other code needs them.
     */
    FrameSnapping: FrameSnapping,

    KeyframeGenerator: KeyframeGenerator,
  };

  return CameraSwipeToolKit;
}

type CameraSwipeToolKitType = ReturnType<typeof createCameraSwipeToolKit>;
