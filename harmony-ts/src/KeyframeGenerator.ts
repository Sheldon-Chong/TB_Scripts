include('global-test.js');

function createKeyframeGeneratorKit(Core: HarmonyCore) {
  var KeyframeGeneratorKit = {
    /**
     * Generate a decaying camera shake on a path column.
     *
     * @param col            The 3D-path column to keyframe.
     * @param startFrame     First frame of the shake.
     * @param endFrame       Last frame of the shake.
     * @param shakeAmount    Initial shake magnitude.
     *                       A number applies equally to both axes;
     *                       a Vec2 / {x,y} / [x,y] sets per-axis values.
     * @param decayExponent  How fast the shake fades
     *                       (higher = faster decay).
     */
    generateShake(
      col: any,
      startFrame: number,
      endFrame: number,
      shakeAmount: vectors.Vector2Input,
      decayExponent: number,
    ): void {
      var amount = Core.Vectors.resolveVec2(shakeAmount);

      var totalFrames = endFrame - startFrame;

      var minStepRatio = 0.7;

      var prev = new Core.Vec2(0, 0);

      for (var i = startFrame; i <= endFrame; i++) {
        var progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;

        var remainingRatio = 1 - progress;

        var currentX = amount.x * Math.pow(remainingRatio, decayExponent);

        var currentY = amount.y * Math.pow(remainingRatio, decayExponent);

        var current: any;

        if (currentX > 0.001 || currentY > 0.001) {
          var maxAmount = currentX > currentY ? currentX : currentY;

          var minDistSq = Math.pow(maxAmount * minStepRatio, 2);

          var attempts = 0;

          do {
            current = new Core.Vec2(
              (Math.random() - 0.5) * 2 * currentX,

              (Math.random() - 0.5) * 2 * currentY,
            );

            attempts++;
          } while (attempts < 15 && current.distanceToSquared(prev) < minDistSq);
        } else {
          current = new Core.Vec2(0, 0);
        }

        prev = current;

        /*
         * Apply shake as an offset from the
         * camera's existing position.
         */
        col.setPosition(
          i,

          new Core.Vec3(current.x, current.y, 0),

          0,
          0,
          0,
        );
      }
    },

    /**
     * Generate a camera zoom on a path column
     * using a hardcoded Z curve.
     *
     * @param col          The 3D-path column to keyframe.
     * @param startFrame   First frame of the zoom.
     * @param endFrame     Last frame of the zoom.
     * @param xy           Optional target XY offset.
     * @param zoomOut      Whether to use the zoom-out curve.
     */
    generateZoom(
      col: any,
      startFrame: number,
      endFrame: number,
      xy?: vectors.Vector2Input,
      zoomOut: boolean = false,
    ): void {
      var FIRST_HALF_VALUES = zoomOut ? [0.0, 0.2, 1.247, 4.935] : [-0.0, -0.2, -1.247, -4.935];

      var SECOND_HALF_VALUES = zoomOut
        ? [-3.354, -0.946, -0.189, -0.0]
        : [3.354, 0.946, 0.189, 0.0];

      var ZOOM_Z_VALUES = FIRST_HALF_VALUES.concat(SECOND_HALF_VALUES);

      Core.MessageLog.trace(
        '[generateZoom] has xy: ' + (xy ? 'yes' : 'no') + ' (type: ' + typeof xy + ')',
      );

      var targetXY = xy ? Core.Vectors.resolveVec2(xy) : null;

      if (targetXY) {
        Core.MessageLog.trace(
          '[generateZoom] targetXY.x=' + targetXY.x + ' targetXY.y=' + targetXY.y,
        );
      } else {
        Core.MessageLog.trace('[generateZoom] targetXY is null/falsy');
      }

      Core.MessageLog.trace(
        'generateZoom: ' +
          col.toString() +
          ', frames ' +
          startFrame +
          '-' +
          endFrame +
          (targetXY ? ', xy ' + Core.JSON.stringify(targetXY) : ''),
      );

      var zCount = ZOOM_Z_VALUES.length;

      Core.MessageLog.trace('[generateZoom] zCount: ' + zCount);

      for (var i = 0; i < zCount; i++) {
        var frameNumber = startFrame + i;

        var z = ZOOM_Z_VALUES[i];

        var x: number;
        var y: number;

        var progress: number | undefined;

        if (targetXY) {
          var firstHalfCount = FIRST_HALF_VALUES.length;

          var baseX = col.getXVal(startFrame);

          var baseY = col.getYVal(startFrame);

          if (i < firstHalfCount) {
            progress = i / (firstHalfCount - 1);

            x = baseX + targetXY.x * progress;

            y = baseY + targetXY.y * progress;
          } else {
            x = baseX;

            y = baseY;
          }
        } else {
          x = col.getXVal(frameNumber);

          y = col.getYVal(frameNumber);
        }

        Core.MessageLog.trace(
          '[generateZoom] frame ' +
            frameNumber +
            ' | z=' +
            z +
            ' | x=' +
            x +
            ', y=' +
            y +
            (targetXY
              ? progress !== undefined
                ? ' | progress=' + progress.toFixed(3)
                : ' | returning'
              : ' (no xy)'),
        );

        col.setPosition(
          frameNumber,

          new Core.Vec3(x, y, z),

          0,
          0,
          0,
        );
      }

      Core.MessageLog.trace('[generateZoom] done');
    },
  };

  return KeyframeGeneratorKit;
}

type KeyframeGeneratorKitType = ReturnType<typeof createKeyframeGeneratorKit>;

function getKeyframeGeneratorKit(Core: HarmonyCore): KeyframeGeneratorKitType {
  var Runtime: any = Core;

  if (!Runtime.KeyframeGeneratorKit) {
    Runtime.KeyframeGeneratorKit = createKeyframeGeneratorKit(Core);
  }

  return Runtime.KeyframeGeneratorKit as KeyframeGeneratorKitType;
}
