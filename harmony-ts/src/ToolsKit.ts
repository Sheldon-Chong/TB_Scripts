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
    function getSelectedDrawingColumns(selection: CoreInstance<'oSelection'>): string[] {
      var layerCount = $.Timeline.numLayerSel;
      var columns: string[] = [];

      function addDrawingColumn(columnName: string): void {
        if (
          columnName &&
          $.column.type(columnName) === 'DRAWING' &&
          columns.indexOf(columnName) === -1
        ) {
          columns.push(columnName);
        }
      }

      for (var index = 0; index < layerCount; index++) {
        if ($.Timeline.selIsColumn(index)) {
          addDrawingColumn($.Timeline.selToColumn(index));
        }
        if ($.Timeline.selIsNode(index)) {
          var nodePath = $.Timeline.selToNode(index);
          if ($.node.type(nodePath) === 'READ') {
            addDrawingColumn($.node.linkedColumn(nodePath, 'DRAWING.ELEMENT'));
          }
        }
      }

      if (layerCount === 0) {
        for (var index = 0; index < selection.selectedNodes.length; index++) {
          var selectedNode = selection.selectedNodes[index];
          if (selectedNode instanceof $.oDrawingNode) {
            addDrawingColumn($.node.linkedColumn(selectedNode.nodePath, 'DRAWING.ELEMENT'));
          }
        }
      }

      return columns;
    }

    function applyMarkerEdit(label: string, edit: () => boolean): void {
      $.scene.beginUndoRedoAccum(label);
      try {
        if (!edit()) {
          throw new $.Error(label + ' failed');
        }
      } catch (error) {
        $.scene.cancelUndoRedoAccum();
        throw error;
      }
      $.scene.endUndoRedoAccum();
    }

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
        $.scene.beginUndoRedoAccum('Apply ' + label + ': ' + presetName);
        try {
          var path = `${$.specialFolders.userScripts}/keyframe_presets/${subFolder}${presetName}.json`;
          $.MessageLog.trace('[Tools.ts] Applying preset from path: ' + path);

          var content = $.FileUtils.readFrom(path);
          if (!content) throw new $.Error('Preset file not found: ' + path);

          var presetData = $.JSON.parse(content);
          var currentFrame = $.frame.current();
          var sel = $.TimelineKit.getSelection();
          $.log(sel);
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
            ? ToolsModule.buildLoopingKeyframes(presetData.keyframes, sel.startFrame, sel.endFrame)
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

      setStartEndFrames(): void {
        var sel = $.TimelineKit.getSelection();
        if (scene.getStartFrame() === sel.startFrame && scene.getStopFrame() === sel.endFrame) {
          $.log(
            "[Tools.ts] Start/End frames already match selection, resetting to scene's full range",
          );
          scene.setStartFrame(1);
          scene.setStopFrame($.frame.numberOf());
          return;
        }
        $.scene.setStartFrame(sel.startFrame);
        $.scene.setStopFrame(sel.endFrame);
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

      sliceFrames(
        drawingColumn: CoreInstance<'oDrawingElementColumn'>,
        selection: { startFrame: number; endFrame: number },
      ): number {
        var startFrame = Math.max(1, selection.startFrame);
        var sceneLength = $.frame.numberOf();
        var endFrame = Math.min(selection.endFrame, sceneLength);
        var framesToSlice: { frame: number; drawing: CoreInstance<'oDrawing'> }[] = [];

        // Check the original exposure boundaries, including holds outside the selection.
        for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++) {
          var entry = drawingColumn.getTimesheetEntry(frameNumber);
          if (entry.emptyCell) {
            continue;
          }

          var nextEntry =
            frameNumber < sceneLength ? drawingColumn.getTimesheetEntry(frameNumber + 1) : null;
          if (entry.heldFrame || (nextEntry && !nextEntry.emptyCell && nextEntry.heldFrame)) {
            var drawing = drawingColumn.getKeyframe(frameNumber);
            if (drawing) {
              framesToSlice.push({ frame: frameNumber, drawing: drawing });
            }
          }
        }

        var copiedCount = 0;
        for (var index = 0; index < framesToSlice.length; index++) {
          var exposure = framesToSlice[index];
          try {
            if (!drawingColumn.copyDrawingTo(exposure.drawing, exposure.frame)) {
              throw new $.Error('Failed to set duplicated drawing');
            }
            copiedCount++;
          } catch (error) {
            $.MessageLog.trace(
              `[Slice Selected Frames] Skipped ${drawingColumn.name} at frame ${exposure.frame}: ${error.message || error}`,
            );
          }
        }

        return copiedCount;
      },
      sliceCurrentSelection(): number {
        var selection = $.TimelineKit.getSelection();
        var columns = getSelectedDrawingColumns(selection);
        var layerCount = $.Timeline.numLayerSel;

        if (columns.length === 0) {
          return 0;
        }

        var firstFrame = layerCount > 0 ? $.Timeline.firstFrameSel : 0;
        var frameCount = layerCount > 0 ? $.Timeline.numFrameSel : 0;
        var range =
          firstFrame > 0 && frameCount > 0
            ? { startFrame: firstFrame, endFrame: firstFrame + frameCount - 1 }
            : selection;
        var copiedCount = 0;

        $.scene.saveAll();

        $.scene.beginUndoRedoAccum('Slice Selected Frames');
        $.log('testing5');

        try {
          for (var index = 0; index < columns.length; index++) {
            var drawingColumn = new $.oDrawingElementColumn(columns[index]);
            copiedCount += ToolsModule.sliceFrames(drawingColumn, range);
          }
        } catch (error) {
          $.scene.cancelUndoRedoAccum();
          throw error;
        }
        $.scene.endUndoRedoAccum();

        return copiedCount;
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
      extendDrawingToBoundary(): void {
        var selection = $.TimelineKit.getSelection();
        var columns = getSelectedDrawingColumns(selection);
        var frameNumber = $.Timeline.firstFrameSel || selection.startFrame;
        var sceneLength = $.frame.numberOf();
        var selectedFrameCount = $.Timeline.numFrameSel || selection.length;
        if (
          columns.length !== 1 ||
          selectedFrameCount !== 1 ||
          frameNumber < 1 ||
          frameNumber > sceneLength
        ) {
          return;
        }

        var drawingColumn = new $.oDrawingElementColumn(columns[0]);
        var drawing = drawingColumn.getKeyframe(frameNumber);
        if (!drawing) {
          return;
        }

        var leftMarker = 1;
        var rightMarker = 0;
        var markers = $.TimelineKit.getAllMarkers();
        for (var index = 0; index < markers.length; index++) {
          var markerFrame = markers[index].frame;
          if (markerFrame < frameNumber && markerFrame > leftMarker) {
            leftMarker = markerFrame;
          } else if (
            markerFrame > frameNumber &&
            markerFrame <= sceneLength &&
            (!rightMarker || markerFrame < rightMarker)
          ) {
            rightMarker = markerFrame;
          }
        }

        // Locate the edges of the selected exposure before looking for empty cells.
        var start = frameNumber;
        while (start > leftMarker && drawingColumn.getTimesheetEntry(start).heldFrame) {
          start--;
        }

        var rightLimit = rightMarker || sceneLength;
        var end = frameNumber;
        while (end < rightLimit && drawingColumn.getTimesheetEntry(end + 1).heldFrame) {
          end++;
        }

        var left = start;
        while (left > leftMarker && drawingColumn.getTimesheetEntry(left - 1).emptyCell) {
          left--;
        }

        var right = end;
        while (right < rightLimit && drawingColumn.getTimesheetEntry(right + 1).emptyCell) {
          right++;
        }
        if (!rightMarker && right === sceneLength) {
          right = end;
        }

        if (left === start && right === end) {
          return;
        }

        $.scene.beginUndoRedoAccum('Extend Drawing to Boundary');
        try {
          if (
            (left < start && !drawingColumn.setKeyFrame(left, drawing, start - 1)) ||
            (right > end && !drawingColumn.setKeyFrame(end + 1, drawing, right))
          ) {
            throw new $.Error('Failed to extend drawing exposure');
          }
        } catch (error) {
          $.scene.cancelUndoRedoAccum();
          throw error;
        }
        $.scene.endUndoRedoAccum();
      },

      quickInsertMarker(): void {
        var currentFrame = $.frame.current();
        var dialog = new $.QDialog();
        dialog.windowTitle = 'Insert Marker at Frame ' + currentFrame;
        dialog.minimumWidth = 320;
        var layout = new $.QVBoxLayout(dialog);
        var nameLabel = new $.QLabel('Name (optional)');
        var nameInput = new $.QLineEdit(dialog);
        var descriptionLabel = new $.QLabel('Description (optional)');
        var descriptionInput = new $.QTextEdit(dialog);
        descriptionInput.maximumHeight = 95;

        var color = '#ff0000';
        var colorButton = new $.QPushButton(dialog);
        colorButton.text = 'Color: Default red';
        colorButton.clicked.connect(function () {
          var chosen = $.QColorDialog.getColor(new $.QColor(color), dialog);
          if (chosen.isValid()) {
            color = chosen.name();
            colorButton.text = 'Color: ' + color;
          }
        });

        var buttons = new $.QHBoxLayout();
        var cancel = new $.QPushButton(dialog);
        cancel.text = 'Cancel';
        cancel.clicked.connect(function () {
          dialog.reject();
        });
        var insert = new $.QPushButton(dialog);
        insert.text = 'Insert';
        insert['default'] = true;
        insert.clicked.connect(function () {
          dialog.accept();
        });
        buttons.addWidget(cancel);
        buttons.addWidget(insert);

        layout.addWidget(nameLabel);
        layout.addWidget(nameInput);
        layout.addWidget(descriptionLabel);
        layout.addWidget(descriptionInput);
        layout.addWidget(colorButton);
        layout.addLayout(buttons);

        if (dialog.exec()) {
          applyMarkerEdit('Insert Marker', function () {
            return !!$.TimelineMarker.createMarker({
              frame: currentFrame,
              length: 1,
              name: nameInput.text,
              notes: descriptionInput.plainText,
              color: color,
            });
          });
        }
      },

      pushFramesAndMarkers(): void {
        applyMarkerEdit('Push Frames and Markers', function () {
          return $.frame.insert($.frame.current(), 1, { ripple_markers: true });
        });
      },

      rippleDeleteCurrentFrame(): void {
        if ($.frame.numberOf() <= 1) {
          return;
        }

        applyMarkerEdit('Ripple Delete Current Frame', function () {
          return $.frame.remove($.frame.current() - 1, 1, { ripple_markers: true });
        });
      },

      deleteMarkersInSelection(): void {
        var start = $.Timeline.firstFrameSel;
        var length = $.Timeline.numFrameSel;
        var end = start + length - 1;
        if (start < 1 || length < 1) {
          var selection = $.TimelineKit.getSelection();
          start = selection.startFrame;
          end = selection.endFrame;
        }

        var markers = $.TimelineKit.getAllMarkers().filter(function (marker: oTimelineMarker) {
          var markerEnd = marker.frame + $.Math.max(marker.length, 1) - 1;
          return marker.frame <= end && markerEnd >= start;
        });
        if (markers.length === 0) {
          return;
        }

        applyMarkerEdit('Delete Markers in Selection', function () {
          for (var index = 0; index < markers.length; index++) {
            if (!$.TimelineMarker.deleteMarker(markers[index])) {
              return false;
            }
          }
          return true;
        });
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
          name: 'Set start/end',
          icon: $.specialFolders.userScripts + '/script-icons/set_start_end.png',
          handler: 'ToolsKit.setStartEndFrames',
          shortcut: 'Ctrl+Alt+S',
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
          name: 'Slice Selected Frames',
          icon: $.specialFolders.userScripts + '/script-icons/slice_frames.png',

          handler: 'ToolsKit.sliceCurrentSelection',

          shortcut: 'Ctrl+Alt+S',
          category: 'Animation Tools',
        });

        $.Toolbar.registerAction({
          name: 'extendDrawingToBoundary',
          icon: `${$.specialFolders.userScripts}/script-icons/extend_to_boundary.png`,
          handler: 'ToolsKit.extendDrawingToBoundary',
          shortcut: 'Ctrl+Alt+E',
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

        var markerIconFolder = $.specialFolders.userScripts + '/script-icons/';
        $.Toolbar.registerAction({
          name: 'Quick Insert Marker',
          icon: markerIconFolder + 'populate_markers.png',
          handler: 'ToolsKit.quickInsertMarker',
          category: 'Markers',
        });
        $.Toolbar.registerAction({
          name: 'Push Frames and Markers Right',
          icon: markerIconFolder + 'push_to_right.png',
          handler: 'ToolsKit.pushFramesAndMarkers',
          category: 'Markers',
        });
        $.Toolbar.registerAction({
          name: 'Ripple Delete Current Frame',
          icon: markerIconFolder + 'push_to_left.png',
          handler: 'ToolsKit.rippleDeleteCurrentFrame',
          category: 'Markers',
        });
        $.Toolbar.registerAction({
          name: 'Delete Markers in Selection',
          icon: markerIconFolder + 'delete_marker.png',
          handler: 'ToolsKit.deleteMarkersInSelection',
          category: 'Markers',
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
