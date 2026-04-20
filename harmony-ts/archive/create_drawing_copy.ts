include("PositionTransformer.js");

var xKeys = ["x0", "x1", "x", "ox", "xx", "xy"];
var yKeys = ["y0", "y1", "y", "oy", "yx", "yy"];

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function main() {

    MessageLog.clearLog() 
    // MessageLog.trace("\n\n\nNEW SESSION --------------------------");

    var node = selection.selectedNode(0);
    var current_frame = frame.current();
    var nextFrameData = Drawing.query.getData({ drawing: { node: node, frame: current_frame + 1 } });

    MessageLog.trace("\n\n\nnextFrameData: " + JSON.stringify(nextFrameData, null, 2) + "\n\n\n");
    var layers = nextFrameData.arts[0].layers;

    for (var i = 0; i < layers.length; i++) {
        var strokes = layers[i].strokes;
        
        if (!strokes || strokes.length === 0) continue;

        for (var j = 0; j < strokes.length; j++)
            strokes[j].pencilColorId = strokes[j].colorId;
    }
    DrawingTools.createLayers({
        label: "Paste All Layers from Next Frame",
        drawing: { node: node, frame: current_frame },
        art: 2,
        layers: layers
    });
    nextFrameData = Drawing.query.getData({ drawing: { node: node, frame: current_frame + 1 } });

    var overlayArt = null;
    for (var a = 0; a < nextFrameData.arts.length; a++) {
        if (nextFrameData.arts[a].art === 3) {
            overlayArt = nextFrameData.arts[a];
            break;
        }
    }
    if (overlayArt && overlayArt.layers && overlayArt.layers.length > 0) {
        var layers = overlayArt.layers;
        var test = new PositionTransformer(layers);
        test.applyToPositions(function(val, key) { 
            if (val.type === SingularCoordinateType.X)
                return val.value + randomBetween(0, 10);
            else if (val.type === SingularCoordinateType.Y)
                return val.value + randomBetween(0, 10);
        })
        for (var i = 0; i < layers.length; i++) {
            var strokes = layers[i].strokes;
            if (!strokes || strokes.length === 0) continue;
            for (var j = 0; j < strokes.length; j++)
                strokes[j].pencilColorId = strokes[j].colorId;
        }
        DrawingTools.createLayers({
            label: "Paste All Layers from Next Frame (Overlay)",
            drawing: { node: node, frame: current_frame },
            art: 3,
            layers: layers
        });
    }

    // Query and print current frame data after creating layers
}