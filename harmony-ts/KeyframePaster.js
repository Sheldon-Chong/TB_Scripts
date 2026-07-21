include("globals.js");
include(specialFolders.userScripts + "/keyframePaster/edgeSnappingPreview.js");
var CAMERA_PRESETS_PATH = "D:/YT projects/Coding/ToonBoom/keyframe_presets/camera";
var ANIMATION_PRESETS_PATH = "D:/YT projects/Coding/ToonBoom/keyframe_presets/animation";
var KEYFRAME_PRESETS = [
    "gentle_jump_bob",
    "jump_bob",
    "left_dip_bob",
    "right_dip_bob",
    "shake",
    "u_bob_small",
    "u_bob",
    "walk_slow",
    "walk"
];
var CAMERA_PRESETS = [
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
];
function saveAllKeyframePresets() {
    try {
        var presetRegions = TimelineMarker.getAllMarkers();
        var currentNode = G.GlobalTimeline.getSelection().selectedNodes[0];
        function savePreset(presetRegion, keyframes, presetsPath) {
            var i = presetRegion.frame;
            var marker = null;
            var center = null;
            var selection = new oSelection();
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
            var presetName = presetRegion.name.replace(/\s+/g, '_');
            var dir = new QDir();
            if (!dir.exists(presetsPath)) {
                dir.mkpath(presetsPath);
            }
            var savePath = presetsPath + "/" + presetName + ".json";
            var data = {
                name: presetName,
                keyframes: keyframes,
                center: center
            };
            G.FileUtils.writeTo(savePath, JSON.stringify(data, null, 2));
            MessageLog.trace("Keyframes saved to: " + savePath);
        }
        var processAnimation = G.Utils.bind(function (presetRegion) {
            var selection = new oSelection(presetRegion.frame, presetRegion.frame + presetRegion.length - 1, undefined);
            var keyframes = serializeKeyFramesFromSplittedPath(selection);
            savePreset(presetRegion, keyframes, ANIMATION_PRESETS_PATH);
        }, this);
        var processCamera = G.Utils.bind(function (presetRegion) {
            var selection = new oSelection(presetRegion.frame, presetRegion.frame + presetRegion.length - 1, undefined);
            MessageLog.trace("SELECTION " + selection.toString());
            var keyframes = serializeKeyFramesFrom3DPath(selection);
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
    }
    catch (e) {
        MessageLog.trace("Error saving presets: " + e.toString() + "\n" + e.lineNumber + "\n" + e.fileName);
    }
}
function saveKeyFramesFrom3DPathCurrent() {
    saveKeyFramesFrom3DPath();
}
function applyKeyFramesTo3DPathCurrent() {
    loadKeyFramesTo3DPath();
}
var presetCallbacks = {};
var presetSettings = {
    edgeSnappingThreshold: 16,
    edgeSnappingEnabled: true,
    maxEdgeSnappingSearch: 100,
};
this.__proto__.presetSettings = presetSettings;
function applyPreset(presetName, subFolder, applyFnName, label) {
    try {
        MessageLog.trace("applying");
        scene.beginUndoRedoAccum("Apply " + label + ": " + presetName);
        var path = "D:/YT projects/Coding/ToonBoom/keyframe_presets/" + subFolder + presetName + ".json";
        var content = G.FileUtils.readFrom(path);
        if (!content)
            throw new Error("Preset file not found: " + path);
        var data = JSON.parse(content);
        var currentFrame = frame.current();
        var selection_1 = G.GlobalTimeline.getSelection();
        if (presetSettings.edgeSnappingEnabled)
            currentFrame = getSnappedFrame(currentFrame, selection_1, presetSettings);
        var trueStart = currentFrame - (data.center || 0);
        var selected = selection_1.selectedNodes;
        if (label === "camera preset") {
            MessageLog.trace("cameras");
            selected = [G.LayerManager.getNodeLayer("Top/Camera-P")];
        }
        G.GlobalTimeline[applyFnName](new G.oSelection(trueStart, undefined, selected), data.keyframes);
        frame.setCurrent(trueStart);
        scene.endUndoRedoAccum();
        G.Utils.toast("Applied " + label + ": " + presetName, { x: 20, y: 20 }, 2000, "#333333");
    }
    catch (e) {
        MessageLog.trace("Error applying " + label + " '" + presetName + "': " + e.toString());
    }
}
function applyAnimationPreset(presetName) {
    MessageLog.trace("applying animation");
    applyPreset(presetName, "animation/", "applyKeyFramesToSplittedPath", "animation preset");
}
function applyCameraPreset(presetName) {
    applyPreset(presetName, "camera/", "applyKeyFramesTo3DPath", "camera preset");
}
function testApplyPanRightPreset() {
    applyCameraPreset("pan_right");
}
this.__proto__.applyPreset = applyPreset;
this.__proto__.applyAnimationPreset = applyAnimationPreset;
this.__proto__.applyCameraPreset = applyCameraPreset;
function registerAllActions() {
    registerAction({
        name: "Save All Presets",
        icon: "earth.png",
        callback: saveAllKeyframePresets,
        category: "custom"
    });
    KEYFRAME_PRESETS.forEach(function (presetName, index) {
        var callback = function () {
            MessageLog.trace("test");
            try {
                applyAnimationPreset(presetName);
                MessageLog.trace("done");
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
        var callback = function () {
            try {
                applyCameraPreset(presetName);
            }
            catch (error) {
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
    finalizeToolbars();
    presetCallbacks["pan_down"]();
}
