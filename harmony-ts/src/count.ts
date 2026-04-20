include("globals.js");

MessageLog.clearLog();

const MAX_PASS = 16;
const MIN_PASS = 1;
function calculateNumberOfEmptyFrames() {
  const selection = G.GlobalTimeline.getSelection();

  let empty_count = 0;

  MessageLog.trace(`Calculating empty frames for selection: Start Frame = ${selection.startFrame}, End Frame = ${selection.endFrame}`);
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    for (let passNumber = MIN_PASS; passNumber <= MAX_PASS; passNumber++) {
      const layerName = `Top/Drawing_${passNumber}`;
      MessageLog.trace(`Checking layer: ${layerName}`);
      const drawingColumn = G.LayerManager.getNodeLayer(layerName).getColumn("DRAWING.ELEMENT");
      const drawingValue = drawingColumn.getKeyframe(i);
      if (!drawingValue || drawingValue === "" || drawingValue === null) {
        MessageLog.trace("Empty frame detected.");
        empty_count++;
      }
    }
    MessageLog.trace(`Frame ${i}: Empty frames: ${empty_count}`);
  }

  let nonEmptyFrames = (selection.endFrame - selection.startFrame + 1) * MAX_PASS - empty_count;
  MessageLog.trace(`Total empty frames in selection: ${empty_count}`);
  MessageLog.trace(`Total non-empty frames in selection: ${nonEmptyFrames}`);
}
