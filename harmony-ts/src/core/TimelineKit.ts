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
  /*
   * Capture Toon Boom globals NOW, while createTimelineKit()
   * is being initialized in a valid Harmony script context.
   */
  var harmonySelection = selection;
  var harmonyFrame = frame;

  function oSelection(startFrame?: number, endFrame?: number, selectedNodes?: oNodeLayer[]) {
    if (startFrame !== undefined) {
      this.startFrame = startFrame;

      this.endFrame = endFrame !== undefined ? endFrame : startFrame;

      this.isRange = startFrame !== endFrame;
    } else {
      if (harmonySelection.isSelectionRange()) {
        this.startFrame = harmonySelection.startFrame();

        this.endFrame = harmonySelection.startFrame() + harmonySelection.numberOfFrames() - 1;

        this.isRange = true;
      } else {
        this.startFrame = harmonyFrame.current();

        this.endFrame = this.startFrame;

        this.isRange = false;
      }
    }

    this.selectedNodes =
      selectedNodes !== undefined ? selectedNodes : Core.LayerManager.getSelected();

    this.length = this.endFrame - this.startFrame + 1;
  }

  return {
    oSelection: oSelection,

    getSelection: function () {
      return new oSelection();
    },
  };
}
namespace TimelineKit {
  export let layers: any[] = updateLayers();

  export function startFrame() {
    return scene.getStartFrame();
  }

  export function endFrame() {
    return frame.numberOf();
  }

  export function getMarkersFromRange(startFrame: number, endFrame: number): any[] {
    const allMarkers = TimelineMarker.getAllMarkers();
    const markersInRange = allMarkers.filter(
      (marker) => marker.frame >= startFrame && marker.frame <= endFrame,
    );
    return markersInRange;
  }

  export function getAllMarkers(): any[] {
    return TimelineMarker.getAllMarkers();
  }

  export function createMarker(
    frame: number,
    name: string = '',
    color: string = '#FF0000',
    notes: string = '',
    length: number = 1,
  ): boolean {
    try {
      TimelineMarker.createMarker({
        frame: frame,
        color: color,
        name: name,
        notes: notes,
        length: length,
      });
    } catch (e) {
      return false;
    }
    return true;
  }

  export function moveMarker(marker: oTimelineMarker, newFrame: number): boolean {
    try {
      if (!TimelineMarker.deleteMarker(marker)) {
        return false;
      }

      TimelineMarker.createMarker({
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
  }
  export function rippleShiftMarkers(
    atFrame: number,
    amount: number,
    mode: 'add' | 'delete' = 'add',
  ): boolean {
    const delta = mode === 'delete' ? -Math.abs(amount) : Math.abs(amount);

    try {
      const markers = TimelineMarker.getAllMarkers();

      // In delete mode, any marker occupying `atFrame` is removed entirely and
      // not reconstructed after the ripple.
      const markersToReconstruct = markers.filter((marker) => {
        if (mode !== 'delete') {
          return true;
        }
        const markerEnd = marker.frame + Math.max(marker.length, 1);
        const occupiesFrame = atFrame >= marker.frame && atFrame < markerEnd;
        return !occupiesFrame;
      });

      // Delete every marker first so shifted markers never collide with
      // markers that have not moved yet. Harmony refuses to create a marker
      // that starts on a frame already occupied by another marker.
      for (const marker of markers) {
        TimelineMarker.deleteMarker(marker);
      }
      MessageLog.trace(
        `[TimelineKit.ts] ${markersToReconstruct.length} markers to reconstruct after ripple shift.`,
      );

      // Reconstruct the remaining markers at their new positions.
      for (const marker of markersToReconstruct) {
        const newFrame = marker.frame > atFrame ? marker.frame + delta : marker.frame;

        TimelineMarker.createMarker({
          frame: newFrame,
          length: marker.length,
          color: marker.color,
          name: marker.name,
          notes: marker.notes,
        });
      }

      return true;
    } catch (e) {
      MessageLog.trace(`[TimelineKit.ts] ${e.message}`);
      return false;
    }
  }

  export function setCurrentFrame(frameNumber: number) {
    frame.setCurrent(frameNumber);
  }

  export function applyKeyFramesTo3DPath(selection: oSelection, keyframes: any[]) {
    const layer = selection.selectedNodes[0];
    const PathColumn3D = layer.getColumn('position.attr3dpath') as oPathColumn3D;
    const ScaleXCol = layer.getColumn('scale.x') as oColumn;
    const ScaleYCol = layer.getColumn('scale.y') as oColumn;

    scene.beginUndoRedoAccum('Apply Keyframes to 3D Path');
    keyframes.forEach((kf: any) => {
      const frameNumber = selection.startFrame + kf.frame;

      MessageLog.trace(' >>> ' + kf.x);

      const x = Math.abs(kf.x) + (kf.x >= 0 ? ' E' : ' W');
      const y = Math.abs(kf.y) + (kf.y >= 0 ? ' N' : ' S');
      const z = Math.abs(kf.z) + (kf.z >= 0 ? ' F' : ' B');

      MessageLog.trace('<<<<<<<< ' + JSON.stringify([x, y, z], null, 2));

      PathColumn3D.setX(frameNumber, x);
      PathColumn3D.setY(frameNumber, y);
      PathColumn3D.setZ(frameNumber, z);

      if (kf.scaleX !== undefined) ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
      if (kf.scaleY !== undefined) ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
    });

    scene.endUndoRedoAccum();
  }

  export function applyKeyFramesToSplittedPath(selection, keyframes) {
    for (const currentNode of selection.selectedNodes) {
      const layer = currentNode;
      const xCol = layer.getColumn('offset.X');
      const yCol = layer.getColumn('offset.Y');
      const zCol = layer.getColumn('offset.Z');

      const ScaleXCol = layer.getColumn('scale.x');
      const ScaleYCol = layer.getColumn('scale.y');

      MessageLog.trace('columns: ' + xCol + ' ' + yCol + ' ' + zCol);
      scene.beginUndoRedoAccum('Apply 3D Path Keyframes');
      keyframes.forEach((kf) => {
        MessageLog.trace(
          ' Applying kf at frame ' +
            (selection.startFrame + kf.frame) +
            ' x:' +
            kf.x +
            ' y:' +
            kf.y +
            ' z:' +
            kf.z,
        );
        const frameNumber = selection.startFrame + kf.frame;
        xCol.setKeyFrame(frameNumber, String(kf.x));
        yCol.setKeyFrame(frameNumber, String(kf.y));
        zCol.setKeyFrame(frameNumber, String(kf.z));

        ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
        ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
        // MessageLog.trace(">>>" + column.setEntry(xCol.name, 1, frameNumber, kf.x.toString()));
      });

      // Set reset keyframe after pasted keyframes
      const resetFrame = selection.startFrame + keyframes.length;
      xCol.setKeyFrame(resetFrame, '0');
      yCol.setKeyFrame(resetFrame, '0');
      zCol.setKeyFrame(resetFrame, '0');
      ScaleXCol.setKeyFrame(resetFrame, '1');
      ScaleYCol.setKeyFrame(resetFrame, '1');

      scene.endUndoRedoAccum();
    }
  }

  export function createFrameMarkers(marker: any, selection: oSelection) {
    for (const node of selection.selectedNodes) {
      for (let f = selection.startFrame; f <= selection.endFrame; f++) {
        try {
          var result = Timeline.createFrameMarker(node.index, marker, f);
          MessageLog.trace(
            'Created frame marker on node ' +
              node.name +
              ' (index ' +
              node.index +
              ') at frame ' +
              f +
              '. Result: ' +
              result,
          );
          MessageLog.trace(JSON.stringify(marker, null, 2));
        } catch (e) {
          MessageLog.trace('Error creating frame marker: ' + e.toString());
        }
      }
    }
  }

  export function deleteFrameMarkers(selection: oSelection) {
    for (const node of selection.selectedNodes) {
      for (let f = selection.startFrame; f <= selection.endFrame; f++) {
        var marker = Timeline.getFrameMarker(node.index, f);
        if (!marker) continue;
        var id = marker['id'];

        if (id !== -1) {
          var status = Timeline.deleteFrameMarker(node.index, id);
          MessageLog.trace(
            'Deleted frame marker ID ' +
              id +
              ' from node ' +
              node.name +
              ' at frame ' +
              f +
              ': ' +
              status,
          );
        }
      }
    }
  }

  export function resetFocusedNodes() {
    Action.perform('onActionTimelineViewModeNormal()', 'timelineView');
  }

  export function focusOnNodes(nodes: string[]) {
    selection.addNodesToSelection(nodes);
    Action.perform('onActionTimelineViewModeSelectionOnly()', 'timelineView');
  }

  export function focusOnColumns(columnNames: string[]) {
    for (const colName of columnNames) {
      selection.addColumnToSelection(colName);
    }
    Action.perform('onActionTimelineViewModeSelectionOnly()', 'timelineView');
    selection.clearSelection();

    for (const colName of columnNames) {
      selection.addColumnToSelection(colName);
    }
  }

  export function getSelection() {
    return new G.oSelection();
  }

  /**
   * @param {FrameOptions} options - The configuration object.
   */
  export function getFrame(options) {
    return new Frame(options);
  }

  export function getLayer(index) {
    return layers[index];
  }

  export function updateLayers() {
    var numColumns = column.numberOf();
    var columns = [];
    for (var i = 0; i < numColumns; i++) {
      var colName = column.getName(i);
      var pos = column.getPos(colName);
      var displayName = column.getDisplayName(colName);
    }
    columns = columns.filter(function (col) {
      columns.push(new TimelineLayer(colName, displayName, pos, i));
      return col.orderIndex !== -1;
    });
    columns.sort(function (a, b) {
      return a.orderIndex - b.orderIndex;
    });
    return columns;
  }

  export function getAllLayers() {
    return layers;
  }

  export function setFrame(number: number) {
    frame.setCurrent(number);
  }

  export function getTimelineMarkersPresentAtFrame(frame: number): oTimelineMarker[] {
    var markers = TimelineMarker.getAllMarkers();

    return markers.filter(function (marker) {
      return frame >= marker.frame && frame < marker.frame + Math.max(marker.length, 1);
    });
  }

  export function getSceneMetadata(key, type) {
    try {
      var meta = scene.metadata(key, type);
      if (meta && meta.hasOwnProperty('value')) return meta.value;
    } catch (e) {
      // metadata may not exist or call may fail
    }
    return null;
  }

  export function setSceneMetadata(key, type, value, creator, version) {
    try {
      var metaObj = {
        name: key,
        type: type,
        value: value,
        creator: creator,
        version: version,
      };
      scene.setMetadata(metaObj);
      MessageLog.trace('✅ Set scene metadata: ' + key + ' = ' + value);
    } catch (e) {
      // ignore failures
    }
  }

  export function setMetadata(key, value) {
    try {
      var metaObj = {
        name: key,
        type: 'string',
        value: value,
        creator: 'harmony-ts',
        version: '1.0',
      };
      scene.setMetadata(metaObj);
    } catch (e) {
      MessageLog.trace('❌ Failed to set scene metadata: ' + key + ' | Error: ' + e.message);
    }
  }

  export function getMetadata(key) {
    try {
      var meta = scene.metadata(key, 'string');
      if (meta && meta.hasOwnProperty('value')) return meta.value;
    } catch (e) {
      // metadata may not exist or call may fail
    }
    return null;
  }
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

  function PathColumn3D(this: any, name: string, parentLayer: any) {
    BaseColumn.call(this, name, parentLayer);
  }

  /*
   * ES5 inheritance.
   */
  PathColumn3D.prototype = Object.create(BaseColumn.prototype);

  PathColumn3D.prototype.constructor = PathColumn3D;

  PathColumn3D.prototype.getX = function (frameNumber: number) {
    return Core.column.getEntry(this.name, 1, frameNumber);
  };

  PathColumn3D.prototype.getY = function (frameNumber: number) {
    return Core.column.getEntry(this.name, 2, frameNumber);
  };

  PathColumn3D.prototype.getZ = function (frameNumber: number) {
    return Core.column.getEntry(this.name, 3, frameNumber);
  };

  PathColumn3D.prototype.parseDirectionalValue = function (
    entry: string,
    positive: string,
    negative: string,
  ) {
    var value = parseFloat(entry);

    return entry.indexOf(positive) !== -1 ? value : -value;
  };

  PathColumn3D.prototype.getXVal = function (frameNumber: number) {
    return this.parseDirectionalValue(this.getX(frameNumber), 'E', 'W');
  };

  PathColumn3D.prototype.getYVal = function (frameNumber: number) {
    return this.parseDirectionalValue(this.getY(frameNumber), 'N', 'S');
  };

  PathColumn3D.prototype.getZVal = function (frameNumber: number) {
    return this.parseDirectionalValue(this.getZ(frameNumber), 'F', 'B');
  };

  PathColumn3D.prototype.setX = function (frameNumber: number, value: string | number) {
    var formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' E' : ' W') : value;

    return Core.column.setEntry(this.name, 1, frameNumber, formattedValue);
  };

  PathColumn3D.prototype.setY = function (frameNumber: number, value: string | number) {
    var formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' N' : ' S') : value;

    return Core.column.setEntry(this.name, 2, frameNumber, formattedValue);
  };

  PathColumn3D.prototype.setZ = function (frameNumber: number, value: string | number) {
    var formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' F' : ' B') : value;

    return Core.column.setEntry(this.name, 3, frameNumber, formattedValue);
  };

  /*
   * Convert any supported VectorInput into
   * a plain { x, y, z } object.
   */
  PathColumn3D.prototype.resolveVec3 = function (input: VectorInput) {
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

    /*
     * If you've placed Array on Core,
     * use Core.Array.isArray here.
     */
    if (Core.Array && Core.Array.isArray && Core.Array.isArray(input)) {
      return {
        x: input[0] !== undefined ? input[0] : 0,

        y: input[1] !== undefined ? input[1] : 0,

        z: input[2] !== undefined ? input[2] : 0,
      };
    }

    /*
     * Plain object form:
     *
     * { x, y, z }
     */
    return {
      x: input.x,
      y: input.y,
      z: input.z,
    };
  };

  PathColumn3D.prototype.setPosition = function (
    frameNumber: number,
    position: VectorInput,
    tension?: number,
    continuity?: number,
    bias?: number,
  ) {
    if (tension === undefined) {
      tension = 0;
    }

    if (continuity === undefined) {
      continuity = 0;
    }

    if (bias === undefined) {
      bias = 0;
    }

    var v = this.resolveVec3(position);

    Core.func.addKeyFramePath3d(this.name, frameNumber, v.x, v.y, v.z, tension, continuity, bias);
  };

  PathColumn3D.prototype.isKeyFrame = function (frameNumber: number, subColumn?: number) {
    if (subColumn === undefined) {
      subColumn = 1;
    }

    return Core.column.isKeyFrame(this.name, subColumn, frameNumber);
  };

  PathColumn3D.prototype.isKeyFrameX = function (frameNumber: number) {
    return Core.column.isKeyFrame(this.name, 1, frameNumber);
  };

  PathColumn3D.prototype.isKeyFrameY = function (frameNumber: number) {
    return Core.column.isKeyFrame(this.name, 2, frameNumber);
  };

  PathColumn3D.prototype.isKeyFrameZ = function (frameNumber: number) {
    return Core.column.isKeyFrame(this.name, 3, frameNumber);
  };

  PathColumn3D.prototype.isKeyFrameVelocity = function (frameNumber: number) {
    return Core.column.isKeyFrame(this.name, 4, frameNumber);
  };

  PathColumn3D.prototype.isKeyFrameAny = function (frameNumber: number) {
    return (
      this.isKeyFrameX(frameNumber) ||
      this.isKeyFrameY(frameNumber) ||
      this.isKeyFrameZ(frameNumber)
    );
  };

  PathColumn3D.prototype.isKeyFrameAll = function (frameNumber: number) {
    return (
      this.isKeyFrameX(frameNumber) &&
      this.isKeyFrameY(frameNumber) &&
      this.isKeyFrameZ(frameNumber)
    );
  };

  PathColumn3D.prototype.toString = function () {
    return 'PathColumn3D<' + this.name + '>';
  };

  return PathColumn3D;
}

function createDrawingElementColumnClass(Core: any) {
  var BaseColumn = Core.oColumn;

  function DrawingElementColumn(this: any, name: string, parentLayer: any) {
    Core.MessageLog.trace('name ' + name);

    Core.MessageLog.trace('name ' + Core.column.getEntry(name, 1, Core.frame.current()));

    /*
     * Equivalent to:
     *
     * super(name, parentLayer)
     */
    BaseColumn.call(this, name, parentLayer);

    this.element = new Core.oElement(Core.node.getElementId(parentLayer.nodePath));
  }

  /*
   * ES5 inheritance.
   */
  DrawingElementColumn.prototype = Object.create(BaseColumn.prototype);

  DrawingElementColumn.prototype.constructor = DrawingElementColumn;

  /*
   * Override getKeyframe().
   */
  DrawingElementColumn.prototype.getKeyframe = function (frameNumber: number) {
    /*
     * Equivalent to:
     *
     * super.getKeyframe(frameNumber)
     */
    var drawingName = BaseColumn.prototype.getKeyframe.call(this, frameNumber);

    if (drawingName === '') {
      return null;
    }

    return new Core.oDrawing(drawingName, this.element);
  };

  /*
   * Override setKeyFrame().
   */
  DrawingElementColumn.prototype.setKeyFrame = function (
    startOrSelection: any,
    value: any,
    endFrame?: number,
  ) {
    if (value instanceof Core.oDrawing) {
      return BaseColumn.prototype.setKeyFrame.call(this, startOrSelection, value.name, endFrame);
    }

    return BaseColumn.prototype.setKeyFrame.call(this, startOrSelection, value, endFrame);
  };

  /*
   * Override pasteLoopKeyframe().
   */
  DrawingElementColumn.prototype.pasteLoopKeyframe = function (
    sourceValue: any,
    destinationFrame: number,
  ) {
    var drawing = sourceValue;

    if (!drawing) {
      return BaseColumn.prototype.setKeyFrame.call(this, destinationFrame, '');
    }

    var copiedDrawing = drawing.duplicate();

    if (!copiedDrawing) {
      return false;
    }

    return BaseColumn.prototype.setKeyFrame.call(this, destinationFrame, copiedDrawing.name);
  };

  DrawingElementColumn.prototype.copyDrawingRangeTo = function (selection: any, destFrame: number) {
    /*
     * TimelineKit can be initialized later.
     *
     * We only resolve it when this method is actually
     * called.
     */
    var pasteSelection = new Core.TimelineKit.oSelection(
      destFrame,

      destFrame + selection.endFrame - selection.startFrame,
    );

    return this.loopKeyframes(selection, pasteSelection);
  };

  DrawingElementColumn.prototype.copyDrawingTo = function (drawing: any, destFrame: number) {
    var copiedDrawing = drawing.duplicate();

    if (!copiedDrawing) {
      Core.MessageLog.trace('Failed to copy drawing for duplication.');

      return false;
    }

    return this.setKeyFrame(destFrame, copiedDrawing.name);
  };

  return DrawingElementColumn;
}
