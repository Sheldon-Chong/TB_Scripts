function renderCurrentFrameToEXR() {
  // 1. Define the output path
  var outputPath = QFileDialog.getSaveFileName(
    0, "Save Rendered Frame As",
    "",
    "EXR Files (*.exr)"
  );
  
  if (!outputPath) {
    MessageLog.trace("Render cancelled: No output path selected.");
    return;
  }

  // 2. Get the current frame number from the scene
  var currentFrame = frame.current();

  // IMPORTANT: Ensure write is enabled. 
  // Scripts like Renderer.ts set this to false by default, which disables renderScene.
  render.setWriteEnabled(true);

  // 3. Define the handlers in an object to prevent garbage collection 
  // of the callback functions before the asynchronous render finishes.
  var renderHandler = {
    frameReady: function(frameNum, frameCel) {
      if (frameNum === currentFrame) {
        MessageLog.trace("Saving frame " + frameNum + " to: " + outputPath);
        frameCel.imageFile(outputPath);
      }
    },
    renderFinished: function() {
      render.frameReady.disconnect(renderHandler.frameReady);
      render.renderFinished.disconnect(renderHandler.renderFinished);
      MessageLog.trace("Render Process Complete.");
    }
  };

  // 5. Connect the signals
  render.frameReady.connect(renderHandler.frameReady);
  render.renderFinished.connect(renderHandler.renderFinished);

  // 6. Execute the render
  render.renderScene(currentFrame, currentFrame);
  MessageLog.trace("Rendering frame " + currentFrame + " to EXR...");
}
