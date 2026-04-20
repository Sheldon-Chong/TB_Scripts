include("Operations.js");
include("DrawingView.js");

// The properties from the `options` object are destructured
// directly into `nodePath`, `x`, and `y` variables.
/**
 * @param {FrameOptions} options - The configuration object. 
 * 
 * @typedef {object} FrameOptions
 * @property {number} node - The x-coordinate to move the node to.
 * @property {number} index - The y-coordinate to move the node to.
*/
function Frame(options) {
    this.node = options.node || selection.selectedNode(0);
    this.index = options.index || frame.current();
    this._frameData = getFrameAt(this.node, this.index);
    this.column = {};
    this.isNull = false;
    if (this._frameData.isNull === true)
        this.isNull = true;

    
    for (var column in GlobalTimeline.layers) {
        if (("Top/" + GlobalTimeline.layers[column].displayName) === this.node ) {
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
    }

    this.createLayers = function(layers, artLayerIndex) {
        artLayerIndex = artLayerIndex || 0;
        DrawingTools.createLayers({
            drawing: this._frameData,
            art: artLayerIndex,
            layers: layers
        })
    }

    /**
     * @param {PasteOptions} options 
     */
    this.paste = function (options) {
        options.drawing = { node: this.node, frame: this.index };
        DrawingView.paste(options);
    }


    this.getPalletesUsed = function () {
        return getPalletesUsedFromJson(this.getDrawingData());
    }

}

