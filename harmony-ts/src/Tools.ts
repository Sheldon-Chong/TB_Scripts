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
    smartPasteEnabled: false,
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
        var path = `${Core.specialFolders.userScripts}/keyframe_presets/${subFolder}${presetName}.json`;
        Core.MessageLog.trace('[Tools.ts] Applying preset from path: ' + path);

        var content = Core.FileUtils.readFrom(path);
        if (!content) throw new Error('Preset file not found: ' + path);

        var presetData = Core.JSON.parse(content);
        var currentFrame = Core.frame.current();
        var sel = Core.TimelineKit.getSelection();
        if (presetSettings.edgeSnappingEnabled) {
          currentFrame = FrameSnapping.getNearestBoundaryFrame(currentFrame);
        }
        if (presetSettings.smartPasteEnabled) {
          Core.MessageLog.trace(
            '[Tools.ts] Smart paste enabled, adjusting selection to current frame: ' + currentFrame,
          );
        }
        var trueStart = currentFrame - (presetData.center || 0);
        var keyframes = presetData.looping
          ? ToolsModule.buildLoopingKeyframes(presetData.keyframes, trueStart, sel.endFrame)
          : presetData.keyframes;
        if (presetData.looping) {
          Core.MessageLog.trace(
            '[Tools.ts] Looping ' +
              presetData.keyframes.length +
              ' keyframes through frame ' +
              sel.endFrame,
          );
        }
        var selected = sel.selectedNodes;
        if (label === 'camera preset') {
          selected = [Core.LayerManager.getNodeLayer('Top/Camera-P')];
        }
        const drawingNode = sel.selectedNodes[0] as CoreInstance<'oDrawingNode'>;
        MessageLog.trace(`[Tools.ts]  selected ${drawingNode.name}`);

        const drawingElementCol = drawingNode.getColumn('DRAWING.ELEMENT');
        const currentDrawingType = drawingElementCol.getDrawingType(sel.startFrame);

        MessageLog.trace(`[Tools.ts] Current Drawing Type${currentDrawingType}`);

        if (presetSettings.smartPasteEnabled) {
          // HARDCODED 16 nodes
          for (var nodeIndex = 1; nodeIndex < 17; nodeIndex++) {
            const nodePath = 'Top/' + nodeIndex;
            const drawingElementCol =
              Core.LayerManager.getNodeLayer(nodePath).getColumn('DRAWING.ELEMENT');
            MessageLog.trace(`[Tools.ts] ${drawingElementCol}`);

            const prevDrawingType = drawingElementCol.getDrawingType(currentFrame - 1);
            const nextDrawingType = drawingElementCol.getDrawingType(currentFrame);
            // MessageLog.trace(
            //   `[Tools.ts] ${nodePath} | Prev: ${prevDrawingType} | Next: ${nextDrawingType}`,
            // );

            const keyframesFirstHalf = keyframes.filter((kf) => kf.frame < keyframes.length / 2);
            const keyframesSecondHalf = keyframes.filter((kf) => kf.frame >= keyframes.length / 2);

            if (prevDrawingType === currentDrawingType) {
              MessageLog.trace(`[Tools.ts] ${nodePath} prev match`);
              const firstHalfSelection = new Core.oSelection(trueStart, undefined, [
                Core.LayerManager.getNodeLayer(nodePath),
              ]);
              Core.TimelineKit[applyFnName](firstHalfSelection, keyframesFirstHalf, false);
            }
            if (nextDrawingType === currentDrawingType) {
              MessageLog.trace(`[Tools.ts] ${nodePath} next match`);
              const secondHalfSelection = new Core.oSelection(trueStart, undefined, [
                Core.LayerManager.getNodeLayer(nodePath),
              ]);
              Core.TimelineKit[applyFnName](secondHalfSelection, keyframesSecondHalf, false);
            }

            // var presetSelection = new Core.oSelection(trueStart, undefined, [
            //   new Core.oDrawingNode(-1, -1, 'Top/16', '16'),
            //   new Core.oDrawingNode(-1, -1, 'Top/13', '13'),
            // ]);
            // Core.TimelineKit[applyFnName](presetSelection, [keyframes[0]], false);
          }
        } else {
          var presetSelection = new Core.oSelection(trueStart, undefined, selected);
          Core.TimelineKit[applyFnName](presetSelection, keyframes, true);
        }

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

    runCycle(): null {
      var sel = Core.TimelineKit.getSelection();
      var drawingNodes: any[] = [];

      /*
       * oDrawingNode as a TypeScript alias is type-only.
       *
       * instanceof needs the real runtime constructor.
       */
      for (var nodeIndex = 0; nodeIndex < sel.selectedNodes.length; nodeIndex++) {
        var selectedNode = sel.selectedNodes[nodeIndex];
        if (selectedNode instanceof Core.oDrawingNode) {
          drawingNodes.push(selectedNode);
        }
      }

      if (!drawingNodes.length) {
        Core.MessageLog.trace('No selected drawing nodes.');
        return;
      }

      Core.scene.saveAll();

      Core.scene.beginUndoRedoAccum('Duplicate Drawing');

      try {
        for (var nodeIndex = 0; nodeIndex < drawingNodes.length; nodeIndex++) {
          var drawingElement = drawingNodes[nodeIndex].drawingElement;
          var drawing1 = drawingElement.getKeyframe(sel.startFrame);
          var drawing2 = drawingElement.getKeyframe(sel.startFrame + 1);
          var drawing3 = drawingElement.getKeyframe(sel.startFrame + 2);

          Core.MessageLog.trace(
            '[Test-duplicate-drawing.ts] ' +
              drawing1 +
              '\n, ' +
              drawing2 +
              '\n, ' +
              drawing3 +
              '\n',
          );

          var copyOrClearDrawing = function (drawing: any, destinationFrame: number): void {
            if (drawing) {
              drawingElement.copyDrawingTo(drawing, destinationFrame);
            } else {
              drawingElement.setKeyFrame(destinationFrame, '');
            }
          };

          copyOrClearDrawing(drawing1, sel.startFrame + 1);
          copyOrClearDrawing(drawing1, sel.startFrame + 2);
          copyOrClearDrawing(drawing2, sel.startFrame + 3);
          copyOrClearDrawing(drawing3, sel.startFrame + 4);
          copyOrClearDrawing(drawing3, sel.startFrame + 5);
          copyOrClearDrawing(drawing3, sel.startFrame + 6);
          copyOrClearDrawing(drawing2, sel.startFrame + 7);
        }

        Core.scene.saveAll();
      } finally {
        Core.scene.endUndoRedoAccum();
      }

      /*
       * Everything referenced here is a true lexical
       * capture and survives the delayed callback.
       */
      var test = function (): void {
        Core.scene.beginUndoRedoAccum('Translate Drawing Strokes');

        Core.MessageLog.trace('[Test-duplicate-drawing.ts] test function called');
        try {
          var translateIfDrawing = function (drawingNode: any, frame: number): void {
            var drawing = drawingNode.drawingElement.getKeyframe(frame);
            if (!drawing) {
              Core.MessageLog.trace(
                `[Test-duplicate-drawing.ts] skipping empty drawing at ${drawingNode.nodePath}:${frame}`,
              );
              return;
            }

            try {
              Core.DrawingDataKit.translateDrawingStrokes(
                {
                  frame: frame,
                  node: drawingNode.nodePath,
                },

                {
                  x: 0,
                  y: 50,
                },
              );
            } catch (error: any) {
              Core.MessageLog.trace(
                '[Test-duplicate-drawing.ts]>>> Error translating ' +
                  drawingNode.nodePath +
                  ':' +
                  frame +
                  ' ' +
                  error.message +
                  ' ' +
                  error.lineNumber +
                  ' ' +
                  error.fileName,
              );
            }
          };

          for (var nodeIndex = 0; nodeIndex < drawingNodes.length; nodeIndex++) {
            var drawingNode = drawingNodes[nodeIndex];
            Core.MessageLog.trace(
              `[Test-duplicate-drawing.ts] translating ${drawingNode.nodePath}`,
            );
            translateIfDrawing(drawingNode, sel.startFrame + 1);
            translateIfDrawing(drawingNode, sel.startFrame + 5);
          }
        } catch (error: any) {
          Core.MessageLog.trace(
            '[Test-duplicate-drawing.ts]>>> Error: ' +
              error.message +
              ' ' +
              error.lineNumber +
              ' ' +
              error.fileName,
          );
        } finally {
          Core.scene.endUndoRedoAccum();
        }
      };

      var timer = new Core.QTimer();

      timer.singleShot = true;

      timer.timeout.connect(test);

      timer.start(500);
      // Core.scene.beginUndoRedoAccum('Set Start/End Frame');

      Core.scene.setStartFrame(sel.startFrame);
      Core.scene.setStopFrame(sel.startFrame + 7);
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
              var sourceSelection = new Core.oSelection(sel.startFrame, lastValidFrame);
              var pasteSelection = new Core.oSelection(lastValidFrame + 1, sel.endFrame);
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
        category: 'Navigation',
      });
      Core.Toolbar.registerAction({
        name: 'Next Boundary Marker',
        icon: Core.specialFolders.userScripts + '/script-icons/next_boundary.png',
        callback: function () {
          FrameSnapping.gotoNextBoundaryMarker();
        },
        shortcut: 'Ctrl+Alt+Right',
        category: 'Navigation',
      });
      // Core.Toolbar.registerAction({
      //   name: 'Empty',
      //   icon: 'earth.png',
      //   callback: function () {
      //     Core.MessageLog.trace('Empty action triggered');
      //   },
      //   shortcut: 'Ctrl+Alt+R',
      //   category: 'custom',
      // });
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
        category: 'Presets',
      });

      Core.Toolbar.registerAction({
        name: 'Smart Paste',
        icon: Core.specialFolders.userScripts + '/script-icons/smart_paste.png',
        checkable: true,
        isChecked: presetSettings.smartPasteEnabled,
        callback: function (action: any) {
          presetSettings.smartPasteEnabled = action.isChecked;
          Core.MessageLog.trace('[Tools] Global smart paste: ' + presetSettings.smartPasteEnabled);
        },
        category: 'Presets',
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
          icon: `${Core.specialFolders.userScripts}/script-icons/${presetName}.png`,
          callback: callback,
          shortcut: index < 9 ? 'Ctrl+' + (index + 1) : undefined,
          category: 'Presets',
        });
      });
      Core.Toolbar.registerAction({
        name: 'Loop Selected Frames',
        icon: `${Core.specialFolders.userScripts}/script-icons/loop.png`,
        callback: function () {
          ToolsModule.loopCurrentSelection();
        },
        shortcut: 'Ctrl+Alt+L',
        category: 'Animation Tools',
      });
      Core.Toolbar.registerAction({
        name: 'runCycle',
        icon: `${Core.specialFolders.userScripts}/script-icons/run_cycle.png`,
        callback: function () {
          try {
            ToolsModule.runCycle();
          } catch (error) {
            MessageLog.trace(
              `[Tools.ts] ${error.message} | ${error.fileName} | ${error.lineNumber}`,
            );
          }
        },
        shortcut: 'Ctrl+Alt+C',
        category: 'Animation Tools',
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
