include("globals.js");

class BaseTooltip extends QWidget {
	static allToasts: BaseTooltip[] = [];

	static destroyAllTooltips() {
		for (const toast of BaseTooltip.allToasts) {
			toast.close();
		}
	}

	constructor() {
		super();
		this.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
		this.setStyleSheet("QWidget { background-color: #333; color: white; border-radius: 10px; padding: 4px; font-family: Arial; font-size: 10pt; }");
		this.setAttribute(Qt.WA_DeleteOnClose);
		BaseTooltip.allToasts.push(this);
	}
}

class DropdownTooltipButton extends QPushButton {
	tooltip: BaseTooltip;
	optionContainer: QWidget;
	optionLayout: QVBoxLayout;
	selectedWidget: QWidget | null = null;
	onSelect: (widget: QWidget, index: number) => void;

	constructor(label: string, options: QWidget[], onSelect?: (widget: QWidget, index: number) => void, tooltipHeight: number = 200) {
		super(label);
		this.onSelect = onSelect;

		// Set custom stylesheet: black background, white outline, white text
		this.setStyleSheet(
			`QPushButton {
				background-color: #000;
				color: #fff;
				border: 2px solid #fff;
				border-radius: 6px;
				padding: 4px 12px;
			}
			QPushButton:pressed {
				background-color: #222;
			}`
		);

		// Create tooltip
		this.tooltip = new BaseTooltip();
		this.tooltip.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
		this.tooltip.setFixedHeight(tooltipHeight);
		this.tooltip.setFixedWidth(220);

		// Scroll area for options
		const scrollArea = new QScrollArea(this.tooltip);
		scrollArea.setFixedHeight(tooltipHeight);

		// Container for option widgets
		this.optionContainer = new QWidget();
		this.optionLayout = new QVBoxLayout(this.optionContainer);
		this.optionLayout.setSpacing(2); 
		this.optionLayout.setContentsMargins(2, 2, 2, 2);

		// Add provided widgets as options
		options.forEach((widget, i) => {
			widget.mousePressEvent = (event) => {
				this.setSelected(widget);
				if (this.onSelect) this.onSelect(widget, i);
				this.tooltip.hide();
			};
			this.optionLayout.addWidget(widget, 0, 0);
		});

		this.optionContainer.setLayout(this.optionLayout);
		scrollArea.setWidget(this.optionContainer);

		// Layout for tooltip
		const tooltipLayout = new QVBoxLayout(this.tooltip);
		tooltipLayout.setContentsMargins(0, 0, 0, 0);
		tooltipLayout.addWidget(scrollArea, 0, 0);

		// Show tooltip on button click
		this['clicked()'].connect(() => {
			const pos = this.mapToGlobal(new QPoint(0, this.height));
			this.tooltip.move(pos.x(), pos.y());
			this.tooltip.show();
		});
	}

	setSelected(widget: QWidget) {
		this.selectedWidget = widget;
		if (widget.text) {
			this.text = widget.text;
		}
	}
}

class StringListWithButtons extends BaseTooltip {
	private scrollArea: QScrollArea;
	private contentWidget: QWidget;
	private layout: QVBoxLayout;
	private items: { label: QLabel; button: QPushButton; widget: QWidget }[] = [];

	constructor(stringList: string[], buttonText: string = "Action", buttonCallback?: (index: number, text: string) => void) {
		super();
		this.setWindowTitle("String List with Buttons");
		this.setMinimumSize(300, 400);

		// Create scroll area
		this.scrollArea = new QScrollArea();
		this.scrollArea.setWidgetResizable(true);
		this.scrollArea.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded);
		this.scrollArea.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded);

		// Create content widget and layout
		this.contentWidget = new QWidget();
		this.layout = new QVBoxLayout(this.contentWidget);
		this.layout.setSpacing(5);
		this.layout.setContentsMargins(5, 5, 5, 5);

		// Populate the list
		for (let i = 0; i < stringList.length; i++) {
			const itemWidget = new QWidget();
			const itemLayout = new QHBoxLayout(itemWidget);
			itemLayout.setContentsMargins(0, 0, 0, 0);

			const label = new QLabel(stringList[i]);
			label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred);

			const button = new QPushButton(buttonText);
			button.setFixedWidth(80);

			if (buttonCallback) {
				button['clicked()'].connect(() => {
					buttonCallback(i, stringList[i]);
				});
			}

			itemLayout.addWidget(label);
			itemLayout.addWidget(button);

			this.layout.addWidget(itemWidget);

			this.items.push({ label, button, widget: itemWidget });
		}

		// Set content widget to scroll area
		this.scrollArea.setWidget(this.contentWidget);

		// Main layout
		const mainLayout = new QVBoxLayout(this);
		mainLayout.addWidget(this.scrollArea);
		this.setLayout(mainLayout);
	}

	// Method to update the list if needed
	updateList(newStringList: string[]) {
		// Clear existing items
		for (const item of this.items) {
			this.layout.removeWidget(item.widget);
			item.widget.close();
		}
		this.items = [];

		// Repopulate
		for (let i = 0; i < newStringList.length; i++) {
			const itemWidget = new QWidget();
			const itemLayout = new QHBoxLayout(itemWidget);
			itemLayout.setContentsMargins(0, 0, 0, 0);

			const label = new QLabel(newStringList[i]);
			label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred);

			const button = new QPushButton("Action");
			button.setFixedWidth(80);

			itemLayout.addWidget(label);
			itemLayout.addWidget(button);

			this.layout.addWidget(itemWidget);

			this.items.push({ label, button, widget: itemWidget });
		}
	}
}


class ToolTipText extends BaseTooltip {
	private label: QLabel;

	constructor(text: string) {
		super();
		var layout = new QHBoxLayout(this);
		this.label = new QLabel(text);
		layout.addWidget(this.label, 0, 0);
	}

	showAt(pos: QPoint) {
		this.move(pos.x(), pos.y());
		this.show();
	}

	setText(text: string) {
		this.label.text = text;
	}
}

G.TooltipToast = ToolTipText;


class ColumnDiscrepancyIndicator extends QPushButton {
	public toast: ToolTipText;
	private _tooltipVisible: boolean = false;

	constructor() {
		super();
		this.text = (" ⚠️ ");
		this.setFixedSize(18, 18);
		this.hide();

		this.toast = new ToolTipText(`Multiple values in selection for current lighting group`);

		this['clicked()'].connect(() => {
			if (!this._tooltipVisible) {
				const pos = this.mapToGlobal(new QPoint(0, this.height));
				this.toast.showAt(pos);
				this._tooltipVisible = true;
			} else {
				MessageLog.trace("Hiding discrepancy tooltip");
				this.toast.hide();
				this._tooltipVisible = false;
			}
		});
		this.setStyleSheet("padding:0; margin:0; font-size:12px; min-width:0; min-height:0;max-width:18px; max-height:18px;");
	}
}

abstract class ParamController {
  protected objectRef: any;
  protected path: string;

  constructor(objectRef: any, path: string) {
    this.objectRef = objectRef;
    this.path = path;
  }

  getValue(): any {
    return G.Utils.getValueByPath(this.objectRef, this.path);
  }

  setValue(newValue: any): void {
    // Traverse to parent, set property at path
    const parts = this.path.split(".");
    let obj = this.objectRef;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = newValue;
  }

  abstract onValueChanged(newValue: any): void;
}

/*
There are nine column types: drawing (DRAWING), sound (SOUND), 3D Path (3DPATH), Bezier Curve (BEZIER), Ease Curve (EASE), Expression (EXPR), Timing (TIMING) for timing columns, Quaternion path (QUATERNIONPATH) for 3D rotation and Annotation (ANNOTATION) for annotation columns. 
*/
function initializeButtons(objects: any[], mappings: Record<string, any>) {
	for (const obj of objects) {
		if (!obj.param)
			continue;
		for (const [key, value] of Object.entries(mappings)) {
			if (obj.param === key && obj.controllerType === "Button") {
				obj['clicked()'].connect(() => {
					// MessageLog.trace("Button clicked for param: " + key);
					try {
						value();
					}
					catch (e) {
						MessageLog.trace("Error in button callback for param " + key + ": " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
					}
				});
			}
		}
	}
}

class ColorPickerController {
	param: string;
	color: oColor;
	button: QPushButton;
	colors: {
		red: { value: number; column: Column };
		green: { value: number; column: Column };
		blue: { value: number; column: Column };
	};
	constructor(
		button: QPushButton, 
		param: string,
		startingColor: oColor,
		redColumn: Column,
		greenColumn: Column,
		blueColumn: Column,
		onDragStart?: () => void,
		onDragEnd?: () => void,
		onDragMove?: (newColor: oColor) => void
	) {
		this.param = param;
		this.color = startingColor;
		this.button = button;
		this.colors = {
			red: { value: startingColor.r, column: redColumn },
			green: { value: startingColor.g, column: greenColumn },
			blue: { value: startingColor.b, column: blueColumn }
		};

		this.button.colors = this.colors;
		this.button.colorPicker = this;

		this.button['clicked()'].connect(wrapWithCatch(() => {
			let color = new G.ColorUtils.ColorObj({
				r: this.colors.red.value,
				g: this.colors.green.value,
				b: this.colors.blue.value
			});

			var colorPicker = new G.Widgets.ColorPickerDialog({
				initialColor: color,
				onDragStart: G.Utils.bind(onDragStart, this) || (() => { scene.beginUndoRedoAccum("Color picker drag"); }),
				onDragEnd: G.Utils.bind(onDragEnd, this) || (() => { scene.endUndoRedoAccum(); }),
				onDragMove: (color) => {
					var rgb = color.toRgb();
					this.button.setStyleSheet("background-color: rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ");  border: 3px solid #454545; border-radius: 10px;");

					this.colors.red.column.setKeyFrame(new G.oSelection(), rgb.r);
					this.colors.green.column.setKeyFrame(new G.oSelection(), rgb.g);
					this.colors.blue.column.setKeyFrame(new G.oSelection(), rgb.b);

					this.colors.red.value = rgb.r;
					this.colors.green.value = rgb.g;
					this.colors.blue.value = rgb.b;

					if (onDragMove) {
						onDragMove({ r: rgb.r, g: rgb.g, b: rgb.b, a: 255 }); // Assuming a=1 or adjust as needed
					}
				}
			});
			colorPicker.show();
		}));
	}

	updateColor(newValues: { r: number; g: number; b: number }) {
		this.colors.red.value = newValues.r;
		this.colors.green.value = newValues.g;
		this.colors.blue.value = newValues.b;

		var color = new G.ColorObj({
			r: this.colors.red.value,
			g: this.colors.green.value,
			b: this.colors.blue.value
		});
		this.button.setStyleSheet("background-color: " + color.toHex() + "; border: 3px solid #454545; border-radius: 10px;");
	}
}

Object.PassManager = PassManager;

class SliderController {
	public label!: QLabel;
	public slider!: QSlider;
	public spinbox!: QSpinBox;
	public callback: (value: number) => void;
	public onDragStart: () => void;
	public onDragEnd: () => void;
	public min: number = 0;
	public max: number = 100;
	public modifier?: (value: number) => number;

	constructor(params: Partial<SliderController>) {

		G.assign(this, params);
		// Begin undo/redo accumulation when slider drag starts
		if (this.onDragStart) {
			this.slider.sliderPressed.connect(G.Utils.bind(this.onDragStart, this));
		}
		// End undo/redo accumulation when slider drag ends
		if (this.onDragEnd) {
			this.slider.sliderReleased.connect(G.Utils.bind(this.onDragEnd, this));
		}

		// Connect slider value changes
		this.slider['valueChanged(int)'].connect(G.Utils.bind((value) => {
			// Custom logic before
			let modifiedValue = this.modifier ? this.modifier(value) : value;
			this.spinbox.value = value;
			// Custom logic after
			if (this.callback) {
				// You can wrap the callback call with more logic if needed
				this.callback(modifiedValue);
			}
			// Example: log param or controllerFrame
			MessageLog.trace("Slider changed for param: " + this.param);
			// ...any other logic...
		}, this));

		// Connect spinbox value changes
		this.spinbox['valueChanged(int)'].connect(G.Utils.bind((value) => {
			let modifiedValue = this.modifier ? this.modifier(value) : value;
			this.slider.value = value;
			// Optionally, callback on spinbox change as well
			if (this.callback) {
				this.callback(modifiedValue);
			}
		}, this));
	}

	setValue(value: number) {
    this.slider.blockSignals(true);
    this.spinbox.blockSignals(true);

    this.slider.value = value;
    this.spinbox.value = value;

    // Re-enable signals
    this.slider.blockSignals(false);
    this.spinbox.blockSignals(false);
	}
}


class LightingPage {
	lightingGroup: LightingGroup;
	groupBoxes: Record<string, any> = {};
	parentWindow: QWidget;

	controlInterface: any;
	layout: QVBoxLayout;

	toString() { return `Lighting Page<${this.lightingGroup.index}>` }

	constructor(lightingGroup: LightingGroup, parent: QWidget) {

		var controlInterface = UiLoader.load(specialFolders.userScripts + "/widget.ui");

		this.lightingGroup = lightingGroup;
		this.layout = controlInterface.toolBox.widget(0).vertical_layout_widget.vertical_layout;
		this.groupBoxes = {
			moodGroupBox: this.layout.itemAt(0).widget(),
			lightGroupBox: this.layout.itemAt(1).widget(),
			shadowGroupBox: this.layout.itemAt(2).widget(),
			rimlightGroupBox: this.layout.itemAt(3).widget()
		}
		this.controlInterface = controlInterface;

		this.initialize(this.lightingGroup.getValues());

		initializeButtons(controlInterface.children(), {
			"copy": () => {
				G.GlobalTimeline.setMetadata("lighting_copy_data", JSON.stringify(this.lightingGroup.getValues(), null, 2));
				MessageLog.trace("Copied lighting data to metadata." + G.GlobalTimeline.getMetadata("lighting_copy_data"));
			},
			"paste": () => {
				var dataStr = G.GlobalTimeline.getMetadata("lighting_copy_data");
				if (!dataStr)
					throw new Error("No lighting data found in metadata to paste.");
				this.setLighting(JSON.parse(dataStr));
				G.Utils.toast(`Pasted lighting data from metadata successfully!`, {x: 100, y: 100},2000, "#4BB543" , this.parentWindow);
			},
			"import": () => { this.importLighting(); },
			"export": () => { this.exportLighting(); },

		});

		var scrollArea = new QScrollArea(parent);
		scrollArea.setWidget(controlInterface);

		var tabLayout = new QVBoxLayout(parent);
		tabLayout.setContentsMargins(0, 0, 0, 0);
		tabLayout.addWidget(scrollArea, 1, 0);

		var listWidget = new QListWidget();
		listWidget.setMinimumSize(200, 150);
		var selectAll = new QPushButton();
		selectAll.text = "selectAll";
		selectAll.setFixedHeight(20);

		var deselectAll = new QPushButton();
		deselectAll.text = "deselectAll";
		deselectAll.setFixedHeight(20);

		var listToolBar = new QHBoxLayout();
		listToolBar.addWidget(selectAll, 0, 0);
		listToolBar.addWidget(deselectAll, 0, 0);
		var listToolBarWidget = new QWidget();
		listToolBarWidget.setLayout(listToolBar);

		controlInterface.toolBox.widget(1).verticalLayoutWidget.verticalLayout.addWidget(listToolBarWidget, 0, 0);
		controlInterface.toolBox.widget(1).verticalLayoutWidget.verticalLayout.addWidget(listWidget, 0, 0);

		var checkboxes = [];
		var layers = LayerManager.getNodeLayer("Top/Drawings").getChildren();
		for (const layer of layers) {
			// Custom widget item with checkbox and label
			var customItem = new QListWidgetItem();
			var widget = new QWidget();
			var layout = new QHBoxLayout(widget);
			var checkbox = new QCheckBox();
			var label = new QLabel(layer.name);
			layout.addWidget(checkbox, 0, 0);
			layout.addWidget(label, 1, 0);
			widget.setLayout(layout);
			widget.setFixedHeight(40); // or any value that fits your design
			listWidget.addItem(customItem);
			listWidget.setItemWidget(customItem, widget);
			listWidget.spacing = 5;
			checkbox.setChecked(this.lightingGroup.passManager.isNodeInGroup(new oSelection(undefined, undefined, [layer])));
			checkboxes.push(checkbox);

			checkbox.stateChanged.connect(function (state) {
				if (state === 0)
					(this.lightingGroup as LightingGroup).passManager.removeFromGroup([layer]);
				else
					(this.lightingGroup as LightingGroup).passManager.addToGroup([layer]);
			});
		}

		selectAll['clicked()'].connect(() => {
			checkboxes.forEach(wrapWithCatch(function (checkbox) {
				checkbox.setChecked(true);
				(this.lightingGroup as LightingGroup).passManager.addToGroup([layers[checkboxes.indexOf(checkbox)]]);
			}));
		});
		deselectAll['clicked()'].connect(() => {
			checkboxes.forEach(wrapWithCatch(function (checkbox) {
				checkbox.setChecked(false);
				(this.lightingGroup as LightingGroup).passManager.removeFromGroup([layers[checkboxes.indexOf(checkbox)]]);
			}));
		});
	}

	exportLighting() {
		this.lightingGroup.exportLighting();
	}

	importLighting(path?: string) {
		var output = this.lightingGroup.importLighting(path);
		if (!output)
			return;
		this.update(output);
		MessageLog.trace(this.toString() + " | " + this.lightingGroup.toString() + " imported succesfully !");
	}

	setLighting(lightingData: any) {
		this.lightingGroup.setLighting(lightingData);
		this.update(lightingData);
	}

	public drawingEditorControls: any[] = [];

	public sliderControls = [];

	public controls = {
		
	}

	initialize(initialValue: any) {
		var lightingGroup = this.lightingGroup;
		var initialColumns = this.lightingGroup.getColumns();

		for (const [key, groupBox] of Object.entries(this.groupBoxes)) {
			var controllerFrames = groupBox.children();

			for (const controllerFrame of controllerFrames) {
				let param = controllerFrame.param;
				if (!param) continue;
				if (param === "none") continue;
				
				switch (controllerFrame.controllerType) {
					case "Drawing": { /* Drawing Controller */
						var drawingLayout = new QVBoxLayout(controllerFrame.layout().itemAt(1).widget());
						controllerFrame.controller = new DrawingController(
							controllerFrame.layout().itemAt(0).widget(),
							drawingLayout,
							controllerFrame.layout().itemAt(2).widget(),
							this.lightingGroup,
							this
						);
						this.drawingEditorControls.push(controllerFrame);

						break;
					}

					case "Color Picker": { /* Color Picker */
						const button = controllerFrame.layout().itemAt(1).widget();
						const colorPath = G.Utils.getValueByPath(initialColumns, param);
						const startingColor: oColor = { r: 0, g: 0, b: 0, a: 255 };
						controllerFrame.colorPicker = new ColorPickerController(
							button,
							param,
							startingColor,
							colorPath.r,
							colorPath.g,
							colorPath.b,
							function () { 
								scene.beginUndoRedoAccum("Color picker drag");
								
								this.colors.red.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).r;
								this.colors.green.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).g;
								this.colors.blue.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).b;
							
								MessageLog.trace(" >>>> " + this.colors.red.column.parent.nodePath);
							},
							function () { scene.endUndoRedoAccum(); },
							(newColor: oColor) => {
							}
						);
						controllerFrame.colorPicker.lightingPage = this;
						break;
					}
						
					case "Slider": { /* Slider */
						var layout = controllerFrame.layout();
						const currentColumn = G.Utils.getValueByPath(initialColumns, param) as Column;

						var controller = new SliderController({
							label: layout.itemAt(0).widget(),
							slider: layout.itemAt(1).widget(),
							spinbox: layout.itemAt(2).widget(),
							modifier: function (value) {
								if (controllerFrame.expression) {
									if (controllerFrame.expression[0] === "/") {
										return value / Number(controllerFrame.expression.substring(1));
									}
									if (controllerFrame.expression[0] === "-") {
										return 100 - (value);
									}
									return value / 20;
								}
								return value;
							},
							onDragStart: function () {
									scene.beginUndoRedoAccum("Adjust " + this.param);
									var initialColumns = this.lightingPage.lightingGroup.getColumns();
									this.currentColumn = G.Utils.getValueByPath(initialColumns, this.param);
							},

							onDragEnd: () => {
								scene.endUndoRedoAccum();
							},

							callback: function (value) {
								MessageLog.trace(`${(this.currentColumn as Column).parent.nodePath} set to ${value}`);
								this.currentColumn.setKeyFrame(new G.oSelection(), value);
							},
						});
						G.assign(controller, { param, currentColumn, lightingPage: this });
						this.sliderControls.push(controller);
						controllerFrame.linearParamController = controller;
						break;
					}

					case "Peg": { /* Peg Controller */
						var layout = controllerFrame.layout();

						var labelWidget = layout.itemAt(0).widget();
						var frameWidget = layout.itemAt(1).widget();



						var pegController = new PegController({
							size: 60,
							dragStartCallback:  function (x, y){
								// scene.beginUndoRedoAccum("Adjust Peg " + x + "," + y);
								MessageLog.trace("STARTED  !!!");
								this.axis = {
									"x": this.lightingPage.lightingGroup.layer.getColumn(param + ".X"),
									"y": this.lightingPage.lightingGroup.layer.getColumn(param + ".Y"),
								}
							},
							
							dragReleaseCallback: function (x, y) {
								const selection = new G.oSelection();
								
								this.axis.x.setKeyFrame(selection, x / 200);
								this.axis.y.setKeyFrame(selection, y / 200);
								MessageLog.trace(`Set  ${this.lightingPage.lightingGroup.layer.nodePath} | ${param} to ${x}, ${y}`);
							},
							
							dragCallback: function (x, y) {

							}
						});
						pegController.lightingPage = this;
						var drawingLayout = new QVBoxLayout(frameWidget);
						drawingLayout.setContentsMargins(0, 0, 0, 0);
						drawingLayout.addWidget(pegController, 0, Qt.AlignmentFlag.AlignCenter);
						break;
					}
					default:
						continue;
				}

				this.controls[param] = controllerFrame;

				const columnDiscrepancyIndicator = new ColumnDiscrepancyIndicator();

				controllerFrame.columnDiscrepancyIndicator = columnDiscrepancyIndicator;

				// Add to the end of the layout
				const layout = controllerFrame.layout && controllerFrame.layout();
				if (layout && typeof layout.addWidget === "function") {
					layout.addWidget(columnDiscrepancyIndicator, 0, Qt.AlignmentFlag.AlignRight);
				}
			}
		}
		this.update(initialValue);
		MessageLog.trace("controls " + Object.keys(this.controls).join("\n - "));
	}

	updateDrawingControls() {
		render.cancelRender ( 		);
		const lightings = ["Mood", "Light", "Shadow", "Rimlight"];

		const number = this.lightingGroup.index;

		G.Renderer.renderTask({
			frame: frame.current(),
			nodes: [
				`Top/lighting_controller_${number}/Lighting_Drawings/Drawing_Mood`,
				`Top/lighting_controller_${number}/Lighting_Drawings/Drawing_Light`,
				`Top/lighting_controller_${number}/Lighting_Drawings/Drawing_Shadow`,
				`Top/lighting_controller_${number}/Lighting_Drawings/Drawing_Rimlight`
			],
			onFinished: (outputPath, renderTask: RenderTask) => {
				const nodeNames = ["Drawing_Mood", "Drawing_Light", "Drawing_Shadow", "Drawing_Rimlight"];
				for (let i = 0; i < nodeNames.length; i++) {
					if (outputPath.indexOf(nodeNames[i]) !== -1) {
						this.drawingEditorControls[i].controller.setThumbnail(outputPath);
						break;
					}
				}
			}
		})
	}

	update(value: any) {

		for (const [key, groupBox] of Object.entries(this.groupBoxes)) {
			var controllerFrames = groupBox.children();

			for (const controllerFrame of controllerFrames) {
				var param = controllerFrame.param;
				if (!param || param === "none") continue;
				
				
				const columnDiscrepancyIndicator = controllerFrame.columnDiscrepancyIndicator as ColumnDiscrepancyIndicator;
				
				if (columnDiscrepancyIndicator) {
					if (this.lightingGroup.multipleValueColumns[param]) {
						columnDiscrepancyIndicator.toast.setText(`Multiple values in selection for parameter: \n[${this.lightingGroup.multipleValueColumns[param].join(", ")}]`);
						columnDiscrepancyIndicator.show();
					}
					else
						columnDiscrepancyIndicator.hide();
				}
				switch (controllerFrame.controllerType) {
					case "Color Picker": {
						(controllerFrame.colorPicker as ColorPickerController).updateColor({
							r: G.Utils.getValueByPath(value, param).r,
							g: G.Utils.getValueByPath(value, param).g,
							b: G.Utils.getValueByPath(value, param).b
						})
						break;
					}
					case "Slider": {
						const controller = controllerFrame.linearParamController as SliderController;
						const currentValue = G.Utils.getValueByPath(value, param);
						let setVal = Number(currentValue);
						if (controllerFrame.expression) {
							switch (controllerFrame.expression[0]) {
								case "-":
									setVal = 100 - Number(currentValue);
									break;
								case "/":
									setVal = Number(currentValue) * Number(controllerFrame.expression.substring(1));
									break;
							}
						}
						controller.setValue(setVal);
						
						break;
					}
					default:
						continue;
				}
			}
		}
	}
}

this.__proto__.LightingPage = LightingPage;

class PresetListItemWidget extends QWidget {
	protected applyButton: QPushButton;
	protected openButton: QPushButton;
	protected nameLabel: QLabel;
	fileName: string;
	presetDir: string;
	lightingPage: LightingPage;
	filePath: string;

	constructor(fileName, presetDir, lightingPage) {
		super();
		this.fileName = fileName;
		this.presetDir = presetDir;
		this.lightingPage = lightingPage;

		this.filePath = this.presetDir + "/" + this.fileName;
		MessageLog.trace("filepath: " + this.filePath);

		const itemLayout = new QHBoxLayout();
		itemLayout.setContentsMargins(8, 4, 8, 4);
		this.nameLabel = new QLabel(fileName);
		this.applyButton = new QPushButton("Apply");
		this.minimumHeight = (30);
		this.applyButton.maximumWidth = (50);
		
		this.openButton = new QPushButton("📝");
		this.openButton.maximumWidth = (20);
		itemLayout.addWidget(this.openButton, 0, 0);


		itemLayout.addWidget(this.nameLabel, 1, 0);
		itemLayout.addWidget(this.applyButton, 0, 0);


		this.openButton['clicked()'].connect(G.Utils.bind(() => {
			const filePath = this.presetDir + "/" + this.fileName;
			MessageLog.trace("opening file: " + filePath);
			G.Utils.openWithDefaultApp(filePath);
		}, this));

		this.setLayout(itemLayout);

		this.applyButton['clicked()'].connect(() => {
      try {
        const filePath = this.presetDir + "/" + this.fileName;
        this.lightingPage.importLighting(filePath);
        MessageLog.trace("filepath: " + filePath);
      } catch (error) {
        MessageLog.trace("Error applying preset from file " + this.fileName + ": " + error.toString());        
      }
		});
	}
}
this.__proto__.PresetListItemWidget = PresetListItemWidget;

class InitialPreset extends PresetListItemWidget {
	presetData: LightingData;
	lightingPage: LightingPage;

	constructor(presetData, lightingPage) {
		// Use a label for revert, but pass lightingPage
		super("", undefined, lightingPage);
		this.presetData = (G.Utils.shallowCopy(presetData));
		this.lightingPage = lightingPage;
		this.applyButton.text = "Revert";
		this.applyButton['clicked()'].connect(G.Utils.bind(() => {
			this.lightingPage.setLighting(G.Utils.shallowCopy(this.presetData));
			MessageLog.trace("Reverted to initial preset.");
		}, this));
		this.nameLabel.text = "Initial Preset";
	}
}

this.__proto__.InitialPreset = InitialPreset;

if (typeof globalThis === "undefined") {
    globalThis = this;
}
const getCircularReplacer = () => {
  const seen = new WeakSet(); // Use WeakSet for efficient garbage collection

  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        // Circular reference found, return undefined to remove it or a placeholder
        return; // or return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};


function attachTooltip(widget:QWidget) {
	widget.enterEvent = (wrapWithCatch(() => {
		if (!widget.tooltip)
			widget.tooltip = new G.TooltipToast("test");
		const pos = widget.mapToGlobal(new QPoint(0, widget.height));
		widget.tooltip.showAt(pos);
		MessageLog.trace("Show");
	}))

	widget.leaveEvent = (() => {
		if (widget.tooltip)
			widget.tooltip.hide();
		MessageLog.trace("hide");
	})
}

class DrawingController {

	public drawingImage;
	private lightingGroup: LightingGroup;
	private lightingPage: LightingPage;

	constructor(
		public label: QLabel,
		public imageFrame: QWidget,
		public editButton?: QPushButton,
		lightingGroup: LightingGroup = null,
		lightingPage: LightingPage = null
	) {
		this.label = label;
		this.imageFrame = imageFrame;

		this.imageFrame.setContentsMargins(0, 0, 0, 0);
		this.lightingGroup = lightingGroup;
		this.lightingPage = lightingPage;

		this.drawingImage = new QLabel();
		var imagePath = specialFolders.userScripts + "/1.png";
		var pixmap = new QPixmap(imagePath);
		if (!pixmap.isNull()) {
			// Scale the pixmap to fit a fixed width (e.g., 200 pixels) while maintaining aspect ratio
			// Adjust the width value as needed to fit your imageFrame
			var scaledPixmap = pixmap.scaledToWidth(60);
			this.drawingImage.setPixmap(scaledPixmap);
			// Optionally set size policy to prevent resizing beyond the pixmap size
			this.drawingImage.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed);
		} else {
			this.drawingImage.text = "Image not found";
			MessageLog.trace("Failed to load image: " + imagePath);
		}
		this.imageFrame.addWidget(this.drawingImage, 0, Qt.AlignmentFlag.AlignCenter);

		attachTooltip(this.drawingImage	);

		editButton['clicked()'].connect(() => { });
		editButton["pressed()"].connect(() => {
			G.GlobalTimeline.resetFocusedNodes();
		});

		editButton["released()"].connect(G.Utils.bind(() => {
			this.lightingPage.lightingGroup.editProperty(editButton.param);
			G.CameraView.showCurrentDrawingOnTop(true);
		}, this));
	}
	setThumbnail(imagePath: string) {
		var pixmap = new QPixmap(imagePath);
		if (!pixmap.isNull()) {
			// Scale the pixmap to fit a fixed width (e.g., 200 pixels) while maintaining aspect ratio
			var scaledPixmap = pixmap.scaledToWidth(60);
			this.drawingImage.setPixmap(scaledPixmap);
		} else {
			MessageLog.trace("Failed to load image: " + imagePath);
		}
	}
}

class Section extends QWidget{
	sectionLayout: QLayout;

	constructor (orientation: string = "horizontal") {
		super();
		if (orientation === "vertical") {
			this.sectionLayout = new QVBoxLayout(this);
		} else {
			this.sectionLayout = new QHBoxLayout(this);
		}
				this.sectionLayout.setContentsMargins(2, 2, 2, 2);
		this.objectName = ("mainContainer");
		this.setStyleSheet("#mainContainer { border: 2px solid #666666; border-radius: 5px; }");
	}

	addWidget(widget: QWidget) {
		this.sectionLayout.addWidget(widget, 1, 0);
	}

	addLayout(layout: QLayout) {
		this.sectionLayout.addLayout(layout, 1);
	}
}




class PopupPresetDialog extends QDialog {
	lightingGroup: LightingGroup;
	lightingPage: LightingPage = null;
	initialPreset = null;

	settings = {
		liveControlsEnabled: true,
		followSelectionLightingGroup: true
	};

	presetDir: string;
	listWidget: QListWidget;

	myNotifier: SceneChangeNotifier;
	masterLightingController: MasterLightingController;

	parentWindow: any;
	refreshPresetList() {
		try {
			// Remove all items
			this.listWidget.clear();
	
			let fileNames = G.Utils.listFilesInDirectory(this.presetDir, ["*"]);
	
			// Add InitialPreset at the top
			const initialPresetItem = new InitialPreset(this.initialPreset, this.lightingPage);
			const initialPresetListItem = new QListWidgetItem();
			this.listWidget.addItem(initialPresetListItem);
			this.listWidget.setItemWidget(initialPresetListItem, initialPresetItem);
	
			// Add all preset files
			for (let i = 0; i < fileNames.length; i++) {
        MessageLog.trace("creating item with lighing page" + this.lightingPage.toString());
				const itemWidget = new PresetListItemWidget(fileNames[i], this.presetDir, this.lightingPage);
				const item = new QListWidgetItem();
				this.listWidget.addItem(item);
				this.listWidget.setItemWidget(item, itemWidget);
			}

		}
		catch (e) {
			MessageLog.trace("Error refreshing preset list: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
		}
	}

	liveControlsEnabled: boolean = true;
	mainLayout: QHBoxLayout;


	updateLightingPage() {
		const values = this.lightingGroup.getValues();
		this.lightingPage.update(values);
		this.selectLightingGroupDropdown.setCurrentIndex(this.lightingGroup.index - 1);
	}

	

	addNotifiers() {
		try {
			MessageLog.trace("notifiers added");
			this.myNotifier = new SceneChangeNotifier(this.mainLayout);

			this.myNotifier.currentFrameChanged.connect(G.Utils.bind(() => {
				this.updateLightingPage();
				if (this.settings.followSelectionLightingGroup) {
					MessageLog.trace(JSON.stringify(G.GlobalTimeline.getSelection(), null, 2));
				}
			}, this));

			this.myNotifier.selectionChanged.connect(G.Utils.bind(() => {
				try {
					if (!this.settings.liveControlsEnabled)
						return;
					if (this.settings.followSelectionLightingGroup) {
						// const selection = new G.oSelection(frame.current(), undefined, [G.GlobalTimeline.getSelection().selectedNodes[0]]);
						// const appliedLightingGroup = this.masterLightingController.getAppliedLightingGroups(selection);
						// this.lightingGroup = appliedLightingGroup[0] || this.masterLightingController.getLightingGroup(1);
						// const selection = G.GlobalTimeline.getSelection();
            
            // MessageLog.trace(JSON.stringify(marker));

            // MessageLog.trace(` >> lighting group for ${selection.toString()}: ${appliedLightingGroup.join("\n -")}`);
					}
					// this.updateLightingPage();
				} catch (error) {
					MessageLog.trace("Error in selectionChanged notifier: " + error.toString() + " | " + error.lineNumber + " |  " + error.fileName);
				}
			}, this));
		}
		catch (e) {
			MessageLog.trace("Error adding notifiers: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
		}
	}

	removeNotifiers() {
		try {
			if (this.myNotifier) {
				this.myNotifier.disconnectAll();
				MessageLog.trace("removed notifiers");
			}
		}
		catch (e) {
			MessageLog.trace("Error removing notifiers: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
		}
	}

	closeEvent(event) {
		try {
			G.TooltipToast.destroyAllTooltips();
			MessageLog.trace("closed");
			this.removeNotifiers();
			G.GlobalTimeline.setMetadata("lighting_preset_dialog_settings", JSON.stringify(this.settings));
		}
		catch (e) {
			MessageLog.trace("Error saving settings on close: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
		}
	}


	enterEvent(event: QEvent) {
		// Your on-hover logic here
		
		MessageLog.trace("Mouse entered the dialog area!");
		this.lightingPage.updateDrawingControls();
    const currentSelection = G.GlobalTimeline.getSelection();
    const marker = Timeline.getFrameMarker(currentSelection.selectedNodes[0].index, frame.current());
    if (marker) {
      MessageLog.trace(JSON.stringify(marker));
    }

		this.updateLightingPage();
		// this.lightingPage.update();
		// Optionally call the base class implementation
		super.enterEvent(event);
	}

	selectLightingGroupDropdown: QComboBox;

	constructor(presetDir, onSelect) {
		super();
		
		const parsed = JSON.parse(GlobalTimeline.getMetadata("lighting_preset_dialog_settings")) || {};
		for (const key in parsed) {
			if (this.settings.hasOwnProperty(key)) {
				this.settings[key] = parsed[key];
			}
		}
		
		this.presetDir = presetDir;
		this.masterLightingController = new MasterLightingController();
		this.lightingGroup = this.masterLightingController.getLightingGroup(1);

		GlobalTimeline.resetFocusedNodes();
		
		this.setupWindow();
		const mainVerticalLayout = new QVBoxLayout(this);
		
		const dropdownBox = this.LightingGroupPicker(mainVerticalLayout);
		this.mainLayout = new QHBoxLayout();
		
		const lightingPageContainer = this.setupLightingPage();
		const leftLayout = this.setupPresetListSection();
		
		this.mainLayout.addWidget(leftLayout, 0, 0);
		this.mainLayout.addWidget(lightingPageContainer, 1, 0);
		
		mainVerticalLayout.addLayout(this.mainLayout, 1);
		this.setLayout(mainVerticalLayout);
		this.initialPreset = this.lightingGroup.getValues();
		
		this.setupDropdownHandler(dropdownBox)
		const renderPreviewRow = this.setupRenderPreviewRow();
		mainVerticalLayout.addWidget(renderPreviewRow, 0, 0);
		
		const nodeEnabledSection = this.setupNodeEnabledSection();
		mainVerticalLayout.addWidget(nodeEnabledSection, 0, 0);
		
		this.addNotifiers();
	}

	private setupWindow() {
		this.setWindowTitle("Select Lighting Preset");
		this.setMinimumSize(320, 400);
		this.setWindowFlags(Qt.WindowStaysOnTopHint);
	}

	currentLightingGroupEnabledBtn: QPushButton;

	private LightingGroupPicker(parentLayout: QVBoxLayout): QComboBox {
		const dropdownRow = new Section("horizontal");
		const dropdownLabel = new QLabel("Select:");
		dropdownLabel.setFixedWidth(50);
		this.selectLightingGroupDropdown = new QComboBox();

		

		dropdownRow.addWidget(dropdownLabel);
		dropdownRow.addWidget(this.selectLightingGroupDropdown);
		parentLayout.addWidget(dropdownRow, 0, 0);
		
		{ /* Populate dropdown options */
			var options = []
			for (const lightingGroup of this.masterLightingController.getAllLightingGroups()) {
				options.push(`${PassManager.MAPPINGS[lightingGroup.index].symbol} ${lightingGroup.getName()}`);
			}
			this.selectLightingGroupDropdown.addItems(options);
		}
		
		{ /* Current lighting group enabled button */
			this.currentLightingGroupEnabledBtn = new QPushButton(this.lightingGroup.isEnabled() ? "👀" : "🙈");
			this.currentLightingGroupEnabledBtn.setFixedWidth(30);
			
			dropdownRow.addWidget(this.currentLightingGroupEnabledBtn, 0, 0);
			this.currentLightingGroupEnabledBtn['clicked()'].connect(bind(() => {
				this.lightingGroup.setEnabled(!this.lightingGroup.isEnabled());
				this.currentLightingGroupEnabledBtn.text = this.lightingGroup.isEnabled() ? "👀" : "🙈";
			}, this));
		}

		{ /* Apply to selected button */
			var applyBtn = new QPushButton("Apply to selected");
			applyBtn.setFixedWidth(120);
			dropdownRow.addWidget(applyBtn, 0, 0);

			applyBtn['clicked()'].connect(bind(() => {
				var currentSelection = new G.oSelection();
				G.Utils.toast(`Applied "${this.lightingGroup.getName()}" to ${currentSelection.getSelectSize()} frames`, { x: 100, y: 100 }, 1000, "#444444", this.parentWindow);
				this.masterLightingController.setLightingGroupOfSelection(this.lightingGroup, currentSelection);
        
      }, this));
		}
	
		{ /* Clear selected button */
			var clearSelectedBtn = new QPushButton("Clear selected");
			clearSelectedBtn.setFixedWidth(120);
			dropdownRow.addWidget(clearSelectedBtn, 0, 0);

			clearSelectedBtn['clicked()'].connect(wrapWithCatch(bind(() => {
				G.Utils.toast(`Cleared lighting for ${new G.oSelection().getSelectSize()} frames`, { x: 100, y: 100 }, 1000, "#444444");
				this.masterLightingController.clearLighting(new G.oSelection());
			}, this)));
		}

		return this.selectLightingGroupDropdown;
	}

	private setupPresetListSection(): Section {
		const leftLayout = new Section("vertical");
		const titleRow = new QHBoxLayout();
		const label = new QLabel("Choose a preset:");
		
		var refreshButton = new QPushButton();
		refreshButton.text = "↻";
		refreshButton.setFixedWidth(30);
		titleRow.addWidget(label, 1, 0);
		titleRow.addWidget(refreshButton, 0, Qt.AlignmentFlag.AlignRight);
		
		const openDirectoryButton = new QPushButton();
		openDirectoryButton.text = "📂";
		openDirectoryButton.setFixedWidth(30);
		titleRow.addWidget(openDirectoryButton, 0, Qt.AlignmentFlag.AlignRight);
		
		leftLayout.addLayout(titleRow);
		
		refreshButton['clicked()'].connect(bind(() => {
			MessageLog.trace("Refreshing preset list.");
			this.refreshPresetList();
		}, this));
		
		openDirectoryButton['clicked()'].connect(bind(() => {
			MessageLog.trace("Opening preset directory: " + this.presetDir);
			G.Utils.openInFileExplorer(this.presetDir);
		}, this));
		
		this.listWidget = new QListWidget();
		this.listWidget.minimumHeight = 300;
		this.listWidget.spacing = 4;
		this.refreshPresetList();
		
		let selectedFile = null;
		this.listWidget['itemClicked(QListWidgetItem*)'].connect((item) => {
			selectedFile = item.text;
		});
		
		leftLayout.addWidget(this.listWidget);
		return leftLayout;
	}

	private setupLightingPage(): QWidget {
		const lightingPageContainer = new QWidget();
		this.lightingPage = new LightingPage(this.lightingGroup, lightingPageContainer);
    MessageLog.trace("lighting page " + this.lightingPage.toString());
		// lightingPageContainer.minimumWidth = 400;
		
		initializeButtons(this.lightingPage.controlInterface.children(), {
			"export": bind(() => {
				MessageLog.trace("Exporting current lighting as new preset.");
				this.refreshPresetList();
			}, this)
		});
		
		return lightingPageContainer;
	}

	private setupDropdownHandler(dropdownBox: QComboBox) {
		dropdownBox['currentIndexChanged(int)'].connect(bind((index)=> {
			var selectedLightingGroup = this.masterLightingController.getLightingGroup(index + 1);
			this.lightingGroup = selectedLightingGroup;
			this.lightingPage.lightingGroup = selectedLightingGroup;
			
			var initialValue = this.lightingGroup.getValues();
			this.lightingPage.update(initialValue);
			this.currentLightingGroupEnabledBtn.text = this.lightingGroup.isEnabled() ? "👀" : "🙈";

			for (var i = 0; i < this.masterLightingController.getAllLightingGroups().length; i++) {
				var lightingGroup = this.masterLightingController.getLightingGroup(i + 1);
				dropdownBox.setItemText(i, `${true ? PassManager.MAPPINGS[lightingGroup.index].symbol : "🔿"} ${lightingGroup.getName()} ${lightingGroup.isEnabled()? "" : "🙈"}`);
			}
		}, this));


		const selection = G.GlobalTimeline.getSelection();
		const appliedLightingGroup = this.masterLightingController.getAppliedLightingGroup(selection);
		MessageLog.trace("applied lighting group : " + appliedLightingGroup);
		if (appliedLightingGroup) {
			dropdownBox.setCurrentIndex(appliedLightingGroup.index - 1);
		}
	}

	private setupRenderPreviewRow(): Section {
		const renderPreviewRow = new Section();

		{ /* Toggle enable all button */
			const toggleEnableAllBtn = new QPushButton("👁️‍🗨️");
			toggleEnableAllBtn.setFixedWidth(30);
			toggleEnableAllBtn['clicked()'].connect(bind(() => {
				const allEnabled = this.masterLightingController.areAllLightingGroupsEnabled();
				this.masterLightingController.setAllLightingGroupsEnabled(!allEnabled);


				if (allEnabled) {
					toggleEnableAllBtn.text = "🙈";
					G.Utils.toast("Disabled all lighting groups", { x: 100, y: 100 }, 1000, "#444444", this.parentWindow);
				} else {
					toggleEnableAllBtn.text = "👁️‍🗨️";
					G.Utils.toast("Enabled all lighting groups", { x: 100, y: 100 }, 1000, "#444444", this.parentWindow);
				}
			}, this));
			renderPreviewRow.addWidget(toggleEnableAllBtn, 0, 0);
		}

		{ /* Label */
			const renderPreviewLabel = new QLabel("Render res:");
			renderPreviewRow.addWidget(renderPreviewLabel);
		}

		{ /* Slider */
			const RENDER_PREVIEW_SCALE = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "1/1"];
			const renderPreviewValueLabel = new QLabel("Off");
			const renderPreviewSlider = new QSlider(Qt.Horizontal);
			renderPreviewSlider.minimum = (0);
			renderPreviewSlider.maximum = (RENDER_PREVIEW_SCALE.length);
			renderPreviewSlider.tickInterval = (1);
			renderPreviewSlider.singleStep = (1);
			renderPreviewSlider.setFixedWidth(120);
			renderPreviewRow.addWidget(renderPreviewSlider);
			var textValue = node.getAttr(this.masterLightingController.renderPreviewNode.nodePath, 1, "scaling").textValue();

			let initialScale = this.masterLightingController.isRenderPreviewEnabled()
				? RENDER_PREVIEW_SCALE.indexOf(textValue) + 1
				: 0;
			renderPreviewValueLabel.setText(initialScale === 0 ? "Off" : textValue);

			renderPreviewSlider.setValue(initialScale);
			renderPreviewSlider.valueChanged.connect(bind((value) => {
				if (value === 0) {
					this.masterLightingController.setRenderPreviewEnabled(false);
					renderPreviewValueLabel.setText("Off");
				} else {
					this.masterLightingController.setRenderPreviewEnabled(true);
					const scale = RENDER_PREVIEW_SCALE[value - 1];
					node.setTextAttr(this.masterLightingController.renderPreviewNode.nodePath, "scaling", 1, scale);
					renderPreviewValueLabel.setText(scale);
				}
			}, this));
			renderPreviewRow.addWidget(renderPreviewValueLabel);
		}



		{ /* Live Controls Checkbox */
			var liveControlsEnabledCheckbox = new QCheckBox();
			liveControlsEnabledCheckbox.text = "live updates";
			liveControlsEnabledCheckbox.setChecked(this.settings.liveControlsEnabled !== false);

			liveControlsEnabledCheckbox.stateChanged.connect(bind((state) => {
				this.liveControlsEnabled = (state === 2);
				if (this.liveControlsEnabled) {
					this.settings.liveControlsEnabled = true;
					this.addNotifiers();
				} else {
					this.settings.liveControlsEnabled = false;
					this.removeNotifiers();
				}
			}, this));
			renderPreviewRow.addWidget(liveControlsEnabledCheckbox, 0, 0);
		}

		{ /* Reset Timeline View Button */
			var resetFocusNodeButton = new QPushButton();
			resetFocusNodeButton.text = "reset timeline view";
			renderPreviewRow.addWidget(resetFocusNodeButton, 0, 0);
			resetFocusNodeButton['clicked()'].connect(() => {
				G.GlobalTimeline.resetFocusedNodes();
				G.CameraView.showCurrentDrawingOnTop(false);
			});
		}

		return renderPreviewRow;
	}

	private setupNodeEnabledSection(): Section {
		function setBatch(nodes: string[], lightingGroupLayer: any, state: number) {
			scene.beginUndoRedoAccum("Set Node Enabled State");
			MessageLog.trace(state === 2 ? "Enabling" : "Disabling" + " nodes: " + nodes.join(", "));
			for (const nodePath of nodes) {
				var node = lightingGroupLayer.getChild(nodePath);
				if (!node) continue;
				node.setEnabled(state === 2);
			}
			scene.endUndoRedoAccum();
		}

		var nodeEnabledCheckboxes = {
			"mood": {
				nodes: ["Mood", "Mood_Mask", "Lighting_Drawings/Drawing_Mood"]
			},
			"light": {
				nodes: ["Light_Transparency", "Lighting_Drawings/Drawing_Light", "Blending"]
			},
			"lbloom": {
				nodes: ["Light_Bloom"]
			},
			"shadows": {
				nodes: ["Shadows_Peg", "Shadow_Apply_Transform", "Shadow_Blending_Multiply", "Shadow_Mask", "Lighting_Drawings/Drawing_Shadow"]
			},
			"rimlights": {
				nodes: ["Rimlight_Left_Peg", "Rimlight_Right_Peg", "Rimlight_Base", "Rimlight_Combine_Left_Right", "Extract_Outline", "Rimlight_Right_Mask", "Rimlight_Left_Mask", "Outline_Mask", "Lighting_Drawings/Drawing_Rimlight"]
			},
			"rbloom": {
				nodes: ["Rimlight_Left_Bloom", "Rimlight_Right_Bloom"]
			}
		}

		var section = new Section();

		for (const [key, obj] of Object.entries(nodeEnabledCheckboxes)) {
			var checkbox = new QCheckBox();
			checkbox.text = key;

			var isChecked = this.masterLightingController.getAllLightingGroups().every((group) => {
				return obj.nodes.every((nodePath) => {
					var node = group.layer.getChild(nodePath);
					if (!node)
						MessageLog.trace("cant find " + nodePath + " in " + group.layer.name);
					return node && node.isEnabled();
				});
			});
			checkbox.setChecked(isChecked);
			checkbox.stateChanged.connect(bind((state) => {
				G.Utils.toast(`${state === 2 ? "Enabled" : "Disabled"} ${key} | ${obj.nodes.length} nodes`, { x: 100, y: 100 }, 1000, "#444444", this.parentWindow);
				scene.beginUndoRedoAccum("Set Lighting Nodes Enabled State");
				this.masterLightingController.getAllLightingGroups().forEach((group) => {
					setBatch(obj.nodes, group.layer, state);
				});
				scene.endUndoRedoAccum();
			}, this));
			section.addWidget(checkbox);
		}
		
		var enableAllCheckbox = new QCheckBox();
		enableAllCheckbox.text = "Enable All";
		enableAllCheckbox.setChecked(false);
		enableAllCheckbox.stateChanged.connect(bind((state) => {
			try {
				G.Utils.toast(`${state === 2 ? "Enabled" : "Disabled"} all lighting nodes`, { x: 100, y: 100 }, 1000, "#444444", this.parentWindow);
				scene.beginUndoRedoAccum("Set All Lighting Nodes Enabled State");
				for (const child of section.children()) {
					if (child.setChecked) {
						child.setChecked(state === 2);
					}
				}
				scene.endUndoRedoAccum();
			} catch (error) {
				MessageLog.trace("Error in Enable All checkbox handler: " + error.toString());				
			}
		}, this));

		var spacer = new QSpacerItem(50, 10, QSizePolicy.Expanding, QSizePolicy.Minimum);
		section.sectionLayout.addItem(spacer);

		section.addWidget(enableAllCheckbox);

		return section;
	}
}

function showButtonPopup(buttons, title) {
	// buttons: [{ label: "Button1", callback: function() { ... } }, ...]
	var dialog = new QDialog();
	dialog.windowTitle = title || "Menu";
	var layout = new QVBoxLayout(dialog);
	layout.setContentsMargins(0, 0, 0, 0);
	layout.setSpacing(0);

	for (var i = 0; i < buttons.length; ++i) {
		(function(btn) {
			var button = new QPushButton(btn.label, dialog);
			button.setStyleSheet("QPushButton { border: none; padding: 5px 10px; text-align: left; background-color: transparent; } QPushButton:hover { background-color: #a0a0a0; }");
			button.clicked.connect(function() {
				dialog.accept();
				btn.callback();
			});
			layout.addWidget(button, 0, 0);
		})(buttons[i]);
	}

	dialog.setWindowFlags(Qt.Popup | Qt.FramelessWindowHint);
	dialog.setStyleSheet("QDialog { border: 1px solid #ccc}");
	dialog.setLayout(layout);
	dialog.exec();
}
