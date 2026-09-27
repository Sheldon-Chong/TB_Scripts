include(specialFolders.userScripts + '/Tools/CameraSwipeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyShakeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyZoomTool.js');
include(specialFolders.userScripts + '/Tools/PositionDebugTool.js');
include('globals.js');

const KEYFRAME_PRESETS = [
  'u_bob',
  'u_bob_small',
  'left_dip_bob',
  'right_dip_bob',
  'jump_bob',
  'gentle_jump_bob',
  'shake',
  'walk_slow',
  'walk',
];
// Module-level variables
var presetCallbacks: { [presetName: string]: () => void } = {};

var presetSettings = {
  edgeSnappingThreshold: 16,
  edgeSnappingEnabled: true,
  maxEdgeSnappingSearch: 100,
};

this.__proto__.presetSettings = presetSettings;

function buildLoopingKeyframes(keyframes: any[], startFrame: number, endFrame: number): any[] {
  if (!keyframes.length || endFrame < startFrame) return keyframes;

  var patternEndFrame = 0;
  for (var i = 0; i < keyframes.length; i++) {
    patternEndFrame = Math.max(patternEndFrame, keyframes[i].frame);
  }

  var patternLength = patternEndFrame + 1;
  var repeated: any[] = [];
  var cycle = 0;

  while (startFrame + cycle * patternLength <= endFrame) {
    var cycleOffset = cycle * patternLength;
    for (var j = 0; j < keyframes.length; j++) {
      var keyframe = keyframes[j];
      var frameNumber = startFrame + cycleOffset + keyframe.frame;
      if (frameNumber > endFrame) continue;

      var repeatedKeyframe: any = {};
      for (var property in keyframe) {
        if (keyframe.hasOwnProperty(property)) {
          repeatedKeyframe[property] = keyframe[property];
        }
      }
      repeatedKeyframe.frame = cycleOffset + keyframe.frame;
      repeated.push(repeatedKeyframe);
    }
    cycle++;
  }

  return repeated;
}

this.__proto__.buildLoopingKeyframes = buildLoopingKeyframes;

function applyPreset(presetName: string, subFolder: string, applyFnName: string, label: string) {
  try {
    MessageLog.trace('applying');
    scene.beginUndoRedoAccum('Apply ' + label + ': ' + presetName);
    const path =
      'D:/YT projects/Coding/ToonBoom/keyframe_presets/' + subFolder + presetName + '.json';

    var content = G.FileUtils.readFrom(path);

    if (!content) throw new Error('Preset file not found: ' + path);

    const data = JSON.parse(content);
    let currentFrame = frame.current();
    const sel = G.TimelineKit.getSelection();

    if (presetSettings.edgeSnappingEnabled)
      currentFrame = G.FrameSnapping.getNearestBoundaryFrame(currentFrame);

    const trueStart = currentFrame - (data.center || 0);
    const keyframes = data.looping
      ? buildLoopingKeyframes(data.keyframes, trueStart, sel.endFrame)
      : data.keyframes;

    if (data.looping) {
      MessageLog.trace(
        `[Tools.ts] Looping ${data.keyframes.length} keyframes through frame ${sel.endFrame}`,
      );
    }

    let selected = sel.selectedNodes;

    if (label === 'camera preset') {
      MessageLog.trace('cameras');
      selected = [(G.LayerManager as _LayerManager).getNodeLayer('Top/Camera-P')];
    }

    // Use the currently selected nodes
    G.TimelineKit[applyFnName](new G.oSelection(trueStart, undefined, selected), keyframes);

    frame.setCurrent(trueStart);

    scene.endUndoRedoAccum();
    G.Utils.toast('Applied ' + label + ': ' + presetName, { x: 20, y: 20 }, 2000, '#333333');
  } catch (e) {
    MessageLog.trace(
      'Error applying ' +
        label +
        " '" +
        presetName +
        "': " +
        e.toString() +
        e.lineNumber +
        e.fileName,
    );
    scene.endUndoRedoAccum();
  }
}

function applyAnimationPreset(presetName: string) {
  MessageLog.trace('applying animation');
  applyPreset(presetName, 'animation/', 'applyKeyFramesToSplittedPath', 'animation preset');
}

function applyCameraPreset(presetName: string) {
  applyPreset(presetName, 'camera/', 'applyKeyFramesTo3DPath', 'camera preset');
}

function testApplyPanRightPreset() {
  applyCameraPreset('pan_right');
}

// Make functions globally accessible for callbacks
this.__proto__.applyPreset = applyPreset;
this.__proto__.applyAnimationPreset = applyAnimationPreset;
this.__proto__.applyCameraPreset = applyCameraPreset;

function registerAllTools() {
  registerCameraSwipeTool();
  registerApplyShakeTool();
  registerApplyZoomTool();

  registerAction({
    name: 'Previous Boundary Marker',
    icon: `${specialFolders.userScripts}\\script-icons\\previous_boundary.png`,
    callback: function () {
      G.FrameSnapping.gotoPreviousBoundaryMarker();
    },
    shortcut: 'Ctrl+Alt+Left',
    category: 'custom',
  });
  registerAction({
    name: 'Next Boundary Marker',
    icon: `${specialFolders.userScripts}\\script-icons\\next_boundary.png`,
    callback: function () {
      G.FrameSnapping.gotoNextBoundaryMarker();
    },
    shortcut: 'Ctrl+Alt+Right',
    category: 'custom',
  });
  registerAction({
    name: 'Empty',
    icon: 'earth.png',
    callback: function () {
      MessageLog.trace('Empty action triggered');
    },
    shortcut: 'Ctrl+Alt+R',
    category: 'custom',
  });
  // register a phony tool due to QT engine bug where running another file before
  // this one causes all tools to fail registration, unless this tool is registered

  registerAction({
    name: 'Boundary Snapping',
    icon: `${specialFolders.userScripts}\\script-icons\\snap_to_boundary.png`,
    checkable: true,
    isChecked: presetSettings.edgeSnappingEnabled,
    callback: function (_globals: any, action: any) {
      presetSettings.edgeSnappingEnabled = action.isChecked;
      MessageLog.trace('[Tools] Global boundary snapping: ' + presetSettings.edgeSnappingEnabled);
    },
    category: 'presets',
  });
  KEYFRAME_PRESETS.forEach(function (presetName, index) {
    const callback = function () {
      MessageLog.trace('test');

      try {
        applyAnimationPreset(presetName);
        MessageLog.trace('done');
      } catch (e) {
        MessageLog.trace('error: ' + e.toString());
      }
    };
    presetCallbacks[presetName] = callback;
    registerAction({
      name: presetName,
      icon: `${specialFolders.userScripts}/script-icons/${presetName}.png`,
      callback: callback,
      shortcut: index < 9 ? 'Ctrl+' + (index + 1) : undefined,
      category: 'Presets',
    });
  });

  updateToolbars();
}
