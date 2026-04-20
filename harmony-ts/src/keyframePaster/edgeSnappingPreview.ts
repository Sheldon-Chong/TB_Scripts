
// --- Global Snapping Preview Logic ---

var _snappingPreviewWindow: QWidget | null = null;

function getSnappedFrame(currentFrame: number, selection: any, settings: any): number {
  const frameInterval = 32;
  // Calculate the closest 32nd frame (1, 33, 65, etc.) assuming 1-based indexing
  const offsetFromStart = (currentFrame - 1) % frameInterval;
  
  let snappedFrame = currentFrame;
  let dist = 0;

  if (offsetFromStart <= frameInterval / 2) {
    // Closer to the start of the current 32-frame block
    dist = offsetFromStart;
    snappedFrame = currentFrame - offsetFromStart;
  } else {
    // Closer to the start of the next 32-frame block
    dist = frameInterval - offsetFromStart;
    snappedFrame = currentFrame + dist;
  }

  // Only snap if within threshold
  if (dist <= settings.edgeSnappingThreshold) {
    return Math.max(1, snappedFrame);
  }
  
  return currentFrame;
}

function updateSnappingPreview(statusLabel: any) {
  const _G = (Object as any)._ || G;
  try {
    const selection = new _G.oSelection();
    if (!selection || selection.selectedNodes.length === 0) return;

    const currentFrame = frame.current();
    const settings = {
      edgeSnappingThreshold: 16,
      edgeSnappingEnabled: true,
      maxEdgeSnappingSearch: 100,
    };
    const snappedFrame = getSnappedFrame(currentFrame, selection, settings);

    // Guard: Only update if the snapped frame or selection changed
    const lastMarkerData = _G.GlobalTimeline.getMetadata("lastSnappingMarker");
    if (lastMarkerData) {
      try {
        const lastMarker = JSON.parse(lastMarkerData);
        // If nothing changed, skip to avoid flickering/crashes from redundant scene edits
        if (lastMarker.center === snappedFrame && 
            lastMarker.nodes.join(",") === selection.selectedNodes.map(function(n: any) { return n.nodePath; }).join(",")) {
          return;
        }

        const lastNodes = lastMarker.nodes.map(function(path: string) { return _G.LayerManager.getNodeLayer(path); }).filter(function(n: any) { return n !== null; });
        if (lastNodes.length > 0) {
          const lastSelection = new _G.oSelection(lastMarker.start, lastMarker.end, lastNodes);
          _G.GlobalTimeline.deleteFrameMarkers(lastSelection);
        }
      } catch(e) {
        MessageLog.trace("Error clearing old marker: " + e.toString());
      }
      _G.GlobalTimeline.setMetadata("lastSnappingMarker", "");
    }

    scene.beginUndoRedoAccum("Snapping Preview");

    // Create new marker (5 markers centered at snappedFrame)
    const start = Math.max(1, snappedFrame - 2);
    const end = snappedFrame + 2;
    const markerSelection = new _G.oSelection(start, end, selection.selectedNodes);
    
    _G.GlobalTimeline.createFrameMarkers("Red", markerSelection);

    scene.endUndoRedoAccum();

    // Store new marker in metadata
    _G.GlobalTimeline.setMetadata("lastSnappingMarker", JSON.stringify({
      start: start,
      end: end,
      center: snappedFrame,
      nodes: selection.selectedNodes.map(function(n: any) { return n.nodePath; })
    }));

    if (statusLabel) statusLabel.text = "Snapped to: " + snappedFrame + (snappedFrame === currentFrame ? " (Current)" : "");
    
    
    MessageLog.trace("created frame marker | " + markerSelection.toString());
  } catch (e) {
    MessageLog.trace("Preview Error: " + e.toString());
  }
}

this.__proto__.getSnappedFrame = getSnappedFrame;

function openLiveSnappingPreviewWindow() {
  const _G = (Object as any)._ || G;
  
  // Close existing window to prevent multiple notifiers fighting over metadata/markers
  if (_snappingPreviewWindow) {
    try {
      _snappingPreviewWindow.close();
    } catch(e) {}
  }

  const window = new QWidget();
  _snappingPreviewWindow = window;
  
  window.setWindowTitle("Snapping Preview");
  window.resize(250, 80);

  const statusLabel = new QLabel("Snapping Preview Active");
  const layout = new QVBoxLayout();
  layout.addWidget(statusLabel, 0, 0);
  window.setLayout(layout);

  const frameNotifier = new SceneChangeNotifier(layout);

  // Use G.Utils.bind for stability, similar to Labeler.ts
  const onUpdate = _G.Utils.bind(function() {
    try {

     MessageLog.trace(KeyModifiers.IsShiftPressed ());
      updateSnappingPreview(statusLabel);
    }
    catch (e) {
      MessageLog.trace("Error in snapping preview update: " + e.toString());
    }
  }, this);

  frameNotifier.currentFrameChanged.connect(onUpdate);
  frameNotifier.selectionChanged.connect(onUpdate);

  window.closeEvent = function (event: any) {
    const lastMarkerData = _G.GlobalTimeline.getMetadata("lastSnappingMarker");
    if (lastMarkerData) {
      try {
        const lastMarker = JSON.parse(lastMarkerData);
        const lastNodes = lastMarker.nodes.map(function(path: string) { return _G.LayerManager.getNodeLayer(path); }).filter(function(n: any) { return n !== null; });
        if (lastNodes.length > 0) {
          const lastSelection = new _G.oSelection(lastMarker.start, lastMarker.end, lastNodes);
          _G.GlobalTimeline.deleteFrameMarkers(lastSelection);
        }
      } catch(e) {}
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

// --- End Global Snapping Preview Logic ---


function saveKeyFramesFrom3DPath() {
  const selection = G.GlobalTimeline.getSelection();

  MessageLog.trace(JSON.stringify(selection.selectedNodes[0].getAttributeKeywords(), null, 2));

  const PathColumn3D = selection.selectedNodes[0].getColumn("position.attr3dpath") as PathColumn3D;

  MessageLog.trace(JSON.stringify(PathColumn3D, null, 2));
  MessageLog.trace(JSON.stringify(PathColumn3D.constructor.name, null, 2));

  // const RotationColumn = selection.selectedNodes[0].getColumn("ROTATION") as PathColumn3D;
  const ScaleXCol = selection.selectedNodes[0].getColumn("scale.x") as Column;
  const ScaleYCol = selection.selectedNodes[0].getColumn("scale.y") as Column;

  // MessageLog.trace(JSON.stringify(selection.selectedNodes[0].getAttributeKeywords(), null, 2));

  const keyframes: { frame: number; x: number; y: number; z: number }[] = [];
  var relativeIndex = 0;
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    keyframes.push({
      frame: relativeIndex,
      x: PathColumn3D.getX(i),
      y: PathColumn3D.getY(i),
      z: PathColumn3D.getZ(i),
      scaleX: ScaleXCol.getKeyframe(i),
      scaleY: ScaleYCol.getKeyframe(i)
    });
    relativeIndex ++;
  }

  // QFileDialog is not available in Harmony scripting. Use QFileDialog.getOpenFileName if available, otherwise fallback.
  var savePath = QFileDialog.getSaveFileName(0, "Save As", "", "JSON Files (*.json);;All Files (*)");

  if (savePath) {
    G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
    MessageLog.trace("Keyframes saved to: " + savePath);
  } else {
    MessageLog.trace("No file selected for saving keyframes.");
  }
}



function loadKeyFramesTo3DPath() {
  const selection = G.GlobalTimeline.getSelection();
  if (selection.selectedNodes.length === 0) {
    MessageLog.trace("No node selected.");
    return;
  }

  var openPath = QFileDialog.getOpenFileName(0, "Open Keyframes JSON", "", "JSON Files (*.json);;All Files (*)");

  if (openPath) {
    const content = G.FileUtils.readFrom(openPath);
    if (content) {
      try {
        const keyframes = JSON.parse(content);
        G.GlobalTimeline.applyKeyFramesTo3DPath(selection, keyframes);
        MessageLog.trace("Keyframes loaded and applied from: " + openPath);
      } catch (e) {
        MessageLog.trace("Error parsing JSON: " + e.toString());
      }
    } else {
      MessageLog.trace("Failed to read file: " + openPath);
    }
  } else {
    MessageLog.trace("No file selected for loading keyframes.");
  }
}


function serializeKeyFramesFromSplittedPath(selection: oSelection) {
  const layer = selection.selectedNodes[0];
  const xCol = layer.getColumn("offset.X");
  const yCol = layer.getColumn("offset.Y");
  const zCol = layer.getColumn("offset.Z");

  const ScaleXCol = layer.getColumn("scale.x");
  const ScaleYCol = layer.getColumn("scale.y");
  const keyframes: { frame: number; x: number; y: number; z: number }[] = [];
  var relativeIndex = 0;
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    keyframes.push({
      frame: relativeIndex,
      x: parseFloat(xCol.getKeyframe(i)),
      y: parseFloat(yCol.getKeyframe(i)),
      z: parseFloat(zCol.getKeyframe(i)),
      scaleX: parseFloat(ScaleXCol.getKeyframe(i)),
      scaleY: parseFloat(ScaleYCol.getKeyframe(i))
    });
    relativeIndex ++;
  }

  return keyframes;
}

function serializeKeyFramesFrom3DPath(selection: oSelection) {
  const layer = selection.selectedNodes[0];
  const PathColumn3D = layer.getColumn("position.attr3dpath") as PathColumn3D;
  const ScaleXCol = layer.getColumn("scale.x") as Column;
  const ScaleYCol = layer.getColumn("scale.y") as Column;
  const keyframes: { frame: number; x: number; y: number; z: number; scaleX: number; scaleY: number }[] = [];
  var relativeIndex = 0;

  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    const rawXVal = String(PathColumn3D.getX(i));
    const rawYVal = String(PathColumn3D.getY(i));
    const rawZVal = String(PathColumn3D.getZ(i));

    MessageLog.trace(JSON.stringify([rawXVal,rawYVal,rawZVal], null, 2));

    keyframes.push({
      frame: relativeIndex,
      x: parseFloat(rawXVal) * (rawXVal.indexOf('E') !== -1 ? 1 : -1),
      y: parseFloat(rawYVal) * (rawYVal.indexOf('N') !== -1 ? 1 : -1),
      z: parseFloat(rawZVal) * (rawZVal.indexOf('F') !== -1 ? 1 : -1),
      scaleX: parseFloat(ScaleXCol.getKeyframe(i)),
      scaleY: parseFloat(ScaleYCol.getKeyframe(i))
    });
    relativeIndex ++;
  }
  return keyframes;
}

this.__proto__.saveKeyFramesFrom3DPath = saveKeyFramesFrom3DPath;
this.__proto__.loadKeyFramesTo3DPath = loadKeyFramesTo3DPath;
this.__proto__.saveAllKeyframePresets = saveAllKeyframePresets;
