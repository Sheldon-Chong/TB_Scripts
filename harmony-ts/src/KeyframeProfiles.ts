function createCameraSwipe(Core: CoreRuntime) {
  var CameraSwipe = {
    smoothInPosition(
      col: any,
      startFrame: number,
      endFrame: number,
      startPos: any,
      endPos: any,
      exponent: number = 2,
    ): void {
      var totalFrames = endFrame - startFrame;

      for (var i = startFrame; i <= endFrame; i++) {
        var progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;

        var t = Core.Math.pow(progress, exponent);

        var current = startPos.lerp(endPos, t);

        col.setPosition(i, current.toVec3(), 0, 0, 0);
      }
    },

    smoothOutPosition(
      col: any,
      startFrame: number,
      endFrame: number,
      startPos: any,
      endPos: any,
      exponent: number = 2,
    ): void {
      var totalFrames = endFrame - startFrame;

      for (var i = startFrame; i <= endFrame; i++) {
        var progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;

        var t = 1 - Core.Math.pow(1 - progress, exponent);

        var current = startPos.lerp(endPos, t);

        col.setPosition(i, current.toVec3(), 0, 0, 0);
      }
    },

    applyScalarCurveInDirection(
      col: any,
      startFrame: number,
      scalarValues: number[],
      direction: Vector2Input,
      origin: Vector2Input = 0,
    ): void {
      var dirVec = new Core.Vec2(direction).normalized();

      var originVec = new Core.Vec2(origin);

      for (var idx = 0; idx < scalarValues.length; idx++) {
        var targetFrame = startFrame + idx;

        var scalarValue = scalarValues[idx];

        var currentPos = originVec.add(dirVec.scale(scalarValue));

        col.setPosition(targetFrame, currentPos.toVec3(), 0, 0, 0);
      }
    },

    stretchScalarCurve(sourceCurve: number[], targetLength: number): number[] {
      if (targetLength <= 1) {
        return [sourceCurve[0]];
      }

      if (sourceCurve.length === targetLength) {
        return sourceCurve.slice();
      }

      var n = sourceCurve.length;

      var d: number[] = new Core.Array(n - 1);

      for (var i = 0; i < n - 1; i++) {
        d[i] = sourceCurve[i + 1] - sourceCurve[i];
      }

      var m: number[] = new Core.Array(n);

      m[0] = d[0];

      for (var j = 1; j < n - 1; j++) {
        m[j] = (d[j - 1] + d[j]) / 2;
      }

      m[n - 1] = d[n - 2];

      for (var k = 0; k < n - 1; k++) {
        if (d[k] === 0) {
          m[k] = 0;
          m[k + 1] = 0;
        } else {
          var alpha = m[k] / d[k];

          var beta = m[k + 1] / d[k];

          var dist = alpha * alpha + beta * beta;

          if (dist > 9) {
            var tau = 3 / Core.Math.sqrt(dist);

            m[k] = tau * alpha * d[k];

            m[k + 1] = tau * beta * d[k];
          }
        }
      }

      var result: number[] = [];

      var srcMaxIdx = n - 1;

      for (var resultIndex = 0; resultIndex < targetLength; resultIndex++) {
        var progress = resultIndex / (targetLength - 1);

        var srcIndexFloat = progress * srcMaxIdx;

        var sourceIndex = Core.Math.floor(srcIndexFloat);

        if (sourceIndex >= srcMaxIdx) {
          sourceIndex = srcMaxIdx - 1;
        }

        var t = srcIndexFloat - sourceIndex;

        var t2 = t * t;

        var t3 = t2 * t;

        var h00 = 2 * t3 - 3 * t2 + 1;

        var h10 = t3 - 2 * t2 + t;

        var h01 = -2 * t3 + 3 * t2;

        var h11 = t3 - t2;

        result.push(
          h00 * sourceCurve[sourceIndex] +
            h10 * m[sourceIndex] +
            h01 * sourceCurve[sourceIndex + 1] +
            h11 * m[sourceIndex + 1],
        );
      }

      return result;
    },

    applyCameraSwipe(
      col: any,
      startFrame: number,
      directionVec: Vector2Input,
      extraFrames: number = 0,
    ): void {
      Core.scene.beginUndoRedoAccum('Camera Swipe');

      try {
        var baseEaseOut = [0.058, 0.201, 0.7, 5.3];

        var baseEaseIn = [4.5, 0.49, 0.086, 0];

        startFrame -= baseEaseOut.length - 1;

        var easeOutCurve = CameraSwipe.stretchScalarCurve(
          baseEaseOut,
          baseEaseOut.length + extraFrames,
        );

        var easeInCurve = CameraSwipe.stretchScalarCurve(
          baseEaseIn,
          baseEaseIn.length + extraFrames,
        );

        Core.MessageLog.trace('easeOutCurve: ' + easeOutCurve);

        var dir = new Core.Vec2(directionVec).normalized();

        var oppositeDirVec = dir.scale(-1);

        CameraSwipe.applyScalarCurveInDirection(col, startFrame, easeOutCurve, dir, [0, 0]);

        CameraSwipe.applyScalarCurveInDirection(
          col,

          startFrame + easeOutCurve.length,

          easeInCurve,

          oppositeDirVec,

          [0, 0],
        );
      } finally {
        Core.scene.endUndoRedoAccum();
      }
    },
  };

  return CameraSwipe;
}

type CameraSwipeModule = ReturnType<typeof createCameraSwipe>;
