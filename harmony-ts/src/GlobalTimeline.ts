include("Frame.js");
include("Layer.js");

include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/DrawingDataUtils.js");

class Cell {
  frame: number;
  node: NodeLayer;
  constructor(frame: number, node: NodeLayer) {
    this.frame = frame;
    this.node = node;
  }

  toString() {
    return "Cell(frame: " + this.frame + ", node: " + this.node.name + ")";
  }
}

class DrawingCell extends Cell {
	drawingName: string;

	constructor(frame: number, node: NodeLayer) {
		super(frame, node);
		this.drawingName = node.getColumn("DRAWING.ELEMENT").getKeyframe(frame);
	}

	getDrawingData(art: number) {
		var data = Drawing.query.getData({
			drawing: {
				node: this.node.nodePath,
				frame: this.frame
			},
			art: art
		});
		return data;
		// return DrawingDataUtils.getDrawingData(new oSelection(this.frame, undefined, [this.node]), art);
	}
}


function saveKeyFramesFrom3DPath() {
  const selection = G.GlobalTimeline.getSelection();
  const PathColumn3D = selection.selectedNodes[0].getColumn("offset.attr3dpath") as PathColumn3D;
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


function serializeKeyFramesFromSplittedPath(selection: oSelection) {

  
  // const selection = G.GlobalTimeline.getSelection();
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

  var savePath = QFileDialog.getSaveFileName(0, "Save As", "", "JSON Files (*.json);;All Files (*)");
  if (savePath) {
    G.FileUtils.writeTo(savePath, JSON.stringify(keyframes, null, 2));
    MessageLog.trace("Keyframes saved to: " + savePath);
  } else {
    MessageLog.trace("No file selected for saving keyframes.");
  }
}


class oSelection {
	public startFrame: number;
	public endFrame: number;
	isRange: boolean;
	length: number;

	selectedNodes: NodeLayer[];
	
	constructor(startFrame?: number, endFrame?: number, selectedNodes?: NodeLayer[]) {
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
		this.selectedNodes = selectedNodes !== undefined ? selectedNodes : Object._.LayerManager.getSelectedNodes();
		this.length = this.endFrame - this.startFrame + 1;
	}

	toString() {
		return "Selection from frame " + this.startFrame + " to " + this.endFrame + " | " + this.selectedNodes.join(", ");
	}

	getSelectSize() {
		return this.length * this.selectedNodes.length;
	}

	forEach(callback: (node: NodeLayer, frame: number) => void) {
		for (const node of this.selectedNodes) {
			for (let f = this.startFrame; f <= this.endFrame; f++) {
				callback(node, f);
			}
		}
	}

	getCell(): Cell {
		// MessageLog.trace("type " + this.selectedNodes[0].getType());
		if (this.selectedNodes[0].getType() === "READ") {
			return new DrawingCell(this.startFrame, this.selectedNodes[0]);
		}
		return new Cell(this.startFrame, this.selectedNodes[0]);
	}
}

type frameRange = Omit<oSelection, "selectedNodes">;

class GlobalTimelineClass {
	layers: any[];



	applyKeyFramesTo3DPath(selection: oSelection, keyframes: any[]) {
		const layer = selection.selectedNodes[0];
		const PathColumn3D = layer.getColumn("position.attr3dpath") as PathColumn3D;
		const ScaleXCol = layer.getColumn("scale.x") as Column;
		const ScaleYCol = layer.getColumn("scale.y") as Column;

		scene.beginUndoRedoAccum("Apply Keyframes to 3D Path");
		keyframes.forEach((kf: any) => {
			const frameNumber = selection.startFrame + kf.frame;

			MessageLog.trace(" >>> " + kf.x);

			const x = Math.abs(kf.x) + (kf.x >= 0 ? " E" : " W");
			const y = Math.abs(kf.y) + (kf.y >= 0 ? " N" : " S");
			const z = Math.abs(kf.z) + (kf.z >= 0 ? " F" : " B");

			MessageLog.trace("<<<<<<<< " + JSON.stringify([x,y,z], null, 2));
			
			PathColumn3D.setX(frameNumber, x);
			PathColumn3D.setY(frameNumber, y);
			PathColumn3D.setZ(frameNumber, z);

			if (kf.scaleX !== undefined) ScaleXCol.setKeyFrame(frameNumber, kf.scaleX);
			if (kf.scaleY !== undefined) ScaleYCol.setKeyFrame(frameNumber, kf.scaleY);
		});
		
		scene.endUndoRedoAccum();
	}


	applyKeyFramesToSplittedPath(selection, keyframes) {
		for (const currentNode of selection.selectedNodes) {
			const layer = currentNode;
			const xCol = layer.getColumn("offset.X");
			const yCol = layer.getColumn("offset.Y");
			const zCol = layer.getColumn("offset.Z");

			const ScaleXCol = layer.getColumn("scale.x");
			const ScaleYCol = layer.getColumn("scale.y");

			MessageLog.trace("columns: " + xCol + " " + yCol + " " + zCol);
			scene.beginUndoRedoAccum("Apply 3D Path Keyframes");
			keyframes.forEach(kf => {
				MessageLog.trace(" Applying kf at frame " + (selection.startFrame + kf.frame) + " x:" + kf.x + " y:" + kf.y + " z:" + kf.z);
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
			xCol.setKeyFrame(resetFrame, "0");
			yCol.setKeyFrame(resetFrame, "0");
			zCol.setKeyFrame(resetFrame, "0");
			ScaleXCol.setKeyFrame(resetFrame, "1");
			ScaleYCol.setKeyFrame(resetFrame, "1");
			
			scene.endUndoRedoAccum();
		}
	}

	createFrameMarkers(marker: any, selection: oSelection) {
		for (const node of selection.selectedNodes) {
			for (let f = selection.startFrame; f <= selection.endFrame; f++) {
				try {
					var result = Timeline.createFrameMarker(node.index, marker, f);
					MessageLog.trace("Created frame marker on node " + node.name + " (index " + node.index + ") at frame " + f + ". Result: " + result);
					MessageLog.trace(JSON.stringify(marker, null, 2));
				} catch (e) {
					MessageLog.trace("Error creating frame marker: " + e.toString());
				}
			}
		}
	}


	deleteFrameMarkers(selection: oSelection) {
		// var frameMarkers = Timeline.getAllFrameMarkers(selection.selectedNodes[0].index);
		// stringify(frameMarkers);
		// for (const marker of  frameMarkers) {
		// 	Timeline.deleteFrameMarker(selection.selectedNodes[0].index, marker.id);
		// }
		// return;
		for (const node of selection.selectedNodes) {
			for (let f = selection.startFrame; f <= selection.endFrame; f++) {
				var marker = Timeline.getFrameMarker(node.index, f);
				if (!marker) continue;
				var id = marker["id"];

				if (id !== -1) {
					var status = Timeline.deleteFrameMarker(node.index, id);
					MessageLog.trace("Deleted frame marker ID " + id + " from node " + node.name + " at frame " + f + ": " + status);
				}
			}
		}
	}

	constructor() {
		this.layers = this.updateLayers();
	}


	resetFocusedNodes() {
		Action.perform("onActionTimelineViewModeNormal()", "timelineView");
	}

	focusOnNodes(nodes: string[]) {
		selection.addNodesToSelection(nodes);
		Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
	}

	focusOnColumns(columnNames: string[]) {
		for (const colName of columnNames) {
			selection.addColumnToSelection(colName);
		}
		Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
		selection.clearSelection();

		for (const colName of columnNames) {
			selection.addColumnToSelection(colName);
		}
	}

	getSelection() {
		return new G.oSelection();
	}

	/**
	 * @param {FrameOptions} options - The configuration object. 
	 */
	getFrame(options) {
		return new Frame(options);
	}

	getLayer(index) {
		return this.layers[index];
	}

	updateLayers() {
		var numColumns = column.numberOf();
		var columns = [];
		for (var i = 0; i < numColumns; i++) {
			var colName = column.getName(i);
			var pos = column.getPos(colName);
			var displayName = column.getDisplayName(colName);
			columns.push(new TimelineLayer(colName, displayName, pos, i));
		}
		columns = columns.filter(function (col) { return col.orderIndex !== -1; });
		columns.sort(function (a, b) { return a.orderIndex - b.orderIndex; });
		return columns;
	}

	getAllLayers() {
		return this.layers;
	}

	getSceneMetadata(key, type) {
		try {
			var meta = scene.metadata(key, type);
			if (meta && meta.hasOwnProperty('value')) return meta.value;
		} catch (e) {
			// metadata may not exist or call may fail
		}
		return null;
	}

	setSceneMetadata(key, type, value, creator, version) {
		try {
			var metaObj = {
				name: key,
				type: type,
				value: value,
				creator: creator,
				version: version
			};
			scene.setMetadata(metaObj);
			MessageLog.trace("✅ Set scene metadata: " + key + " = " + value);
		} catch (e) {
			// ignore failures
		}
	}

	setMetadata(key, value) {
		try {
			var metaObj = {
				name: key,
				type: "string",
				value: value,
				creator: "harmony-ts",
				version: "1.0"
			};
			scene.setMetadata(metaObj);
		}
		catch (e) {
			MessageLog.trace("❌ Failed to set scene metadata: " + key + " | Error: " + e.message);
		}
	}

	getMetadata(key) {
		try {
			var meta = scene.metadata(key, "string");
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
	return this.name + " (" + this.displayName + ") - OrderIndex: " + this.orderIndex;
};

// Create the global instance
var GlobalTimeline = new GlobalTimelineClass();

function createDrawingAtFrame(nodePath, frameNum) {

	var settings = Tools.getToolSettings();
	if (settings.currentDrawing) {
		return;
	}
	scene.beginUndoRedoAccum("Create Drawing example");
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
	MessageLog.trace("TestCallable invoked");
}