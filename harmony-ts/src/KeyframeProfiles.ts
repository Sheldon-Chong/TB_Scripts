function applyCameraSwipe(
  column: oPathColumn3D,
  startFrame: number,
  directionVec: Vector2Input,
  extraFrames: number = 0, // Add frames to stretch the transition
) {
  scene.beginUndoRedoAccum('Camera Swipe');

  const baseEaseOut = [0.058, 0.201, 0.7, 5.3];
  const baseEaseIn = [4.5, 0.49, 0.086, 0];

  // Dynamically stretch curve lengths while preserving hand-crafted acceleration
  const easeOutCurve = stretchScalarCurve(baseEaseOut, baseEaseOut.length + extraFrames);
  const easeInCurve = stretchScalarCurve(baseEaseIn, baseEaseIn.length + extraFrames);

  MessageLog.trace('easeOutCurve: ' + easeOutCurve);

  // Normalize direction vector safely using Vec2
  const dir = new Vec2(directionVec).normalized();
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
