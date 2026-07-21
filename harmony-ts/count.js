include("globals.js");
MessageLog.clearLog();
var MAX_PASS = 16;
var MIN_PASS = 1;
function calculateNumberOfEmptyFrames() {
    var selection = G.GlobalTimeline.getSelection();
    var empty_count = 0;
    MessageLog.trace("Calculating empty frames for selection: Start Frame = ".concat(selection.startFrame, ", End Frame = ").concat(selection.endFrame));
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        for (var passNumber = MIN_PASS; passNumber <= MAX_PASS; passNumber++) {
            var layerName = "Top/Drawing_".concat(passNumber);
            MessageLog.trace("Checking layer: ".concat(layerName));
            var drawingColumn = G.LayerManager.getNodeLayer(layerName).getColumn("DRAWING.ELEMENT");
            var drawingValue = drawingColumn.getKeyframe(i);
            if (!drawingValue || drawingValue === "" || drawingValue === null) {
                MessageLog.trace("Empty frame detected.");
                empty_count++;
            }
        }
        MessageLog.trace("Frame ".concat(i, ": Empty frames: ").concat(empty_count));
    }
    var nonEmptyFrames = (selection.endFrame - selection.startFrame + 1) * MAX_PASS - empty_count;
    MessageLog.trace("Total empty frames in selection: ".concat(empty_count));
    MessageLog.trace("Total non-empty frames in selection: ".concat(nonEmptyFrames));
}
