var _snappingPreviewWindow = null;
function getSnappedFrame(currentFrame, selection, settings) {
    var frameInterval = 32;
    var offsetFromStart = (currentFrame - 1) % frameInterval;
    var snappedFrame = currentFrame;
    var dist = 0;
    if (offsetFromStart <= frameInterval / 2) {
        dist = offsetFromStart;
        snappedFrame = currentFrame - offsetFromStart;
    }
    else {
        dist = frameInterval - offsetFromStart;
        snappedFrame = currentFrame + dist;
    }
    if (dist <= settings.edgeSnappingThreshold) {
        return Math.max(1, snappedFrame);
    }
    return currentFrame;
}
function updateSnappingPreview(statusLabel) {
    var _G = Object._ || G;
    try {
        var selection_1 = new _G.oSelection();
        if (!selection_1 || selection_1.selectedNodes.length === 0)
            return;
        var currentFrame = frame.current();
        var settings = {
            edgeSnappingThreshold: 16,
            edgeSnappingEnabled: true,
            maxEdgeSnappingSearch: 100,
        };
        var snappedFrame = getSnappedFrame(currentFrame, selection_1, settings);
        var lastMarkerData = _G.GlobalTimeline.getMetadata("lastSnappingMarker");
        if (lastMarkerData) {
            try {
                var lastMarker = JSON.parse(lastMarkerData);
                if (lastMarker.center === snappedFrame &&
                    lastMarker.nodes.join(",") === selection_1.selectedNodes.map(function (n) { return n.nodePath; }).join(",")) {
                    return;
                }
                var lastNodes = lastMarker.nodes.map(function (path) { return _G.LayerManager.getNodeLayer(path); }).filter(function (n) { return n !== null; });
                if (lastNodes.length > 0) {
                    var lastSelection = new _G.oSelection(lastMarker.start, lastMarker.end, lastNodes);
                    _G.GlobalTimeline.deleteFrameMarkers(lastSelection);
                }
            }
            catch (e) {
                MessageLog.trace("Error clearing old marker: " + e.toString());
            }
            _G.GlobalTimeline.setMetadata("lastSnappingMarker", "");
        }
        scene.beginUndoRedoAccum("Snapping Preview");
        var start = Math.max(1, snappedFrame - 2);
        var end = snappedFrame + 2;
        var markerSelection = new _G.oSelection(start, end, selection_1.selectedNodes);
        _G.GlobalTimeline.createFrameMarkers("Red", markerSelection);
        scene.endUndoRedoAccum();
        _G.GlobalTimeline.setMetadata("lastSnappingMarker", JSON.stringify({
            start: start,
            end: end,
            center: snappedFrame,
            nodes: selection_1.selectedNodes.map(function (n) { return n.nodePath; })
        }));
        if (statusLabel)
            statusLabel.text = "Snapped to: " + snappedFrame + (snappedFrame === currentFrame ? " (Current)" : "");
        MessageLog.trace("created frame marker | " + markerSelection.toString());
    }
    catch (e) {
        MessageLog.trace("Preview Error: " + e.toString());
    }
}
this.__proto__.getSnappedFrame = getSnappedFrame;
function openLiveSnappingPreviewWindow() {
    var _G = Object._ || G;
    if (_snappingPreviewWindow) {
        try {
            _snappingPreviewWindow.close();
        }
        catch (e) { }
    }
    var window = new QWidget();
    _snappingPreviewWindow = window;
    window.setWindowTitle("Snapping Preview");
    window.resize(250, 80);
    var statusLabel = new QLabel("Snapping Preview Active");
    var layout = new QVBoxLayout();
    layout.addWidget(statusLabel, 0, 0);
    window.setLayout(layout);
    var frameNotifier = new SceneChangeNotifier(layout);
    var onUpdate = _G.Utils.bind(function () {
        try {
            MessageLog.trace(KeyModifiers.IsShiftPressed());
            updateSnappingPreview(statusLabel);
        }
        catch (e) {
            MessageLog.trace("Error in snapping preview update: " + e.toString());
        }
    }, this);
    frameNotifier.currentFrameChanged.connect(onUpdate);
    frameNotifier.selectionChanged.connect(onUpdate);
    window.closeEvent = function (event) {
        var lastMarkerData = _G.GlobalTimeline.getMetadata("lastSnappingMarker");
        if (lastMarkerData) {
            try {
                var lastMarker = JSON.parse(lastMarkerData);
                var lastNodes = lastMarker.nodes.map(function (path) { return _G.LayerManager.getNodeLayer(path); }).filter(function (n) { return n !== null; });
                if (lastNodes.length > 0) {
                    var lastSelection = new _G.oSelection(lastMarker.start, lastMarker.end, lastNodes);
                    _G.GlobalTimeline.deleteFrameMarkers(lastSelection);
                }
            }
            catch (e) { }
            _G.GlobalTimeline.setMetadata("lastSnappingMarker", "");
        }
        frameNotifier.currentFrameChanged.disconnect(onUpdate);
        frameNotifier.selectionChanged.disconnect(onUpdate);
        _snappingPreviewWindow = null;
        event.accept();
    };
    window.show();
    updateSnappingPreview(statusLabel);
}
this.__proto__.updateSnappingPreview = updateSnappingPreview;
function saveKeyFramesFrom3DPath() {
    var selection = G.GlobalTimeline.getSelection();
    MessageLog.trace(JSON.stringify(selection.selectedNodes[0].getAttributeKeywords(), null, 2));
    var PathColumn3D = selection.selectedNodes[0].getColumn("position.attr3dpath");
    MessageLog.trace(JSON.stringify(PathColumn3D, null, 2));
    MessageLog.trace(JSON.stringify(PathColumn3D.constructor.name, null, 2));
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
function loadKeyFramesTo3DPath() {
    var selection = G.GlobalTimeline.getSelection();
    if (selection.selectedNodes.length === 0) {
        MessageLog.trace("No node selected.");
        return;
    }
    var openPath = QFileDialog.getOpenFileName(0, "Open Keyframes JSON", "", "JSON Files (*.json);;All Files (*)");
    if (openPath) {
        var content = G.FileUtils.readFrom(openPath);
        if (content) {
            try {
                var keyframes = JSON.parse(content);
                G.GlobalTimeline.applyKeyFramesTo3DPath(selection, keyframes);
                MessageLog.trace("Keyframes loaded and applied from: " + openPath);
            }
            catch (e) {
                MessageLog.trace("Error parsing JSON: " + e.toString());
            }
        }
        else {
            MessageLog.trace("Failed to read file: " + openPath);
        }
    }
    else {
        MessageLog.trace("No file selected for loading keyframes.");
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
}
function serializeKeyFramesFrom3DPath(selection) {
    var layer = selection.selectedNodes[0];
    var PathColumn3D = layer.getColumn("position.attr3dpath");
    var ScaleXCol = layer.getColumn("scale.x");
    var ScaleYCol = layer.getColumn("scale.y");
    var keyframes = [];
    var relativeIndex = 0;
    for (var i = selection.startFrame; i <= selection.endFrame; i++) {
        var rawXVal = String(PathColumn3D.getX(i));
        var rawYVal = String(PathColumn3D.getY(i));
        var rawZVal = String(PathColumn3D.getZ(i));
        MessageLog.trace(JSON.stringify([rawXVal, rawYVal, rawZVal], null, 2));
        keyframes.push({
            frame: relativeIndex,
            x: parseFloat(rawXVal) * (rawXVal.indexOf('E') !== -1 ? 1 : -1),
            y: parseFloat(rawYVal) * (rawYVal.indexOf('N') !== -1 ? 1 : -1),
            z: parseFloat(rawZVal) * (rawZVal.indexOf('F') !== -1 ? 1 : -1),
            scaleX: parseFloat(ScaleXCol.getKeyframe(i)),
            scaleY: parseFloat(ScaleYCol.getKeyframe(i))
        });
        relativeIndex++;
    }
    return keyframes;
}
this.__proto__.saveKeyFramesFrom3DPath = saveKeyFramesFrom3DPath;
this.__proto__.loadKeyFramesTo3DPath = loadKeyFramesTo3DPath;
this.__proto__.saveAllKeyframePresets = saveAllKeyframePresets;
