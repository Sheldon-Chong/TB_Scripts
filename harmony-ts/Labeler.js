include("GlobalTimeline.js");
include("globals.js");
function recursiveWalk(obj, callback) {
    function recurse(o) {
        if (Array.isArray(o)) {
            for (var i = 0; i < o.length; i++)
                recurse(o[i]);
        }
        else if (typeof o === "object" && o !== null) {
            for (var key in o) {
                if (!o.hasOwnProperty(key))
                    continue;
                callback(key, o[key]);
                recurse(o[key]);
            }
        }
    }
    recurse(obj);
}
this.__proto__.recursiveWalk = recursiveWalk;
this.__proto__.getParentPalette = function getParentPalette(colorId) {
    var palettes = PaletteObjectManager.getScenePaletteList();
    for (var i = 0; i < palettes.numPalettes; i++) {
        var palette = palettes.getPaletteByIndex(i);
        var color = palette.getColorById(colorId);
        if (color.isValid) {
            return palette;
        }
    }
    return null;
};
function openFrameMonitorWindow() {
    var window = new QWidget();
    window.setWindowTitle("Frame Monitor");
    window.resize(300, 100);
    var frameLabel = new QLabel("Current Frame: " + frame.current());
    var layout = new QVBoxLayout();
    layout.addWidget(frameLabel, 0, 0);
    window.setLayout(layout);
    var frameNotifier = new SceneChangeNotifier(layout);
    G.GlobalTimeline.setMetadata("previousFrame", frame.current());
    var frameChangedHandler = G.Utils.bind(function () {
        var _a;
        try {
            var previousFrame = parseInt(G.GlobalTimeline.getMetadata("previousFrame"));
            var currentSelection = G.GlobalTimeline.getSelection();
            var currentCell = currentSelection.getCell();
            frameLabel.text = "Current Frame: " + currentCell.frame;
            if (previousFrame === currentCell.frame) {
                return;
            }
            var previousCell = new G.DrawingCell(previousFrame, currentCell.node);
            var settings = Tools.getToolSettings();
            var data = previousCell.getDrawingData(settings.activeArt);
            var palletesUsed = G.DrawingDataUtils.getPalletesUsedFromDrawingData(data);
            MessageLog.trace("Analyzing frame " + previousFrame + " (previous) while at frame " + currentCell.frame + " (current)");
            if (!palletesUsed || palletesUsed.length === 0) {
                MessageLog.trace("No palettes found in " + currentCell.node.nodePath + " at frame " + previousFrame);
                G.GlobalTimeline.setMetadata("previousFrame", currentCell.frame);
                return;
            }
            var palleteName = palletesUsed[0].pallete.getName();
            if (palleteName === "Template_Lineart" && palletesUsed.length > 1)
                palleteName = (_a = palletesUsed[1].pallete.getName()) !== null && _a !== void 0 ? _a : palleteName;
            MessageLog.trace(JSON.stringify(palleteName, null, 2));
            var colName = currentCell.node.getColumn("DRAWING.ELEMENT").name;
            column.setDrawingType(colName, previousFrame, palleteName);
            G.GlobalTimeline.setMetadata("previousFrame", currentCell.frame);
        }
        catch (error) {
            MessageLog.trace("Error in frameChangedHandler: " + error.toString() + "\n" + error.fileName + ":" + error.lineNumber);
        }
    }, this);
    frameNotifier.currentFrameChanged.connect(frameChangedHandler);
    frameNotifier.selectionChanged.connect(frameChangedHandler);
    window.closeEvent = function (event) {
        frameNotifier.currentFrameChanged.disconnect(frameChangedHandler);
        frameNotifier.selectionChanged.disconnect(frameChangedHandler);
        event.accept();
    };
    window.show();
}
