include("globals.js");
var SELECTED_MATTE_INDEX = 12;
LayerManager.getNodeLayers().forEach(function (layer) {
    if (layer.name === SELECTED_MATTE_INDEX.toString()
        || layer.name === "Pass_".concat(SELECTED_MATTE_INDEX)
        || layer.name === "Transparency_".concat(SELECTED_MATTE_INDEX)
        || layer.isGroup()
        || layer.name === "Backdrop") {
        layer.setEnabled(true);
    }
    else {
        layer.setEnabled(false);
    }
});
var transparencyCol = G.LayerManager.getNodeLayer("Top/Passes/Transparency_".concat(SELECTED_MATTE_INDEX)).getColumn("transparency");
MessageLog.trace("transparency col: " + transparencyCol);
function getOpaqueChunks(startFrame, endFrame) {
    var values = transparencyCol.getKeyframeRange(startFrame, endFrame);
    var chunks = [];
    var chunkStart = null;
    for (var i = 0; i < values.length; i++) {
        var frame_1 = startFrame + i;
        var isOpaque = values[i] === "0.0000";
        if (isOpaque && chunkStart === null) {
            chunkStart = frame_1;
        }
        else if (!isOpaque && chunkStart !== null) {
            chunks.push({ start: chunkStart, end: frame_1 - 1 });
            chunkStart = null;
        }
    }
    if (chunkStart !== null) {
        chunks.push({ start: chunkStart, end: endFrame });
    }
    return chunks;
}
var START_FRAME = 1;
var END_FRAME = 5000;
var opaqueChunks = getOpaqueChunks(START_FRAME, END_FRAME);
MessageLog.trace(JSON.stringify(opaqueChunks, null, 2));
render.setWriteEnabled(false);
render.setRenderDisplay("Top/Display");
render.setWhiteBackground(false);
var writeNode = new NodeLayer(-1, -1, "Top/Write", "Write");
MessageLog.trace(JSON.stringify(writeNode.getAttributeKeywords()));
MessageLog.trace(JSON.stringify(writeNode.getAttributeNames()));
writeNode.setAttribute("MOVIE_PATH", "D:/toonboom/individual/mask_".concat(SELECTED_MATTE_INDEX));
