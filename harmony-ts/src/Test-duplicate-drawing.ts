include('globals.js');

function testDuplicateDrawing(): oDrawing | null {
  MessageLog.clearLog();
  const sel = G.TimelineKit.getSelection();
  const selNode = sel.selectedNodes[0] as oDrawingNode;

  const elementCol = selNode.drawingElement as oDrawingElementColumn;
  MessageLog.trace(`[Test-duplicate-drawing.ts] ${elementCol.constructor.name}`);
  MessageLog.trace(
    `[Test-duplicate-drawing.ts] ${elementCol.getKeyframe(frame.current()).constructor.name}`,
  );

  elementCol.copyDrawingTo(elementCol.getKeyframe(frame.current()), frame.current() + 1);

  return null;

  MessageLog.trace(`[Test-duplicate-drawing.ts] ${selNode.name}`);
  MessageLog.trace(`[Test-duplicate-drawing.ts] ${selNode.drawingElement}`);
  const element = selNode.getElement();
  MessageLog.trace(`[Test-duplicate-drawing.ts] ${element}`);
  element.getDrawings().forEach((drawingName) => {
    MessageLog.trace(`[Test-duplicate-drawing.ts] ${drawingName}`);
  });

  const newDrawing = element.duplicateDrawing('new', 'TestDrawing_50');
  MessageLog.trace(`[Test-duplicate-drawing.ts] ${newDrawing.name}`);

  return null;
}
