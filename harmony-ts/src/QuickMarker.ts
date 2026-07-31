include('globals.js');
include(specialFolders.userScripts + '/core/CameraSwipe.js');

function createMarker() {
  const selection = new G.oSelection();
  MessageLog.trace('selection: ' + selection.toString());

  const name = G.Utils.prompt('name');

  TimelineMarker.createMarker({
    frame: selection.startFrame,
    length: selection.length,
    color: '#9caddb',
    name: name,
    notes: 'extended exposures',
  });
}

function generateShake(
  column: oPathColumn3D,
  startFrame: number,
  endFrame: number,
  initialShakeAmount: number,
  decayExponent: number,
) {
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

function testShake() {
  scene.beginUndoRedoAccum('Shake Camera');

  const selection = new G.oSelection();

  const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
  const pos = camPeg.position as oPathColumn3D;

  generateShake(pos, selection.startFrame, selection.endFrame, 10, 3);

  scene.endUndoRedoAccum();
}

function smoothInPosition(
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
function smoothOutPosition(
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

function applyScalarCurveInDirection(
  column: oPathColumn3D,
  startFrame: number,
  scalarValues: number[],
  direction: Vector2Input,
  origin: Vector2Input = new Vec2(0, 0),
) {
  // Normalize direction vector so scalar values retain exact magnitude
  const dirVec = new Vec2(direction).normalized();
  const originVec = new Vec2(origin);

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
 */
function stretchScalarCurve(sourceCurve: number[], targetLength: number): number[] {
  return _.CameraSwipe.stretchScalarCurve(sourceCurve, targetLength);
}

function testApplyScalar() {
  const startFrame = new G.oSelection().startFrame;
  const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
  const pos = camPeg.position as oPathColumn3D;

  const width = 1920;
  const height = 1080;

  const topRightDir = new Vec2(width / 2, height / 2).normalized();
  const topLeftDir = new Vec2(-width / 2, height / 2).normalized();
  const bottomRightDir = new Vec2(width / 2, -height / 2).normalized();
  const bottomLeftDir = new Vec2(-width / 2, -height / 2).normalized();

  const directionVec = [-1, 0.2];
  applyCameraSwipe(pos, startFrame, directionVec, 0);
}

function serializeKeyframesOfSelection() {
  const selection = new G.oSelection();

  const pos = (G.LayerManager.getNodeLayer('Top/Drawing') as oDrawingNode).position;
  const scale = (G.LayerManager.getNodeLayer('Top/Drawing') as oDrawingNode).scale;

  let keyframes: any[] = [];
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    const p = pos.get(i);
    const s = scale.get(i);
    keyframes.push({
      x: p.x,
      y: p.y,
      z: p.z,
      scaleX: s.x,
      scaleY: s.y,
      scaleZ: s.z,
    });
  }

  MessageLog.trace('keyframes: ' + JSON.stringify(keyframes, null, 2));
}
