include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/Layers.js");


const RESOLUTION = {
  width: 256,
  height: 256
}

render.setResolution(RESOLUTION.width, RESOLUTION.height);
render.setWriteEnabled(true);
render.setRenderDisplay("Display All");
render.setWhiteBackground(false);

interface RenderTask {
  range: oSelection;
  nodes?: string[];
  onFinished: (filepath: string, renderTask: RenderTask) => void;
  completedNodes?: string[];
  completedFrames?: number[];
  outputFormat: "png" | "exr";
  resolution?: { width: number; height: number};
  outputPath?: string;    
}

class Renderer {
  static queue: RenderTask[] = [];
  static currentTask: RenderTask | null = null;

  static renderTask(task: RenderTask) {
    task.completedNodes = [];
    task.completedFrames = [];
    Renderer.queue.push(task);
    MessageLog.trace(Renderer.queue.length + " tasks in queue");
    if (task.resolution) {
      render.setResolution(task.resolution.width, task.resolution.height);
    }
    Renderer.currentTask = task;
    
    const startFrame = task.range.startFrame;
    const endFrame = task.range.endFrame;
    
    if (task.nodes && task.nodes.length > 0) {
      // Render specific nodes
      render.renderNodes(task.nodes, startFrame, endFrame);
    } else {
      // Render entire scene
      render.renderScene(startFrame, endFrame);
      MessageLog.trace("rendering scene from " + startFrame + " to " + endFrame);
    }
  }
}

// Handle scene rendering (frameReady signal for entire scene)
render.frameReady.connect((frame, celImage) => { 
  try {
    if (!Renderer.currentTask || (Renderer.currentTask.nodes && Renderer.currentTask.nodes.length > 0)) return;
    const ext = Renderer.currentTask.outputFormat;
    const outputDir = Renderer.currentTask.outputPath || `${specialFolders.userScripts}/image_cache`;
    const filename = `${frame}.${ext}`;
    celImage.imageFile(`${outputDir}/${filename}`);
    MessageLog.trace(`Scene frame ${frame} rendered to ${outputDir}/${filename}`);
  }
  catch (error) {
    MessageLog.trace("Error in frameReady handler: " + error.toString());
  }
});

// Handle node-specific rendering (nodeFrameReady signal)
render.nodeFrameReady.connect((frame, celImage, nodePath) => {
  try {
    if (!Renderer.currentTask || !Renderer.currentTask.nodes || Renderer.currentTask.nodes.length === 0) return;
    const ext = Renderer.currentTask.outputFormat;
    const outputDir = Renderer.currentTask.outputPath || `${specialFolders.userScripts}/image_cache`;
    const filename = `${frame}${(nodePath as string).replace(/\//g, "_")}.${ext}`;
    celImage.imageFile(`${outputDir}/${filename}`);

  }
  catch (error) {
    MessageLog.trace("Error in nodeFrameReady handler: " + error.toString());
  }
  
});

render.renderFinished.connect(() => {
  try {
    Renderer.queue.slice().forEach((task) => {
      const ext = task.outputFormat;
      const outputDir = task.outputPath || `${specialFolders.userScripts}/image_cache`;
      const files = listFilesInDirectory(outputDir, [`*.${ext}`]);
      MessageLog.trace("tasks " + Renderer.queue.length);
      
      // Handle scene rendering (entire frames)
      if (!task.nodes || task.nodes.length === 0) {
        const startFrame = task.range.startFrame;
        const endFrame = task.range.endFrame;
        for (let f = startFrame; f <= endFrame; f++) {
          if (task.completedFrames && task.completedFrames.indexOf(f) !== -1) continue;
          
          const imgName = `${f}.${ext}`;
          if (files.indexOf(imgName) !== -1) {
            const imgPath = `${outputDir}/${imgName}`;
            task.onFinished(imgPath, task);
            if (task.completedFrames) task.completedFrames.push(f);
          } else {
            MessageLog.trace(`Scene image for frame ${f} not found in ${outputDir}.`);
            task.onFinished("", task);
            if (task.completedFrames) task.completedFrames.push(f);
          }
        }
        
        // Remove task if all frames are complete
        const totalFrames = endFrame - startFrame + 1;
        if (task.completedFrames && task.completedFrames.length === totalFrames) {
          const idx = Renderer.queue.indexOf(task);
          if (idx !== -1) Renderer.queue.splice(idx, 1);
        }
      } 
      // Handle node-specific rendering
      else {
        MessageLog.trace("nodes : " + task.nodes);
        const startFrame = task.range.startFrame;
        task.nodes.forEach((nodePath) => {
          if (task.completedNodes && task.completedNodes.indexOf(nodePath) !== -1) return;
          const imgName = `${startFrame}${nodePath.replace(/\//g, "_")}.${ext}`;
          if (files.indexOf(imgName) !== -1) {
            const imgPath = `${outputDir}/${imgName}`;
            task.onFinished(imgPath, task);
            if (task.completedNodes) task.completedNodes.push(nodePath);
          } else {
            MessageLog.trace(`Image for frame ${startFrame} not found in cache for node ${nodePath}.`);
            task.onFinished("", task);
            if (task.completedNodes) task.completedNodes.push(nodePath);
          }
        });
        
        // Remove task if all nodes are finished
        if (task.completedNodes && task.completedNodes.length === task.nodes.length) {
          const idx = Renderer.queue.indexOf(task);
          if (idx !== -1) Renderer.queue.splice(idx, 1);
        }
      }
    });
    Renderer.currentTask = null;
  } catch (error) {
    MessageLog.trace("Error in renderFinished handler: " + error.toString());
  }
});
