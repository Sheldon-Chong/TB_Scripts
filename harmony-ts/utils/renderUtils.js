include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/Layers.js");
var RESOLUTION = {
    width: 256,
    height: 256
};
render.setResolution(RESOLUTION.width, RESOLUTION.height);
render.setWriteEnabled(true);
render.setRenderDisplay("Display All");
render.setWhiteBackground(false);
var Renderer = (function () {
    function Renderer() {
    }
    Renderer.renderTask = function (task) {
        task.completedNodes = [];
        task.completedFrames = [];
        Renderer.queue.push(task);
        MessageLog.trace(Renderer.queue.length + " tasks in queue");
        if (task.resolution) {
            render.setResolution(task.resolution.width, task.resolution.height);
        }
        Renderer.currentTask = task;
        var startFrame = task.range.startFrame;
        var endFrame = task.range.endFrame;
        if (task.nodes && task.nodes.length > 0) {
            render.renderNodes(task.nodes, startFrame, endFrame);
        }
        else {
            render.renderScene(startFrame, endFrame);
            MessageLog.trace("rendering scene from " + startFrame + " to " + endFrame);
        }
    };
    Renderer.queue = [];
    Renderer.currentTask = null;
    return Renderer;
}());
render.frameReady.connect(function (frame, celImage) {
    try {
        if (!Renderer.currentTask || (Renderer.currentTask.nodes && Renderer.currentTask.nodes.length > 0))
            return;
        var ext = Renderer.currentTask.outputFormat;
        var outputDir = Renderer.currentTask.outputPath || "".concat(specialFolders.userScripts, "/image_cache");
        var filename = "".concat(frame, ".").concat(ext);
        celImage.imageFile("".concat(outputDir, "/").concat(filename));
        MessageLog.trace("Scene frame ".concat(frame, " rendered to ").concat(outputDir, "/").concat(filename));
    }
    catch (error) {
        MessageLog.trace("Error in frameReady handler: " + error.toString());
    }
});
render.nodeFrameReady.connect(function (frame, celImage, nodePath) {
    try {
        if (!Renderer.currentTask || !Renderer.currentTask.nodes || Renderer.currentTask.nodes.length === 0)
            return;
        var ext = Renderer.currentTask.outputFormat;
        var outputDir = Renderer.currentTask.outputPath || "".concat(specialFolders.userScripts, "/image_cache");
        var filename = "".concat(frame).concat(nodePath.replace(/\//g, "_"), ".").concat(ext);
        celImage.imageFile("".concat(outputDir, "/").concat(filename));
    }
    catch (error) {
        MessageLog.trace("Error in nodeFrameReady handler: " + error.toString());
    }
});
render.renderFinished.connect(function () {
    try {
        Renderer.queue.slice().forEach(function (task) {
            var ext = task.outputFormat;
            var outputDir = task.outputPath || "".concat(specialFolders.userScripts, "/image_cache");
            var files = listFilesInDirectory(outputDir, ["*.".concat(ext)]);
            MessageLog.trace("tasks " + Renderer.queue.length);
            if (!task.nodes || task.nodes.length === 0) {
                var startFrame = task.range.startFrame;
                var endFrame = task.range.endFrame;
                for (var f = startFrame; f <= endFrame; f++) {
                    if (task.completedFrames && task.completedFrames.indexOf(f) !== -1)
                        continue;
                    var imgName = "".concat(f, ".").concat(ext);
                    if (files.indexOf(imgName) !== -1) {
                        var imgPath = "".concat(outputDir, "/").concat(imgName);
                        task.onFinished(imgPath, task);
                        if (task.completedFrames)
                            task.completedFrames.push(f);
                    }
                    else {
                        MessageLog.trace("Scene image for frame ".concat(f, " not found in ").concat(outputDir, "."));
                        task.onFinished("", task);
                        if (task.completedFrames)
                            task.completedFrames.push(f);
                    }
                }
                var totalFrames = endFrame - startFrame + 1;
                if (task.completedFrames && task.completedFrames.length === totalFrames) {
                    var idx = Renderer.queue.indexOf(task);
                    if (idx !== -1)
                        Renderer.queue.splice(idx, 1);
                }
            }
            else {
                MessageLog.trace("nodes : " + task.nodes);
                var startFrame_1 = task.range.startFrame;
                task.nodes.forEach(function (nodePath) {
                    if (task.completedNodes && task.completedNodes.indexOf(nodePath) !== -1)
                        return;
                    var imgName = "".concat(startFrame_1).concat(nodePath.replace(/\//g, "_"), ".").concat(ext);
                    if (files.indexOf(imgName) !== -1) {
                        var imgPath = "".concat(outputDir, "/").concat(imgName);
                        task.onFinished(imgPath, task);
                        if (task.completedNodes)
                            task.completedNodes.push(nodePath);
                    }
                    else {
                        MessageLog.trace("Image for frame ".concat(startFrame_1, " not found in cache for node ").concat(nodePath, "."));
                        task.onFinished("", task);
                        if (task.completedNodes)
                            task.completedNodes.push(nodePath);
                    }
                });
                if (task.completedNodes && task.completedNodes.length === task.nodes.length) {
                    var idx = Renderer.queue.indexOf(task);
                    if (idx !== -1)
                        Renderer.queue.splice(idx, 1);
                }
            }
        });
        Renderer.currentTask = null;
    }
    catch (error) {
        MessageLog.trace("Error in renderFinished handler: " + error.toString());
    }
});
