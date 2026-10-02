include('globals.js');

function runCycle() {
  const sel = G.TimelineKit.getSelection();
  const selNode = sel.selectedNodes[0];
  if (!(selNode instanceof oDrawingNode)) {
    MessageLog.trace('Selected node is not a drawing node.');
    return;
  }
  const drawingElement = selNode.drawingElement;
  const drawing1 = drawingElement.getKeyframe(sel.startFrame);
  const drawing2 = drawingElement.getKeyframe(sel.startFrame + 1);
  const drawing3 = drawingElement.getKeyframe(sel.startFrame + 2);

  scene.beginUndoRedoAccum('Duplicate Drawing');
  drawingElement.copyDrawingTo(drawing1, sel.startFrame + 1);
  drawingElement.copyDrawingTo(drawing1, sel.startFrame + 2);
  drawingElement.copyDrawingTo(drawing2, sel.startFrame + 3);
  drawingElement.copyDrawingTo(drawing3, sel.startFrame + 4);
  drawingElement.copyDrawingTo(drawing3, sel.startFrame + 5);
  drawingElement.copyDrawingTo(drawing3, sel.startFrame + 6);
  drawingElement.copyDrawingTo(drawing2, sel.startFrame + 7);
  scene.endUndoRedoAccum();
}

function loopCurrentSelection() {
  scene.saveAll();
  scene.beginUndoRedoAccum('Duplicate Drawing');

  MessageLog.clearLog();
  const sel = G.TimelineKit.getSelection();

  for (const selNode of sel.selectedNodes) {
    if (!(selNode instanceof oDrawingNode)) {
      continue;
    }

    const elementCol = selNode.drawingElement;

    try {
      let lastValidFrame = sel.startFrame - 1;

      for (let i = sel.startFrame; i <= sel.endFrame; i++) {
        const keyframe = elementCol.getKeyframe(i);

        if (keyframe) {
          lastValidFrame = i;
        }
      }

      if (lastValidFrame >= sel.startFrame && lastValidFrame < sel.endFrame) {
        const sourceSelection = new G.oSelection(sel.startFrame, lastValidFrame);
        const pasteSelection = new G.oSelection(lastValidFrame + 1, sel.endFrame);

        elementCol.loopKeyframes(sourceSelection, pasteSelection);
      }

      const repeatSequenceLength = lastValidFrame - sel.startFrame + 1;

      for (let i = sel.startFrame; i <= sel.endFrame; i += repeatSequenceLength) {
        Timeline.createFrameMarker(selNode.index, 'Red', i);
      }
    } catch (error) {
      MessageLog.trace(`[Test-duplicate-drawing.ts] Error: ${error.message}`);
    }
  }
  scene.endUndoRedoAccum();
  return null;
}

function testDuplicateDrawing() {
  loopCurrentSelection();
}
