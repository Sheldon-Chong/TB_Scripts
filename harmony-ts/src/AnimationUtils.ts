include("globals.js");

const BOUNDARY_LENGTH = 32;

this.__proto__.BOUNDARY_LENGTH = BOUNDARY_LENGTH;

function jumpToNextBoundary() {
  try {
    const currentFrame = frame.current();

    const targetFrame = Math.ceil((currentFrame + 1) / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;

    frame.setCurrent(targetFrame);

  } catch (error) {
    MessageLog.trace(">>> " + error.toString());
  }
}

function jumpToPreviousBoundary() {
  try {
    const currentFrame = frame.current();

    const targetFrame = Math.floor((currentFrame - 1) / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;
    frame.setCurrent(targetFrame);
  } catch (error) {
    MessageLog.trace(">>> " + error.toString());
  }
}

function selectWithinBoundaries() {


  MessageLog.trace("current view : " + view.currentView());
  selection.clearSelection();

  MessageLog.trace(">> " + selection.setSelectionFrameRange);
  // Action.perform("onActionTimelineNextBlueMark()", "timelineView");


  const name = G.LayerManager.getNodeLayer("Top/Drawing_1").getColumn("DRAWING.ELEMENT").name;
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
    const selectRange = G.GlobalTimeline.getSelection();
    const start = Math.floor(selectRange.startFrame / BOUNDARY_LENGTH) * BOUNDARY_LENGTH;
    const end = Math.ceil(selectRange.endFrame / BOUNDARY_LENGTH) * BOUNDARY_LENGTH - 1;

    const markers = TimelineMarker.getAllMarkers();

    markers.forEach((marker) => {
      TimelineMarker.deleteMarker(marker);
    })

    TimelineMarker.createMarker({
      frame: start,
      length: end,
      color: "#9caddb",
      name: "selection",
      notes: "extended exposures"
    });

    // selection.setSelectionFrameRange(start, end - start + 1);
  } catch (error) {
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


  } catch (error) {

  }

  finalizeToolbars();
}

function loopSelection() {
  try {
    const selection = G.GlobalTimeline.getSelection();

    scene.beginUndoRedoAccum("Loop Selection");
    selection.selectedNodes.forEach(node => {
      const drawingsList = [];
      const drawingCol: DrawingElementColumn = node.getColumn("DRAWING.ELEMENT") as DrawingElementColumn;

      let loopStart = -1;
      let i = selection.endFrame;
      while (i >= selection.startFrame && drawingCol.getKeyframe(i) === null)
        i--;
      loopStart = i;
      while (i >= selection.startFrame) {
        const drawing = drawingCol.getKeyframe(i);
        drawingsList.unshift(drawing);
        i--;
      }

      drawingsList.forEach(element => {
        MessageLog.trace("element " + element);
      });

      for (let i = loopStart; i <= selection.endFrame; i++) {
        let index = (i - loopStart) % drawingsList.length;

        if (index === 0)
          Timeline.createFrameMarker(node.index, "Red", i + 1)
        const loopedDrawing = drawingsList[(i - loopStart) % drawingsList.length];
        if (loopedDrawing !== null)
          drawingCol.copyDrawingTo(loopedDrawing, i + 1);
      }
    });
    scene.endUndoRedoAccum();

    MessageLog.trace("done");
  } catch (error) {
    MessageLog.trace("error : " + error.toString());
  }

  // const drawingLayer = (G.LayerManager.getNodeLayer("Top/Drawing") as DrawingLayer);
  // const drawingCol = drawingLayer.getColumn("DRAWING.ELEMENT");
  // const drawing = (drawingCol.getKeyframe(1) as objDrawing);

  // drawingCol.setKeyFrame(5, drawing);


  // MessageLog.trace(">> " + drawing.element.completeFolder);
  // G.FileUtils.listFiles(drawing.element.completeFolder, ["*"]).forEach((file) => {
  //   MessageLog.trace(">>> " + file);
  // });

  // drawing.copy("Drawing-1");

  // MessageLog.trace(G.FileUtils.getUniqueFileName(drawing.element.completeFolder, "Drawing-1", ".tvg"));

  // openInFileExplorer(scene.currentProjectPath());
}


