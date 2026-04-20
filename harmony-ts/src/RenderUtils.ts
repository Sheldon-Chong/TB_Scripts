include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/Layers.js");

// render.setRenderDisplay("Top/Display");
render.setResolution(256, 256);
render.setWriteEnabled(false);

interface RenderQueueItem {
  frame: number;
  onFinished: (filepath: string) => void;
  nodes?: string[];
  type?: "scene" | "nodes";
}

const renderQueue: RenderQueueItem[] = [];
let isRendering = false;
let currentItem: RenderQueueItem | null = null;

function listFilesInDirectory(dirPath: string, filters: string[]): string[] {
  try {
    let dir: QDir = new QDir(dirPath);
    return dir.entryList(filters, QDir.Files, QDir.Name);
  } catch (e: any) {
    MessageLog.trace("Error reading directory '" + dirPath + "': " + e.toString());
    return [];
  }
}

function processNextInQueue() {
  MessageLog.trace("Processing next item in render queue...");
  if (isRendering || renderQueue.length === 0) return;
  currentItem = renderQueue.shift()!;
  isRendering = true;
  if (currentItem.type === "scene") {
    render.renderScene(currentItem.frame, currentItem.frame);
    return;
  }
  render.renderNodes(currentItem.nodes, currentItem.frame, currentItem.frame);
}

render.nodeFrameReady.connect((frame, celImage, nodePath) => {
  // Save the image to the cache
  MessageLog.trace("☑️ ready " + nodePath);
  celImage.imageFile(`${specialFolders.userScripts}/image_cache/${frame}${(nodePath as string).replace(/\//g, "_")}.png`);
});

render.renderFinished.connect(() => {
  // Check if the requested image exists
  if (currentItem) {
    const imgName = `${currentItem.frame}.png`;
    const imgPath = `${specialFolders.userScripts}/image_cache/${imgName}`;
    const files = listFilesInDirectory(`${specialFolders.userScripts}/image_cache`, [imgName]);
    if (files.indexOf(imgName) !== -1) {
      // Call the callback for the completed item, passing the image path
      currentItem.onFinished(imgPath);
    } else {
      MessageLog.trace(`Image for frame ${currentItem.frame} not found in cache.`);
      currentItem.onFinished("");
    }
  }
  isRendering = false;
  currentItem = null;
  processNextInQueue();
});

function addToRenderQueue(item: RenderQueueItem) {
  renderQueue.push(item);
  processNextInQueue();
}

// Optionally, a helper to enqueue a single frame render
function renderNodes(nodes: string[], frame: number, onFinished: (filepath: string) => void) {
  addToRenderQueue({ nodes, frame, onFinished });
}




const RenderUtils = {
  addToRenderQueue,
  renderNodes
};