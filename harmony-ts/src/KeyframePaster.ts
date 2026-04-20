include("globals.js");
include(specialFolders.userScripts + "/keyframePaster/edgeSnappingPreview.js");
const CAMERA_PRESETS_PATH = specialFolders.userScripts + "/keyframe_presets/camera";
const ANIMATION_PRESETS_PATH = specialFolders.userScripts + "/keyframe_presets/animation";

const KEYFRAME_PRESETS = [
  "gentle_jump_bob",
  "jump_bob",
  "left_dip_bob",
  "right_dip_bob",
  "shake",
  "u_bob_small",
  "u_bob",
  "walk_slow",
  "walk"
]

const CAMERA_PRESETS = [
  "heavy_shake",
  "light_shake_2",
  "light_shake",
  "pan_down",
  "pan_left",
  "pan_right",
  "pan_to_bottom_left",
  "pan_to_bottom_right",
  "pan_to_top_left",
  "pan_to_top_right",
  "pan_up",
  "vertical_shake",
  "zoom_in",
  "zoom_out",
]

// TODO support toonboom's 3d column using a special inherited class


function saveAllKeyframePresets() {
  try {
    const presetRegions = TimelineMarker.getAllMarkers();
    const currentNode = G.GlobalTimeline.getSelection().selectedNodes[0];

    function savePreset(presetRegion: any, keyframes: any, presetsPath: string) {
      let i = presetRegion.frame;
      let marker = null;
      let center = null;
      const selection = new oSelection();

      while (i < presetRegion.frame + presetRegion.length) {
        marker = Timeline.getFrameMarker(selection.selectedNodes[0].index, i);
        MessageLog.trace("preset region " + presetRegion.toString());
        MessageLog.trace("preset region " + presetRegion.constructor.name);
        if (marker) {
          center = i - presetRegion.frame;
          MessageLog.trace(JSON.stringify(marker, null, 2));
          break;
        }
        i++;
      }
      const presetName = presetRegion.name.replace(/\s+/g, '_');
      const dir = new QDir();
      if (!dir.exists(presetsPath)) {
        dir.mkpath(presetsPath);
      }
      const savePath = presetsPath + "/" + presetName + ".json";
      const data = {
        name: presetName,
        keyframes: keyframes,
        center: center
      }
      G.FileUtils.writeTo(savePath, JSON.stringify(data, null, 2));
      MessageLog.trace("Keyframes saved to: " + savePath);
    }

    const processAnimation = G.Utils.bind(function (presetRegion: any) {
      const selection = new oSelection(presetRegion.frame, presetRegion.frame + presetRegion.length - 1, undefined);
      const keyframes = serializeKeyFramesFromSplittedPath(selection);
      savePreset(presetRegion, keyframes, ANIMATION_PRESETS_PATH);
    }, this);

    const processCamera = G.Utils.bind(function (presetRegion: any) {
      const selection = new oSelection(presetRegion.frame, presetRegion.frame + presetRegion.length - 1, undefined);
      MessageLog.trace("SELECTION " + selection.toString());
      const keyframes = serializeKeyFramesFrom3DPath(selection);
      savePreset(presetRegion, keyframes, CAMERA_PRESETS_PATH);
    }, this);

    if (currentNode.getType() === "PEG") {
      MessageLog.trace("processing camera");
      presetRegions.forEach(processCamera);
      G.Utils.openInFileExplorer(CAMERA_PRESETS_PATH);
    }
    else {
      presetRegions.forEach(processAnimation);
      G.Utils.openInFileExplorer(ANIMATION_PRESETS_PATH);
    }
  } catch (e) {
    MessageLog.trace("Error saving presets: " + e.toString() + "\n" + e.lineNumber + "\n" + e.fileName);
  }
}

function saveKeyFramesFrom3DPathCurrent() {
  saveKeyFramesFrom3DPath();
}
function applyKeyFramesTo3DPathCurrent() {
  loadKeyFramesTo3DPath();
}

// Module-level variables
var presetCallbacks: { [presetName: string]: () => void } = {};

var presetSettings = {
  edgeSnappingThreshold: 16,
  edgeSnappingEnabled: true,
  maxEdgeSnappingSearch: 100,
};

this.__proto__.presetSettings = presetSettings;

function applyPreset(presetName: string, subFolder: string, applyFnName: string, label: string) {
  try {
    MessageLog.trace("applying");
    scene.beginUndoRedoAccum("Apply " + label + ": " + presetName);
    const path = specialFolders.userScripts + "/keyframe_presets/" + subFolder + presetName + ".json";

    var content = G.FileUtils.readFrom(path);

    if (!content) throw new Error("Preset file not found: " + path);
    
    const data = JSON.parse(content);
    let currentFrame = frame.current();
    const selection = G.GlobalTimeline.getSelection();

    if (presetSettings.edgeSnappingEnabled) 
      currentFrame = getSnappedFrame(currentFrame, selection, presetSettings);

    const trueStart = currentFrame - (data.center || 0);

    let selected = selection.selectedNodes;

    if (label === "camera preset") {
      MessageLog.trace("cameras");
      selected = [(G.LayerManager as _LayerManager).getNodeLayer("Top/Camera-P")];
    }

    // Use the currently selected nodes
    G.GlobalTimeline[applyFnName](new G.oSelection(trueStart, undefined, selected), data.keyframes);

    frame.setCurrent(trueStart);
    
    scene.endUndoRedoAccum();
    G.Utils.toast("Applied " + label + ": " + presetName, { x: 20, y: 20 }, 2000, "#333333");
  } catch (e) {
    MessageLog.trace("Error applying " + label + " '" + presetName + "': " + e.toString());
  }
}

function applyAnimationPreset(presetName: string) {
  MessageLog.trace("applying animation");
  applyPreset(presetName, "animation/", "applyKeyFramesToSplittedPath", "animation preset");
}

function applyCameraPreset(presetName: string) {
  applyPreset(presetName, "camera/", "applyKeyFramesTo3DPath", "camera preset");
}

function testApplyPanRightPreset() {
  applyCameraPreset("pan_right");
}

// Make functions globally accessible for callbacks
this.__proto__.applyPreset = applyPreset;
this.__proto__.applyAnimationPreset = applyAnimationPreset;
this.__proto__.applyCameraPreset = applyCameraPreset;

// Register all actions dynamically based on presets
function registerAllActions() {
  // Register standard actions
  registerAction({
    name: "Save All Presets",
    icon: "earth.png",
    callback: saveAllKeyframePresets,
    category: "custom"
  });

  // Register dynamic preset actions and store callbacks
  KEYFRAME_PRESETS.forEach(function(presetName, index) {
    const callback = function () { 
      MessageLog.trace("test");
      
      try {
        applyAnimationPreset(presetName); 
        MessageLog.trace("done") 
      }
      catch (e) {
        MessageLog.trace("error: " + e.toString());
      }
    };
    presetCallbacks[presetName] = callback;
    registerAction({
      name: presetName,
      icon: "earth.png",
      callback: callback,
      shortcut: index < 9 ? "Ctrl+" + (index + 1) : undefined,
      category: "Presets"
    });
  });

  CAMERA_PRESETS.forEach(function (presetName, index) {
    const callback = function () {
      try {
        applyCameraPreset(presetName);
      } catch (error) {
        MessageLog.trace("error: " + error.toString());
      } 
    };
    presetCallbacks[presetName] = callback;
    registerAction({
      name: presetName,
      icon: specialFolders.userScripts + "/icons/camera.png",
      callback: callback,
      shortcut: "none",
      category: "Camera Presets"
    });
  });

  // Finalize all toolbars after registering actions
  finalizeToolbars();
  
  // Test first preset
  // presetCallbacks["gentle_jump_bob"]();
  presetCallbacks["pan_down"]();
}
