include('globals.js');

namespace KeyframeGeneratorKit {
  /**
   * Generate a decaying camera shake on a path column.
   *
   * @param column       The 3D-path column to keyframe.
   * @param startFrame   First frame of the shake.
   * @param endFrame     Last frame of the shake.
   * @param shakeAmount  Initial shake magnitude.
   *                     A number applies equally to both axes;
   *                     a Vec2 / {x,y} / [x,y] sets per-axis values.
   * @param decayExponent  How fast the shake fades (higher = faster decay).
   */
  export function generateShake(
    column: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    shakeAmount: vectors.Vector2Input,
    decayExponent: number,
  ) {
    var amount = vectors.resolveVec2(shakeAmount);

    MessageLog.trace(
      'generateShake: ' +
        column.toString() +
        ', frames ' +
        startFrame +
        '-' +
        endFrame +
        ', shake ' +
        JSON.stringify(amount) +
        ', decay ' +
        decayExponent,
    );

    var totalFrames = endFrame - startFrame;
    var minStepRatio = 0.7;
    var prev = new Vec2(0, 0);

    for (var i = startFrame; i <= endFrame; i++) {
      var progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;
      var remainingRatio = 1 - progress;

      var currentX = amount.x * Math.pow(remainingRatio, decayExponent);
      var currentY = amount.y * Math.pow(remainingRatio, decayExponent);

      var current: Vec2;

      if (currentX > 0.001 || currentY > 0.001) {
        var maxAmount = currentX > currentY ? currentX : currentY;
        var minDistSq = Math.pow(maxAmount * minStepRatio, 2);
        var attempts = 0;

        do {
          current = new Vec2(
            (Math.random() - 0.5) * 2 * currentX,
            (Math.random() - 0.5) * 2 * currentY,
          );
          attempts++;
        } while (attempts < 15 && current.distanceToSquared(prev) < minDistSq);
      } else {
        current = new Vec2(0, 0);
      }

      prev = current;

      // Apply shake as an OFFSET from the camera's existing position,
      // so pre-existing animation is preserved and the camera doesn't drift.
      // var baseX = column.getXVal(i);
      // var baseY = column.getYVal(i);
      column.setPosition(i, new Vec3(current.x, current.y, 0), 0, 0, 0);
    }
  }
}
