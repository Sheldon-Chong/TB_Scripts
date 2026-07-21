include("globals.js");
include("openHarmony.js");
include("DrawingPaster.js");
include("test.js");
include("Transformations.js");
include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/ColorUtils.js");
include("Frame.js");
include("GlobalTimeline.js");
include("DrawingView.js");
include(specialFolders.userScripts + "/utils/LogUtils.js");
include(specialFolders.userScripts + "/utils/Shapes.js");
include("Toolbar.js");
include("Layers.js");
include(specialFolders.userScripts + "/Renderer.js");
include(specialFolders.scripts + "/widgets/WidgetUtils.js");
var ToggleGroup = (function () {
    function ToggleGroup() {
        this.buttons = [];
    }
    ToggleGroup.prototype.add = function (button) {
        this.buttons.push(button);
        button._toggleGroup = this;
    };
    ToggleGroup.prototype.select = function (button) {
        for (var _i = 0, _a = this.buttons; _i < _a.length; _i++) {
            var btn = _a[_i];
            if (btn !== button) {
                btn.setSelected(false, true);
            }
        }
    };
    return ToggleGroup;
}());
;
var MarkerColors = {
    RED: "Red",
    ORANGE: "Orange",
    YELLOW: "Yellow",
    GREEN: "Green",
    CYAN: "Cyan",
    BLUE: "Blue",
    PURPLE: "Purple",
    PINK: "Pink",
    WHITE: "White",
    BLACK: "Black"
};
var LitDrawing = (function () {
    function LitDrawing(name, layer, masterLightingController) {
        this.name = name;
        this.layer = layer;
        this.masterLightingController = masterLightingController;
    }
    LitDrawing.prototype.appliedLightingGroups = function (selection) {
        var selection = selection !== null && selection !== void 0 ? selection : new oSelection();
    };
    LitDrawing.prototype.applyLighting = function (lightingGroup, selection) {
        this.masterLightingController.clearLighting(selection);
    };
    return LitDrawing;
}());
var MasterLightingController = (function () {
    function MasterLightingController() {
        this.renderPreviewNode = LayerManager.getNodeLayer("Top/RenderPreview");
        var RENDER_PREVIEW_SCALE = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "1/1"];
        var sNode = "Top/RenderPreview";
        var wAttr = node.getAttr(sNode, 1, "scaling");
        var myAttributeValue = wAttr.textValue();
        MessageLog.trace("RenderPreview scaling attribute value: " + myAttributeValue);
        var lightingGroups = (G.LayerManager.getNodeLayers().filter(function (layer) {
            return layer.name.indexOf(MasterLightingController.LIGHTING_CONTROLLER_PREFIX) === 0;
        })).sort(function (a, b) {
            return a.name.localeCompare(b.name);
        }).map(bind(function (layer, index) {
            return new LightingGroup(layer, (index + 1), this, "Lighting Group ".concat(index + 1));
        }, this));
        this.lightingGroups = lightingGroups;
    }
    MasterLightingController.prototype.setAllLightingGroupsEnabled = function (enabled) {
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var group = _a[_i];
            group.setEnabled(enabled);
        }
    };
    MasterLightingController.prototype.areAllLightingGroupsEnabled = function () {
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var group = _a[_i];
            if (!group.isEnabled()) {
                return false;
            }
        }
        return true;
    };
    MasterLightingController.prototype.setRenderPreviewEnabled = function (enabled) {
        this.renderPreviewNode.setEnabled(enabled);
    };
    MasterLightingController.prototype.isRenderPreviewEnabled = function () {
        return this.renderPreviewNode.isEnabled();
    };
    MasterLightingController.prototype.setEnabledForAllLightingGroups = function (enabled) {
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var group = _a[_i];
            group.setEnabled(enabled);
        }
    };
    MasterLightingController.prototype.setLightingGroupOfSelection = function (lightingGroup, selection) {
        scene.beginUndoRedoAccum("Apply Lighting Passes");
        lightingGroup.masterLightingController.clearLighting(selection);
        G.GlobalTimeline.createFrameMarkers(lightingGroup.passManager.marker, selection);
        for (var _i = 0, _a = selection.selectedNodes; _i < _a.length; _i++) {
            var node_1 = _a[_i];
            var index = PassManager.getPassIndexFromNode(node_1.name);
            lightingGroup.passManager.setPass(index, selection, true);
        }
        scene.endUndoRedoAccum();
    };
    MasterLightingController.prototype.getAppliedLightingGroup = function (selection) {
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var lightingGroup = _a[_i];
            if (lightingGroup.passManager.isNodeInGroup(selection))
                return lightingGroup;
        }
        return null;
    };
    MasterLightingController.prototype.getAppliedLightingGroups = function (selection) {
        var appliedGroups = [];
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var lightingGroup = _a[_i];
            if (lightingGroup.passManager.isNodeInGroup(selection))
                appliedGroups.push(lightingGroup);
        }
        return appliedGroups;
    };
    MasterLightingController.prototype.getAllLightingGroups = function () {
        return this.lightingGroups;
    };
    MasterLightingController.prototype.getLightingGroup = function (ControllerIndex) {
        return this.lightingGroups[ControllerIndex - 1];
    };
    MasterLightingController.prototype.toString = function () { return "MasterLightingController<".concat(this.lightingGroups.length, " controllers>"); };
    MasterLightingController.prototype.clearLighting = function (selection) {
        scene.beginUndoRedoAccum("Clear Lighting Passes");
        for (var _i = 0, _a = this.lightingGroups; _i < _a.length; _i++) {
            var lightingGroup = _a[_i];
            for (var _b = 0, _c = selection.selectedNodes; _b < _c.length; _b++) {
                var node_2 = _c[_b];
                var index = PassManager.getPassIndexFromNode(node_2.name);
                lightingGroup.passManager.setPass(index, selection, false);
            }
            G.GlobalTimeline.deleteFrameMarkers(selection);
        }
        scene.endUndoRedoAccum();
    };
    MasterLightingController.getSelectedPasses = function () {
        var selectedNodes = LayerManager.getSelectedNodes();
        var selectedPasses = [];
        for (var _i = 0, selectedNodes_1 = selectedNodes; _i < selectedNodes_1.length; _i++) {
            var node_3 = selectedNodes_1[_i];
            selectedPasses.push(PassManager.getPassIndexFromNode(node_3.name));
        }
        return selectedPasses;
    };
    MasterLightingController.prototype.isolateLighting = function (lightingGroup, selectedRange, passes) {
        var selectedRange = selectedRange !== null && selectedRange !== void 0 ? selectedRange : new G.oSelection();
        this.clearLighting(selectedRange);
        this.getLightingGroup(lightingGroup).passManager.addToGroup(selectedRange.selectedNodes);
    };
    MasterLightingController.LIGHTING_CONTROLLER_PREFIX = "lighting_controller_";
    return MasterLightingController;
}());
var PassManager = (function () {
    function PassManager(layer, index, lightingGroup) {
        var _a;
        this.marker = null;
        this.index = -1;
        this.marker = PassManager.MAPPINGS[index].marker;
        this.layer = layer;
        this.index = index;
        this.lightingGroup = lightingGroup;
        this.passes = ((_a = this.layer.getChild("Drawing_Passes").getChildren()) !== null && _a !== void 0 ? _a : []).filter(function (child) {
            return child !== null && child.name.indexOf("pass_") === 0;
        }).sort(function (a, b) {
            var numA = parseInt(a.name.substring(5));
            var numB = parseInt(b.name.substring(5));
            return numA - numB;
        }).map(function (child) {
            return child.getColumn("Port_Index");
        });
    }
    PassManager.getPassIndexFromNode = function (nodeName) {
        return (parseInt(nodeName.substring(5)) - 1);
    };
    PassManager.prototype.toString = function () { return "PassManager<index:".concat(this.index, ">"); };
    PassManager.prototype.clearLighting = function (selection) {
        scene.beginUndoRedoAccum("Clear Lighting Passes");
        for (var _i = 0, _a = this.passes; _i < _a.length; _i++) {
            var pass = _a[_i];
            pass.setKeyFrame(selection, PassManager.DISABLED);
        }
        scene.endUndoRedoAccum();
    };
    PassManager.prototype.setPass = function (passIndex, selection, enabled) {
        this.passes[passIndex].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
    };
    PassManager.prototype.setPasses = function (passIndexes, selection, enabled) {
        for (var i = 0; i < passIndexes.length; i++)
            this.passes[passIndexes[i]].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
    };
    PassManager.prototype.setAllPasses = function (selection, enabled) {
        MessageLog.trace(" cleared ");
        for (var i = 0; i < this.passes.length; i++)
            this.passes[i].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
    };
    PassManager.prototype.addToGroup = function (nodes) {
        this._validateNodeIsDrawingPass(nodes);
        var self = this;
        nodes.forEach(function (currentNode) {
            var passIndex = PassManager.getPassIndexFromNode(currentNode.name);
            self.setPass(passIndex, new G.oSelection(), true);
            var id = Timeline.createFrameMarker(currentNode.index, PassManager.MAPPINGS[self.index].marker, frame.current());
        });
    };
    PassManager.prototype.isNodeInGroup = function (currentSelection) {
        var currentSelection = currentSelection !== null && currentSelection !== void 0 ? currentSelection : new G.oSelection();
        this._validateNodeIsDrawingPass([currentSelection.selectedNodes[0]]);
        var passIndex = (parseInt(currentSelection.selectedNodes[0].name.substring(5)) - 1);
        var passValue = Number(this.passes[passIndex].getKeyframe(currentSelection.startFrame));
        return passValue === PassManager.ENABLED;
    };
    PassManager.prototype.removeFromGroup = function (nodes) {
        this._validateNodeIsDrawingPass(nodes);
        var self = this;
        nodes.forEach(function (currentNode) {
            var passIndex = (parseInt(currentNode.name.substring(5)) - 1);
            self.setPass(passIndex, new G.oSelection(), false);
        });
    };
    PassManager.prototype._validateNodeIsDrawingPass = function (nodes) {
        var allParentsAreDrawings = nodes.every(function (node) {
            return (node.getParent() && node.getParent().name === "Drawings");
        });
        if (!allParentsAreDrawings)
            throw new Error("All selected nodes must be children of 'Drawings' node.");
    };
    PassManager.ENABLED = 1;
    PassManager.DISABLED = 0;
    PassManager.MAPPINGS = {
        1: {
            marker: MarkerColors.RED,
            symbol: "🔴",
            color: "#800000",
        },
        2: {
            marker: MarkerColors.ORANGE,
            symbol: "🟠",
            color: "#CC8400"
        },
        3: {
            marker: MarkerColors.YELLOW,
            symbol: "🟡",
            color: "#CABC00"
        },
        4: {
            marker: MarkerColors.GREEN,
            symbol: "🟢",
            color: "#116000"
        },
        5: {
            marker: MarkerColors.BLUE,
            symbol: "🔵",
            color: "#000080"
        },
        6: {
            marker: MarkerColors.PURPLE,
            symbol: "🟣",
            color: "#400040"
        },
        7: {
            marker: MarkerColors.WHITE,
            symbol: "⚪",
            color: "#404040"
        },
        8: {
            marker: MarkerColors.BLACK,
            symbol: "⚫",
            color: "#000000"
        },
    };
    return PassManager;
}());
this.__proto__.PassManager = PassManager;
var LightingGroup = (function () {
    function LightingGroup(layer, index, masterLightingController, name) {
        var _this = this;
        this.controls = {};
        this.multipleValueColumns = {};
        this.name = name;
        this.layer = layer;
        this.index = index || 1;
        this.passManager = new PassManager(layer, index, this);
        this.masterLightingController = masterLightingController;
        this.controlNodes = {
            Mood: "Mood",
            Rimlight_Left_Bloom: "Rimlight_Left_Bloom",
            Rimlight_Right_Bloom: "Rimlight_Right_Bloom",
            Light_Bloom: "Light_Bloom",
            Light: "Light_Transparency",
            Rimlight_Right_Peg: "Rimlight_Right_Peg",
            Rimlight_Left_Peg: "Rimlight_Left_Peg",
            Shadows_Peg: "Shadows_Peg",
        };
        this.controls = {};
        objectForEach(this.controlNodes, function (name, node) {
            var node = _this.layer.getChild(node);
            var type = node.getType();
            var map = {};
            var VALID_TYPES = ["GLOW", "HIGHLIGHT", "TONE", "FADE"];
            if (VALID_TYPES.indexOf(type) !== -1)
                node.getEditableAttributes().forEach(function (attr) { return map[attr] = node.getColumn(attr); });
            _this.controls[name] = map;
        });
    }
    LightingGroup.prototype.toString = function () { return "LightingGroup<".concat(this.index, ">"); };
    LightingGroup.prototype.getName = function () {
        return this.name;
    };
    LightingGroup.prototype.setEnabled = function (enabled) {
        this.layer.setEnabled(enabled);
    };
    LightingGroup.prototype.isEnabled = function () {
        return this.layer.isEnabled();
    };
    LightingGroup.prototype.editLightingGroup = function () {
        selection.clearSelection();
        selection.addNodesToSelection((this.layer.getChildrenRecursive().filter(function (child) {
            return child.getLocked() === false && child.isGroup() === false;
        }).map(function (child) {
            return child.nodePath;
        })));
        Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
    };
    LightingGroup.prototype.editProperty = function (name) {
        selection.clearSelection();
        G.GlobalTimeline.focusOnNodes((this.layer.getChildrenRecursive().filter(function (child) {
            return child.getLocked() === false && child.isGroup() === false && child.name.indexOf(name) !== -1;
        }).map(function (child) {
            return child.nodePath;
        })));
    };
    LightingGroup.prototype.editPropertyAttribute = function (name, attribute) {
        var name = this.layer.getColumn(name).name;
        MessageLog.trace("Focusing on column: " + name);
        G.GlobalTimeline.focusOnColumns([name]);
    };
    LightingGroup.prototype.editLight = function () { this.editProperty("Light"); };
    LightingGroup.prototype.editMood = function () { this.editProperty("Mood"); };
    LightingGroup.prototype.editRimlight = function () { this.editProperty("Rimlight"); };
    LightingGroup.prototype.editShadow = function () { this.editProperty("Shadow"); };
    LightingGroup.getColumns = function (layer, selection) {
        var data = {
            mood: {
                colorGain: layer.getColumn("/Mood|COLOUR_GAIN"),
                drawing: layer.getColumn("/Lighting_Drawings/Drawing_Mood|DRAWING.ELEMENT"),
            },
            light: {
                drawing: layer.getColumn("/Lighting_Drawings/Drawing_Light|DRAWING.ELEMENT"),
                transparency: layer.getColumn("/Light_Transparency|transparency"),
                bloom: {
                    colorGain: layer.getColumn("/Light_Bloom|COLOUR_GAIN"),
                    color: {
                        r: layer.getColumn("/Light_Bloom|COLOR.RED"),
                        g: layer.getColumn("/Light_Bloom|COLOR.GREEN"),
                        b: layer.getColumn("/Light_Bloom|COLOR.BLUE"),
                        a: layer.getColumn("/Light_Bloom|COLOR.ALPHA")
                    },
                    radius: layer.getColumn("/Light_Bloom|RADIUS")
                }
            },
            shadow: {
                drawing: layer.getColumn("/Lighting_Drawings/Drawing_Shadow|DRAWING.ELEMENT"),
            },
            rimlight: {
                drawing: layer.getColumn("/Lighting_Drawings/Drawing_Rimlight|DRAWING.ELEMENT"),
                left: {
                    colorGain: layer.getColumn("/Rimlight_Left_Bloom|COLOUR_GAIN"),
                    color: {
                        r: layer.getColumn("/Rimlight_Left_Bloom|COLOR.RED"),
                        g: layer.getColumn("/Rimlight_Left_Bloom|COLOR.GREEN"),
                        b: layer.getColumn("/Rimlight_Left_Bloom|COLOR.BLUE"),
                        a: layer.getColumn("/Rimlight_Left_Bloom|COLOR.ALPHA")
                    },
                    radius: layer.getColumn("/Rimlight_Left_Bloom|RADIUS"),
                },
                right: {
                    colorGain: layer.getColumn("/Rimlight_Right_Bloom|COLOUR_GAIN"),
                    color: {
                        r: layer.getColumn("/Rimlight_Right_Bloom|COLOR.RED"),
                        g: layer.getColumn("/Rimlight_Right_Bloom|COLOR.GREEN"),
                        b: layer.getColumn("/Rimlight_Right_Bloom|COLOR.BLUE"),
                        a: layer.getColumn("/Rimlight_Right_Bloom|COLOR.ALPHA")
                    },
                    radius: layer.getColumn("/Rimlight_Right_Bloom|RADIUS"),
                }
            }
        };
        return data;
    };
    LightingGroup.prototype.getColumns = function () {
        if (this.columnsCache === undefined) {
            this.columnsCache = LightingGroup.getColumns(this.layer, new G.oSelection());
        }
        var copy = G.Utils.deepCopy(this.columnsCache);
        return copy;
    };
    LightingGroup.prototype.getFlattenedColumns = function () {
        var attributeColumns = this.getColumns();
        var flatColumns = {};
        G.Utils.forEachLeafValue(attributeColumns, function (value, path) {
            if (value.constructor.name === "Column") {
                flatColumns[path] = value;
            }
        });
        return flatColumns;
    };
    LightingGroup.prototype.getValues = function (selection) {
        var _this = this;
        if (selection === void 0) { selection = new G.oSelection(); }
        this.multipleValueColumns = {};
        var attributeColumns = this.getColumns();
        G.Utils.forEachLeafValue(attributeColumns, function (value, path) {
            if (value.constructor.name === "Column") {
                var col = value;
                var keyframeOrKeyframes = col.getKeyframe(selection.startFrame);
                if (Array.isArray(keyframeOrKeyframes)) {
                    var uniqueValues = [];
                    for (var i = 0; i < keyframeOrKeyframes.length; i++) {
                        if (uniqueValues.indexOf(keyframeOrKeyframes[i]) === -1) {
                            uniqueValues.push(keyframeOrKeyframes[i]);
                        }
                    }
                    _this.multipleValueColumns[path] = uniqueValues;
                    if (col.parent.name.indexOf("Drawing_") !== -1)
                        return keyframeOrKeyframes[0];
                    return Number(keyframeOrKeyframes[0]);
                }
                else {
                    if (col.parent.name.indexOf("Drawing_") !== -1)
                        return keyframeOrKeyframes;
                    return Number(keyframeOrKeyframes);
                }
                return Number(col.getMostCommonKeyframeFromRange(selection));
            }
        });
        return attributeColumns;
    };
    LightingGroup.prototype.serializeLighting = function (selection) {
        if (selection === void 0) { selection = new G.oSelection(); }
        return this.getValues(selection);
    };
    LightingGroup.prototype.exportLighting = function () {
        var defaultDir = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\test\\lightingPresets";
        var defaultName = "lighting.json";
        var defaultPath = defaultDir + "/" + defaultName;
        var savePath = QFileDialog.getSaveFileName(0, "Save As", defaultPath);
        if (!savePath)
            return;
        var data = this.serializeLighting(G.GlobalTimeline.getSelection());
        G.FileUtils.writeTo(savePath, JSON.stringify(data, null, 2));
    };
    LightingGroup.prototype.importLighting = function (path) {
        var defaultDir = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\test\\lightingPresets";
        var defaultName = "lighting.json";
        var defaultPath = defaultDir + "/" + defaultName;
        var openPath;
        if (path) {
            openPath = path;
        }
        else {
            openPath = QFileDialog.getOpenFileName(0, "Open Lighting File", defaultPath, "JSON Files (*.json)");
            if (!openPath)
                return false;
        }
        MessageLog.trace("importing lighting from: " + openPath);
        var fileContent = G.FileUtils.readFrom(openPath);
        if (!fileContent)
            return;
        var data = JSON.parse(fileContent);
        this.setLighting(data);
        return data;
    };
    LightingGroup.prototype.setLighting = function (lightingData) {
        MessageLog.trace(JSON.stringify(lightingData, null, 2));
        var lightingData = G.Utils.shallowCopy(lightingData);
        var columns = this.getColumns();
        G.Utils.forEachLeafValue(columns, function (value, path, isLeaf) {
            if (value.constructor.name === "Column") {
                var col = value;
                if (col.getType() === "DRAWING") {
                    var elementId = col.parent.getElementId();
                    var element = new G.oElement(elementId);
                    var drawing = G.Utils.getValueByPath(lightingData, path);
                    if (!element.exists(drawing)) {
                        MessageLog.trace("Element does not exist: " + drawing + " for column: " + path);
                        return;
                    }
                    var drawingObj = element.duplicateDrawing("Imported_".concat(drawing), drawing);
                    col.setKeyFrame(new G.oSelection(), drawingObj.name);
                    MessageLog.trace("drawing : " + drawingObj.toString());
                    return;
                }
                col.setKeyFrame(new G.oSelection(), G.Utils.getValueByPath(lightingData, path));
            }
        });
    };
    return LightingGroup;
}());
function wrapWithCatch(fn, prefix) {
    return function () {
        try {
            return fn.apply(this, arguments);
        }
        catch (e) {
            MessageLog.trace(prefix + "⚠️ >>>     Caught error: " + e.toString() + "|  line: " + e.lineNumber + " | " + e.fileName + " | " + e.stack);
        }
    };
}
Object.entries = function (obj) {
    if (obj == null) {
        throw new TypeError('Cannot convert undefined or null to object');
    }
    var ownProps = Object.keys(obj);
    var resArray = new Array(ownProps.length);
    for (var i = 0; i < ownProps.length; i++) {
        resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }
    return resArray;
};
