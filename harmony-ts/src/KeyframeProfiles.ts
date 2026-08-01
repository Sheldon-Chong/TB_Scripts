namespace CameraSwipe {
  export function smoothInPosition(
    column: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    startPos: Vec2,
    endPos: Vec2,
    exponent: number = 2,
  ) {
    const totalFrames = endFrame - startFrame;

    for (let i = startFrame; i <= endFrame; i++) {
      const progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;
      // Ease-In curve: progress^exponent
      const t = Math.pow(progress, exponent);

      // Linear interpolation using Vec2 math
      const current = startPos.lerp(endPos, t);
      column.setPosition(i, current.toVec3(), 0, 0, 0);
    }
  }

  /**
   * Smooth-Out (Ease-Out): Starts fast and decelerates smoothly into the target position.
   */
  export function smoothOutPosition(
    column: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    startPos: Vec2,
    endPos: Vec2,
    exponent: number = 2,
  ) {
    const totalFrames = endFrame - startFrame;

    for (let i = startFrame; i <= endFrame; i++) {
      const progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;
      // Ease-Out curve: 1 - (1 - progress)^exponent
      const t = 1 - Math.pow(1 - progress, exponent);

      // Linear interpolation using Vec2 math
      const current = startPos.lerp(endPos, t);
      column.setPosition(i, current.toVec3(), 0, 0, 0);
    }
  }

  export function applyScalarCurveInDirection(
    column: oPathColumn3D,
    startFrame: number,
    scalarValues: number[],
    direction: Vector2Input,
    origin: Vector2Input = new G.Vec2(0, 0),
  ) {
    // Normalize direction vector so scalar values retain exact magnitude
    const dirVec = new G.Vec2(direction).normalized();
    const originVec = new G.Vec2(origin);

    for (let idx = 0; idx < scalarValues.length; idx++) {
      const frame = startFrame + idx;
      const scalarVal = scalarValues[idx];

      // Position = origin + (directionUnitVector * scalarValue)
      const currentPos = originVec.add(dirVec.scale(scalarVal));

      column.setPosition(frame, currentPos.toVec3(), 0, 0, 0);
    }
  }

  /**
   * Resamples hand-tuned animation curves to any target length while strictly
   * preserving monotonic velocity (prevents spline overshoot/dips).
   * Uses monotone Hermite spline interpolation (Fritsch-Carlson).
   */
  export function stretchScalarCurve(sourceCurve: number[], targetLength: number): number[] {
    if (targetLength <= 1) return [sourceCurve[0]];
    if (sourceCurve.length === targetLength) return sourceCurve.slice();

    const n = sourceCurve.length;

    // Secant slopes
    const d: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      d[i] = sourceCurve[i + 1] - sourceCurve[i];
    }

    // Tangents
    const m: number[] = new Array(n);
    m[0] = d[0];
    for (let i = 1; i < n - 1; i++) {
      m[i] = (d[i - 1] + d[i]) / 2;
    }
    m[n - 1] = d[n - 2];

    // Fritsch-Carlson monotonicity enforcement
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
      } else {
        const alpha = m[i] / d[i];
        const beta = m[i + 1] / d[i];
        const dist = alpha * alpha + beta * beta;
        if (dist > 9) {
          const tau = 3 / Math.sqrt(dist);
          m[i] = tau * alpha * d[i];
          m[i + 1] = tau * beta * d[i];
        }
      }
    }

    // Sample Hermite spline at target resolution
    const result: number[] = [];
    const srcMaxIdx = n - 1;
    for (let i = 0; i < targetLength; i++) {
      const progress = i / (targetLength - 1);
      const srcIndexFloat = progress * srcMaxIdx;
      let idx = Math.floor(srcIndexFloat);
      if (idx >= srcMaxIdx) idx = srcMaxIdx - 1;

      const t = srcIndexFloat - idx;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      result.push(
        h00 * sourceCurve[idx] + h10 * m[idx] + h01 * sourceCurve[idx + 1] + h11 * m[idx + 1],
      );
    }
    return result;
  }

  export function applyCameraSwipe(
    column: oPathColumn3D,
    startFrame: number,
    directionVec: Vector2Input,
    extraFrames: number = 0, // Add frames to stretch the transition
  ) {
    scene.beginUndoRedoAccum('Camera Swipe');

    const baseEaseOut = [0.058, 0.201, 0.7, 5.3];
    const baseEaseIn = [4.5, 0.49, 0.086, 0];

    startFrame -= baseEaseOut.length - 1;

    // Dynamically stretch curve lengths while preserving hand-crafted acceleration
    const easeOutCurve = stretchScalarCurve(baseEaseOut, baseEaseOut.length + extraFrames);
    const easeInCurve = stretchScalarCurve(baseEaseIn, baseEaseIn.length + extraFrames);

    MessageLog.trace('easeOutCurve: ' + easeOutCurve);

    // Normalize direction vector safely using Vec2
    const dir = new G.Vec2(directionVec).normalized();
    const oppositeDirVec = dir.scale(-1);

    applyScalarCurveInDirection(column, startFrame, easeOutCurve, dir, [0, 0]);

    applyScalarCurveInDirection(
      column,
      startFrame + easeOutCurve.length,
      easeInCurve,
      oppositeDirVec,
      [0, 0],
    );

    scene.endUndoRedoAccum();
  }
}

// Augment HarmonyGlobals so G.CameraSwipe has full intellisense
interface HarmonyGlobals {
  CameraSwipe: typeof CameraSwipe;
}

G.CameraSwipe = CameraSwipe;
_.CameraSwipe = CameraSwipe;
