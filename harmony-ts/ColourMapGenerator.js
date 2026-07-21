include("globals.js");
var MAX_PASS = 16;
var MIN_PASS = 1;
var PASS_PATH = "Top/";
var PASS_PREFIX = "Pass_";
var TRANSPARENCY_PREFIX = "Transparency_";
var TOGGLE_ON = 0;
var TOGGLE_OFF = 100;
var PASS_GROUP = G.LayerManager.getNodeLayer("Top/Passes");
var CAMERA_OFFSET_PEG = G.LayerManager.getNodeLayer("Top/Peg");
var CAMERA_PEG = G.LayerManager.getNodeLayer("Top/Camera-P");
var BG = G.LayerManager.getNodeLayer("Top/bg");
var BACKDROP = G.LayerManager.getNodeLayer("Top/backdrop");
var ColorMatte = (function () {
    function ColorMatte(passNumber) {
        this.passNumber = passNumber;
        MessageLog.trace("initializing ColorMatte for Pass_" + passNumber);
        var drawingLayerPath = "".concat(PASS_PATH).concat(passNumber);
        var transparencyLayerPath = "".concat(PASS_PATH).concat(TRANSPARENCY_PREFIX).concat(passNumber);
        var passLayerPath = "".concat(PASS_PATH).concat(PASS_PREFIX).concat(passNumber);
        try {
            this.drawingLayer = G.LayerManager.getNodeLayer(drawingLayerPath);
            this.transparencyLayer = G.LayerManager.getNodeLayer(transparencyLayerPath);
            this.passLayer = G.LayerManager.getNodeLayer(passLayerPath);
            this.drawingCol = this.drawingLayer.getColumn("DRAWING.ELEMENT");
            this.transparencyCol = this.transparencyLayer.getColumn("transparency");
            this.passCol = this.passLayer.getColumn("DRAWING.ELEMENT");
            this.initialPassDrawing = this.passCol.getKeyframe(1);
        }
        catch (error) {
            if (!this.drawingCol)
                MessageLog.trace("\u26A0\uFE0F Expected drawing layer at ".concat(drawingLayerPath, ", instead got ").concat(G.LayerManager.getNodeLayer(drawingLayerPath)));
            if (!this.transparencyCol)
                MessageLog.trace("\u26A0\uFE0F Expected transparency layer at ".concat(transparencyLayerPath, ", instead got ").concat(G.LayerManager.getNodeLayer(transparencyLayerPath)));
            if (!this.passCol)
                MessageLog.trace("\u26A0\uFE0F Expected pass layer at ".concat(passLayerPath, ", instead got ").concat(G.LayerManager.getNodeLayer(passLayerPath)));
            throw error;
        }
    }
    ColorMatte.prototype.toggleForFrame = function (frame) {
        var drawingValue = this.drawingCol.getKeyframe(frame);
        MessageLog.trace("Toggling Pass_".concat(this.passNumber, " for frame ").concat(frame, ". Current drawing value: ").concat(JSON.stringify(drawingValue)));
        this.transparencyCol.setKeyFrame(frame, drawingValue === null ? TOGGLE_OFF : TOGGLE_ON);
    };
    ColorMatte.prototype.toggleForFrameRange = function (startFrame, endFrame) {
        for (var frame_1 = startFrame; frame_1 <= endFrame; frame_1++) {
            this.toggleForFrame(frame_1);
        }
    };
    ColorMatte.prototype.setMatteEnabled = function (enabled) {
        this.transparencyCol.parent.setEnabled(enabled);
    };
    ColorMatte.prototype.isMatteEnabled = function () {
        return this.transparencyCol.parent.isEnabled() && this.passCol.parent.isEnabled();
    };
    return ColorMatte;
}());
function disconnectOutputPort(sourceNode, outputPortIndex) {
    var numLinks = node.numberOfOutputLinks(sourceNode, outputPortIndex);
    for (var i = numLinks - 1; i >= 0; i--) {
        var destinationNode = node.dstNode(sourceNode, outputPortIndex, i);
        var targetInputPort = 0;
        var numInputs = node.numberOfInputPorts(destinationNode);
        for (var p = 0; p < numInputs; p++) {
            if (node.srcNode(destinationNode, p) === sourceNode) {
                targetInputPort = p;
                break;
            }
        }
        node.unlink(destinationNode, targetInputPort);
    }
}
function disconnectAllOutputPorts(sourceNode) {
    var numOutputPorts = node.numberOfOutputPorts(sourceNode);
    for (var portIndex = 0; portIndex < numOutputPorts; portIndex++) {
        disconnectOutputPort(sourceNode, portIndex);
    }
}
var colorMattes = [];
MessageLog.trace("layer : ".concat(G.LayerManager.getNodeLayer("Top/1")));
MessageLog.trace("all node layers : ".concat(G.LayerManager.getNodeLayers().map(function (layer) { return layer.nodePath; }).join(", ")));
MessageLog.trace("timeline num layers: ".concat(Timeline.numLayers));
for (var i = MIN_PASS; i <= MAX_PASS; i++) {
    colorMattes.push(new ColorMatte(i));
}
function updateColorMapForSelectionSeperatePaths() {
    scene.beginUndoRedoAccum("Toggle Color Map for Pass");
    var selection = G.GlobalTimeline.getSelection();
    var originalPositionX = CAMERA_PEG.getColumn("position.x");
    var originalPositionY = CAMERA_PEG.getColumn("position.y");
    var originalPositionZ = CAMERA_PEG.getColumn("position.z");
    var offsetPositionColX = CAMERA_OFFSET_PEG.getColumn("position.x");
    var offsetPositionColY = CAMERA_OFFSET_PEG.getColumn("position.y");
    var offsetPositionColZ = CAMERA_OFFSET_PEG.getColumn("position.z");
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        var originalX = originalPositionX.getKeyframe(i);
        var originalY = originalPositionY.getKeyframe(i);
        var originalZ = originalPositionZ.getKeyframe(i);
        offsetPositionColX.setKeyFrame(i, originalX * -0.5);
        offsetPositionColY.setKeyFrame(i, originalY * -0.5);
        offsetPositionColZ.setKeyFrame(i, 0);
        MessageLog.trace("Frame ".concat(i, ": Original Position - X: ").concat(originalX, ", Y: ").concat(originalY, ", Z: ").concat(originalZ));
        MessageLog.trace(">>> " + offsetPositionColX.getKeyframe(i) + " , " + offsetPositionColY.getKeyframe(i) + " , " + offsetPositionColZ.getKeyframe(i));
    }
    scene.endUndoRedoAccum();
}
function updateColorMapForSelection() {
    scene.beginUndoRedoAccum("Toggle Color Map for Pass");
    MessageLog.trace(">>> Updating color map for selection");
    var selection = G.GlobalTimeline.getSelection();
    for (var i = MIN_PASS; i <= MAX_PASS; i++) {
        MessageLog.trace("----  Toggling Color Map for Pass_".concat(i, " ---- "));
        colorMattes[i - 1].toggleForFrameRange(selection.startFrame, selection.endFrame);
    }
    var originalPositionCol = CAMERA_PEG.getColumn("position.attr3dpath");
    var offsetPositionCol = CAMERA_OFFSET_PEG.getColumn("position.attr3dpath");
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        var originalX = originalPositionCol.getXVal(i);
        var originalY = originalPositionCol.getYVal(i);
        var originalZ = originalPositionCol.getZVal(i);
        offsetPositionCol.setX(i, originalX * -0.5);
        offsetPositionCol.setY(i, originalY * -0.5);
        offsetPositionCol.setZ(i, 0);
        MessageLog.trace(">>> " + offsetPositionCol.getX(i) + " , " + offsetPositionCol.getY(i) + " , " + offsetPositionCol.getZ(i));
    }
    scene.endUndoRedoAccum();
}
function getColorMatte(passNumber) {
    if (passNumber < MIN_PASS || passNumber > MAX_PASS) {
        MessageLog.trace("Pass number ".concat(passNumber, " is out of range (").concat(MIN_PASS, "-").concat(MAX_PASS, ")."));
        return null;
    }
    return colorMattes[passNumber - 1];
}
function setColorMapEnabled(enabled) {
    var _a;
    for (var i = MIN_PASS; i <= MAX_PASS; i++) {
        (_a = getColorMatte(i)) === null || _a === void 0 ? void 0 : _a.setMatteEnabled(enabled);
    }
}
var PASSES_CONFIG_PATH = "D:\\YT projects\\Coding\\ToonBoom\\harmony-ts\\src\\passes.json";
var PASSES_CONFIG = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
var PASS_COLORS = PASSES_CONFIG["passes"];
function serializeColorsOfPalette() {
    var palette = G.Palettes.get("Passes");
    var colorsData = palette.getColors().map(function (color) { return ({
        name: color.name,
        color: rgbToHex(color.colorData.r, color.colorData.g, color.colorData.b)
    }); });
    MessageLog.trace(JSON.stringify(colorsData, null, 2));
    return colorsData;
}
function toggleColorMapMode() {
    scene.beginUndoRedoAccum("Toggle Color Map Mode");
    MessageLog.trace("".concat(node.numberOfInputPorts("Top/1")));
    var isAnyEnabled = colorMattes.some(function (matte) { return matte.isMatteEnabled(); });
    var toggleOn = !isAnyEnabled;
    if (toggleOn)
        MessageLog.trace("Enabling all color mattes...");
    else {
        MessageLog.trace("Disabling all color mattes...");
    }
    for (var i = MIN_PASS; i <= MAX_PASS; i++) {
        var color_matte = colorMattes[i - MIN_PASS];
        color_matte.passLayer.setEnabled(toggleOn);
        color_matte.transparencyLayer.setEnabled(toggleOn);
        color_matte.drawingLayer.setEnabled(true);
        if (toggleOn) {
            disconnectAllOutputPorts(color_matte.drawingLayer.nodePath);
            disconnectAllOutputPorts(color_matte.passLayer.nodePath);
            node.link(color_matte.drawingLayer.nodePath, 0, color_matte.passLayer.nodePath, 1);
            node.link(color_matte.passLayer.nodePath, 0, color_matte.transparencyLayer.nodePath, 0);
            node.link(color_matte.transparencyLayer.nodePath, 0, "Top/Composite", i - 1, false, true);
        }
        else {
            disconnectAllOutputPorts(color_matte.transparencyLayer.nodePath);
            disconnectAllOutputPorts(color_matte.drawingLayer.nodePath);
            var currentPorts = node.numberOfInputPorts("Top/Composite");
            node.link(color_matte.drawingLayer.nodePath, 0, "Top/Composite", currentPorts, false, true);
        }
    }
    var palette = G.Palettes.get("Passes");
    for (var i = MIN_PASS; i <= MAX_PASS; i++) {
        var color = palette.getColor("Pass_".concat(i));
        if (!color)
            continue;
        var passColor = hexToRgb(PASS_COLORS["Pass_".concat(i)]);
        color.colorData = {
            r: passColor.r,
            g: passColor.g,
            b: passColor.b,
            a: 255
        };
    }
    var DEFAULT_PALETTE = G.Palettes.get("Template_Lineart");
    var LINEART_COLOR = DEFAULT_PALETTE.getColorById("0c0b25adddd01181");
    if (!toggleOn) {
        setColorMapEnabled(false);
        BACKDROP.setEnabled(false);
        BG.setEnabled(true);
        CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1);
        CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1);
        CAMERA_OFFSET_PEG.setEnabled(false);
        LINEART_COLOR.colorData = {
            r: 0,
            g: 0,
            b: 0,
            a: 255
        };
    }
    else {
        setColorMapEnabled(true);
        BACKDROP.setEnabled(true);
        BG.setEnabled(false);
        CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1.5);
        CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1.5);
        CAMERA_OFFSET_PEG.setEnabled(true);
        LINEART_COLOR.colorData = {
            r: 0,
            g: 0,
            b: 0,
            a: 0
        };
    }
    scene.endUndoRedoAccum();
}
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (x) {
        var hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}
function hexToRgb(hex) {
    var match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) {
        return null;
    }
    return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
    };
}
function printPaletteColors() {
    var passPalette = G.Palettes.get("Passes");
    var colors = [];
    passPalette.getColors().forEach(function (color, index) {
        colors.push({
            color: rgbToHex(color.colorData.r, color.colorData.g, color.colorData.b)
        });
    });
    MessageLog.trace(JSON.stringify(colors, null, 2));
}
function loadColorMapFromFile() {
    var filePath = QFileDialog.getOpenFileName(0, "testing", "", "JSON Files (*.json)");
    if (!filePath) {
        MessageLog.trace("No file selected");
        return;
    }
    var colors = JSON.parse(G.FileUtils.readFrom(filePath));
    MessageLog.trace(JSON.stringify(colors));
    var passPalette = G.Palettes.get("Passes");
    passPalette.getColors().forEach(function (color, index) {
        MessageLog.trace(">>> " + color.name + " , " + color.colorData.r + " , " + color.colorData.g + " , " + color.colorData.b);
        color.colorData = {
            r: hexToRgb(colors[index].color).r,
            g: hexToRgb(colors[index].color).g,
            b: hexToRgb(colors[index].color).b,
            a: 255
        };
    });
}
