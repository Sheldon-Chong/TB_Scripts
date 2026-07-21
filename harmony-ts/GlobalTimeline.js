include("Frame.js");
include("Layer.js");
include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/DrawingDataUtils.js");
var Cell = (function () {
    function Cell(frame, node) {
        this.frame = frame;
        this.node = node;
    }
    Cell.prototype.toString = function () {
        return "Cell(frame: " + this.frame + ", node: " + this.node.name + ")";
    };
    return Cell;
}());
var DrawingCell = (function (_super) {
    __extends(DrawingCell, _super);
    function DrawingCell(frame, node) {
        var _this = _super.call(this, frame, node) || this;
        _this.drawingName = node.getColumn("DRAWING.ELEMENT").getKeyframe(frame);
        return _this;
    }
    DrawingCell.prototype.getDrawingData = function (art) {
        var data = Drawing.query.getData({
            drawing: {
                node: this.node.nodePath,
                frame: this.frame
            },
            art: art
        });
        return data;
    };
    return DrawingCell;
}(Cell));
function saveKeyFramesFrom3DPath() {
    var selection = G.GlobalTimeline.getSelection();
    var PathColumn3D = selection.selectedNodes[0].getColumn("offset.attr3dpath");
    var ScaleXCol = selection.selectedNodes[0].getColumn("scale.x");
    var ScaleYCol = selection.selectedNodes[0].getColumn("scale.y");
    var keyframes = [];
    var relativeIndex = 0;
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        keyframes.push({
            frame: relativeIndex,
            x: PathColumn3D.getX(i),
            y: PathColumn3D.getY(i),
            z: PathColumn3D.getZ(i),
            scaleX: ScaleXCol.getKeyframe(i),
            scaleY: ScaleYCol.getKeyframe(i)
        });
        relativeIndex++;
    }
    var savePath = QFileDialog.getSaveFileName(0, "Save As", "", "JSON Files (*.json);;All Files (*)");
    if (savePath) {
        G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
        MessageLog.trace("Keyframes saved to: " + savePath);
    }
    else {
        MessageLog.trace("No file selected for saving keyframes.");
    }
}
function serializeKeyFramesFromSplittedPath(selection) {
    var layer = selection.selectedNodes[0];
    var xCol = layer.getColumn("offset.X");
    var yCol = layer.getColumn("offset.Y");
    var zCol = layer.getColumn("offset.Z");
    var ScaleXCol = layer.getColumn("scale.x");
    var ScaleYCol = layer.getColumn("scale.y");
    var keyframes = [];
    var relativeIndex = 0;
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        keyframes.push({
            frame: relativeIndex,
            x: parseFloat(xCol.getKeyframe(i)),
            y: parseFloat(yCol.getKeyframe(i)),
            z: parseFloat(zCol.getKeyframe(i)),
            scaleX: parseFloat(ScaleXCol.getKeyframe(i)),
            scaleY: parseFloat(ScaleYCol.getKeyframe(i))
        });
        relativeIndex++;
    }
    return keyframes;
    var savePath = QFileDialog.getSaveFileName(0, "Save As", "", "JSON Files (*.json);;All Files (*)");
    if (savePath) {
        G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
        MessageLog.trace("Keyframes saved to: " + savePath);
    }
    else {
        MessageLog.trace("No file selected for saving keyframes.");
    }
}
var oSelection = (function () {
    function oSelection(startFrame, endFrame, selectedNodes) {
        if (startFrame !== undefined) {
            this.startFrame = startFrame;
            this.endFrame = endFrame !== undefined ? endFrame : startFrame;
            this.isRange = startFrame !== endFrame;
        }
        else {
            if (selection.isSelectionRange()) {
                this.startFrame = selection.startFrame();
                this.endFrame = selection.startFrame() + selection.numberOfFrames() - 1;
                this.isRange = true;
            }
            else {
                this.startFrame = frame.current();
                this.endFrame = this.startFrame;
                this.isRange = false;
            }
        }
        this.selectedNodes = selectedNodes !== undefined ? selectedNodes : Object._.LayerManager.getSelectedNodes();
        this.length = this.endFrame - this.startFrame + 1;
    }
    oSelection.prototype.toString = function () {
        return "Selection from frame " + this.startFrame + " to " + this.endFrame + " | " + this.selectedNodes.join(", ");
    };
    oSelection.prototype.getSelectSize = function () {
        return this.length * this.selectedNodes.length;
    };
    oSelection.prototype.forEach = function (callback) {
        for (var _i = 0, _a = this.selectedNodes; _i < _a.length; _i++) {
            var node_1 = _a[_i];
            for (var f = this.startFrame; f <= this.endFrame; f++) {
                callback(node_1, f);
            }
        }
    };
    oSelection.prototype.getCell = function () {
        if (this.selectedNodes[0].getType() === "READ") {
            return new DrawingCell(this.startFrame, this.selectedNodes[0]);
        }
        return new Cell(this.startFrame, this.selectedNodes[0]);
    };
    return oSelection;
}());
var GlobalTimelineClass = (function () {
    function GlobalTimelineClass() {
        this.layers = this.updateLayers();
    }
    GlobalTimelineClass.prototype.applyKeyFramesTo3DPath = function (selection, keyframes) {
        var layer = selection.selectedNodes[0];
        var PathColumn3D = layer.getColumn("position.attr3dpath");
        var ScaleXCol = layer.getColumn("scale.x");
        var ScaleYCol = layer.getColumn("scale.y");
        scene.beginUndoRedoAccum("Apply Keyframes to 3D Path");
        keyframes.forEach(function (kf) {
            var frameNumber = selection.startFrame + kf.frame;
            MessageLog.trace(" >>> " + kf.x);
            var x = Math.abs(kf.x) + (kf.x >= 0 ? " E" : " W");
            var y = Math.abs(kf.y) + (kf.y >= 0 ? " N" : " S");
            var z = Math.abs(kf.z) + (kf.z >= 0 ? " F" : " B");
            MessageLog.trace("<<<<<<<< " + JSON.stringify([x, y, z], null, 2));
            PathColumn3D.setX(frameNumber, x);
            PathColumn3D.setY(frameNumber, y);
            PathColumn3D.setZ(frameNumber, z);
            if (kf.scaleX !== undefined)
                ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
            if (kf.scaleY !== undefined)
                ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
        });
        scene.endUndoRedoAccum();
    };
    GlobalTimelineClass.prototype.applyKeyFramesToSplittedPath = function (selection, keyframes) {
        var _loop_1 = function (currentNode) {
            var layer = currentNode;
            var xCol = layer.getColumn("offset.X");
            var yCol = layer.getColumn("offset.Y");
            var zCol = layer.getColumn("offset.Z");
            var ScaleXCol = layer.getColumn("scale.x");
            var ScaleYCol = layer.getColumn("scale.y");
            MessageLog.trace("columns: " + xCol + " " + yCol + " " + zCol);
            scene.beginUndoRedoAccum("Apply 3D Path Keyframes");
            keyframes.forEach(function (kf) {
                MessageLog.trace(" Applying kf at frame " + (selection.startFrame + kf.frame) + " x:" + kf.x + " y:" + kf.y + " z:" + kf.z);
                var frameNumber = selection.startFrame + kf.frame;
                xCol.setKeyFrame(frameNumber, String(kf.x));
                yCol.setKeyFrame(frameNumber, String(kf.y));
                zCol.setKeyFrame(frameNumber, String(kf.z));
                ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
                ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
            });
            var resetFrame = selection.startFrame + keyframes.length;
            xCol.setKeyFrame(resetFrame, "0");
            yCol.setKeyFrame(resetFrame, "0");
            zCol.setKeyFrame(resetFrame, "0");
            ScaleXCol.setKeyFrame(resetFrame, "1");
            ScaleYCol.setKeyFrame(resetFrame, "1");
            scene.endUndoRedoAccum();
        };
        for (var _i = 0, _a = selection.selectedNodes; _i < _a.length; _i++) {
            var currentNode = _a[_i];
            _loop_1(currentNode);
        }
    };
    GlobalTimelineClass.prototype.createFrameMarkers = function (marker, selection) {
        for (var _i = 0, _a = selection.selectedNodes; _i < _a.length; _i++) {
            var node_2 = _a[_i];
            for (var f = selection.startFrame; f <= selection.endFrame; f++) {
                try {
                    var result = Timeline.createFrameMarker(node_2.index, marker, f);
                    MessageLog.trace("Created frame marker on node " + node_2.name + " (index " + node_2.index + ") at frame " + f + ". Result: " + result);
                    MessageLog.trace(JSON.stringify(marker, null, 2));
                }
                catch (e) {
                    MessageLog.trace("Error creating frame marker: " + e.toString());
                }
            }
        }
    };
    GlobalTimelineClass.prototype.deleteFrameMarkers = function (selection) {
        for (var _i = 0, _a = selection.selectedNodes; _i < _a.length; _i++) {
            var node_3 = _a[_i];
            for (var f = selection.startFrame; f <= selection.endFrame; f++) {
                var marker = Timeline.getFrameMarker(node_3.index, f);
                if (!marker)
                    continue;
                var id = marker["id"];
                if (id !== -1) {
                    var status = Timeline.deleteFrameMarker(node_3.index, id);
                    MessageLog.trace("Deleted frame marker ID " + id + " from node " + node_3.name + " at frame " + f + ": " + status);
                }
            }
        }
    };
    GlobalTimelineClass.prototype.resetFocusedNodes = function () {
        Action.perform("onActionTimelineViewModeNormal()", "timelineView");
    };
    GlobalTimelineClass.prototype.focusOnNodes = function (nodes) {
        selection.addNodesToSelection(nodes);
        Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
    };
    GlobalTimelineClass.prototype.focusOnColumns = function (columnNames) {
        for (var _i = 0, columnNames_1 = columnNames; _i < columnNames_1.length; _i++) {
            var colName = columnNames_1[_i];
            selection.addColumnToSelection(colName);
        }
        Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
        selection.clearSelection();
        for (var _a = 0, columnNames_2 = columnNames; _a < columnNames_2.length; _a++) {
            var colName = columnNames_2[_a];
            selection.addColumnToSelection(colName);
        }
    };
    GlobalTimelineClass.prototype.getSelection = function () {
        return new G.oSelection();
    };
    GlobalTimelineClass.prototype.getFrame = function (options) {
        return new Frame(options);
    };
    GlobalTimelineClass.prototype.getLayer = function (index) {
        return this.layers[index];
    };
    GlobalTimelineClass.prototype.updateLayers = function () {
        var numColumns = column.numberOf();
        var columns = [];
        for (var i = 0; i < numColumns; i++) {
            var colName = column.getName(i);
            var pos = column.getPos(colName);
            var displayName = column.getDisplayName(colName);
            columns.push(new TimelineLayer(colName, displayName, pos, i));
        }
        columns = columns.filter(function (col) { return col.orderIndex !== -1; });
        columns.sort(function (a, b) { return a.orderIndex - b.orderIndex; });
        return columns;
    };
    GlobalTimelineClass.prototype.getAllLayers = function () {
        return this.layers;
    };
    GlobalTimelineClass.prototype.getSceneMetadata = function (key, type) {
        try {
            var meta = scene.metadata(key, type);
            if (meta && meta.hasOwnProperty('value'))
                return meta.value;
        }
        catch (e) {
        }
        return null;
    };
    GlobalTimelineClass.prototype.setSceneMetadata = function (key, type, value, creator, version) {
        try {
            var metaObj = {
                name: key,
                type: type,
                value: value,
                creator: creator,
                version: version
            };
            scene.setMetadata(metaObj);
            MessageLog.trace("✅ Set scene metadata: " + key + " = " + value);
        }
        catch (e) {
        }
    };
    GlobalTimelineClass.prototype.setMetadata = function (key, value) {
        try {
            var metaObj = {
                name: key,
                type: "string",
                value: value,
                creator: "harmony-ts",
                version: "1.0"
            };
            scene.setMetadata(metaObj);
        }
        catch (e) {
            MessageLog.trace("❌ Failed to set scene metadata: " + key + " | Error: " + e.message);
        }
    };
    GlobalTimelineClass.prototype.getMetadata = function (key) {
        try {
            var meta = scene.metadata(key, "string");
            if (meta && meta.hasOwnProperty('value'))
                return meta.value;
        }
        catch (e) {
        }
        return null;
    };
    return GlobalTimelineClass;
}());
function TimelineLayer(name, displayName, orderIndex, trueIndex) {
    this.name = name;
    this.displayName = displayName;
    this.orderIndex = orderIndex;
    this.trueIndex = trueIndex;
}
TimelineLayer.prototype.toString = function () {
    return this.name + " (" + this.displayName + ") - OrderIndex: " + this.orderIndex;
};
var GlobalTimeline = new GlobalTimelineClass();
function createDrawingAtFrame(nodePath, frameNum) {
    var settings = Tools.getToolSettings();
    if (settings.currentDrawing) {
        return;
    }
    scene.beginUndoRedoAccum("Create Drawing example");
    settings = Tools.createDrawing();
    scene.endUndoRedoAccum();
}
function TestCallable() {
    MessageLog.trace("TestCallable invoked");
}
