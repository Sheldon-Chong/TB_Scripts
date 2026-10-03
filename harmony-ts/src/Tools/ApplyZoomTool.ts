include('global-test.js');

include(specialFolders.userScripts + '/FrameSnapping.js');

include(specialFolders.userScripts + '/KeyframeGenerator.js');

function createApplyZoomToolKit($: HarmonyCore, KeyframeGenerator: KeyframeGeneratorKitType) {
  var FrameSnapping = getFrameSnappingKit($);

  var TOOL_ID = 'com.toonboom.applyZoomTool';
  var CENTER_SNAP_RADIUS = 600;

  function createArrowPaths(
    start: any,
    end: any,
    color: { r: number; g: number; b: number; a: number },
  ): { path: any; color: { r: number; g: number; b: number; a: number } }[] {
    var direction = end.subtract(start);
    var length = direction.length();
    if (length < 0.001) {
      return [];
    }

    var unit = direction.scale(1 / length);
    var perpendicular = new $.Vec2(-unit.y, unit.x);
    var headLength = $.Math.max(6, length * 0.15);
    var headWidth = headLength * 0.5;
    var headBase = end.subtract(unit.scale(headLength));
    var leftTip = headBase.add(perpendicular.scale(headWidth));
    var rightTip = headBase.subtract(perpendicular.scale(headWidth));

    return [
      {
        path: new $.Shapes.Line({ start: start, end: end, color: color }).toPath(),
        color: color,
      },
      {
        path: new $.Shapes.Line({ start: end, end: leftTip, color: color }).toPath(),
        color: color,
      },
      {
        path: new $.Shapes.Line({ start: end, end: rightTip, color: color }).toPath(),
        color: color,
      },
    ];
  }

  class ApplyZoomTool {
    COLORS = {
      rectActiveZoomIn: { r: 0, g: 255, b: 0, a: 255 },
      rectActiveZoomOut: { r: 255, g: 0, b: 0, a: 255 },
      rectActiveZoomInSnapped: { r: 0, g: 125, b: 0, a: 255 },
      rectActiveZoomOutSnapped: { r: 145, g: 0, b: 0, a: 255 },
    };

    name: string = TOOL_ID;
    displayName: string = 'Apply Zoom Tool';
    icon: string = 'MyTool.png';
    toolType: string = 'drawing';
    canBeOverridenBySelectOrTransformTool: boolean = false;
    options: { snapToBoundary: boolean };
    resourceFolder: string = 'resources';
    defaultOptions: { snapToBoundary: boolean };
    ui: { snapCheckbox: any; optionsButton: any } | undefined;

    constructor() {
      this.options = { snapToBoundary: true };
      this.defaultOptions = { snapToBoundary: true };
    }

    preferenceName(): string {
      return this.name + '.settings';
    }

    loadFromPreferences(): void {
      try {
        var value = $.preferences.getString(
          this.preferenceName(),
          $.JSON.stringify(this.defaultOptions),
        );
        this.options = $.JSON.parse(value);
      } catch (e) {
        this.options = this.defaultOptions;
      }
    }

    storeToPreferences(): void {
      $.preferences.setString(this.preferenceName(), $.JSON.stringify(this.options));
    }

    onRegister(): void {
      $.MessageLog.trace('Registered tool: ApplyZoomTool');
      this.loadFromPreferences();
    }

    onCreate(ctx: any): void {
      ctx._rectCenter = null;
    }

    onMouseDown(ctx: any): boolean {
      try {
        ctx._rectCenter = ctx.currentPoint;
        ctx._rawRectCenter = ctx.currentPoint;
        ctx._centerSnapped = false;
        ctx._arrowDebugMoves = 0;
        ctx._snapDebugMoves = 0;
        $.MessageLog.trace('[ApplyZoomTool] mouse down: arrow preview started');
        $.MessageLog.trace(
          '[ApplyZoomTool] snap origin field=(' +
            ctx._rawRectCenter.x +
            ', ' +
            ctx._rawRectCenter.y +
            ') screen=(' +
            ctx._rawRectCenter.screenX +
            ', ' +
            ctx._rawRectCenter.screenY +
            ') radius=' +
            CENTER_SNAP_RADIUS,
        );
        return true;
      } catch (e: any) {
        $.MessageLog.trace('ApplyZoomTool onMouseDown error: ' + e.toString());
        return false;
      }
    }

    onMouseMove(ctx: any): boolean {
      if (!ctx._rectCenter) {
        return true;
      }

      try {
        if (ctx.shiftPressed) {
          var rawCenter = ctx._rawRectCenter || ctx._rectCenter;

          var centerDistance = $.Math.sqrt(
            rawCenter.x * rawCenter.x + rawCenter.y * rawCenter.y,
          );
          ctx._snapDebugMoves = (ctx._snapDebugMoves || 0) + 1;

          if (ctx._snapDebugMoves === 1 || ctx._snapDebugMoves % 20 === 0) {
            $.MessageLog.trace(
              '[ApplyZoomTool] shift=true fieldDistance=' +
                centerDistance.toFixed(4) +
                ' threshold=' +
                CENTER_SNAP_RADIUS +
                ' snapped=' +
                !!ctx._centerSnapped,
            );
          }

          if (centerDistance <= CENTER_SNAP_RADIUS) {
            if (!ctx._centerSnapped) {
              $.MessageLog.trace('[ApplyZoomTool] center snap accepted');
            }
            var snappedCenter: any = new $.Vec2(0, 0);
            snappedCenter.screenX = rawCenter.screenX;
            snappedCenter.screenY = rawCenter.screenY;
            ctx._rectCenter = snappedCenter;
            ctx._centerSnapped = true;
          }
        } else if (ctx._snapDebugMoves && ctx._snapDebugMoves % 20 === 0) {
          $.MessageLog.trace('[ApplyZoomTool] shift=false; center snap not evaluated');
        }

        var centerPoint = ctx._rectCenter;
        var currentPoint = ctx.currentPoint;
        var center = ctx._centerSnapped ? new $.Vec2(0, 0) : new $.Vec2(centerPoint);
        var mouse = new $.Vec2(currentPoint);
        var rawHalf = mouse.subtract(center);
        var aspectRatio = 1;
        var halfX = $.Math.abs(rawHalf.x);
        var halfY = $.Math.abs(rawHalf.y);

        if (halfX <= 0.001 && halfY > 0.001) {
          halfX = halfY * aspectRatio;
        } else if (halfY <= 0.001 && halfX > 0.001) {
          halfY = halfX / aspectRatio;
        } else if (halfX > 0.001 && halfY > 0.001) {
          if (halfX / halfY > aspectRatio) {
            halfX = halfY * aspectRatio;
          } else {
            halfY = halfX / aspectRatio;
          }
        }

        var half = new $.Vec2(rawHalf.x < 0 ? -halfX : halfX, rawHalf.y < 0 ? -halfY : halfY);
        var fieldX = currentPoint.x - centerPoint.x;
        var fieldY = currentPoint.y - centerPoint.y;
        var fieldDistance = $.Math.sqrt(fieldX * fieldX + fieldY * fieldY);

        ctx._dragX = currentPoint.screenX - centerPoint.screenX;
        ctx._dragY = centerPoint.screenY - currentPoint.screenY;
        ctx._arrowDebugMoves = (ctx._arrowDebugMoves || 0) + 1;

        var zoomOut = ctx._dragY < 0;
        var color = ctx._centerSnapped
          ? zoomOut
            ? this.COLORS.rectActiveZoomOutSnapped
            : this.COLORS.rectActiveZoomInSnapped
          : zoomOut
            ? this.COLORS.rectActiveZoomOut
            : this.COLORS.rectActiveZoomIn;

        var cornerDistance = half.length();
        if (cornerDistance < 0.001) {
          if (ctx._arrowDebugMoves === 1) {
            $.MessageLog.trace('[ApplyZoomTool] preview early exit: corner distance < 0.001');
          }
          ctx.overlay = { paths: [] };
          return true;
        }

        var corners = [
          new $.Vec2(center.x + half.x, center.y + half.y),
          new $.Vec2(center.x - half.x, center.y + half.y),
          new $.Vec2(center.x - half.x, center.y - half.y),
          new $.Vec2(center.x + half.x, center.y - half.y),
        ];
        var arrowGap = $.Math.min(cornerDistance * 0.4, $.Math.max(8, cornerDistance * 0.25));
        if (arrowGap >= cornerDistance) {
          arrowGap = cornerDistance * 0.5;
        }

        var paths: any[] = [];
        var firstArrowLength = 0;
        for (var i = 0; i < corners.length; i++) {
          var outward = corners[i].subtract(center).normalized();
          var arrowStart = zoomOut ? center : corners[i];
          var arrowEnd = zoomOut ? corners[i] : center.add(outward.scale(arrowGap));
          if (i === 0) {
            firstArrowLength = arrowEnd.subtract(arrowStart).length();
          }
          var arrowPaths = createArrowPaths(arrowStart, arrowEnd, color);
          for (var j = 0; j < arrowPaths.length; j++) {
            paths.push(arrowPaths[j]);
          }
        }

        ctx.overlay = { paths: paths };

        if (ctx._arrowDebugMoves === 1 || ctx._arrowDebugMoves % 20 === 0) {
          $.MessageLog.trace(
            '[ApplyZoomTool] preview paths=' +
              paths.length +
              ' arrowLength=' +
              firstArrowLength.toFixed(3) +
              ' cornerDistance=' +
              cornerDistance.toFixed(3) +
              ' arrowGap=' +
              arrowGap.toFixed(3) +
              ' zoomOut=' +
              zoomOut,
          );
        }
      } catch (e: any) {
        $.MessageLog.trace('ApplyZoomTool onMouseMove error: ' + e.toString());
        $.MessageLog.trace('ApplyZoomTool onMouseMove stack: ' + (e.stack || 'none'));
      }

      return true;
    }

    onMouseUp(ctx: any): boolean {
      if (!ctx._rectCenter) {
        return true;
      }

      if (typeof ctx._dragX === 'undefined' || typeof ctx._dragY === 'undefined') {
        ctx._centerSnapped = false;
        ctx.overlay = {};
        return true;
      }

      try {
        var camPeg = $.LayerManager.getNodeLayer('Top/Camera-P');
        if (!camPeg) {
          $.MessageLog.trace('ApplyZoomTool: Camera peg not found.');
        } else {
          var centerFrame = $.frame.current();
          if (this.options.snapToBoundary) {
          }
          centerFrame = FrameSnapping.getNearestBoundaryFrame(centerFrame);

          var startFrame = centerFrame - 4;
          var endFrame = startFrame + 7;
          var baseX = camPeg.position.getXVal(startFrame);
          var baseY = camPeg.position.getYVal(startFrame);
          var directionX = ctx._rectCenter.x - baseX;
          var directionY = ctx._rectCenter.y - baseY;
          var directionLength = $.Math.sqrt(directionX * directionX + directionY * directionY);
          var scale = 8;
          var target =
            directionLength > 0.001
              ? new $.Vec2(
                  (directionX / directionLength) * scale,
                  (directionY / directionLength) * scale,
                )
              : new $.Vec2(0, 0);

          $.scene.beginUndoRedoAccum('Apply Zoom');
          try {
            KeyframeGenerator.generateZoom(
              camPeg.position,
              startFrame,
              endFrame,
              target,
              ctx._dragY < 0,
            );
            $.TimelineKit.setCurrentFrame(centerFrame);
          } finally {
            $.scene.endUndoRedoAccum();
          }

          $.TimelineKit.setCurrentFrame(centerFrame - 4);
        }
      } catch (e: any) {
        $.MessageLog.trace('ApplyZoomTool onMouseUp error: ' + e.toString());
      }

      ctx._centerSnapped = false;
      ctx._dragX = undefined;
      ctx._dragY = undefined;
      ctx.overlay = {};
      return true;
    }

    onResetTool(ctx: any): void {
      ctx._centerSnapped = false;
      ctx._dragX = undefined;
      ctx._dragY = undefined;
      ctx.overlay = {};
    }

    loadPanel(dialog: any, responder: any): void {
      try {
        var snapCheckbox = new $.Widgets.BoundarySnapSwitch(dialog);
        snapCheckbox.setEnabledState(this.options.snapToBoundary);
        snapCheckbox.onStateChanged(
          function (state: number) {
            this.options.snapToBoundary = state !== 0;
            this.storeToPreferences();
            responder.settingsChanged();
          }.bind(this),
        );

        var optionsButton = new $.Widgets.UI_QToolButton({ dialog: dialog });
        var optionsMenu = $.Widgets.optionsMenu(optionsButton, [
          [
            [
              'Reset Settings',
              function () {
                this.options = { snapToBoundary: true };
                this.storeToPreferences();
                snapCheckbox.setEnabledState(this.options.snapToBoundary);
                responder.settingsChanged();
              }.bind(this),
            ],
          ],
          [
            [
              'Activate Apply Zoom Tool',
              function () {
                $.Tools.setCurrentTool(TOOL_ID);
              },
            ],
          ],
        ]);
        optionsButton.setMenu(optionsMenu);

        var layout = new QVBoxLayout(dialog);
        layout.setContentsMargins(8, 8, 8, 8);
        layout.addWidget(snapCheckbox, 0, Qt.AlignmentFlag.AlignLeft);
        layout.addWidget(optionsButton, 0, Qt.AlignmentFlag.AlignRight);
        layout.addStretch(1);
        this.ui = { snapCheckbox: snapCheckbox, optionsButton: optionsButton };
      } catch (e: any) {
        $.MessageLog.trace('ApplyZoomTool loadPanel error: ' + e.toString());
      }
    }

    refreshPanel(dialog: any, responder: any): void {
      try {
        if (this.ui && this.ui.snapCheckbox) {
          this.ui.snapCheckbox.setEnabledState(this.options.snapToBoundary);
        }
      } catch (e: any) {
        $.MessageLog.trace('ApplyZoomTool refreshPanel error: ' + e.toString());
      }
    }
  }

  var ApplyZoomToolKit = {
    activate(): void {
      $.MessageLog.trace('ApplyZoomTool action triggered');
      $.Tools.setCurrentTool(TOOL_ID);
    },

    register(): void {
      $.SceneKit!.registerTool(new ApplyZoomTool());

      $.Toolbar!.registerAction({
        name: 'Apply Zoom Tool',
        icon: $.specialFolders.userScripts + '/script-icons/apply_zoom_tool.png',
        callback: function () {
          $.Tools.setCurrentTool(TOOL_ID);
        },
        shortcut: 'Ctrl+Alt+R',
        category: 'custom',
      });
    },
  };

  return ApplyZoomToolKit;
}

type ApplyZoomToolKitType = ReturnType<typeof createApplyZoomToolKit>;
