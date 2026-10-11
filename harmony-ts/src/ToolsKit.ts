// ToolsKit.ts

type ApplyPresetFunction = 'applyKeyFramesToSplittedPath' | 'applyKeyFramesTo3DPath';

interface PresetSettings {
  edgeSnappingThreshold: number;
  edgeSnappingEnabled: boolean;
  maxEdgeSnappingSearch: number;
  smartPasteEnabled: boolean;
}

interface ToolsKitDependencies {
  getFrameSnappingKit: typeof getFrameSnappingKit;
  createCameraSwipe: typeof createCameraSwipe;
  createCameraSwipeToolKit: typeof createCameraSwipeToolKit;
  getKeyframeGeneratorKit: typeof getKeyframeGeneratorKit;
  createApplyShakeToolKit: typeof createApplyShakeToolKit;
  createApplyZoomToolKit: typeof createApplyZoomToolKit;
}

(function () {
  // Your existing createToolsKit implementation...
})();

// Keep your existing PresetSettings interface.
// Keep your existing ToolsKitDependencies interface.

(function () {
  var shared = Function('return this;')().__proto__;

  shared.__TBFactories = shared.__TBFactories || {};

  /*
   * IMPORTANT:
   *
   * createToolsKit is declared INSIDE this closure.
   */
  function createToolsKit(
    $: HarmonyCore,
    deps: ToolsKitDependencies,
    existingSettings?: PresetSettings,
  ) {
    var FrameSnapping = deps.getFrameSnappingKit($);
    /*
     * These tools only need to be constructed
     * during initial registration.
     */
    var CameraSwipeTool: any = null;
    var ApplyShakeTool: any = null;
    var ApplyZoomTool: any = null;

    /*
     * existingSettings is only supplied when
     * rebuilding an existing ToolsKit.
     *
     * Skip toolbar tool construction during reload.
     */
    if (!existingSettings) {
      var CameraSwipe = deps.createCameraSwipe($);

      CameraSwipeTool = deps.createCameraSwipeToolKit($, CameraSwipe);

      var KeyframeGenerator = deps.getKeyframeGeneratorKit($);

      ApplyShakeTool = deps.createApplyShakeToolKit($, KeyframeGenerator);

      ApplyZoomTool = deps.createApplyZoomToolKit($, KeyframeGenerator);
    }
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
    var presetSettings: PresetSettings = existingSettings || {
      edgeSnappingThreshold: 16,
      edgeSnappingEnabled: true,
      maxEdgeSnappingSearch: 100,
      smartPasteEnabled: false,
    };
    var ToolsModule = {
      /*
       * Public state
       */
      gotoPreviousBoundaryMarker(): void {
        FrameSnapping.gotoPreviousBoundaryMarker();
      },

      gotoNextBoundaryMarker(): void {
        FrameSnapping.gotoNextBoundaryMarker();
      },
      setBoundarySnapping(action: any): void {
        presetSettings.edgeSnappingEnabled = action.isChecked;

        $.log('[Tools] Boundary snapping: ' + presetSettings.edgeSnappingEnabled);
      },

      setSmartPaste(action: any): void {
        presetSettings.smartPasteEnabled = action.isChecked;

        $.log('[Tools] Smart paste: ' + presetSettings.smartPasteEnabled);
      },
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
        $.MessageLog.trace('applying');
        $.scene.beginUndoRedoAccum('Apply ' + label + ': ' + presetName);
        try {
          var path = `${$.specialFolders.userScripts}/keyframe_presets/${subFolder}${presetName}.json`;
          $.MessageLog.trace('[Tools.ts] Applying preset from path: ' + path);

          var content = $.FileUtils.readFrom(path);
          if (!content) throw new Error('Preset file not found: ' + path);

          var presetData = $.JSON.parse(content);
          var currentFrame = $.frame.current();
          var sel = $.TimelineKit.getSelection();
          if (presetSettings.edgeSnappingEnabled) {
            currentFrame = FrameSnapping.getNearestBoundaryFrame(currentFrame);
          }
          if (presetSettings.smartPasteEnabled) {
            $.MessageLog.trace(
              '[Tools.ts] Smart paste enabled, adjusting selection to current frame: ' +
                currentFrame,
            );
          }
          var trueStart = currentFrame - (presetData.center || 0);
          var keyframes = presetData.looping
            ? ToolsModule.buildLoopingKeyframes(presetData.keyframes, trueStart, sel.endFrame)
            : presetData.keyframes;
          if (presetData.looping) {
            $.MessageLog.trace(
              '[Tools.ts] Looping ' +
                presetData.keyframes.length +
                ' keyframes through frame ' +
                sel.endFrame,
            );
          }
          var selected = sel.selectedNodes;
          if (label === 'camera preset') {
            selected = [$.LayerManager.getNodeLayer('Top/Camera-P')];
          }
          const drawingNode = sel.selectedNodes[0] as CoreInstance<'oDrawingNode'>;
          $.log(`[Tools.ts]  selected ${drawingNode.name}`);

          const drawingElementCol = drawingNode.getColumn('DRAWING.ELEMENT');
          const currentDrawingType = drawingElementCol.getDrawingType(sel.startFrame);

          $.log(`[Tools.ts] Current Drawing Type${currentDrawingType}`);

          if (presetSettings.smartPasteEnabled) {
            // HARDCODED 16 nodes
            for (var nodeIndex = 1; nodeIndex < 17; nodeIndex++) {
              const nodePath = 'Top/' + nodeIndex;
              const drawingElementCol =
                $.LayerManager.getNodeLayer(nodePath).getColumn('DRAWING.ELEMENT');
              $.log(`[Tools.ts] ${drawingElementCol}`);

              const prevDrawingType = drawingElementCol.getDrawingType(currentFrame - 1);
              const nextDrawingType = drawingElementCol.getDrawingType(currentFrame);

              const keyframesFirstHalf = keyframes.filter((kf) => kf.frame < keyframes.length / 2);
              const keyframesSecondHalf = keyframes.filter(
                (kf) => kf.frame >= keyframes.length / 2,
              );

              if (prevDrawingType === currentDrawingType) {
                $.log(`[Tools.ts] ${nodePath} prev match`);
                const firstHalfSelection = new $.oSelection(trueStart, undefined, [
                  $.LayerManager.getNodeLayer(nodePath),
                ]);
                $.TimelineKit[applyFnName](firstHalfSelection, keyframesFirstHalf, false);
              }
              if (nextDrawingType === currentDrawingType) {
                $.log(`[Tools.ts] ${nodePath} next match`);
                const secondHalfSelection = new $.oSelection(trueStart, undefined, [
                  $.LayerManager.getNodeLayer(nodePath),
                ]);
                $.TimelineKit[applyFnName](secondHalfSelection, keyframesSecondHalf, false);
              }
            }
          } else {
            var presetSelection = new $.oSelection(trueStart, undefined, selected);
            $.TimelineKit[applyFnName](presetSelection, keyframes, true);
          }

          $.frame.setCurrent(trueStart);
          $.Utils.toast(
            'Applied ' + label + ': ' + presetName,
            {
              x: 20,
              y: 20,
            },
            2000,
            '#333333',
          );
        } catch (e: any) {
          $.MessageLog.trace(
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
          $.scene.endUndoRedoAccum();
        }
      },
      applyAnimationPreset(presetName: string): void {
        $.MessageLog.trace('applying animation');
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
        var sel = $.TimelineKit.getSelection();
        var drawingNodes: any[] = [];

        /*
         * oDrawingNode as a TypeScript alias is type-only.
         *
         * instanceof needs the real runtime constructor.
         */
        for (var nodeIndex = 0; nodeIndex < sel.selectedNodes.length; nodeIndex++) {
          var selectedNode = sel.selectedNodes[nodeIndex];
          if (selectedNode instanceof $.oDrawingNode) {
            drawingNodes.push(selectedNode);
          }
        }

        if (!drawingNodes.length) {
          $.MessageLog.trace('No selected drawing nodes.');
          return;
        }

        $.scene.saveAll();

        $.scene.beginUndoRedoAccum('Duplicate Drawing');

        try {
          for (var nodeIndex = 0; nodeIndex < drawingNodes.length; nodeIndex++) {
            var drawingElement = drawingNodes[nodeIndex].drawingElement;
            var drawing1 = drawingElement.getKeyframe(sel.startFrame);
            var drawing2 = drawingElement.getKeyframe(sel.startFrame + 1);
            var drawing3 = drawingElement.getKeyframe(sel.startFrame + 2);

            $.MessageLog.trace(
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

          $.scene.saveAll();
        } finally {
          $.scene.endUndoRedoAccum();
        }

        /*
         * Everything referenced here is a true lexical
         * capture and survives the delayed callback.
         */
        var test = function (): void {
          $.log('testing');
          $.scene.beginUndoRedoAccum('Translate Drawing Strokes');

          $.log('[Test-duplicate-drawing.ts] test function called');
          try {
            var translateIfDrawing = function (drawingNode: any, frame: number): void {
              var drawing = drawingNode.drawingElement.getKeyframe(frame);
              if (!drawing) {
                $.log(
                  `[Test-duplicate-drawing.ts] skipping empty drawing at ${drawingNode.nodePath}:${frame}`,
                );
                return;
              }

              try {
                $.DrawingDataKit.translateDrawingStrokes(
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
                $.log(
                  `[Test-duplicate-drawing.ts]>>> Error translating ${drawingNode.nodePath}:${frame} ${error.message} ${error.lineNumber} ${error.fileName}`,
                );
              }
            };

            for (var nodeIndex = 0; nodeIndex < drawingNodes.length; nodeIndex++) {
              var drawingNode = drawingNodes[nodeIndex];
              $.log(`[Test-duplicate-drawing.ts] translating ${drawingNode.nodePath}`);
              translateIfDrawing(drawingNode, sel.startFrame + 1);
              translateIfDrawing(drawingNode, sel.startFrame + 5);
            }
          } catch (error: any) {
            $.log(
              `[Test-duplicate-drawing.ts]>>> Error: ${error.message} ${error.lineNumber} ${error.fileName}`,
            );
          } finally {
            $.scene.endUndoRedoAccum();
          }
        };
        $.Timer.createTimer({
          startTimeMs: 500,
          callback: test,
        });

        // var timer = new $.QTimer();

        // timer.singleShot = true;

        // timer.timeout.connect(test);

        // timer.start(500);
        // Core.scene.beginUndoRedoAccum('Set Start/End Frame');

        $.scene.setStartFrame(sel.startFrame);
        $.scene.setStopFrame(sel.startFrame + 7);
      },

      loopCurrentSelection(): null {
        $.scene.saveAll();
        $.scene.beginUndoRedoAccum('Duplicate Drawing');
        try {
          $.MessageLog.clearLog();
          $.log('[Tools.ts] Looping current selection');
          var sel = $.TimelineKit.getSelection();
          for (var nodeIndex = 0; nodeIndex < sel.selectedNodes.length; nodeIndex++) {
            var selNode = sel.selectedNodes[nodeIndex];
            if (!(selNode instanceof $.oDrawingNode)) {
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
                var sourceSelection = new $.oSelection(sel.startFrame, lastValidFrame);
                var pasteSelection = new $.oSelection(lastValidFrame + 1, sel.endFrame);
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
                $.Timeline.createFrameMarker(selNode.index, 'Red', markerFrame);
              }
            } catch (error: any) {
              $.log(
                `[Test-duplicate-drawing.ts] Error: ${error.message} ${error.lineNumber} ${error.fileName}`,
              );
            }
          }
        } finally {
          $.scene.endUndoRedoAccum();
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
        $.Toolbar.registerAction({
          name: 'Previous Boundary Marker',
          icon: $.specialFolders.userScripts + '/script-icons/previous_boundary.png',
          handler: 'ToolsKit.gotoPreviousBoundaryMarker',
          shortcut: 'Ctrl+Alt+Left',
          category: 'Navigation',
        });
        $.Toolbar.registerAction({
          name: 'Next Boundary Marker',
          icon: $.specialFolders.userScripts + '/script-icons/next_boundary.png',
          handler: 'ToolsKit.gotoNextBoundaryMarker',
          shortcut: 'Ctrl+Alt+Right',
          category: 'Navigation',
        });

        $.Toolbar.registerAction({
          name: 'Boundary Snapping',
          icon: $.specialFolders.userScripts + '/script-icons/snap_to_boundary.png',

          checkable: true,
          isChecked: presetSettings.edgeSnappingEnabled,

          handler: 'ToolsKit.setBoundarySnapping',

          category: 'Presets',
        });

        $.Toolbar.registerAction({
          name: 'Smart Paste',
          icon: $.specialFolders.userScripts + '/script-icons/smart_paste.png',

          checkable: true,
          isChecked: presetSettings.smartPasteEnabled,

          handler: 'ToolsKit.setSmartPaste',

          category: 'Presets',
        });
        keyframePresets.forEach(function (presetName: string, index: number) {
          $.Toolbar.registerAction({
            name: presetName,

            icon: $.specialFolders.userScripts + '/script-icons/' + presetName + '.png',

            handler: 'ToolsKit.presetCallbacks.' + presetName,

            shortcut: index < 9 ? 'Ctrl+' + (index + 1) : undefined,

            category: 'Presets',
          });
        });
        $.Toolbar.registerAction({
          name: 'Loop Selected Frames',
          icon: $.specialFolders.userScripts + '/script-icons/loop.png',

          handler: 'ToolsKit.loopCurrentSelection',

          shortcut: 'Ctrl+Alt+L',
          category: 'Animation Tools',
        });

        $.Toolbar.registerAction({
          name: 'runCycle',
          icon: `${$.specialFolders.userScripts}/script-icons/run_cycle.png`,
          // callback: function () {
          //   try {
          //     ToolsModule.runCycle();
          //   } catch (error) {
          //     $.log(`[Tools.ts] ${error.message} | ${error.fileName} | ${error.lineNumber}`);
          //   }
          // },
          handler: 'ToolsKit.runCycle',
          shortcut: 'Ctrl+Alt+C',
          category: 'Animation Tools',
        });
        $.Toolbar.updateToolbars();
      },
    };
    keyframePresets.forEach(function (presetName: string) {
      presetCallbacks[presetName] = function (): void {
        $.MessageLog.trace('[Tools] Applying: ' + presetName);

        ToolsModule.applyAnimationPreset(presetName);
      };
    });
    return ToolsModule;
  }

  /*
   * This wrapper captures createToolsKit locally.
   */
  shared.__TBFactories.ToolsKit = function (
    Core: HarmonyCore,
    deps: ToolsKitDependencies,
    previous?: { presetSettings: PresetSettings },
  ) {
    return createToolsKit(Core, deps, previous ? previous.presetSettings : undefined);
  };
})();
