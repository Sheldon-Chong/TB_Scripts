include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/Layers.js");
render.setResolution(256, 256);
render.setWriteEnabled(false);
var renderQueue = [];
var isRendering = false;
var currentItem = null;
function listFilesInDirectory(dirPath, filters) {
    try {
        var dir = new QDir(dirPath);
        return dir.entryList(filters, QDir.Files, QDir.Name);
    }
    catch (e) {
        MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
        return [];
    }
}
function processNextInQueue() {
    MessageLog.trace("Processing next item in render queue...");
    if (isRendering || renderQueue.length === 0)
        return;
    currentItem = renderQueue.shift();
    isRendering = true;
    if (currentItem.type === "scene") {
        render.renderScene(currentItem.frame, currentItem.frame);
        return;
    }
    render.renderNodes(currentItem.nodes, currentItem.frame, currentItem.frame);
}
render.nodeFrameReady.connect(function (frame, celImage, nodePath) {
    MessageLog.trace("☑️ ready " + nodePath);
    celImage.imageFile("".concat(specialFolders.userScripts, "/image_cache/").concat(frame).concat(nodePath.replace(/\//g, "_"), ".png"));
});
render.renderFinished.connect(function () {
    if (currentItem) {
        var imgName = "".concat(currentItem.frame, ".png");
        var imgPath = "".concat(specialFolders.userScripts, "/image_cache/").concat(imgName);
        var files = listFilesInDirectory("".concat(specialFolders.userScripts, "/image_cache"), [imgName]);
        if (files.indexOf(imgName) !== -1) {
            currentItem.onFinished(imgPath);
        }
        else {
            MessageLog.trace("Image for frame ".concat(currentItem.frame, " not found in cache."));
            currentItem.onFinished("");
        }
    }
    isRendering = false;
    currentItem = null;
    processNextInQueue();
});
function addToRenderQueue(item) {
    renderQueue.push(item);
    processNextInQueue();
}
function renderNodes(nodes, frame, onFinished) {
    addToRenderQueue({ nodes: nodes, frame: frame, onFinished: onFinished });
}
var RenderUtils = {
    addToRenderQueue: addToRenderQueue,
    renderNodes: renderNodes
};
