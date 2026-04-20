
include("GlobalTimeline.js");
include("globals.js");


function recursiveWalk(obj, callback) {
	function recurse(o) {
		if (Array.isArray(o)) {
			for (var i = 0; i < o.length; i++)
				recurse(o[i]);
		}

		else if (typeof o === "object" && o !== null) {
			for (var key in o) {
				if (!o.hasOwnProperty(key)) continue;
				callback(key, o[key]);
				recurse(o[key]);
			}
		}
	}
	recurse(obj);
}
this.__proto__.recursiveWalk = recursiveWalk;


interface DrawingColor {
	objectName: string;
	isTexture: boolean;
	name: string;
	id: string;
	isValid: boolean;
	colorType: number;
	colorData: {
		a: number;
		b: number;
		g: number;
		r: number;
	};
}


this.__proto__.getParentPalette = function getParentPalette(colorId: string) {
	var palettes = PaletteObjectManager.getScenePaletteList();
	for (var i = 0; i < palettes.numPalettes; i++) {
		var palette = palettes.getPaletteByIndex(i);
		var color = palette.getColorById(colorId);
		if (color.isValid) {
			return palette;
		}
	}
	return null;
}

function openFrameMonitorWindow() {


	const window = new QWidget();
	window.setWindowTitle("Frame Monitor");
	window.resize(300, 100);

	// Create layout
	const frameLabel = new QLabel("Current Frame: " + frame.current());

	const layout = new QVBoxLayout();
	layout.addWidget(frameLabel, 0, 0);

	window.setLayout(layout);
	const frameNotifier = new SceneChangeNotifier(layout);

	// Store the initial frame as previousFrame
	G.GlobalTimeline.setMetadata("previousFrame", frame.current());

	const frameChangedHandler = G.Utils.bind(function () {
		try {
			const previousFrame = parseInt(G.GlobalTimeline.getMetadata("previousFrame"));
			const currentSelection = G.GlobalTimeline.getSelection();
			const currentCell = currentSelection.getCell();

			frameLabel.text = "Current Frame: " + currentCell.frame;
			
			// Skip if we're still on the same frame (initial trigger)
			if (previousFrame === currentCell.frame) {
				return;
			}
			
			// Create a cell for the previous frame to get its drawing data
			const previousCell = new G.DrawingCell(previousFrame, currentCell.node);
			var settings = Tools.getToolSettings();
			const data = previousCell.getDrawingData(settings.activeArt);
			const palletesUsed = G.DrawingDataUtils.getPalletesUsedFromDrawingData(data);

			MessageLog.trace("Analyzing frame " + previousFrame + " (previous) while at frame " + currentCell.frame + " (current)");

			if (!palletesUsed || palletesUsed.length === 0) {
				MessageLog.trace("No palettes found in " + currentCell.node.nodePath + " at frame " + previousFrame);
				G.GlobalTimeline.setMetadata("previousFrame", currentCell.frame);
				return;
			}

			let palleteName = palletesUsed[0].pallete.getName();
			if (palleteName === "Template_Lineart" && palletesUsed.length > 1)
				palleteName = palletesUsed[1].pallete.getName() ?? palleteName;

			MessageLog.trace(JSON.stringify(palleteName, null, 2));
			const colName = currentCell.node.getColumn("DRAWING.ELEMENT").name;
			column.setDrawingType(colName, previousFrame, palleteName);
			G.GlobalTimeline.setMetadata("previousFrame", currentCell.frame);
		}
		catch (error) {
			MessageLog.trace("Error in frameChangedHandler: " + error.toString() + "\n" + error.fileName + ":" + error.lineNumber);
		}
	}, this);

	frameNotifier.currentFrameChanged.connect(frameChangedHandler);
	frameNotifier.selectionChanged.connect(frameChangedHandler);

	window.closeEvent = function (event: any) {
		frameNotifier.currentFrameChanged.disconnect(frameChangedHandler);
		frameNotifier.selectionChanged.disconnect(frameChangedHandler);
		event.accept();
	};

	window.show();
}

