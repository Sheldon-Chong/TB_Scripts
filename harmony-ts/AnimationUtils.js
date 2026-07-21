include("globals.js");
var BOUNDARY_LENGTH = 32;
this.__proto__.BOUNDARY_LENGTH = BOUNDARY_LENGTH;
function jumpToNextBoundary() {
    try {
        var currentFrame = frame.current();
        var targetFrame = Math.ceil((currentFrame + 1) / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;
        frame.setCurrent(targetFrame);
    }
    catch (error) {
        MessageLog.trace(">>> " + error.toString());
    }
}
function jumpToPreviousBoundary() {
    try {
        var currentFrame = frame.current();
        var targetFrame = Math.floor((currentFrame - 1) / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;
        frame.setCurrent(targetFrame);
    }
    catch (error) {
        MessageLog.trace(">>> " + error.toString());
    }
}
function selectWithinBoundaries() {
    MessageLog.trace("current view : " + view.currentView());
    selection.clearSelection();
    MessageLog.trace(">> " + selection.setSelectionFrameRange);
    var name = G.LayerManager.getNodeLayer("Top/Drawing_1").getColumn("DRAWING.ELEMENT").name;
    MessageLog.trace(" name : " + name);
    selection.addDrawingColumnToSelection(name);
    selection.addNodeToSelection("Top/Drawing_1");
    selection.setSelectionFrameRange(3, 5);
    MessageLog.trace("is range : " + selection.isSelectionRange());
    MessageLog.trace(">> start " + selection.startFrame());
    Action.perform("onActionRefresh()");
    view.refreshViews();
    return;
    try {
        var selectRange = G.GlobalTimeline.getSelection();
        var start = Math.floor(selectRange.startFrame / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;
        var end = Math.ceil(selectRange.endFrame / BOUNDARY_LENGTH) * BOUNDARY_LENGTH - 1;
        var markers = TimelineMarker.getAllMarkers();
        markers.forEach(function (marker) {
            TimelineMarker.deleteMarker(marker);
        });
        TimelineMarker.createMarker({
            frame: start,
            length: end,
            color: "#9caddb",
            name: "selection",
            notes: "extended exposures"
        });
    }
    catch (error) {
        MessageLog.trace(">>> " + error.toString());
    }
}
function registerBoundaryNavigationShortcuts() {
    try {
        registerAction({
            name: "previousBoundary",
            icon: "earth.png",
            shortcut: "Ctrl+Alt+2",
            callback: jumpToPreviousBoundary
        });
        registerAction({
            name: "nextBoundary",
            icon: "earth.png",
            shortcut: "Ctrl+Alt+1",
            callback: jumpToNextBoundary
        });
        registerAction({
            name: "selectWithinBoundaries",
            icon: "earth.png",
            shortcut: "Ctrl+Alt+3",
            callback: selectWithinBoundaries
        });
    }
    catch (error) {
    }
    finalizeToolbars();
}
function loopSelection() {
    try {
        var selection_1 = G.GlobalTimeline.getSelection();
        scene.beginUndoRedoAccum("Loop Selection");
        selection_1.selectedNodes.forEach(function (node) {
            var drawingsList = [];
            var drawingCol = node.getColumn("DRAWING.ELEMENT");
            var loopStart = -1;
            var i = selection_1.endFrame;
            while (i >= selection_1.startFrame && drawingCol.getKeyframe(i) === null)
                i--;
            loopStart = i;
            while (i >= selection_1.startFrame) {
                var drawing = drawingCol.getKeyframe(i);
                drawingsList.unshift(drawing);
                i--;
            }
            drawingsList.forEach(function (element) {
                MessageLog.trace("element " + element);
            });
            for (var i_1 = loopStart; i_1 <= selection_1.endFrame; i_1++) {
                var index = (i_1 - loopStart) % drawingsList.length;
                if (index === 0)
                    Timeline.createFrameMarker(node.index, "Red", i_1 + 1);
                var loopedDrawing = drawingsList[(i_1 - loopStart) % drawingsList.length];
                if (loopedDrawing !== null)
                    drawingCol.copyDrawingTo(loopedDrawing, i_1 + 1);
            }
        });
        scene.endUndoRedoAccum();
        MessageLog.trace("done");
    }
    catch (error) {
        MessageLog.trace("error : " + error.toString());
    }
}
