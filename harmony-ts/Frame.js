include("Operations.js");
include("DrawingView.js");
function Frame(options) {
    this.node = options.node || selection.selectedNode(0);
    this.index = options.index || frame.current();
    this._frameData = getFrameAt(this.node, this.index);
    this.column = {};
    this.isNull = false;
    if (this._frameData.isNull === true)
        this.isNull = true;
    for (var column in GlobalTimeline.layers) {
        if (("Top/" + GlobalTimeline.layers[column].displayName) === this.node) {
            this.column = GlobalTimeline.layers[column];
        }
    }
    this.exposure = this._frameData.exposure;
    var settings = Tools.getToolSettings();
    this.getDrawingData = function () {
        var data = Drawing.query.getData({
            drawing: this._frameData,
            art: settings.activeArt
        });
        return data;
    };
    this.createLayers = function (layers, artLayerIndex) {
        artLayerIndex = artLayerIndex || 0;
        DrawingTools.createLayers({
            drawing: this._frameData,
            art: artLayerIndex,
            layers: layers
        });
    };
    this.paste = function (options) {
        options.drawing = { node: this.node, frame: this.index };
        DrawingView.paste(options);
    };
    this.getPalletesUsed = function () {
        return getPalletesUsedFromJson(this.getDrawingData());
    };
}
