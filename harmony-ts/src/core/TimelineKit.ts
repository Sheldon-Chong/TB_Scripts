include(specialFolders.userScripts + '/core/Frame.js');
include('Layer.js');

include(specialFolders.userScripts + '/core/utils.js');
include(specialFolders.userScripts + '/core/DrawingDataUtils.js');

class Cell {
  frame: number;
  node: oNodeLayer;
  constructor(frame: number, node: oNodeLayer) {
    this.frame = frame;
    this.node = node;
  }

  toString() {
    return 'Cell(frame: ' + this.frame + ', node: ' + this.node.name + ')';
  }
}

class DrawingCell extends Cell {
  drawingName: string;

  constructor(frame: number, node: oNodeLayer) {
    super(frame, node);
    this.drawingName = node.getColumn('DRAWING.ELEMENT').getKeyframe(frame);
  }

  getDrawingData(art: number) {
    var data = Drawing.query.getData({
      drawing: {
        node: this.node.nodePath,
        frame: this.frame,
      },
      art: art,
    });
    return data;
    // return DrawingDataUtils.getDrawingData(new oSelection(this.frame, undefined, [this.node]), art);
  }
}

function saveKeyFramesFrom3DPath() {
  const sel = TimelineKit.getSelection();
  const PathColumn3D = sel.selectedNodes[0].getColumn('offset.attr3dpath') as oPathColumn3D;
  // const RotationColumn = selection.selectedNodes[0].getColumn("ROTATION") as PathColumn3D;
  const ScaleXCol = sel.selectedNodes[0].getColumn('scale.x') as oColumn;
  const ScaleYCol = sel.selectedNodes[0].getColumn('scale.y') as oColumn;

  // MessageLog.trace(JSON.stringify(selection.selectedNodes[0].getAttributeKeywords(), null, 2));

  const keyframes: { frame: number; x: number; y: number; z: number }[] = [];
  var relativeIndex = 0;
  for (let i = sel.startFrame; i <= sel.endFrame; i++) {
    keyframes.push({
      frame: relativeIndex,
      x: PathColumn3D.getX(i),
      y: PathColumn3D.getY(i),
      z: PathColumn3D.getZ(i),
      scaleX: ScaleXCol.getKeyframe(i),
      scaleY: ScaleYCol.getKeyframe(i),
    });
    relativeIndex++;
  }

  // QFileDialog is not available in Harmony scripting. Use QFileDialog.getOpenFileName if available, otherwise fallback.
  var savePath = QFileDialog.getSaveFileName(
    0,
    'Save As',
    '',
    'JSON Files (*.json);;All Files (*)',
  );

  if (savePath) {
    G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
    MessageLog.trace('Keyframes saved to: ' + savePath);
  } else {
    MessageLog.trace('No file selected for saving keyframes.');
  }
}

function serializeKeyFramesFromSplittedPath(selection: oSelection) {
  // const selection = TimelineKit.getSelection();
  const layer = selection.selectedNodes[0];
  const xCol = layer.getColumn('offset.X');
  const yCol = layer.getColumn('offset.Y');
  const zCol = layer.getColumn('offset.Z');

  const ScaleXCol = layer.getColumn('scale.x');
  const ScaleYCol = layer.getColumn('scale.y');
  const keyframes: { frame: number; x: number; y: number; z: number }[] = [];
  var relativeIndex = 0;
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    keyframes.push({
      frame: relativeIndex,
      x: parseFloat(xCol.getKeyframe(i)),
      y: parseFloat(yCol.getKeyframe(i)),
      z: parseFloat(zCol.getKeyframe(i)),
      scaleX: parseFloat(ScaleXCol.getKeyframe(i)),
      scaleY: parseFloat(ScaleYCol.getKeyframe(i)),
    });
    relativeIndex++;
  }

  return keyframes;

  var savePath = QFileDialog.getSaveFileName(
    0,
    'Save As',
    '',
    'JSON Files (*.json);;All Files (*)',
  );
  if (savePath) {
    G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
    MessageLog.trace('Keyframes saved to: ' + savePath);
  } else {
    MessageLog.trace('No file selected for saving keyframes.');
  }
}

class oSelection {
  public startFrame: number;
  public endFrame: number;
  isRange: boolean;
  length: number;

  selectedNodes: oNodeLayer[];

  constructor(startFrame?: number, endFrame?: number, selectedNodes?: oNodeLayer[]) {
    if (startFrame !== undefined) {
      this.startFrame = startFrame;
      this.endFrame = endFrame !== undefined ? endFrame : startFrame;
      this.isRange = startFrame !== endFrame;
    } else {
      if (selection.isSelectionRange()) {
        this.startFrame = selection.startFrame();
        this.endFrame = selection.startFrame() + selection.numberOfFrames() - 1;
        this.isRange = true;
      } else {
        this.startFrame = frame.current();
        this.endFrame = this.startFrame;
        this.isRange = false;
      }
    }
    this.selectedNodes = selectedNodes !== undefined ? selectedNodes : G.LayerManager.getSelected();
    this.length = this.endFrame - this.startFrame + 1;
  }

  toString() {
    return (
      'Selection from frame ' +
      this.startFrame +
      ' to ' +
      this.endFrame +
      ' | ' +
      this.selectedNodes.join(', ')
    );
  }

  getSelectSize() {
    return this.length * this.selectedNodes.length;
  }

  forEach(callback: (node: oNodeLayer, frame: number) => void) {
    for (const node of this.selectedNodes) {
      for (let f = this.startFrame; f <= this.endFrame; f++) {
        callback(node, f);
      }
    }
  }

  getCell(): Cell {
    // MessageLog.trace("type " + this.selectedNodes[0].getType());
    if (this.selectedNodes[0].getType() === 'READ') {
      return new DrawingCell(this.startFrame, this.selectedNodes[0]);
    }
    return new Cell(this.startFrame, this.selectedNodes[0]);
  }
}

type frameRange = Omit<oSelection, 'selectedNodes'>;

// ─── TimelineKit namespace ──────────────────────────────────────────────────
function createTimelineKit(Core: any) {
  class Selection {
    startFrame: number;
    endFrame: number;
    isRange: boolean;
    selectedNodes: any[];
    length: number;

    constructor(startFrame?: number, endFrame?: number, selectedNodes?: any[]) {
      if (startFrame !== undefined) {
        this.startFrame = startFrame;

        this.endFrame = endFrame !== undefined ? endFrame : startFrame;

        this.isRange = this.startFrame !== this.endFrame;
      } else if (Core.selection.isSelectionRange()) {
        this.startFrame = Core.selection.startFrame();

        this.endFrame = Core.selection.startFrame() + Core.selection.numberOfFrames() - 1;

        this.isRange = true;
      } else {
        this.startFrame = Core.frame.current();

        this.endFrame = this.startFrame;

        this.isRange = false;
      }

      this.selectedNodes =
        selectedNodes !== undefined ? selectedNodes : Core.LayerManager.getSelected();

      this.length = this.endFrame - this.startFrame + 1;
    }
  }

  /*
   * Keep the same array instance so
   * TimelineKit.layers always stays current.
   */
  var layers: any[] = [];

  var TimelineKit = {
    /*
     * Types / constructors
     */
    oSelection: Selection,

    /*
     * Cached state
     */
    layers: layers,

    /*
     * Selection
     */
    getSelection(): Selection {
      return new Selection();
    },

    /*
     * Frames
     */
    startFrame(): number {
      return Core.scene.getStartFrame();
    },

    endFrame(): number {
      return Core.frame.numberOf();
    },

    setCurrentFrame(frameNumber: number): void {
      Core.frame.setCurrent(frameNumber);
    },

    setFrame(frameNumber: number): void {
      Core.frame.setCurrent(frameNumber);
    },

    getFrame(options: any): any {
      return new Core.Frame(options);
    },

    /*
     * Markers
     */
    getMarkersFromRange(startFrame: number, endFrame: number): any[] {
      var allMarkers = Core.TimelineMarker.getAllMarkers();

      return allMarkers.filter(function (marker: any) {
        return marker.frame >= startFrame && marker.frame <= endFrame;
      });
    },

    getAllMarkers(): any[] {
      return Core.TimelineMarker.getAllMarkers();
    },

    createMarker(
      frameNumber: number,
      name: string = '',
      color: string = '#FF0000',
      notes: string = '',
      length: number = 1,
    ): boolean {
      try {
        Core.TimelineMarker.createMarker({
          frame: frameNumber,
          color: color,
          name: name,
          notes: notes,
          length: length,
        });

        return true;
      } catch (e) {
        return false;
      }
    },

    moveMarker(marker: any, newFrame: number): boolean {
      try {
        if (!Core.TimelineMarker.deleteMarker(marker)) {
          return false;
        }

        Core.TimelineMarker.createMarker({
          frame: newFrame,
          length: marker.length,
          color: marker.color,
          name: marker.name,
          notes: marker.notes,
        });

        return true;
      } catch (e) {
        return false;
      }
    },

    rippleShiftMarkers(atFrame: number, amount: number, mode: 'add' | 'delete' = 'add'): boolean {
      var delta = mode === 'delete' ? -Math.abs(amount) : Math.abs(amount);

      try {
        var markers = Core.TimelineMarker.getAllMarkers();

        var markersToReconstruct = markers.filter(function (marker: any) {
          if (mode !== 'delete') {
            return true;
          }

          var markerEnd = marker.frame + Math.max(marker.length, 1);

          var occupiesFrame = atFrame >= marker.frame && atFrame < markerEnd;

          return !occupiesFrame;
        });

        /*
         * Delete all markers first so shifted
         * markers do not collide.
         */
        for (var i = 0; i < markers.length; i++) {
          Core.TimelineMarker.deleteMarker(markers[i]);
        }

        Core.MessageLog.trace(
          '[TimelineKit.ts] ' +
            markersToReconstruct.length +
            ' markers to reconstruct after ripple shift.',
        );

        for (var i = 0; i < markersToReconstruct.length; i++) {
          var marker = markersToReconstruct[i];

          var newFrame = marker.frame > atFrame ? marker.frame + delta : marker.frame;

          Core.TimelineMarker.createMarker({
            frame: newFrame,
            length: marker.length,
            color: marker.color,
            name: marker.name,
            notes: marker.notes,
          });
        }

        return true;
      } catch (e: any) {
        Core.MessageLog.trace('[TimelineKit.ts] ' + e.message);

        return false;
      }
    },

    getTimelineMarkersPresentAtFrame(frameNumber: number): any[] {
      var markers = Core.TimelineMarker.getAllMarkers();

      return markers.filter(function (marker: any) {
        return (
          frameNumber >= marker.frame && frameNumber < marker.frame + Math.max(marker.length, 1)
        );
      });
    },

    /*
     * Keyframes
     */
    applyKeyFramesTo3DPath(selection: Selection, keyframes: any[]): void {
      var layer = selection.selectedNodes[0];

      var PathColumn3D = layer.getColumn('position.attr3dpath');

      var ScaleXCol = layer.getColumn('scale.x');

      var ScaleYCol = layer.getColumn('scale.y');

      Core.scene.beginUndoRedoAccum('Apply Keyframes to 3D Path');

      try {
        for (var i = 0; i < keyframes.length; i++) {
          var kf = keyframes[i];

          var frameNumber = selection.startFrame + kf.frame;

          Core.MessageLog.trace(' >>> ' + kf.x);

          var x = Math.abs(kf.x) + (kf.x >= 0 ? ' E' : ' W');

          var y = Math.abs(kf.y) + (kf.y >= 0 ? ' N' : ' S');

          var z = Math.abs(kf.z) + (kf.z >= 0 ? ' F' : ' B');

          Core.MessageLog.trace('<<<<<<<< ' + Core.JSON.stringify([x, y, z], null, 2));

          PathColumn3D.setX(frameNumber, x);

          PathColumn3D.setY(frameNumber, y);

          PathColumn3D.setZ(frameNumber, z);

          if (kf.scaleX !== undefined) {
            ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
          }

          if (kf.scaleY !== undefined) {
            ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
          }
        }
      } finally {
        Core.scene.endUndoRedoAccum();
      }
    },

    applyKeyFramesToSplittedPath(selection: Selection, keyframes: any[]): void {
      for (var nodeIndex = 0; nodeIndex < selection.selectedNodes.length; nodeIndex++) {
        var layer = selection.selectedNodes[nodeIndex];

        var xCol = layer.getColumn('offset.X');

        var yCol = layer.getColumn('offset.Y');

        var zCol = layer.getColumn('offset.Z');

        var ScaleXCol = layer.getColumn('scale.x');

        var ScaleYCol = layer.getColumn('scale.y');

        Core.MessageLog.trace('columns: ' + xCol + ' ' + yCol + ' ' + zCol);

        Core.scene.beginUndoRedoAccum('Apply 3D Path Keyframes');

        try {
          for (var i = 0; i < keyframes.length; i++) {
            var kf = keyframes[i];

            var frameNumber = selection.startFrame + kf.frame;

            Core.MessageLog.trace(
              ' Applying kf at frame ' + frameNumber + ' x:' + kf.x + ' y:' + kf.y + ' z:' + kf.z,
            );

            xCol.setKeyFrame(frameNumber, String(kf.x));

            yCol.setKeyFrame(frameNumber, String(kf.y));

            zCol.setKeyFrame(frameNumber, String(kf.z));

            ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);

            ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
          }

          var resetFrame = selection.startFrame + keyframes.length;

          xCol.setKeyFrame(resetFrame, '0');

          yCol.setKeyFrame(resetFrame, '0');

          zCol.setKeyFrame(resetFrame, '0');

          ScaleXCol.setKeyFrame(resetFrame, '1');

          ScaleYCol.setKeyFrame(resetFrame, '1');
        } finally {
          Core.scene.endUndoRedoAccum();
        }
      }
    },

    /*
     * Frame markers
     */
    createFrameMarkers(marker: any, selection: Selection): void {
      for (var i = 0; i < selection.selectedNodes.length; i++) {
        var selectedNode = selection.selectedNodes[i];

        for (var f = selection.startFrame; f <= selection.endFrame; f++) {
          try {
            var result = Core.Timeline.createFrameMarker(selectedNode.index, marker, f);

            Core.MessageLog.trace(
              'Created frame marker on node ' +
                selectedNode.name +
                ' (index ' +
                selectedNode.index +
                ') at frame ' +
                f +
                '. Result: ' +
                result,
            );

            Core.MessageLog.trace(Core.JSON.stringify(marker, null, 2));
          } catch (e: any) {
            Core.MessageLog.trace('Error creating frame marker: ' + e.toString());
          }
        }
      }
    },

    deleteFrameMarkers(selection: Selection): void {
      for (var i = 0; i < selection.selectedNodes.length; i++) {
        var selectedNode = selection.selectedNodes[i];

        for (var f = selection.startFrame; f <= selection.endFrame; f++) {
          var marker = Core.Timeline.getFrameMarker(selectedNode.index, f);

          if (!marker) {
            continue;
          }

          var id = marker['id'];

          if (id !== -1) {
            var status = Core.Timeline.deleteFrameMarker(selectedNode.index, id);

            Core.MessageLog.trace(
              'Deleted frame marker ID ' +
                id +
                ' from node ' +
                selectedNode.name +
                ' at frame ' +
                f +
                ': ' +
                status,
            );
          }
        }
      }
    },

    /*
     * Timeline focus
     */
    resetFocusedNodes(): void {
      Core.Action.perform('onActionTimelineViewModeNormal()', 'timelineView');
    },

    focusOnNodes(nodes: string[]): void {
      Core.selection.addNodesToSelection(nodes);

      Core.Action.perform('onActionTimelineViewModeSelectionOnly()', 'timelineView');
    },

    focusOnColumns(columnNames: string[]): void {
      var i: number;

      for (i = 0; i < columnNames.length; i++) {
        Core.selection.addColumnToSelection(columnNames[i]);
      }

      Core.Action.perform('onActionTimelineViewModeSelectionOnly()', 'timelineView');

      Core.selection.clearSelection();

      for (i = 0; i < columnNames.length; i++) {
        Core.selection.addColumnToSelection(columnNames[i]);
      }
    },

    /*
     * Layers
     */
    getLayer(index: number): any {
      return layers[index];
    },

    updateLayers(): any[] {
      /*
       * Keep the same array object.
       */
      layers.length = 0;

      var numColumns = Core.column.numberOf();

      for (var i = 0; i < numColumns; i++) {
        var colName = Core.column.getName(i);

        var pos = Core.column.getPos(colName);

        var displayName = Core.column.getDisplayName(colName);

        var timelineLayer = new Core.TimelineLayer(colName, displayName, pos, i);

        if (timelineLayer.orderIndex !== -1) {
          layers.push(timelineLayer);
        }
      }

      layers.sort(function (a: any, b: any) {
        return a.orderIndex - b.orderIndex;
      });

      return layers;
    },

    getAllLayers(): any[] {
      return layers;
    },

    /*
     * Metadata
     */
    getSceneMetadata(key: any, type: any): any {
      try {
        var meta = Core.scene.metadata(key, type);

        if (meta && meta.hasOwnProperty('value')) {
          return meta.value;
        }
      } catch (e) {}

      return null;
    },

    setSceneMetadata(key: any, type: any, value: any, creator: any, version: any): void {
      try {
        var metaObj = {
          name: key,
          type: type,
          value: value,
          creator: creator,
          version: version,
        };

        Core.scene.setMetadata(metaObj);

        Core.MessageLog.trace('Set scene metadata: ' + key + ' = ' + value);
      } catch (e) {}
    },

    setMetadata(key: any, value: any): void {
      try {
        Core.scene.setMetadata({
          name: key,
          type: 'string',
          value: value,
          creator: 'harmony-ts',
          version: '1.0',
        });
      } catch (e: any) {
        Core.MessageLog.trace('Failed to set scene metadata: ' + key + ' | Error: ' + e.message);
      }
    },

    getMetadata(key: any): any {
      try {
        var meta = Core.scene.metadata(key, 'string');

        if (meta && meta.hasOwnProperty('value')) {
          return meta.value;
        }
      } catch (e) {}

      return null;
    },
  };

  /*
   * Populate initial layer cache.
   */
  TimelineKit.updateLayers();

  return TimelineKit;
}
function TimelineLayer(name, displayName, orderIndex, trueIndex) {
  this.name = name;
  this.displayName = displayName;
  this.orderIndex = orderIndex;
  this.trueIndex = trueIndex;
}

TimelineLayer.prototype.toString = function () {
  return this.name + ' (' + this.displayName + ') - OrderIndex: ' + this.orderIndex;
};

function createDrawingAtFrame(nodePath, frameNum) {
  var settings = Tools.getToolSettings();
  if (settings.currentDrawing) {
    return;
  }
  scene.beginUndoRedoAccum('Create Drawing example');
  settings = Tools.createDrawing();
  scene.endUndoRedoAccum();
  // var elementId = node.getElementId(nodePath);
  // if (elementId < 0) {
  //     throw Error("Invalid node: " + nodePath);
  // }

  // var drawingName = "drawing_" + frameNum;
  // var success = Drawing.create(elementId, drawingName, true);
  // if (!success)
  //     throw Error("Failed to create drawing for " + nodePath + " at frame " + frameNum);

  // var drawingColumn = node.linkedColumn(nodePath, "DRAWING.ELEMENT");
  // if (!drawingColumn || drawingColumn === "")
  //     throw Error("No drawing column linked to node: " + nodePath);

  // column.setEntry(drawingColumn, 1, frameNum, drawingName);

  // DrawingTools.setCurrentDrawingFromNodeName(nodePath, frameNum); // calling this refreshes/updates toonboom
  // $.log("✅ Created and activated drawing: " + drawingName + " at frame " + frameNum + " (" + Drawing.filename(elementId, drawingName) + ")");

  // return drawingName;
}

function TestCallable() {
  MessageLog.trace('TestCallable invoked');
}

function createLayerManager(Core: any) {
  function LayerManager(this: any) {
    this.nodeLayers = [];

    this.updateNodeLayers();
  }

  LayerManager.prototype.updateNodeLayers = function () {
    this.nodeLayers = [];

    var timelineIndices: {
      [nodePath: string]: number;
    } = {};

    /*
     * Build:
     *
     * node path -> timeline index
     */
    for (var timelineIndex = 0; timelineIndex < Core.Timeline.numLayers; timelineIndex++) {
      var timelineNodePath = Core.Timeline.layerToNode(timelineIndex);

      if (timelineNodePath) {
        timelineIndices[timelineNodePath] = timelineIndex;
      }
    }

    function getAllNodesInScene() {
      var accumulatedNodes = [];

      // Recursive helper function to crawl nested group layers
      function crawlGroup(groupPath) {
        var subNodeCount = node.numberOfSubNodes(groupPath);

        for (var i = 0; i < subNodeCount; i++) {
          // Get the full path of the current child node
          var currentChild = node.subNode(groupPath, i);
          accumulatedNodes.push(currentChild);

          // If this child is a Group, recursively look inside it
          if (node.isGroup(currentChild)) {
            crawlGroup(currentChild);
          }
        }
      }

      // Start crawling from the absolute top layer ("Top")
      var absoluteRoot = node.root();
      crawlGroup(absoluteRoot);

      // Output findings to the Message Log
      // MessageLog.trace('--- total nodes found: ' + accumulatedNodes.length + ' ---');
      // for (var j = 0; j < accumulatedNodes.length; j++) {
      //   MessageLog.trace(accumulatedNodes[j]);
      // }

      return accumulatedNodes;
    }

    var allNodes = getAllNodesInScene();

    for (var i = 0; i < allNodes.length; i++) {
      var nodePath = allNodes[i];

      var nodeType = Core.node.type(nodePath);

      var timelineIndex = timelineIndices[nodePath] !== undefined ? timelineIndices[nodePath] : -1;

      var nodeName = Core.node.getName(nodePath);

      if (nodeType === 'COLOR_CARD') {
        this.nodeLayers.push(
          new Core.oColorCardNode(this.nodeLayers.length, timelineIndex, nodePath, nodeName),
        );
      } else if (nodeType === 'PEG') {
        this.nodeLayers.push(
          new Core.oPegNode(this.nodeLayers.length, timelineIndex, nodePath, nodeName),
        );
      } else if (nodeType === 'READ') {
        this.nodeLayers.push(
          new Core.oDrawingNode(this.nodeLayers.length, timelineIndex, nodePath, nodeName),
        );
      } else {
        this.nodeLayers.push(
          new Core.oNodeLayer(this.nodeLayers.length, timelineIndex, nodePath, nodeName),
        );
      }
    }
  };

  LayerManager.prototype.getSelected = function () {
    var selectedNodePaths = Core.selection.selectedNodes();

    var selected = [];

    for (var i = 0; i < selectedNodePaths.length; i++) {
      var layer = this.getNodeLayer(selectedNodePaths[i]);

      if (layer !== null) {
        selected.push(layer);
      }
    }

    selected.sort(function (a: any, b: any) {
      return a.displayOrder - b.displayOrder;
    });

    return selected;
  };

  LayerManager.prototype.getNodeLayers = function () {
    return this.nodeLayers;
  };

  LayerManager.prototype.getNodeLayer = function (index: string | number) {
    for (var i = 0; i < this.nodeLayers.length; i++) {
      var layer = this.nodeLayers[i];

      if (typeof index === 'string') {
        if (layer.nodePath === index) {
          return layer;
        }
      } else {
        if (layer.index === index) {
          return layer;
        }
      }
    }

    return null;
  };

  return new LayerManager();
}

function createNodeLayerClass(Core: any) {
  function NodeLayer(
    this: any,
    displayOrder: number,
    index: number,
    nodePath: string,
    name: string,
  ) {
    this.displayOrder = displayOrder;
    this.index = index;
    this.nodePath = nodePath;
    this.name = name;
  }

  NodeLayer.prototype.toString = function () {
    return 'NodeLayer<' + this.nodePath + '>';
  };

  NodeLayer.prototype.setEnabled = function (enabled: boolean) {
    Core.node.setEnable(this.nodePath, enabled);
  };

  NodeLayer.prototype.isEnabled = function () {
    return Core.node.getEnable(this.nodePath);
  };

  NodeLayer.prototype.getAttributeNames = function () {
    return Core.node.getAllAttrNames(this.nodePath);
  };

  NodeLayer.prototype.getAllAttributes = function () {
    var attributeNames = this.getAttributeKeywords();

    var attributes = [];

    for (var i = 0; i < attributeNames.length; i++) {
      attributes.push(Core.node.getAttr(this.nodePath, Core.frame.current(), attributeNames[i]));
    }

    return attributes;
  };

  NodeLayer.prototype.getAttributeKeywords = function () {
    return Core.node.getAllAttrKeywords(this.nodePath);
  };

  NodeLayer.prototype.getEditableAttributes = function () {
    function getAttributes(attribute: any, attributeList: any[]) {
      attributeList.push(attribute);

      var subAttrList = attribute.getSubAttributes();

      for (var j = 0; j < subAttrList.length; j++) {
        if (
          typeof subAttrList[j].keyword() === 'undefined' ||
          subAttrList[j].keyword().length === 0
        ) {
          continue;
        }

        getAttributes(subAttrList[j], attributeList);
      }
    }

    function getFullAttributeList(nodePath: string) {
      var attributeList = [];

      var topAttributeList = Core.node.getAttrList(nodePath, 1);

      for (var i = 0; i < topAttributeList.length; i++) {
        getAttributes(topAttributeList[i], attributeList);
      }

      return attributeList;
    }

    return getFullAttributeList(this.nodePath)
      .filter(function (attr: any) {
        return ['INT', 'DOUBLE'].indexOf(attr.typeName()) >= 0;
      })
      .map(function (attr: any) {
        return attr.fullKeyword();
      });
  };

  NodeLayer.prototype.getColumn = function (
    attrName: string,
    linkType?: string,
    createColumn?: boolean,
  ) {
    if (createColumn === undefined) {
      createColumn = true;
    }

    /*
     * Support nested node paths:
     *
     * Group|POSITION.X
     */
    if (attrName.indexOf('|') !== -1) {
      var lastSlashIndex = attrName.lastIndexOf('|');

      var path = attrName.substring(0, lastSlashIndex);

      var layer = Core.LayerManager.getNodeLayer(this.nodePath + path);

      if (layer === null) {
        throw new Error('Node not found for path: ' + this.nodePath + path);
      }

      var attributeName = attrName.substring(lastSlashIndex + 1);

      return layer.getColumn(attributeName, linkType, createColumn);
    }

    var col = Core.node.linkedColumn(this.nodePath, attrName);

    if (!col) {
      if (!createColumn) {
        throw new Error(
          "Column not found for attribute '" + attrName + "' on node '" + this.nodePath + "'.",
        );
      }

      var colName = Core.column.generateAnonymousName();

      var resolvedLinkType = linkType !== undefined ? linkType : 'BEZIER';

      Core.MessageLog.trace(
        "No column linked to attribute '" +
          attrName +
          "' on node '" +
          this.nodePath +
          "'. Creating new " +
          resolvedLinkType +
          ' column: ' +
          colName,
      );

      Core.column.add(colName, resolvedLinkType);

      var result = Core.node.linkAttr(this.nodePath, attrName, colName);

      if (!result) {
        Core.MessageLog.trace(
          "Failed to link new column '" +
            colName +
            "' to attribute '" +
            attrName +
            "' of type '" +
            resolvedLinkType +
            "' on node '" +
            this.nodePath +
            "'.",
        );
      }

      if (attrName === 'DRAWING.ELEMENT') {
        return new Core.oDrawingElementColumn(colName, this);
      }

      return new Core.oColumn(colName, this);
    }

    if (attrName === 'offset.attr3dpath' || attrName === 'position.attr3dpath') {
      return new Core.oPathColumn3D(col, this);
    }

    if (attrName === 'DRAWING.ELEMENT') {
      return new Core.oDrawingElementColumn(col, this);
    }

    return new Core.oColumn(col, this);
  };

  NodeLayer.prototype.getType = function () {
    return Core.node.type(this.nodePath);
  };

  NodeLayer.prototype.getFullAttributeList = function () {
    function getAttributes(attribute: any, attributeList: any[]) {
      attributeList.push(attribute);

      var subAttrList = attribute.getSubAttributes();

      for (var j = 0; j < subAttrList.length; j++) {
        if (
          typeof subAttrList[j].keyword() === 'undefined' ||
          subAttrList[j].keyword().length === 0
        ) {
          continue;
        }

        getAttributes(subAttrList[j], attributeList);
      }
    }

    var attributeList = [];

    var topAttributeList = Core.node.getAttrList(this.nodePath, Core.frame.current());

    for (var i = 0; i < topAttributeList.length; i++) {
      getAttributes(topAttributeList[i], attributeList);
    }

    return attributeList;
  };

  NodeLayer.prototype.setAttribute = function (attrName: string, value: any) {
    var attr = Core.node.getAttr(this.nodePath, Core.frame.current(), attrName);

    if (!attr) {
      throw new Error("Attribute '" + attrName + "' not found on node '" + this.nodePath + "'.");
    }

    attr.setValue(value);
  };

  NodeLayer.prototype.getChildren = function () {
    var childPaths = Core.node.subNodes(this.nodePath);

    if (!childPaths) {
      return [];
    }

    var result = [];

    for (var i = 0; i < childPaths.length; i++) {
      var layer = Core.LayerManager.getNodeLayer(childPaths[i]);

      if (layer !== null) {
        result.push(layer);
      }
    }

    return result;
  };

  NodeLayer.prototype.getLocked = function () {
    return Core.node.getLocked(this.nodePath);
  };

  NodeLayer.prototype.setLocked = function (locked: boolean) {
    Core.node.setLocked(this.nodePath, locked);
  };

  NodeLayer.prototype.getChild = function (name: string) {
    if (name.indexOf('/') !== -1) {
      return Core.LayerManager.getNodeLayer(this.nodePath + '/' + name);
    }

    var childPath = Core.node.subNodeByName(this.nodePath, name);

    if (!childPath) {
      return null;
    }

    return Core.LayerManager.getNodeLayer(childPath);
  };

  NodeLayer.prototype.getChildrenRecursive = function () {
    var result = [];

    var children = this.getChildren();

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      result.push(child);

      var descendants = child.getChildrenRecursive();

      for (var j = 0; j < descendants.length; j++) {
        result.push(descendants[j]);
      }
    }

    return result;
  };

  NodeLayer.prototype.getParent = function () {
    var parentPath = Core.node.parentNode(this.nodePath);

    if (parentPath === Core.node.root()) {
      return null;
    }

    return Core.LayerManager.getNodeLayer(parentPath);
  };

  NodeLayer.prototype.isGroup = function () {
    return Core.node.isGroup(this.nodePath);
  };

  return NodeLayer;
}

function createColumnClass(Core: HarmonyCore) {
  class Column {
    name: string;
    parent: any;

    constructor(name: string, parentLayer: any) {
      this.name = name;
      this.parent = parentLayer;
    }

    getType(): string {
      return Core.column.type(this.name);
    }

    getKeyframe(frameNumber: number): any {
      return Core.column.getEntry(this.name, 1, frameNumber);
    }

    toString(): string {
      return 'Column<' + this.name + '>';
    }

    insertKeyFrame(frameNumber: number): boolean {
      return Core.column.setKeyFrame(this.name, frameNumber);
    }

    deleteKeyframes(selection: any): void {
      for (var frame = selection.startFrame; frame <= selection.endFrame; frame++) {
        Core.column.clearKeyFrame(this.name, frame);
      }
    }

    getKeyframeRange(startOrSelection: number | any, endFrame?: number): any[] {
      var startFrame: number;

      if (typeof startOrSelection === 'number') {
        if (endFrame === undefined) {
          throw new Error('endFrame is required when startFrame is provided');
        }

        startFrame = startOrSelection;
      } else {
        startFrame = startOrSelection.startFrame;

        endFrame = startOrSelection.endFrame;
      }

      var values = [];

      for (var frame = startFrame; frame <= endFrame; frame++) {
        values.push(this.getKeyframe(frame));
      }

      return values;
    }

    getKeyframeRangeSimplify(startOrSelection: number | any, endFrame?: number): string[] | string {
      var startFrame: number;

      if (typeof startOrSelection === 'number') {
        if (endFrame === undefined) {
          throw new Error('endFrame is required when startFrame is provided');
        }

        startFrame = startOrSelection;
      } else {
        startFrame = startOrSelection.startFrame;

        endFrame = startOrSelection.endFrame;
      }

      var values: string[] = [];

      for (var frame = startFrame; frame <= endFrame; frame++) {
        values.push(this.getKeyframe(frame));
      }

      if (values.length > 0) {
        var firstValue = values[0];

        var allSame = true;

        for (var i = 1; i < values.length; i++) {
          if (values[i] !== firstValue) {
            allSame = false;
            break;
          }
        }

        if (allSame) {
          return firstValue;
        }
      }

      return values;
    }

    getMostCommonKeyframeFromRange(selection: any): string | null {
      var values = this.getKeyframeRange(selection);

      var valueCounts: {
        [key: string]: number;
      } = {};

      var mostCommonValue: string | null = null;

      var highestCount = 0;

      for (var i = 0; i < values.length; i++) {
        var value = values[i];

        var key = String(value);

        if (valueCounts[key] !== undefined) {
          valueCounts[key]++;
        } else {
          valueCounts[key] = 1;
        }

        if (valueCounts[key] > highestCount) {
          highestCount = valueCounts[key];

          mostCommonValue = value;
        }
      }

      return mostCommonValue;
    }

    setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;

    setKeyFrame(selection: any, value: any): boolean;

    setKeyFrame(startOrSelection: number | any, value: any, endFrame?: number): boolean {
      var startFrame: number;
      var endFrameLocal: number;

      if (typeof startOrSelection === 'number') {
        startFrame = startOrSelection;

        if (endFrame === undefined) {
          endFrameLocal = startFrame;
        } else {
          endFrameLocal = endFrame;
        }
      } else {
        startFrame = startOrSelection.startFrame;

        endFrameLocal = startOrSelection.endFrame;
      }

      for (var frame = startFrame; frame <= endFrameLocal; frame++) {
        var status = Core.column.setEntry(this.name, 1, frame, value.toString());

        if (!status) {
          return false;
        }
      }

      return true;
    }

    loopKeyframes(sourceSelection: any, pasteSelection: any): boolean {
      if (sourceSelection.endFrame < sourceSelection.startFrame) {
        return false;
      }

      if (pasteSelection.endFrame < pasteSelection.startFrame) {
        return false;
      }

      var sourceLength = sourceSelection.endFrame - sourceSelection.startFrame + 1;

      var sourceValues = [];

      for (
        var sourceFrame = sourceSelection.startFrame;
        sourceFrame <= sourceSelection.endFrame;
        sourceFrame++
      ) {
        sourceValues.push(this.getKeyframe(sourceFrame));
      }

      for (
        var destinationFrame = pasteSelection.startFrame;
        destinationFrame <= pasteSelection.endFrame;
        destinationFrame++
      ) {
        var sourceIndex = (destinationFrame - pasteSelection.startFrame) % sourceLength;

        var sourceValue = sourceValues[sourceIndex];

        if (!this.pasteLoopKeyframe(sourceValue, destinationFrame)) {
          return false;
        }
      }

      return true;
    }

    protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
      return this.setKeyFrame(destinationFrame, sourceValue);
    }

    isKeyFrame(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 0, frameNumber);
    }
  }

  return Column;
}
function createPathColumn3DClass(Core: any) {
  var BaseColumn = Core.oColumn;

  class PathColumn3D extends BaseColumn {
    constructor(name: string, parentLayer: any) {
      super(name, parentLayer);
    }

    getX(frameNumber: number): string {
      return Core.column.getEntry(this.name, 1, frameNumber);
    }

    getY(frameNumber: number): string {
      return Core.column.getEntry(this.name, 2, frameNumber);
    }

    getZ(frameNumber: number): string {
      return Core.column.getEntry(this.name, 3, frameNumber);
    }

    private parseDirectionalValue(entry: string, positive: string, negative: string): number {
      var value = parseFloat(entry);

      return entry.indexOf(positive) !== -1 ? value : -value;
    }

    getXVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getX(frameNumber), 'E', 'W');
    }

    getYVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getY(frameNumber), 'N', 'S');
    }

    getZVal(frameNumber: number): number {
      return this.parseDirectionalValue(this.getZ(frameNumber), 'F', 'B');
    }

    setX(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' E' : ' W') : value;

      return Core.column.setEntry(this.name, 1, frameNumber, formattedValue);
    }

    setY(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' N' : ' S') : value;

      return Core.column.setEntry(this.name, 2, frameNumber, formattedValue);
    }

    setZ(frameNumber: number, value: string | number): boolean {
      var formattedValue =
        typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' F' : ' B') : value;

      return Core.column.setEntry(this.name, 3, frameNumber, formattedValue);
    }

    private resolveVec3(input: VectorInput): {
      x: number;
      y: number;
      z: number;
    } {
      if (typeof input === 'number') {
        return {
          x: input,
          y: input,
          z: input,
        };
      }

      if (input instanceof Core.Vec3) {
        return {
          x: input.x,
          y: input.y,
          z: input.z,
        };
      }

      if (Core.Array && Core.Array.isArray && Core.Array.isArray(input)) {
        return {
          x: input[0] !== undefined ? input[0] : 0,

          y: input[1] !== undefined ? input[1] : 0,

          z: input[2] !== undefined ? input[2] : 0,
        };
      }

      return {
        x: input.x,
        y: input.y,
        z: input.z,
      };
    }

    setPosition(
      frameNumber: number,
      position: VectorInput,
      tension: number = 0,
      continuity: number = 0,
      bias: number = 0,
    ): void {
      var v = this.resolveVec3(position);

      Core.func.addKeyFramePath3d(this.name, frameNumber, v.x, v.y, v.z, tension, continuity, bias);
    }

    isKeyFrame(frameNumber: number, subColumn: number = 1): boolean {
      return Core.column.isKeyFrame(this.name, subColumn, frameNumber);
    }

    isKeyFrameX(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 1, frameNumber);
    }

    isKeyFrameY(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 2, frameNumber);
    }

    isKeyFrameZ(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 3, frameNumber);
    }

    isKeyFrameVelocity(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 4, frameNumber);
    }

    isKeyFrameAny(frameNumber: number): boolean {
      return (
        this.isKeyFrameX(frameNumber) ||
        this.isKeyFrameY(frameNumber) ||
        this.isKeyFrameZ(frameNumber)
      );
    }

    isKeyFrameAll(frameNumber: number): boolean {
      return (
        this.isKeyFrameX(frameNumber) &&
        this.isKeyFrameY(frameNumber) &&
        this.isKeyFrameZ(frameNumber)
      );
    }

    toString(): string {
      return 'PathColumn3D<' + this.name + '>';
    }
  }

  return PathColumn3D;
}
function createDrawingElementColumnClass(Core: any) {
  var BaseColumn = Core.oColumn;

  class DrawingElementColumn extends BaseColumn {
    element: any;

    constructor(name: string, parentLayer: any) {
      Core.MessageLog.trace('name ' + name);

      Core.MessageLog.trace('name ' + Core.column.getEntry(name, 1, Core.frame.current()));

      super(name, parentLayer);

      this.element = new Core.oElement(Core.node.getElementId(parentLayer.nodePath));
    }

    getKeyframe(frameNumber: number): any {
      var drawingName = super.getKeyframe(frameNumber);

      if (drawingName === '') {
        return null;
      }

      return new Core.oDrawing(drawingName, this.element);
    }

    setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;

    setKeyFrame(selection: any, value: any): boolean;

    setKeyFrame(startOrSelection: any, value: any, endFrame?: number): boolean {
      if (value instanceof Core.oDrawing) {
        return super.setKeyFrame(startOrSelection, value.name, endFrame);
      }

      return super.setKeyFrame(startOrSelection, value, endFrame);
    }

    protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
      var drawing = sourceValue;

      if (!drawing) {
        return super.setKeyFrame(destinationFrame, '');
      }

      var copiedDrawing = drawing.duplicate();

      if (!copiedDrawing) {
        return false;
      }

      return super.setKeyFrame(destinationFrame, copiedDrawing.name);
    }

    copyDrawingRangeTo(selection: any, destFrame: number): boolean {
      /*
       * Core.TimelineKit is intentionally looked up
       * when this method runs.
       *
       * It does not need to exist yet when this class
       * factory is created.
       */
      var pasteSelection = new Core.TimelineKit.oSelection(
        destFrame,

        destFrame + selection.endFrame - selection.startFrame,
      );

      return this.loopKeyframes(selection, pasteSelection);
    }

    copyDrawingTo(drawing: any, destFrame: number): boolean {
      var copiedDrawing = drawing.duplicate();

      if (!copiedDrawing) {
        Core.MessageLog.trace('Failed to copy drawing for duplication.');

        return false;
      }

      return this.setKeyFrame(destFrame, copiedDrawing.name);
    }
  }

  return DrawingElementColumn;
}
