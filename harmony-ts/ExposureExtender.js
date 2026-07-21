include("Layers.js");
include(specialFolders.userScripts + "/utils/utils.js");
function collectInitialExposures() {
    var rows = [];
    var nodes = selection.selectedNodes();
    var selectedStartFrame = selection.startFrame();
    var selectedEndFrame = selectedStartFrame + selection.numberOfFrames() - 1;
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var currentNode = nodes_1[_i];
        var row = [];
        var layer = LayerManager.getNodeLayer(currentNode);
        var drawingCol = layer.getColumn("DRAWING.ELEMENT");
        if (!drawingCol) {
            MessageLog.trace("No DRAWING.ELEMENT column found in node: " + currentNode);
            continue;
        }
        for (var frame = selectedStartFrame; frame <= selectedEndFrame; frame++) {
            var drawingValue = drawingCol.getKeyframe(frame);
            row.push(drawingValue);
        }
        rows.push({
            column: drawingCol,
            frames: row,
            node: currentNode
        });
    }
    stringify(rows);
    return rows;
}
function getTimelineMarkersPresentAtFrame(frame) {
    var markers = TimelineMarker.getAllMarkers();
    return markers.filter(function (marker) {
        return frame >= marker.frame && frame < marker.frame + Math.max(marker.length, 1);
    });
}
function deleteAllMarkers() {
    var markers = TimelineMarker.getAllMarkers();
    for (var _i = 0, markers_1 = markers; _i < markers_1.length; _i++) {
        var marker = markers_1[_i];
        TimelineMarker.deleteMarker(marker);
    }
}
include("Toolbar.js");
include(specialFolders.userScripts + "/utils/test.js");
function extendExposures() {
    var MARGIN = 3;
    var rows = collectInitialExposures();
    var nodes = selection.selectedNodes();
    var selectedStartFrame = selection.startFrame();
    var selectedEndFrame = selectedStartFrame + selection.numberOfFrames() - 1;
    scene.beginUndoRedoAccum("Create Drawing example");
    var extensionLength = 32;
    var BOUNDARY_COLOR = "#9caddb";
    var markers = TimelineMarker.getAllMarkers();
    var skipExtensionFrames = [];
    markers.forEach(function (currentMarker) {
        if (currentMarker.color === "#1e90ff") {
            skipExtensionFrames.push(currentMarker.frame);
        }
    });
    stringify(skipExtensionFrames);
    function isMarkerPresentAtFrame(frame) {
        var markers = getTimelineMarkersPresentAtFrame(frame);
        markers = markers.filter(function (marker) {
            return marker.color === "#1e90ff";
        });
        return markers.length > 0;
    }
    var extendedIndex = 0;
    var endingFrame = 0;
    try {
        rows.forEach(function (row) {
            var drawingCol = row.column;
            var layer = LayerManager.getNodeLayer(row.node);
            var folder = element.completeFolder(layer.getElementId());
            var folderName = element.folder(layer.getElementId());
            var frames = row.frames;
            extendedIndex = 0;
            var isInSkipMode = false;
            var skipModeIndex = 0;
            var start = 0;
            var end = 0;
            row.frames.forEach(function (element, index) {
                if (isMarkerPresentAtFrame(index + 1)) {
                    if (!isInSkipMode) {
                        skipModeIndex = 0;
                        start = selectedStartFrame + (extendedIndex * extensionLength);
                        isInSkipMode = true;
                    }
                    drawingCol.setKeyFrame(start + skipModeIndex, frames[index]);
                    skipModeIndex++;
                    return;
                }
                else {
                    if (isInSkipMode) {
                        extendedIndex++;
                        isInSkipMode = false;
                    }
                }
                start = selectedStartFrame + (extendedIndex * extensionLength);
                end = start + extensionLength - 1;
                var exposureStart = start + MARGIN;
                var exposureEnd = end - MARGIN;
                if (!frames[index]) {
                    drawingCol.setKeyframeRange(start, end, "");
                    return;
                }
                drawingCol.setKeyframeRange(exposureStart, exposureEnd, frames[index]);
                var originalDrawing = frames[index];
                function createMarginCopy(copyName, frameNum) {
                    copyFile("".concat(folder, "/").concat(folderName, "-").concat(originalDrawing, ".tvg"), "".concat(folder, "/").concat(folderName, "-").concat(copyName, ".tvg"));
                    drawingCol.setKeyFrame(frameNum, copyName);
                }
                for (var b = 0; b < MARGIN; b++)
                    createMarginCopy("".concat(originalDrawing, "_before_").concat(index, "_").concat(b), start + b);
                for (var a = 0; a < MARGIN; a++)
                    createMarginCopy("".concat(originalDrawing, "_after_").concat(index, "_").concat(a), exposureEnd + 1 + a);
                extendedIndex++;
                endingFrame = end;
            });
        });
    }
    catch (e) {
        MessageLog.trace("Error during exposure extension: " + e.toString());
    }
    MessageLog.trace("ending frame: " + endingFrame);
    MessageLog.trace("extended index: " + extendedIndex);
    var copyStartFrame = endingFrame + 2;
    rows.forEach(function (row) {
        var drawingCol = row.column;
        var frames = row.frames;
        for (var i = 0; i < frames.length; i++) {
            drawingCol.setKeyFrame(copyStartFrame + i, frames[i]);
        }
    });
    deleteAllMarkers();
    rows[0].frames.forEach(function (elem, index) {
        try {
            var start = (index * extensionLength) + 1;
            TimelineMarker.createMarker({
                frame: start,
                length: 0,
                color: BOUNDARY_COLOR,
                name: "Boundary",
                notes: "extended exposures"
            });
        }
        catch (e) {
            MessageLog.trace("Failed to create marker: " + e.toString());
        }
    });
    scene.endUndoRedoAccum();
    return;
}
function frameTraverse() {
    function jumpToBoundary(direction) {
        var markers = TimelineMarker.getAllMarkers().filter(function (m) { return m.name === "Boundary"; });
        var current = frame.current();
        var filtered = markers.filter(function (m) { return direction === 'next' ? m.frame > current : m.frame < current; });
        if (filtered.length === 0) {
            MessageLog.trace("No Boundary markers found ".concat(direction, " current frame"));
            return;
        }
        var target = filtered.sort(function (a, b) { return direction === 'next' ? a.frame - b.frame : b.frame - a.frame; })[0];
        MessageLog.trace("".concat(direction.charAt(0).toUpperCase() + direction.slice(1), " Boundary marker at frame: ").concat(target.frame));
        frame.setCurrent(target.frame);
    }
    registerAction({
        name: "nextBoundary",
        icon: "earth.png",
        shortcut: "Ctrl+Alt+1",
        callback: function () { return jumpToBoundary('next'); }
    });
    registerAction({
        name: "previousBoundary",
        icon: "earth.png",
        shortcut: "Ctrl+Alt+2",
        callback: function () { return jumpToBoundary('previous'); }
    });
}
