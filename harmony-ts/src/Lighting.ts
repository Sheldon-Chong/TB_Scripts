include(specialFolders.userScripts + "/lighting/backend.js");
include(specialFolders.userScripts + "/lighting/frontend.js");


function quickSelectConnectedExposure() {
	const currentSelection = new G.oSelection();
	const selectedNode = currentSelection.selectedNodes[0];
	const elementCol = selectedNode.getColumn("DRAWING.ELEMENT");


	MessageLog.trace("Element col : " + elementCol);

	var end = currentSelection.startFrame;
	const currentVal = elementCol.getKeyframe(end);

	MessageLog.trace("current val " + currentVal);


	if (currentVal === null || currentVal === undefined || currentVal === "") {
		MessageLog.trace("No keyframe at current frame.");
		return;
	}

	while (true) {
		if (elementCol.getKeyframe(end) !== currentVal)
			break;
		end++;
	}

	var start = currentSelection.startFrame;
	while (start > 0) {
		if (elementCol.getKeyframe(start - 1) !== currentVal)
			break;
		start--;
	}

	selection.setSelectionFrameRange(start, end - start);
}

function LightTest() {
	// quickSelectConnectedExposure();

	// const parentWidget = `QApplication.activeWindow();`
	// const numFrames = 100;
	// var progress = new QProgressDialog("Loading frames...", "Abort", 0, numFrames, parentWidget);
	// progress.setMinimumDuration(0);

	// for (var i = 0; i < 1; i++) {
	// 	progress.setValue(i);
	// }
	// // progress.setValue(numFrames);

	// return; 
	// 		// preferences.setBool("DRAWING_SHOW_CURRENT_DRAWING_ON_TOP", true);
	// MessageLog.trace(">>> " + preferences.getBool("DRAWING_SHOW_CURRENT_DRAWING_ON_TOP", false ));

	// const masterController = new MasterLightingController();
	// masterController.getLightingGroup(1).passManager.passes[0].insertKeyFrame(5);
	// return ;


	// try {

	// 	const parentLayout = new QVBoxLayout();

	// 	const option1 = new QPushButton("Option 1");
	// 	const option2 = new QPushButton("Option 2");
	// 	const option3 = new QPushButton("Option 3");

	// 	// Create the dropdown button
	// 	const dropdown = new DropdownTooltipButton(
	// 		"Select Option",
	// 		[option1, option2, option3],
	// 		(widget, index) => {
	// 			MessageLog.trace("Selected option: " + (widget.text || "Widget " + index));
	// 		},
	// 		120 // Tooltip height in px
	// 	);

	// 	// Add to your layout or parent widget
	// 	parentLayout.addWidget(dropdown, 0, Qt.AlignTop);

	// 	const lightingWindow = new QWidget();
	// 	lightingWindow.setLayout(parentLayout);
	// 	lightingWindow.show();

	// } catch (error) {
	// 	MessageLog.trace("Error in LightTest: " + error.toString() + "\n" + error.fileName + ":" + error.lineNumber);
	// }


	// return ;

	GlobalTimeline.resetFocusedNodes();
	const window = QApplication.activeWindow()
	const dialog = new PopupPresetDialog("C:/Users/emers/Desktop/Coding projects/Python Bot/ToonBoom_Automations/test/lightingPresets", function(selectedFile) {
		MessageLog.trace("Selected preset file: " + selectedFile);
	});
	dialog.parentWindow = window;
	dialog.lightingPage.parentWindow=window;
	// MessageLog.trace("tye");
	
	dialog.show();
	return;
}

var global_test = "test";
	

// ToggleButton class: QPushButton with toggle state and callback
class ToggleButton extends QPushButton {
	constructor(text, selected = false, onToggle = null, toggleGroup = null) {
		super(text);
		this._selected = selected;
		this.updateStyle();
		this._onToggle = onToggle;
		this._toggleGroup = toggleGroup || null;
		this['clicked()'].connect(() => {
			if (this._toggleGroup) {
				if (!this._selected) {
					this._toggleGroup.select(this);
					this.setSelected(true);
					if (this._onToggle) {
						this._onToggle(true, this);
					}
				}
			} else {
				this._selected = !this._selected;
				this.updateStyle();
				if (this._onToggle) {
					this._onToggle(this._selected, this);
				}
			}
		});
		if (this._toggleGroup) {
			this._toggleGroup.add(this);
		}
	}
	updateStyle() {
		if (this._selected) {
			this.setStyleSheet("border: 2px solid #2196f3; border-radius: 8px;");
		} else {
			this.setStyleSheet("");
		}
	}
	setSelected(selected, silent = false) {
		this._selected = selected;
		this.updateStyle();
		if (!silent && this._onToggle) {
			this._onToggle(this._selected, this);
		}
	}
	isSelected() {
		return this._selected;
	}
}


// class LightingEditor {
	
// 	static LINEAR_PARAM_CONTROLLER = SliderController;
// 	lightingPages: LightingPage[] = [];

// 	masterLightingController = new MasterLightingController();

// 	updateControllerPage(index?: Number) {
// 		for (var i = 0; i < 8; i++) {
// 			if (i !== 0) 
// 				continue;
			
// 			var lightingController = this.masterLightingController.getLightingGroup((i + 1) as LightingGroupRange);
// 			const attributeColumns = lightingController.getValues();
// 			this.lightingPages[0].update(attributeColumns);
// 		}
// 	}

// 	constructor() {
// 		Action.perform("onActionTimelineViewModeNormal()", "timelineView");
// 		GlobalTimeline.resetFocusedNodes();

// 		var baseUi = UiLoader.load(specialFolders.userScripts + "/untitled.ui");
// 		var masterLightingController = this.masterLightingController;

		
// 		sceneNotifier.selectionChanged.connect(bind(function () {
// 			MessageLog.trace(" Selection changed - updating lighting controller UI.");
// 			try {
// 				this.updateControllerPage();
// 			} catch (e) {
// 				MessageLog.trace(e.toString());
// 			}
// 		}, this));


// 		baseUi.showEvent = function (event) {
// 			MessageLog.trace("Lighting Controller UI shown.");
// 		}

// 		const tabs = baseUi.tabWidget;

// 		baseUi.button_reset_layer_view["clicked()"].connect(function () {
// 			G.GlobalTimeline.resetFocusedNodes();
// 		})

// 		tabs.clear();
// 		for (var t = 0; t < 8; t++) {
// 			tabs.addTab(new QWidget(), "Lighting " + (t + 1));
// 		}

// 		for (var i = 0; i < tabs.count; i++) {
// 			var lightingController = masterLightingController.getLightingGroup((i + 1) as LightingGroupRange);
// 			this.lightingPages.push(new LightingPage(lightingController, tabs.widget(i)));
// 		}

// 		baseUi.show();
// 		return;
// 	}
// }
