include('global-test.js');

include(specialFolders.userScripts + '/FrameSnapping.js');

include(specialFolders.userScripts + '/KeyframeGenerator.js');

include(specialFolders.userScripts + '/Tools/CameraSwipeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyShakeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyZoomTool.js');
include(specialFolders.userScripts + '/KeyframeProfiles.js');

type ApplyPresetFunction = 'applyKeyFramesToSplittedPath' | 'applyKeyFramesTo3DPath';

function createToolsKit(Core: HarmonyCore) {
  /*
   * Capture dependencies while Core is available
   * as a real local variable.
   */
  var FrameSnapping = getFrameSnappingKit(Core);

  var CameraSwipe = createCameraSwipe(Core);
  var CameraSwipeTool = createCameraSwipeToolKit(Core, CameraSwipe);
  var KeyframeGenerator = getKeyframeGeneratorKit(Core);
  var ApplyShakeTool = createApplyShakeToolKit(Core, KeyframeGenerator);
  var ApplyZoomTool = createApplyZoomToolKit(Core, KeyframeGenerator);

  var keyframePresets = [
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

  var presetCallbacks: {
    [presetName: string]: () => void;
  } = {};

  var presetSettings = {
    edgeSnappingThreshold: 16,
    edgeSnappingEnabled: true,
    maxEdgeSnappingSearch: 100,
  };

  var ToolsModule = {
    /*
     * Public state
     */
    presetSettings: presetSettings,

    presetCallbacks: presetCallbacks,

    buildLoopingKeyframes(keyframes: any[], startFrame: number, endFrame: number): any[] {
      if (!keyframes.length || endFrame < startFrame) {
        return keyframes;
      }

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

          if (frameNumber > endFrame) {
            continue;
          }

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
    },

    applyPreset(
      presetName: string,
      subFolder: string,
      applyFnName: ApplyPresetFunction,
      label: string,
    ): void {
      Core.MessageLog.trace('applying');

      Core.scene.beginUndoRedoAccum('Apply ' + label + ': ' + presetName);

      try {
        var path =
          Core.specialFolders.userScripts + '/keyframe_presets/' + subFolder + presetName + '.json';

        Core.MessageLog.trace('[Tools.ts] Applying preset from path: ' + path);

        var content = Core.FileUtils.readFrom(path);

        if (!content) {
          throw new Error('Preset file not found: ' + path);
        }

        var data = Core.JSON.parse(content);

        var currentFrame = Core.frame.current();

        var sel = Core.TimelineKit.getSelection();

        if (presetSettings.edgeSnappingEnabled) {
          currentFrame = FrameSnapping.getNearestBoundaryFrame(currentFrame);
        }

        var trueStart = currentFrame - (data.center || 0);

        var keyframes = data.looping
          ? ToolsModule.buildLoopingKeyframes(data.keyframes, trueStart, sel.endFrame)
          : data.keyframes;

        if (data.looping) {
          Core.MessageLog.trace(
            '[Tools.ts] Looping ' +
              data.keyframes.length +
              ' keyframes through frame ' +
              sel.endFrame,
          );
        }

        var selected = sel.selectedNodes;

        if (label === 'camera preset') {
          Core.MessageLog.trace('cameras');

          selected = [Core.LayerManager.getNodeLayer('Top/Camera-P')];
        }

        var presetSelection = new Core.TimelineKit.oSelection(trueStart, undefined, selected);

        /*
         * Dynamically call the requested
         * TimelineKit application method.
         */
        Core.TimelineKit[applyFnName](presetSelection, keyframes);

        Core.frame.setCurrent(trueStart);

        Core.Utils.toast(
          'Applied ' + label + ': ' + presetName,

          {
            x: 20,
            y: 20,
          },

          2000,

          '#333333',
        );
      } catch (e: any) {
        Core.MessageLog.trace(
          'Error applying ' +
            label +
            " '" +
            presetName +
            "': " +
            e.toString() +
            ' ' +
            e.lineNumber +
            ' ' +
            e.fileName,
        );
      } finally {
        Core.scene.endUndoRedoAccum();
      }
    },

    applyAnimationPreset(presetName: string): void {
      Core.MessageLog.trace('applying animation');

      ToolsModule.applyPreset(
        presetName,
        'animation/',
        'applyKeyFramesToSplittedPath',
        'animation preset',
      );
    },

    applyCameraPreset(presetName: string): void {
      ToolsModule.applyPreset(presetName, 'camera/', 'applyKeyFramesTo3DPath', 'camera preset');
    },

    testApplyPanRightPreset(): void {
      ToolsModule.applyCameraPreset('pan_right');
    },

    loopCurrentSelection(): null {
      Core.scene.saveAll();

      Core.scene.beginUndoRedoAccum('Duplicate Drawing');

      try {
        Core.MessageLog.clearLog();

        var sel = Core.TimelineKit.getSelection();

        for (var nodeIndex = 0; nodeIndex < sel.selectedNodes.length; nodeIndex++) {
          var selNode = sel.selectedNodes[nodeIndex];

          if (!(selNode instanceof Core.oDrawingNode)) {
            continue;
          }

          var elementCol = selNode.drawingElement;

          try {
            var lastValidFrame = sel.startFrame - 1;

            for (var frameNumber = sel.startFrame; frameNumber <= sel.endFrame; frameNumber++) {
              var keyframe = elementCol.getKeyframe(frameNumber);

              if (keyframe) {
                lastValidFrame = frameNumber;
              }
            }

            if (lastValidFrame >= sel.startFrame && lastValidFrame < sel.endFrame) {
              var sourceSelection = new Core.TimelineKit.oSelection(sel.startFrame, lastValidFrame);

              var pasteSelection = new Core.TimelineKit.oSelection(
                lastValidFrame + 1,

                sel.endFrame,
              );

              elementCol.loopKeyframes(sourceSelection, pasteSelection);
            }

            var repeatSequenceLength = lastValidFrame - sel.startFrame + 1;

            /*
             * Avoid an infinite loop if
             * no valid drawing exists.
             */
            if (repeatSequenceLength <= 0) {
              continue;
            }

            for (
              var markerFrame = sel.startFrame;
              markerFrame <= sel.endFrame;
              markerFrame += repeatSequenceLength
            ) {
              Core.Timeline.createFrameMarker(selNode.index, 'Red', markerFrame);
            }
          } catch (error: any) {
            Core.MessageLog.trace('[Test-duplicate-drawing.ts] Error: ' + error.message);
          }
        }
      } finally {
        Core.scene.endUndoRedoAccum();
      }

      return null;
    },

    registerAllTools(): void {
      /*
       * CameraSwipe has already been constructed
       * with this Core and is safely captured.
       */
      CameraSwipeTool.register();

      ApplyShakeTool.register();
      ApplyZoomTool.register();

      Core.Toolbar.registerAction({
        name: 'Previous Boundary Marker',

        icon: Core.specialFolders.userScripts + '/script-icons/previous_boundary.png',

        callback: function () {
          FrameSnapping.gotoPreviousBoundaryMarker();
        },

        shortcut: 'Ctrl+Alt+Left',

        category: 'custom',
      });

      Core.Toolbar.registerAction({
        name: 'Next Boundary Marker',

        icon: Core.specialFolders.userScripts + '/script-icons/next_boundary.png',

        callback: function () {
          FrameSnapping.gotoNextBoundaryMarker();
        },

        shortcut: 'Ctrl+Alt+Right',

        category: 'custom',
      });

      Core.Toolbar.registerAction({
        name: 'Empty',

        icon: 'earth.png',

        callback: function () {
          Core.MessageLog.trace('Empty action triggered');
        },

        shortcut: 'Ctrl+Alt+R',

        category: 'custom',
      });

      Core.Toolbar.registerAction({
        name: 'Boundary Snapping',

        icon: Core.specialFolders.userScripts + '/script-icons/snap_to_boundary.png',

        checkable: true,

        isChecked: presetSettings.edgeSnappingEnabled,

        callback: function (action: any) {
          presetSettings.edgeSnappingEnabled = action.isChecked;

          Core.MessageLog.trace(
            '[Tools] Global boundary snapping: ' + presetSettings.edgeSnappingEnabled,
          );
        },

        category: 'presets',
      });

      keyframePresets.forEach(function (presetName: string, index: number) {
        /*
         * presetName is local to this invocation,
         * so the delayed toolbar callback captures
         * the correct preset name.
         */
        var callback = function () {
          Core.MessageLog.trace('Applying preset: ' + presetName);

          try {
            ToolsModule.applyAnimationPreset(presetName);

            Core.MessageLog.trace('Preset complete: ' + presetName);
          } catch (e: any) {
            Core.MessageLog.trace('Preset error: ' + e.toString());
          }
        };

        presetCallbacks[presetName] = callback;

        Core.Toolbar.registerAction({
          name: presetName,

          icon: Core.specialFolders.userScripts + '/script-icons/' + presetName + '.png',

          callback: callback,

          shortcut: index < 9 ? 'Ctrl+' + (index + 1) : undefined,

          category: 'Presets',
        });
      });

      Core.Toolbar.registerAction({
        name: 'Loop Current Selection',

        icon: Core.specialFolders.userScripts + '/script-icons/loop_selection.png',

        callback: function () {
          ToolsModule.loopCurrentSelection();
        },

        shortcut: 'Ctrl+Alt+L',

        category: 'custom',
      });

      /*
       * Register all collected toolbar definitions
       * after their actions/buttons have been added.
       */
      Core.Toolbar.updateToolbars();
    },
  };

  return ToolsModule;
}

/*
 * Inferred public type of the Tools singleton.
 */
type ToolsKit = ReturnType<typeof createToolsKit>;

/*
 * Retrieve or lazily construct the one persistent
 * ToolsKit associated with Core.
 */
function getTools(Core: HarmonyCore): ToolsKit {
  var Runtime: any = Core;

  if (!Runtime.ToolsKit) {
    Runtime.ToolsKit = createToolsKit(Runtime);
  }

  return Runtime.ToolsKit as ToolsKit;
}

/*
 * Toon Boom entry point.
 *
 * Core is obtained here as a genuine local variable,
 * then captured by all factories/callbacks created
 * beneath this call.
 */
function registerAllTools(): void {
  var Core = getCore();

  var ToolsKit = getTools(Core);

  ToolsKit.registerAllTools();
}
