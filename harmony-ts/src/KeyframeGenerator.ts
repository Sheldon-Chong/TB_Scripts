include('globals.js');

namespace KeyframeGeneratorKit {
  export function generateShake(
    column: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    initialShakeAmount: number,
    decayExponent: number,
  ) {
    MessageLog.trace(
      'testing generateShake with column: ' +
        column.toString() +
        ', startFrame: ' +
        startFrame +
        ', endFrame: ' +
        endFrame +
        ', initialShakeAmount: ' +
        initialShakeAmount +
        ', decayExponent: ' +
        decayExponent,
    );
    const totalFrames = endFrame - startFrame;
    const minStepRatio = 0.7;

    let prev = new Vec2(0, 0);

    for (let i = startFrame; i <= endFrame; i++) {
      const progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;
      const remainingRatio = 1 - progress;
      const currentShakeAmount = initialShakeAmount * Math.pow(remainingRatio, decayExponent);

      let current: Vec2;

      if (currentShakeAmount > 0.001) {
        const minDistSq = Math.pow(currentShakeAmount * minStepRatio, 2);
        let attempts = 0;

        do {
          current = new Vec2(Math.random(), Math.random())
            .subtract(0.5)
            .scale(2 * currentShakeAmount);
          attempts++;
        } while (attempts < 15 && current.distanceToSquared(prev) < minDistSq);
      } else {
        current = new Vec2(0, 0);
      }

      prev = current;
      column.setPosition(i, current.toVec3(), 0, 0, 0);
    }
  }
}
