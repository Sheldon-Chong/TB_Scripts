include("globals.js");
include("openHarmony.js");
include("DrawingPaster.js");
include("test.js");
include("Transformations.js");
include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/ColorUtils.js")

include("Frame.js");
include("GlobalTimeline.js");
include("DrawingView.js");
include(specialFolders.userScripts + "/utils/LogUtils.js");
include(specialFolders.userScripts + "/utils/Shapes.js");
include("Toolbar.js");
include("Layers.js");
include(specialFolders.userScripts + "/Renderer.js");
include(specialFolders.scripts + "/widgets/WidgetUtils.js");


// ToggleGroup class: manages exclusive selection among ToggleButtons
class ToggleGroup {
	constructor() {
		this.buttons = [];
	}
	add(button) {
		this.buttons.push(button);
		button._toggleGroup = this;
	}
	select(button) {
		for (let btn of this.buttons) {
			if (btn !== button) {
				btn.setSelected(false, true); // silent update
			}
		}
	}
}


type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

type passRange = IntRange<0, 15>;
type LightingGroupRange = IntRange<1, 8>;

interface oColor {
	r: number;
	g: number;
	b: number;
	a: number;
};

interface LightingData {
	mood: { 
		colorGain: number; 
		drawing: number;
	};
	light: {
		drawing: number;
		transparency: number;
		bloom: {
			colorGain: number;
			color: oColor;
		};
	};
	shadow: {
		
	}
	rimlight: {
		drawing: number;
		left: {
			colorGain: number;
			color: oColor;
			radius: number;
		};
		right: {
			colorGain: number;
			color: oColor;
			radius: number;
		};
	}
}


const MarkerColors = {
	RED: "Red",
	ORANGE: "Orange",
	YELLOW: "Yellow",
	GREEN: "Green",
	CYAN: "Cyan",
	BLUE: "Blue",
	PURPLE: "Purple",
	PINK: "Pink",
	WHITE: "White",
	BLACK: "Black"
} as const;

class LitDrawing {
	name: String;
	layer: NodeLayer;
	masterLightingController: MasterLightingController;

	constructor(name: String, layer: NodeLayer, masterLightingController: MasterLightingController) {
		this.name = name;
		this.layer = layer;
		this.masterLightingController = masterLightingController;
	}

	appliedLightingGroups(selection?: oSelection) {
		var selection = selection ?? new oSelection();
		
	}

	applyLighting(lightingGroup: LightingGroupRange, selection?: oSelection) {
		this.masterLightingController.clearLighting(selection);
	}
}

class MasterLightingController {
	setAllLightingGroupsEnabled(enabled: boolean) {
		for (const group of this.lightingGroups) {
			group.setEnabled(enabled);
		}
	}
	
	areAllLightingGroupsEnabled() {
		for (const group of this.lightingGroups) {
			if (!group.isEnabled()) {
				return false;
			}
		}
		return true;
	}

	lightingGroups: LightingGroup[];

	renderPreviewNode: NodeLayer;

	static LIGHTING_CONTROLLER_PREFIX: string = "lighting_controller_";

	setRenderPreviewEnabled(enabled: boolean) {
		this.renderPreviewNode.setEnabled(enabled);
	}
	isRenderPreviewEnabled(): boolean {
		return this.renderPreviewNode.isEnabled();
	}

	setEnabledForAllLightingGroups(enabled: boolean) {
		for (const group of this.lightingGroups) {
			group.setEnabled(enabled);
		}
	}

	setLightingGroupOfSelection(lightingGroup: LightingGroup, selection: oSelection) {
		scene.beginUndoRedoAccum("Apply Lighting Passes");
		lightingGroup.masterLightingController.clearLighting(selection);
		G.GlobalTimeline.createFrameMarkers(lightingGroup.passManager.marker, selection);

		// lightingGroup.passManager.setAllPasses(selection, true);
    for (const node of selection.selectedNodes) {
      var index = PassManager.getPassIndexFromNode(node.name);
      lightingGroup.passManager.setPass(index, selection, true);
    }
		// var lightingData = lightingGroup.getValues(selection);
		// for (const [path, column] of Object.entries(lightingGroup.getFlattenedColumns())) {
		// 	(column as Column).deleteKeyframes(new G.oSelection());
		// 	(column as Column).setKeyFrame(new G.oSelection(), G.Utils.getValueByPath(lightingData, path));
		// }
		scene.endUndoRedoAccum();
	}

	getAppliedLightingGroup(selection: oSelection) {
		for (const lightingGroup of this.lightingGroups) {
			if (lightingGroup.passManager.isNodeInGroup(selection)) 
				return lightingGroup;
		}
		return null;
	}

	getAppliedLightingGroups(selection: oSelection) {
		const appliedGroups = [];
		for (const lightingGroup of this.lightingGroups) {
			if (lightingGroup.passManager.isNodeInGroup(selection))
				appliedGroups.push(lightingGroup);
		}
		return appliedGroups;
	}
	

	constructor() {
		this.renderPreviewNode = LayerManager.getNodeLayer("Top/RenderPreview");

		const RENDER_PREVIEW_SCALE = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "1/1"];
		
		var sNode = "Top/RenderPreview";

		var wAttr = node.getAttr(sNode, 1, "scaling");

		var myAttributeValue = wAttr.textValue();
		MessageLog.trace("RenderPreview scaling attribute value: " + myAttributeValue);

		var lightingGroups = (G.LayerManager.getNodeLayers().filter(function (layer) {
			return layer.name.indexOf(MasterLightingController.LIGHTING_CONTROLLER_PREFIX) === 0;
		})).sort(function(a,b) {
			return a.name.localeCompare(b.name);
		}).map(bind(function (layer, index) {
			return new LightingGroup(layer, (index + 1) as LightingGroupRange, this, `Lighting Group ${index + 1}`);
		}, this));

		this.lightingGroups = lightingGroups;
	}

	getAllLightingGroups() {
		return this.lightingGroups;
	}

	getLightingGroup(ControllerIndex: IntRange<1,8>){
		return this.lightingGroups[ControllerIndex - 1];
	}

	toString() { return `MasterLightingController<${this.lightingGroups.length} controllers>`; }

	clearLighting(selection: oSelection) {
		scene.beginUndoRedoAccum("Clear Lighting Passes");
		for (const lightingGroup of this.lightingGroups) {
			// lightingGroup.passManager.clearLighting(selection);
			// lightingGroup.passManager.setAllPasses(selection, false);

			for (const node of selection.selectedNodes) {
				var index = PassManager.getPassIndexFromNode(node.name);
				lightingGroup.passManager.setPass(index, selection, false);
			}

			G.GlobalTimeline.deleteFrameMarkers(selection);
		}
		scene.endUndoRedoAccum();
	}

	static getSelectedPasses() {
		const selectedNodes = LayerManager.getSelectedNodes();
		
		const selectedPasses = [];
		for (const node of selectedNodes) {
			selectedPasses.push(PassManager.getPassIndexFromNode(node.name));
		}
		return selectedPasses;
	} 

	isolateLighting(
		lightingGroup: LightingGroupRange, 
		selectedRange?: oSelection,
		passes?: passRange[]
	) {
		var selectedRange = selectedRange ?? new G.oSelection();
		this.clearLighting(selectedRange);
		this.getLightingGroup(lightingGroup).passManager.addToGroup(selectedRange.selectedNodes);
	}
}


class PassManager {
	marker: typeof MarkerColors | null = null;
	index: number = -1;
	layer: NodeLayer;
	lightingGroup: LightingGroup;

	passes: Column[];

	static ENABLED = 1;
	static DISABLED = 0;
	
	static MAPPINGS = {
		1: {
			marker: MarkerColors.RED,
			symbol: "🔴",
			color: "#800000",
		},
		2: {
			marker: MarkerColors.ORANGE,
			symbol: "🟠",
			color: "#CC8400"
		},
		3: {
			marker: MarkerColors.YELLOW,
			symbol: "🟡",
			color: "#CABC00"
		},
		4: {
			marker: MarkerColors.GREEN,
			symbol: "🟢",
			color: "#116000"
		},
		5: {
			marker: MarkerColors.BLUE,
			symbol: "🔵",
			color: "#000080"
		},
		6: {
			marker: MarkerColors.PURPLE,
			symbol: "🟣",
			color: "#400040"
		},
		7: {
			marker: MarkerColors.WHITE,
			symbol: "⚪",
			color: "#404040"
		},
		8: {
			marker: MarkerColors.BLACK,
			symbol: "⚫",
			color: "#000000"
		},
	} as const;

	static getPassIndexFromNode(nodeName: string): passRange {
		return (parseInt(nodeName.substring(5)) - 1) as passRange;
	}

	toString() { return `PassManager<index:${this.index}>` }



	clearLighting(selection: oSelection) {
		scene.beginUndoRedoAccum("Clear Lighting Passes");
		for (const pass of this.passes) {
			// pass.deleteKeyframes(selection);
			// pass.setKeyFrame(new G.oSelection(selection.startFrame), PassManager.DISABLED);
      pass.setKeyFrame(selection, PassManager.DISABLED);
		}
		scene.endUndoRedoAccum();
	}

	constructor(layer: NodeLayer, index: number, lightingGroup: LightingGroup) {
		this.marker = PassManager.MAPPINGS[index].marker;
		this.layer = layer;
		this.index = index;
		this.lightingGroup = lightingGroup;

		this.passes = (this.layer.getChild("Drawing_Passes").getChildren() ?? []).filter(function (child) {
			return child !== null && child.name.indexOf("pass_") === 0;
		}).sort(function (a, b) {
			var numA = parseInt(a.name.substring(5));
			var numB = parseInt(b.name.substring(5));
			return numA - numB;
		}).map(function (child) {
			return child.getColumn("Port_Index");
		});
	}

	setPass(passIndex: passRange, selection: oSelection, enabled: boolean) {
		this.passes[passIndex].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
	}

	setPasses(passIndexes: passRange[], selection: oSelection, enabled: boolean) {
		for (var i = 0; i < passIndexes.length; i++)
			this.passes[passIndexes[i]].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
	}

	setAllPasses(selection: oSelection, enabled: boolean) {
		MessageLog.trace(" cleared ");
		for (var i = 0; i < this.passes.length; i++)
			this.passes[i].setKeyFrame(selection, enabled ? PassManager.ENABLED : PassManager.DISABLED);
	}

	addToGroup(nodes: NodeLayer[]) {
		this._validateNodeIsDrawingPass(nodes);

		var self = this;
		nodes.forEach(function (currentNode) {
			var passIndex = PassManager.getPassIndexFromNode(currentNode.name);
			self.setPass(passIndex, new G.oSelection(), true);
			var id = Timeline.createFrameMarker(currentNode.index, PassManager.MAPPINGS[self.index].marker, frame.current());
		});
	}

	isNodeInGroup(currentSelection?: oSelection): boolean {
		var currentSelection = currentSelection ?? new G.oSelection(); 
		this._validateNodeIsDrawingPass([currentSelection.selectedNodes[0]]);
		var passIndex = (parseInt(currentSelection.selectedNodes[0].name.substring(5)) - 1) as passRange;
		var passValue = Number(this.passes[passIndex].getKeyframe(currentSelection.startFrame));
		return passValue === PassManager.ENABLED;
	}

	removeFromGroup(nodes: NodeLayer[]) {
		this._validateNodeIsDrawingPass(nodes);
		var self = this;
		nodes.forEach(function (currentNode) {
			var passIndex = (parseInt(currentNode.name.substring(5)) - 1) as passRange;
			self.setPass(passIndex, new G.oSelection(), false);
		});
	}

	/* GROUP MANAGEMENT */

	_validateNodeIsDrawingPass(nodes: NodeLayer[]) {
		var allParentsAreDrawings = nodes.every(function (node) {
			return (node.getParent() && node.getParent().name === "Drawings");
		});

		if (!allParentsAreDrawings)
			throw new Error("All selected nodes must be children of 'Drawings' node.");
	}
}

this.__proto__.PassManager = PassManager;


// Usage:
class LightingGroup {
	public layer: NodeLayer;
	passManager: PassManager;

	public name: string;

	index: LightingGroupRange;
	controlNodes: any;
	controls: Record<string, Record<string, Column>> = {};
	
	masterLightingController: MasterLightingController;

	toString() { return `LightingGroup<${this.index}>`; }

	getName() {
		return this.name;
	}

	setEnabled (enabled: boolean) {
		this.layer.setEnabled(enabled);
	}

	isEnabled(): boolean {
		return this.layer.isEnabled();
	}

	constructor(
		layer: NodeLayer, 
		index: LightingGroupRange, 
		masterLightingController: MasterLightingController,
		name: string
	) {

		this.name = name;
		this.layer = layer;
		this.index = index || 1;

		this.passManager = new PassManager(layer, index, this);
		
		this.masterLightingController = masterLightingController;

		this.controlNodes = {
			Mood: "Mood",
			Rimlight_Left_Bloom: "Rimlight_Left_Bloom",
			Rimlight_Right_Bloom: "Rimlight_Right_Bloom",
			Light_Bloom: "Light_Bloom",
			Light: "Light_Transparency",
			Rimlight_Right_Peg: "Rimlight_Right_Peg",
			Rimlight_Left_Peg: "Rimlight_Left_Peg",
			Shadows_Peg: "Shadows_Peg",
		}

		this.controls = {};
		objectForEach(this.controlNodes, (name, node: string) => {
			var node = this.layer.getChild(node) as NodeLayer;

			const type = node.getType();
			const map = {}

			const VALID_TYPES = ["GLOW", "HIGHLIGHT", "TONE", "FADE"];
			if (VALID_TYPES.indexOf(type) !== -1)
				node.getEditableAttributes().forEach(attr => map[attr] = node.getColumn(attr));

			this.controls[name] = map;
		});
	}

	/* PROPERTY EDITING */

	editLightingGroup() {
		selection.clearSelection();
		selection.addNodesToSelection((this.layer.getChildrenRecursive().filter(function (child: NodeLayer) {
			return child.getLocked() === false && child.isGroup() === false;
		}).map(function (child) {
			return child.nodePath;
		})));
		Action.perform("onActionTimelineViewModeSelectionOnly()", "timelineView");
	}

	editProperty(name: string) {
		selection.clearSelection();
		G.GlobalTimeline.focusOnNodes((this.layer.getChildrenRecursive().filter(function (child: NodeLayer) {
			return child.getLocked() === false && child.isGroup() === false && child.name.indexOf(name) !== -1;
		}).map(function (child) {
			return child.nodePath;
		})));
	}

	editPropertyAttribute(name: string, attribute: string) {

		var name = this.layer.getColumn(name).name;
		MessageLog.trace("Focusing on column: " + name);
		G.GlobalTimeline.focusOnColumns([name]);
	}

	editLight() { this.editProperty("Light"); }
	editMood() { this.editProperty("Mood"); }
	editRimlight() { this.editProperty("Rimlight"); }
	editShadow() { this.editProperty("Shadow"); }

	static getColumns(layer: NodeLayer, selection: oSelection) {
		var data = {
			mood: {
				colorGain: layer.getColumn("/Mood|COLOUR_GAIN"),
				drawing: layer.getColumn("/Lighting_Drawings/Drawing_Mood|DRAWING.ELEMENT"),
			},
			light: {
				drawing: layer.getColumn("/Lighting_Drawings/Drawing_Light|DRAWING.ELEMENT"),
				transparency: layer.getColumn("/Light_Transparency|transparency"),
				bloom: {
					colorGain: layer.getColumn("/Light_Bloom|COLOUR_GAIN"),
					color: {
						r: layer.getColumn("/Light_Bloom|COLOR.RED"),
						g: layer.getColumn("/Light_Bloom|COLOR.GREEN"),
						b: layer.getColumn("/Light_Bloom|COLOR.BLUE"),
						a: layer.getColumn("/Light_Bloom|COLOR.ALPHA")
					},
					radius: layer.getColumn("/Light_Bloom|RADIUS")
				}
			},
			shadow: {
				drawing: layer.getColumn("/Lighting_Drawings/Drawing_Shadow|DRAWING.ELEMENT"),
			},
			rimlight: {
				drawing: layer.getColumn("/Lighting_Drawings/Drawing_Rimlight|DRAWING.ELEMENT"),
				left: {
					colorGain: layer.getColumn("/Rimlight_Left_Bloom|COLOUR_GAIN"),
					color: {
						r: layer.getColumn("/Rimlight_Left_Bloom|COLOR.RED"),
						g: layer.getColumn("/Rimlight_Left_Bloom|COLOR.GREEN"),
						b: layer.getColumn("/Rimlight_Left_Bloom|COLOR.BLUE"),
						a: layer.getColumn("/Rimlight_Left_Bloom|COLOR.ALPHA")
					},
					radius: layer.getColumn("/Rimlight_Left_Bloom|RADIUS"),
				},
				right: {
					colorGain: layer.getColumn("/Rimlight_Right_Bloom|COLOUR_GAIN"),
					color: {
						r: layer.getColumn("/Rimlight_Right_Bloom|COLOR.RED"),
						g: layer.getColumn("/Rimlight_Right_Bloom|COLOR.GREEN"),
						b: layer.getColumn("/Rimlight_Right_Bloom|COLOR.BLUE"),
						a: layer.getColumn("/Rimlight_Right_Bloom|COLOR.ALPHA")
					},
					radius: layer.getColumn("/Rimlight_Right_Bloom|RADIUS"),
				}
			}
		}

		return data;
	}

	columnsCache: any;

	getColumns() {
		if (this.columnsCache === undefined) {
			this.columnsCache = LightingGroup.getColumns(this.layer, new G.oSelection());
		}

		const copy = G.Utils.deepCopy(this.columnsCache);
		return copy;
	}

	getFlattenedColumns(): Record<string, Column> {
		var attributeColumns = this.getColumns();
		var flatColumns: Record<string, Column> = {};
		G.Utils.forEachLeafValue(attributeColumns, (value: any, path: string) => {
			if (value.constructor.name === "Column") {
				flatColumns[path] = value as Column;
			}
		});
		return flatColumns;
	}

	public multipleValueColumns: Record<string, any[]> = {};

	getValues(selection: oSelection = new G.oSelection()) {
		this.multipleValueColumns = {};
		var attributeColumns = this.getColumns();

		G.Utils.forEachLeafValue(attributeColumns, (value: any, path: string) => {
			if (value.constructor.name === "Column") {
				var col = value as Column;

				// var keyframeOrKeyframes = col.getKeyframeRangeSimplify(selection);
				var keyframeOrKeyframes  = col.getKeyframe(selection.startFrame);
        if (Array.isArray(keyframeOrKeyframes)) {
					var uniqueValues = [];
					for (var i = 0; i < keyframeOrKeyframes.length; i++) {
						if (uniqueValues.indexOf(keyframeOrKeyframes[i]) === -1) {
							uniqueValues.push(keyframeOrKeyframes[i]);
						}
					}
					this.multipleValueColumns[path] = uniqueValues;

					if (col.parent.name.indexOf("Drawing_") !== -1)
						return keyframeOrKeyframes[0];
					return Number(keyframeOrKeyframes[0]);
				} 
				
				else {
					if (col.parent.name.indexOf("Drawing_") !== -1) 
						return keyframeOrKeyframes;
					
					return Number(keyframeOrKeyframes);
				}

				return Number(col.getMostCommonKeyframeFromRange(selection));
			}
		})
		return attributeColumns as LightData;
	}

	serializeLighting(selection: oSelection = new G.oSelection()): LightData {
		return this.getValues(selection);
	}


	exportLighting() {
		var defaultDir = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\test\\lightingPresets";
		var defaultName = "lighting.json";
		var defaultPath = defaultDir + "/" + defaultName;

		var savePath = QFileDialog.getSaveFileName(0, "Save As", defaultPath);
		if (!savePath)
			return;

		var data = this.serializeLighting(G.GlobalTimeline.getSelection());
		G.FileUtils.writeTo(savePath, JSON.stringify(data, null, 2));
	}

	importLighting(path?: string) {
		var defaultDir = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\test\\lightingPresets";
		var defaultName = "lighting.json";
		var defaultPath = defaultDir + "/" + defaultName;
		
		var openPath: string;
		if (path) {
			openPath = path;
		} else {
			openPath = QFileDialog.getOpenFileName(0, "Open Lighting File", defaultPath, "JSON Files (*.json)");
			if (!openPath)
				return false;
		}
		
		MessageLog.trace("importing lighting from: " + openPath);
		var fileContent = G.FileUtils.readFrom(openPath);
		if (!fileContent)
			return;
		var data: LightingData = JSON.parse(fileContent);
		this.setLighting(data);
		return data;
	}

	setLighting(lightingData: any) {
		MessageLog.trace(JSON.stringify(lightingData, null, 2));

		var lightingData = G.Utils.shallowCopy(lightingData);

		var columns = this.getColumns();
		G.Utils.forEachLeafValue(columns, (value, path, isLeaf: boolean) => {
			if (value.constructor.name === "Column") {
				var col = value as Column;
				if (col.getType() === "DRAWING") {
					var elementId = col.parent.getElementId();
					var element = new G.oElement(elementId);

					var drawing = G.Utils.getValueByPath(lightingData, path);
					if (!element.exists(drawing)) {

            MessageLog.trace("Element does not exist: " + drawing + " for column: " + path);
						return ;
          }
					var drawingObj = element.duplicateDrawing(`Imported_${drawing}`, drawing);

					col.setKeyFrame(new G.oSelection(), drawingObj.name);
					MessageLog.trace("drawing : " + drawingObj.toString());
					return;
				}
				col.setKeyFrame(new G.oSelection(), G.Utils.getValueByPath(lightingData, path));
			}
		});
	}
}
type LightData = ReturnType<typeof LightingGroup.getColumns>;

function wrapWithCatch(fn, prefix?: string) {
	return function () {
		try {
			return fn.apply(this, arguments);
		} catch (e) {
			MessageLog.trace(prefix + "⚠️ >>>     Caught error: " + e.toString() + "|  line: " + e.lineNumber + " | " + e.fileName + " | " + e.stack);
		}
	};
}



Object.entries = function(obj) {
  if (obj == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }
  var ownProps = Object.keys(obj);
  var resArray = new Array(ownProps.length);
  for (var i = 0; i < ownProps.length; i++) {
    resArray[i] = [ownProps[i], obj[ownProps[i]]];
  }
  return resArray;
};


