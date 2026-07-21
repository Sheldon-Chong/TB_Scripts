include(specialFolders.userScripts + "/utils/utils.js");
var oDrawing = (function () {
    function oDrawing(name, element) {
        this.element = element;
        this.name = name;
    }
    oDrawing.prototype.toString = function () {
        return "Drawing<".concat(this.element.folder, "-").concat(this.name, ".tvg>");
    };
    return oDrawing;
}());
var oElement = (function () {
    function oElement(elementId, associatedNode) {
        this.elementId = elementId;
        this.completeFolder = element.completeFolder(elementId);
        this.folder = element.folder(elementId);
        this.associatedNode = associatedNode;
        this.updateDrawingsList();
        MessageLog.trace(JSON.stringify(this.drawings, null, 2));
    }
    oElement.prototype.updateDrawingsList = function () {
        this.drawings = listFilesInDirectory(this.completeFolder, ["*.tvg"]);
    };
    oElement.prototype.getDrawings = function () {
        this.updateDrawingsList();
        return this.drawings;
    };
    oElement.prototype.getDrawing = function (drawingName) {
        this.updateDrawingsList();
        if (this.exists(drawingName)) {
            return new oDrawing(drawingName, this);
        }
        return null;
    };
    oElement.prototype.exists = function (drawingName) {
        this.updateDrawingsList();
        MessageLog.trace(this.completeFolder);
        return this.drawings.indexOf("".concat(this.folder, "-").concat(drawingName, ".tvg")) !== -1;
    };
    oElement.prototype.generateUniqueDrawingName = function (baseName) {
        this.updateDrawingsList();
        var uniqueName = baseName;
        var counter = 1;
        while (this.exists(uniqueName)) {
            uniqueName = "".concat(baseName, "_").concat(counter);
            counter++;
        }
        return uniqueName;
    };
    oElement.prototype.duplicateDrawing = function (newDrawingName, sourceDrawingName) {
        var sourcePath = this.completeFolder + "/" + "".concat(this.folder, "-").concat(sourceDrawingName, ".tvg");
        var uniqueName = this.generateUniqueDrawingName(newDrawingName);
        var destPath = this.completeFolder + "/" + "".concat(this.folder, "-").concat(uniqueName, ".tvg");
        if (copyFile(sourcePath, destPath)) {
            Drawing.create(this.elementId, uniqueName, true, true);
            return new oDrawing(uniqueName, this);
        }
        return null;
    };
    oElement.prototype.revealInFileExplorer = function () {
        return openInFileExplorer(this.completeFolder);
    };
    oElement.prototype.toString = function () {
        return "Element<".concat(this.completeFolder, ">");
    };
    return oElement;
}());
var Column = (function () {
    function Column(name, parentLayer) {
        this.name = name;
        this.parent = parentLayer;
    }
    Column.prototype.getType = function () {
        return column.type(this.name);
    };
    Column.prototype.getKeyframe = function (frameNumber) {
        return column.getEntry(this.name, 1, frameNumber);
    };
    Column.prototype.toString = function () {
        return "Column<".concat(this.name, ">");
    };
    Column.prototype.insertKeyFrame = function (frameNumber) {
        return column.setKeyFrame(this.name, frameNumber);
    };
    Column.prototype.deleteKeyframes = function (selection) {
        for (var frame_1 = selection.startFrame; frame_1 <= selection.endFrame; frame_1++) {
            column.clearKeyFrame(this.name, frame_1);
        }
    };
    Column.prototype.getKeyframeRange = function (startOrSelection, endFrame) {
        var startFrame;
        if (typeof startOrSelection === 'number') {
            if (endFrame === undefined)
                throw new Error("endFrame is required when startFrame is provided");
            startFrame = startOrSelection;
        }
        else {
            startFrame = startOrSelection.startFrame;
            endFrame = startOrSelection.endFrame;
        }
        var values = [];
        for (var frame_2 = startFrame; frame_2 <= endFrame; frame_2++) {
            values.push(this.getKeyframe(frame_2));
        }
        return values;
    };
    Column.prototype.getKeyframeRangeSimplify = function (startOrSelection, endFrame) {
        var startFrame;
        if (typeof startOrSelection === 'number') {
            if (endFrame === undefined)
                throw new Error("endFrame is required when startFrame is provided");
            startFrame = startOrSelection;
        }
        else {
            startFrame = startOrSelection.startFrame;
            endFrame = startOrSelection.endFrame;
        }
        var values = [];
        for (var frame_3 = startFrame; frame_3 <= endFrame; frame_3++) {
            values.push(this.getKeyframe(frame_3));
        }
        if (values.length > 0 && values.every(function (v) { return v === values[0]; })) {
            return values[0];
        }
        return values;
    };
    Column.prototype.getMostCommonKeyframeFromRange = function (selection) {
        var values = this.getKeyframeRange(selection);
        var valueCounts = {};
        var mostCommonValue = null;
        var highestCount = 0;
        for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
            var value = values_1[_i];
            valueCounts[value] = (value in valueCounts) ? valueCounts[value] + 1 : 1;
            if (valueCounts[value] > highestCount) {
                highestCount = valueCounts[value];
                mostCommonValue = value;
            }
        }
        return mostCommonValue;
    };
    Column.prototype.setKeyFrame = function (startOrSelection, value, endFrame) {
        var startFrame;
        var endFrameLocal;
        if (typeof startOrSelection === 'number') {
            startFrame = startOrSelection;
            if (endFrame === undefined) {
                endFrameLocal = startFrame;
            }
            else {
                endFrameLocal = endFrame;
            }
        }
        else {
            startFrame = startOrSelection.startFrame;
            endFrameLocal = startOrSelection.endFrame;
        }
        for (var frame_4 = startFrame; frame_4 <= endFrameLocal; frame_4++) {
            var status_1 = column.setEntry(this.name, 1, frame_4, value.toString());
            if (!status_1)
                return false;
        }
        return true;
    };
    Column.prototype.isKeyFrame = function (frameNumber) {
        return column.isKeyFrame(this.name, 0, frameNumber);
    };
    return Column;
}());
var PathColumn3D = (function (_super) {
    __extends(PathColumn3D, _super);
    function PathColumn3D(name, parentLayer) {
        return _super.call(this, name, parentLayer) || this;
    }
    PathColumn3D.prototype.getX = function (frameNumber) {
        return column.getEntry(this.name, 1, frameNumber);
    };
    PathColumn3D.prototype.getY = function (frameNumber) {
        return column.getEntry(this.name, 2, frameNumber);
    };
    PathColumn3D.prototype.getZ = function (frameNumber) {
        return column.getEntry(this.name, 3, frameNumber);
    };
    PathColumn3D.prototype.getXVal = function (frameNumber) {
        var entry = this.getX(frameNumber);
        return this.parseDirectionalValue(entry, 'E', 'W');
    };
    PathColumn3D.prototype.getYVal = function (frameNumber) {
        var entry = this.getY(frameNumber);
        return this.parseDirectionalValue(entry, 'N', 'S');
    };
    PathColumn3D.prototype.getZVal = function (frameNumber) {
        var entry = this.getZ(frameNumber);
        return this.parseDirectionalValue(entry, 'F', 'B');
    };
    PathColumn3D.prototype.parseDirectionalValue = function (entry, positive, negative) {
        var value = parseFloat(entry);
        return entry.indexOf(positive) !== -1 ? value : -value;
    };
    PathColumn3D.prototype.setX = function (frameNumber, value) {
        var formattedValue = typeof value === 'number'
            ? Math.abs(value) + (value >= 0 ? " E" : " W")
            : value;
        return column.setEntry(this.name, 1, frameNumber, formattedValue);
    };
    PathColumn3D.prototype.setY = function (frameNumber, value) {
        var formattedValue = typeof value === 'number'
            ? Math.abs(value) + (value >= 0 ? " N" : " S")
            : value;
        return column.setEntry(this.name, 2, frameNumber, formattedValue);
    };
    PathColumn3D.prototype.setZ = function (frameNumber, value) {
        var formattedValue = typeof value === 'number'
            ? Math.abs(value) + (value >= 0 ? " F" : " B")
            : value;
        return column.setEntry(this.name, 3, frameNumber, formattedValue);
    };
    PathColumn3D.prototype.isKeyFrame = function (frameNumber, subColumn) {
        return column.isKeyFrame(this.name, subColumn !== null && subColumn !== void 0 ? subColumn : 1, frameNumber);
    };
    PathColumn3D.prototype.isKeyFrameX = function (frameNumber) { return column.isKeyFrame(this.name, 1, frameNumber); };
    PathColumn3D.prototype.isKeyFrameY = function (frameNumber) { return column.isKeyFrame(this.name, 2, frameNumber); };
    PathColumn3D.prototype.isKeyFrameZ = function (frameNumber) { return column.isKeyFrame(this.name, 3, frameNumber); };
    PathColumn3D.prototype.isKeyFrameVelocity = function (frameNumber) { return column.isKeyFrame(this.name, 4, frameNumber); };
    PathColumn3D.prototype.isKeyFrameAny = function (frameNumber) {
        return this.isKeyFrameX(frameNumber)
            || this.isKeyFrameY(frameNumber)
            || this.isKeyFrameZ(frameNumber);
    };
    PathColumn3D.prototype.isKeyFrameAll = function (frameNumber) {
        return this.isKeyFrameX(frameNumber)
            && this.isKeyFrameY(frameNumber)
            && this.isKeyFrameZ(frameNumber);
    };
    PathColumn3D.prototype.toString = function () {
        return "PathColumn3D<".concat(this.name, ">");
    };
    return PathColumn3D;
}(Column));
var NodeLayer = (function () {
    function NodeLayer(displayOrder, index, nodePath, name) {
        this.displayOrder = displayOrder;
        this.index = index;
        this.nodePath = nodePath;
        this.name = name;
    }
    NodeLayer.prototype.toString = function () {
        return "NodeLayer<".concat(this.nodePath, ">");
    };
    NodeLayer.prototype.setEnabled = function (enabled) {
        node.setEnable(this.nodePath, enabled);
    };
    NodeLayer.prototype.isEnabled = function () {
        return node.getEnable(this.nodePath);
    };
    NodeLayer.prototype.getAttributeNames = function () {
        return node.getAllAttrNames(this.nodePath);
    };
    NodeLayer.prototype.getAllAttributes = function () {
        var attributeNames = this.getAttributeKeywords();
        var attributes = [];
        for (var i = 0; i < attributeNames.length; i++) {
            attributes.push(node.getAttr(this.nodePath, frame.current(), attributeNames[i]));
        }
        return attributes;
    };
    NodeLayer.prototype.getAttributeKeywords = function () {
        return node.getAllAttrKeywords(this.nodePath);
    };
    NodeLayer.prototype.getEditableAttributes = function () {
        function getAttributes(attribute, attributeList) {
            attributeList.push(attribute);
            var subAttrList = attribute.getSubAttributes();
            for (var j = 0; j < subAttrList.length; ++j) {
                if (typeof (subAttrList[j].keyword()) === 'undefined' || subAttrList[j].keyword().length == 0)
                    continue;
                getAttributes(subAttrList[j], attributeList);
            }
        }
        function getFullAttributeList(nodePath) {
            var attributeList = [];
            var topAttributeList = node.getAttrList(nodePath, 1);
            for (var i = 0; i < topAttributeList.length; ++i) {
                getAttributes(topAttributeList[i], attributeList);
            }
            return attributeList;
        }
        return getFullAttributeList(this.nodePath).filter(function (attr) { return ["INT", "DOUBLE"].indexOf(attr.typeName()) >= 0; })
            .map(function (attr) { return attr.fullKeyword(); });
    };
    NodeLayer.prototype.getColumn = function (attrName, linkType) {
        if (attrName.indexOf("|") !== -1) {
            var lastSlashIndex = attrName.lastIndexOf("|");
            var path = attrName.substring(0, lastSlashIndex);
            var node_1 = LayerManager.getNodeLayer(this.nodePath + path);
            if (node_1 === null) {
                throw new Error("Node not found for path: " + this.nodePath + path);
            }
            var attributeName = attrName.substring(lastSlashIndex + 1);
            return node_1.getColumn(attributeName, linkType);
        }
        var col = node.linkedColumn(this.nodePath, attrName);
        if (!col) {
            var colName = column.generateAnonymousName();
            MessageLog.trace("⚠️ No column linked to attribute '" + attrName + "' on node '" + this.nodePath + "'. Creating new Bezier column: " + colName);
            column.add(colName, linkType !== null && linkType !== void 0 ? linkType : "BEZIER");
            var result = node.linkAttr(this.nodePath, attrName, colName);
            if (!result) {
                MessageLog.trace("❌ Failed to link new column '" + colName + "' to attribute '" + attrName + " of type " + (linkType !== null && linkType !== void 0 ? linkType : "BEZIER") + "' on node '" + this.nodePath + "'.");
            }
            return new G.Column(colName, this);
        }
        if (attrName === "offset.attr3dpath" || attrName === "position.attr3dpath") {
            MessageLog.trace(">> 3d PATH");
            return new G.PathColumn3D(col, this);
        }
        if (attrName === "DRAWING.ELEMENT") {
            return new DrawingElementColumn(col, this);
        }
        return new G.Column(col, this);
    };
    NodeLayer.prototype.getType = function () {
        return node.type(this.nodePath);
    };
    NodeLayer.prototype.getFullAttributeList = function () {
        function getAttributes(attribute, attributeList) {
            attributeList.push(attribute);
            var subAttrList = attribute.getSubAttributes();
            for (var j = 0; j < subAttrList.length; ++j) {
                if (typeof (subAttrList[j].keyword()) === 'undefined' || subAttrList[j].keyword().length === 0) {
                    continue;
                }
                getAttributes(subAttrList[j], attributeList);
            }
        }
        var attributeList = [];
        var topAttributeList = node.getAttrList(this.nodePath, frame.current());
        for (var i = 0; i < topAttributeList.length; ++i) {
            getAttributes(topAttributeList[i], attributeList);
        }
        return attributeList;
    };
    NodeLayer.prototype.setAttribute = function (attrName, value) {
        var attr = node.getAttr(this.nodePath, frame.current(), attrName);
        if (!attr) {
            throw new Error("Attribute '" + attrName + "' not found on node '" + this.nodePath + "'.");
        }
        attr.setValue(value);
    };
    NodeLayer.prototype.getChildren = function () {
        if (!node.subNodes(this.nodePath)) {
            return [];
        }
        return node.subNodes(this.nodePath).map(function (childPath) { return LayerManager.getNodeLayer(childPath); }).filter(function (layer) { return layer !== null; });
    };
    NodeLayer.prototype.getLocked = function () {
        return node.getLocked(this.nodePath);
    };
    NodeLayer.prototype.setLocked = function (locked) {
        node.setLocked(this.nodePath, locked);
    };
    NodeLayer.prototype.getChild = function (name) {
        if (name.indexOf("/") !== -1) {
            return LayerManager.getNodeLayer(this.nodePath + "/" + name);
        }
        else {
            var childPath = node.subNodeByName(this.nodePath, name);
            if (!childPath) {
                return null;
            }
            return LayerManager.getNodeLayer(childPath);
        }
    };
    NodeLayer.prototype.getChildrenRecursive = function () {
        var result = [];
        var children = this.getChildren();
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            result.push(child);
            result.push.apply(result, child.getChildrenRecursive());
        }
        return result;
    };
    NodeLayer.prototype.getParent = function () {
        if (node.parentNode(this.nodePath) === node.root()) {
            return null;
        }
        return LayerManager.getNodeLayer(node.parentNode(this.nodePath));
    };
    NodeLayer.prototype.isGroup = function () {
        return node.isGroup(this.nodePath);
    };
    return NodeLayer;
}());
var objElement = (function () {
    function objElement(elementId) {
        this.id = elementId;
    }
    Object.defineProperty(objElement.prototype, "elementName", {
        get: function () { return element.getNameById(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "scanType", {
        get: function () { return element.scanType(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "fieldChart", {
        get: function () { return element.fieldChart(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "vectorType", {
        get: function () { return element.vectorType(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "pixmapFormat", {
        get: function () { return element.pixmapFormat(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "folder", {
        get: function () { return element.folder(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "completeFolder", {
        get: function () { return element.completeFolder(this.id); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objElement.prototype, "physicalName", {
        get: function () { return element.physicalName(this.id); },
        enumerable: false,
        configurable: true
    });
    objElement.prototype.modify = function (scanType, fieldChart, pixmapFormat, vectorType) { return element.modify(this.id, scanType, fieldChart, pixmapFormat, vectorType); };
    objElement.prototype.rename = function (name) {
        return element.renameById(this.id, name);
    };
    objElement.prototype.remove = function (deleteDiskFile) {
        return element.remove(this.id, deleteDiskFile);
    };
    return objElement;
}());
var objDrawing = (function () {
    function objDrawing(name, element) {
        this.name = name;
        this.element = element;
    }
    objDrawing.prototype.getName = function () {
        return this.name;
    };
    Object.defineProperty(objDrawing.prototype, "exposureName", {
        get: function () {
            return this.name.substring(this.name.lastIndexOf(this.element.folder) + this.element.folder.length + 1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objDrawing.prototype, "filepath", {
        get: function () {
            return Drawing.filename(this.element.id, this.name);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(objDrawing.prototype, "filename", {
        get: function () {
            return this.filepath.substring(this.filepath.lastIndexOf("/") + 1);
        },
        enumerable: false,
        configurable: true
    });
    objDrawing.prototype.copy = function (destFileName, override) {
        if (override === void 0) { override = false; }
        var drawingName = "";
        if (destFileName) {
            drawingName = destFileName;
        }
        else {
            var filename = this.filename.substring(0, this.filename.lastIndexOf(".tvg"));
            drawingName = G.FileUtils.getUniqueFileName(this.element.completeFolder, filename, ".tvg").replace(".tvg", "");
        }
        var destPath = this.element.completeFolder + "/" + drawingName + ".tvg";
        if (!override && G.FileUtils.exists(destPath)) {
            MessageLog.trace("File already exists at destination path: " + destPath);
            return null;
        }
        var copiedFile = new G.objDrawing(drawingName, this.element);
        var result = Drawing.create(this.element.id, copiedFile.exposureName, true, true);
        MessageLog.trace("result " + result);
        G.FileUtils.copyTo(this.filepath, destPath);
        return copiedFile;
    };
    return objDrawing;
}());
var DrawingElementColumn = (function (_super) {
    __extends(DrawingElementColumn, _super);
    function DrawingElementColumn(name, parentLayer) {
        var _this = this;
        MessageLog.trace("name " + name);
        MessageLog.trace("name " + column.getEntry(name, 1, frame.current()));
        _this = _super.call(this, name, parentLayer) || this;
        _this.element = new G.objElement(node.getElementId(parentLayer.nodePath));
        return _this;
    }
    DrawingElementColumn.prototype.getKeyframe = function (frameNumber) {
        if (_super.prototype.getKeyframe.call(this, frameNumber) === "") {
            return null;
        }
        return new G.objDrawing(_super.prototype.getKeyframe.call(this, frameNumber), this.element);
    };
    DrawingElementColumn.prototype.setKeyFrame = function (startOrSelection, value, endFrame) {
        if (value instanceof G.objDrawing) {
            return _super.prototype.setKeyFrame.call(this, startOrSelection, value.exposureName, endFrame);
        }
        return _super.prototype.setKeyFrame.call(this, startOrSelection, value, endFrame);
    };
    DrawingElementColumn.prototype.copyDrawingTo = function (drawing, destFrame) {
        var copiedDrawing = drawing.copy();
        if (!copiedDrawing) {
            MessageLog.trace("Failed to copy drawing for duplication.");
            return false;
        }
        MessageLog.trace(copiedDrawing.exposureName);
        return this.setKeyFrame(destFrame, copiedDrawing.exposureName);
    };
    return DrawingElementColumn;
}(Column));
var DrawingLayer = (function (_super) {
    __extends(DrawingLayer, _super);
    function DrawingLayer(displayOrder, index, nodePath, name) {
        return _super.call(this, displayOrder, index, nodePath, name) || this;
    }
    DrawingLayer.prototype.getElementId = function () {
        return node.getElementId(this.nodePath);
    };
    DrawingLayer.prototype.toString = function () {
        return "DrawingLayer<".concat(this.nodePath, ">");
    };
    return DrawingLayer;
}(NodeLayer));
function getAllNodesInScene() {
    var accumulatedNodes = [];
    function crawlGroup(groupPath) {
        var subNodeCount = node.numberOfSubNodes(groupPath);
        for (var i = 0; i < subNodeCount; i++) {
            var currentChild = node.subNode(groupPath, i);
            accumulatedNodes.push(currentChild);
            if (node.isGroup(currentChild)) {
                crawlGroup(currentChild);
            }
        }
    }
    var absoluteRoot = node.root();
    crawlGroup(absoluteRoot);
    MessageLog.trace("--- total nodes found: " + accumulatedNodes.length + " ---");
    for (var j = 0; j < accumulatedNodes.length; j++) {
        MessageLog.trace(accumulatedNodes[j]);
    }
    return accumulatedNodes;
}
var _LayerManager = (function () {
    function _LayerManager() {
        this.nodeLayers = [];
        this.updateNodeLayers();
    }
    _LayerManager.prototype.updateNodeLayers = function () {
        this.nodeLayers = [];
        var allNodes = getAllNodesInScene();
        for (var _i = 0, allNodes_1 = allNodes; _i < allNodes_1.length; _i++) {
            var nodePath = allNodes_1[_i];
            var nodeType = node.type(nodePath);
            if (nodeType === "READ") {
                this.nodeLayers.push(new DrawingLayer(this.nodeLayers.length, 0, nodePath, node.getName(nodePath)));
            }
            else {
                this.nodeLayers.push(new NodeLayer(this.nodeLayers.length, 0, nodePath, node.getName(nodePath)));
            }
        }
    };
    _LayerManager.prototype.getSelectedNodes = function () {
        var _this = this;
        var selectedNodePaths = selection.selectedNodes();
        var selectedNodes = selectedNodePaths
            .map(function (nodePath) { return _this.getNodeLayer(nodePath); })
            .filter(function (layer) { return layer !== null; });
        selectedNodes.sort(function (a, b) { return a.displayOrder - b.displayOrder; });
        return selectedNodes;
    };
    _LayerManager.prototype.getNodeLayers = function () {
        return this.nodeLayers;
    };
    _LayerManager.prototype.getNodeLayer = function (index) {
        for (var i = 0; i < this.nodeLayers.length; i++) {
            if (typeof index === "string") {
                if (this.nodeLayers[i].nodePath === index)
                    return this.nodeLayers[i];
            }
            else {
                if (this.nodeLayers[i].index === index)
                    return this.nodeLayers[i];
            }
        }
        return null;
    };
    return _LayerManager;
}());
var LayerManager = new _LayerManager();
var _Selection = (function () {
    function _Selection() {
    }
    _Selection.prototype.getSelectedNodes = function () {
        var selectedNodePaths = selection.selectedNodes();
        return selectedNodePaths.map(function (nodePath) { return LayerManager.getNodeLayer(nodePath); }).filter(function (layer) { return layer !== null; });
    };
    return _Selection;
}());
var GlobalSelection = new _Selection();
