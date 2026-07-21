function renderCurrentFrameToEXR() {
    var outputPath = QFileDialog.getSaveFileName(0, "Save Rendered Frame As", "", "EXR Files (*.exr)");
    if (!outputPath) {
        MessageLog.trace("Render cancelled: No output path selected.");
        return;
    }
    var currentFrame = frame.current();
    render.setWriteEnabled(true);
    var renderHandler = {
        frameReady: function (frameNum, frameCel) {
            if (frameNum === currentFrame) {
                MessageLog.trace("Saving frame " + frameNum + " to: " + outputPath);
                frameCel.imageFile(outputPath);
            }
        },
        renderFinished: function () {
            render.frameReady.disconnect(renderHandler.frameReady);
            render.renderFinished.disconnect(renderHandler.renderFinished);
            MessageLog.trace("Render Process Complete.");
        }
    };
    render.frameReady.connect(renderHandler.frameReady);
    render.renderFinished.connect(renderHandler.renderFinished);
    render.renderScene(currentFrame, currentFrame);
    MessageLog.trace("Rendering frame " + currentFrame + " to EXR...");
}
