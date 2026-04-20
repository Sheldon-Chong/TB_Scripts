

var __extends = (this && this.__extends) || (function () {
	var extendStatics = function (d, b) {
		extendStatics = Object.setPrototypeOf ||
			({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
			function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
		return extendStatics(d, b);
	};
	return function (d, b) {
		if (typeof b !== "function" && b !== null)
			throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
		extendStatics(d, b);
		function __() { this.constructor = d; }
		d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
})();

class ColorPickerButton extends QColorDialog {
	constructor(callback: (color: QColor) => void) {
    
		super();
  
    // Object.assign(this, {"width": 250});
    MessageLog.trace("object assign" + Object.test);
    MessageLog.trace("object assign" + Object.test);
    
    for (var child of this.children()) {
			if (child.text === "&Pick Screen Color")
				continue;
			if (child.hide)
				child.hide();
		}

		this.currentColorChanged.connect(function (color) {
			callback(color);
		});
	}
}

class ColorPickerDialog extends QDialog {
	private colorsUtils: any;
	private currentColor: any; // ColorObj instance
	private isDragging: boolean;
	
	private canvasContainer: QWidget;
	private saturationCanvas: QWidget;
	private brightnessCanvas: QWidget;
	private circleIndicator: QWidget;
	private hueBarContainer: QWidget;
	private hueBar: QWidget;
	private hueIndicator: QWidget;
	private colorPreview: QWidget;
	private hexInput: QLineEdit;
	private colorPickerDialog: ColorPickerButton;
	
	private defaultCircleSize: number;
	private enlargedCircleSize: number;
	
	public onDragStart?: () => void;
  public onDragMove?: ( color: any) => void;
	public onDragEnd?: () => void;

  public initialColor: ColorObj | null = null;

	setHSV(hue: number, sat: number, val: number) {
		this.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hue, sat, val);
		this.updateAllUI();
	}

	setColor(colorUtil: any) {
		this.currentColor = colorUtil;
		this.updateAllUI();
	}

	WIDTH = 250;

	constructor(params?: Partial<ColorPickerDialog>) {
		super();

    G.assign(this, params);

		MessageLog.trace("ColorUtils loaded: " + (_.ColorUtils ? "yes" : "no"));
		this.windowTitle = "Custom Color Picker";
		this.setMinimumSize(400, 350);
		
		var mainLayout = new QVBoxLayout(this);

		// Current color using ColorObj
		this.currentColor = this.initialColor || Object._.ColorUtils.ColorObj.fromHsv(0, 100, 100); // Default: white
		this.isDragging = false;    // Track dragging state
		
		this.canvasContainer = new QWidget();
		this.canvasContainer.setMinimumSize(this.WIDTH, this.WIDTH);
		this.canvasContainer.setMaximumSize(this.WIDTH, this.WIDTH);
		
		this.saturationCanvas = new QWidget(this.canvasContainer);
		this.saturationCanvas.setGeometry(0, 0, this.WIDTH, this.WIDTH);
		
		this.brightnessCanvas = new QWidget(this.canvasContainer);
		this.brightnessCanvas.setGeometry(0, 0, this.WIDTH, this.WIDTH);
		this.brightnessCanvas.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(0,0,0,0), stop:1 rgba(0,0,0,255)); border: 1px solid black;");
		
		// Circle indicator for selected color
		this.circleIndicator = new QWidget(this.canvasContainer);
		this.defaultCircleSize = 20;
		this.enlargedCircleSize = 30;
		var circleSize = this.defaultCircleSize;
		this.circleIndicator.setGeometry(0, 0, circleSize, circleSize);
		this.circleIndicator.setStyleSheet("background-color: white; border: 2px solid white; border-radius: " + (circleSize / 2) + "px;");
		this.circleIndicator.raise();
		
		// Hue gradient bar (rainbow)
		this.hueBarContainer = new QWidget();
		this.hueBarContainer.setMinimumSize(this.WIDTH, 20);
		this.hueBarContainer.setMaximumSize(this.WIDTH, 20);
		
		this.hueBar = new QWidget(this.hueBarContainer);
		this.hueBar.setGeometry(0, 0, this.WIDTH, 20);
		this.hueBar.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #FF0000, stop:0.16 #FFFF00, stop:0.33 #00FF00, stop:0.5 #00FFFF, stop:0.66 #0000FF, stop:0.83 #FF00FF, stop:1 #FF0000); border: 1px solid black;");
		
		// Hue indicator line
		this.hueIndicator = new QWidget(this.hueBarContainer);
		this.hueIndicator.setGeometry(0, 0, 2, 20);
		this.hueIndicator.setStyleSheet("background-color: white; border: 1px solid black;");
		this.hueIndicator.raise();
		
		// Color preview box
		this.colorPreview = new QWidget();
		this.colorPreview.setMaximumSize(60, 60);
		this.colorPreview.setStyleSheet("background-color: rgb(255, 255, 255); border: 1px solid black;");
		
		// Hex input field
		this.hexInput = new QLineEdit();
		this.hexInput.text = "#FFFFFF";
		this.hexInput.maximumWidth = 63;
		
		// Set up event handlers
		var self = this;
		
		// Canvas mouse tracking
		this.canvasContainer.mousePressEvent = function (event) {
			self.isDragging = true;
			var x = event.x();
			var y = event.y();
			var hsv = self.currentColor.toHsv();
			var newSat = Math.max(0, Math.min(100, (x / self.WIDTH) * 100));
			var newVal = Math.max(0, Math.min(100, 100 - (y / self.WIDTH) * 100));
			self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, newSat, newVal);
			if (self.onDragStart) self.onDragStart();
			
			self.updateAllUI();
		};
		
		this.canvasContainer.mouseMoveEvent = function (event) {
			if (event.buttons() & Qt.LeftButton) {
				var x = event.x();
				var y = event.y();
				var hsv = self.currentColor.toHsv();
				var newSat = Math.max(0, Math.min(100, (x / self.WIDTH) * 100));
				var newVal = Math.max(0, Math.min(100, 100 - (y / self.WIDTH) * 100));
				self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, newSat, newVal);
        try {
          if (self.onDragMove) self.onDragMove(self.currentColor);
        }
        catch (e) {
          MessageLog.trace("Error in onDragMove: " + e);
        }
				self.updateAllUI();
			}
		};
		
		this.canvasContainer.mouseReleaseEvent = function (event) {
			self.isDragging = false;
			if (self.onDragEnd) self.onDragEnd();
			self.updateAllUI();
		};
		
		// Also add mouse events to both child canvases
		this.brightnessCanvas.mousePressEvent = this.canvasContainer.mousePressEvent;
		this.brightnessCanvas.mouseMoveEvent = this.canvasContainer.mouseMoveEvent;
		this.brightnessCanvas.mouseReleaseEvent = this.canvasContainer.mouseReleaseEvent;
		
		// Hue bar mouse tracking
		this.hueBarContainer.mousePressEvent = function (event) {
			var x = event.x();
			var hsv = self.currentColor.toHsv();
			var newHue = Math.round((x / self.WIDTH) * 359);
			self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(newHue, hsv.s, hsv.v);
			if (self.onDragStart) self.onDragStart();
			if (self.onDragMove) {
				try {
					self.onDragMove(self.currentColor);
				} catch (e) {
					MessageLog.trace("Error in hueBar onDragMove: " + e);
				}
			}
			self.updateAllUI();
		};

		this.hueBarContainer.mouseMoveEvent = function (event) {
			if (event.buttons() & Qt.LeftButton) {
				var x = event.x();
				var hsv = self.currentColor.toHsv();
				var newHue = Math.round((x / self.WIDTH) * 359);
				self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(newHue, hsv.s, hsv.v);
				if (self.onDragMove) {
					try {
						self.onDragMove(self.currentColor);
					} catch (e) {
						MessageLog.trace("Error in hueBar onDragMove: " + e);
					}
				}
				self.updateAllUI();
			}
		};

		this.hueBarContainer.mouseReleaseEvent = function (event) {
			if (self.onDragEnd) self.onDragEnd();
			self.updateAllUI();
		};

		// Layout assembly - single column
		mainLayout.addWidget(this.canvasContainer, 0, Qt.AlignmentFlag.AlignCenter);
		mainLayout.addWidget(this.hueBarContainer, 0, Qt.AlignmentFlag.AlignCenter);
		
		// Color preview and hex input row
		var previewHexContainer = new QWidget();
		previewHexContainer.minimumWidth = this.WIDTH;
		previewHexContainer.maximumWidth = this.WIDTH;
		var previewHexLayout = new QHBoxLayout(previewHexContainer);
		previewHexLayout.setContentsMargins(0, 0, 0, 0);
		this.colorPreview.setMinimumSize(30, 30);
		this.colorPreview.setMaximumSize(30, 30);
		previewHexLayout.addWidget(this.colorPreview, 0, Qt.AlignmentFlag.AlignLeft);
		previewHexLayout.addWidget(this.hexInput, 0, Qt.AlignmentFlag.AlignLeft);
		
		// Add color picker button to the same row
		this.colorPickerDialog = new _.Widgets.ColorPickerButton(function (color) {
			self.currentColor = Object._.ColorUtils.ColorObj.fromRgb(color.red(), color.green(), color.blue());
			self.updateAllUI();
		});
		previewHexLayout.addWidget(this.colorPickerDialog, 0, Qt.AlignmentFlag.AlignLeft);
		
		mainLayout.addWidget(previewHexContainer, 0, Qt.AlignmentFlag.AlignCenter);
		
		// Hex input handler
		this.hexInput.editingFinished.connect(function () {
			var hexValue = self.hexInput.text.toUpperCase();
			try {
				self.currentColor = Object._.ColorUtils.ColorObj.fromHex(hexValue);
				self.updateAllUI();
			} catch (e) {
				// Invalid hex format - ignore
			}
		});
		
		// Initialize UI
		this.updateAllUI();
	}
	
	updateAllUI() {
		// Get color representations from ColorObj
		var hexColor = this.currentColor.toHex();
		var hsv = this.currentColor.toHsv();
		
		// Update color preview
		this.colorPreview.setStyleSheet("background-color: " + hexColor + "; border: 1px solid black.");
		
		// Update hex input
		this.hexInput.text = hexColor;
		
		// Update saturation canvas gradient (white to current hue at full saturation/value)
		var hueColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, 100, 100);
		var hueHex = hueColor.toHex();
		this.saturationCanvas.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #FFFFFF, stop:1 " + hueHex + ");");
		
		// Update circle indicator position and color
		var circleSize = this.isDragging ? this.enlargedCircleSize : this.defaultCircleSize;
		var x = Math.round((hsv.s / 100) * this.WIDTH);
		var y = Math.round((1 - (hsv.v / 100)) * this.WIDTH);
		this.circleIndicator.setGeometry(x - (circleSize / 2), y - (circleSize / 2), circleSize, circleSize);
		this.circleIndicator.setStyleSheet("background-color: " + hexColor + "; border: 2px solid white; border-radius: " + (circleSize / 2) + "px;");
		
		// Update hue indicator position
		var hueX = Math.round((hsv.h / 359) * this.WIDTH);
		this.hueIndicator.setGeometry(hueX - 1, 0, 2, 20);
	}
}

class PegController extends QWidget {

	test = "Test";

	constructor(params) {
		super();
		var size = params.size || 100;
		var dragCallback = G.Utils.bind(params.dragCallback, this) || function (x, y) { };
		var dragStartCallback = G.Utils.bind(params.dragStartCallback,this) || function (x, y) { };
		var dragReleaseCallback = G.Utils.bind(params.dragReleaseCallback, this) || function (x, y) { };
		var scaleFactor = params.scaleFactor || 10; // Divide distance by this to get visual circle size

		this.minimumWidth = (size + 90); // canvas + spacing + spinbox width
		this.maximumWidth = (size + 90);

		var mainLayout = new QHBoxLayout(this);
		mainLayout.setContentsMargins(0, 0, 0, 0);
		mainLayout.setSpacing(5);

		// Create canvas widget
		var widget = new QWidget();
		widget.setMinimumSize(size, size);
		widget.setMaximumSize(size, size);
		widget.setStyleSheet("background-color: #333; border: 2px solid #666; border-radius: 5px;");

		var centerX = size / 2;
		var centerY = size / 2;
		var isDragging = false;
		var currentX = 0;
		var currentY = 0;

		// Create indicator circle
		var indicator = new QWidget(widget);
		indicator.setGeometry(centerX - 5, centerY - 5, 10, 10);
		indicator.setStyleSheet("background-color: #66CCFF; border: 2px solid white; border-radius: 5px;");
		indicator.raise();

		// Create spinbox container
		var spinboxContainer = new QWidget();
		spinboxContainer.minimumWidth = 85;
		spinboxContainer.maximumWidth = 85;

		var spinboxLayout = new QVBoxLayout(spinboxContainer);
		spinboxLayout.setContentsMargins(0, 0, 0, 0);
		spinboxLayout.setSpacing(2);

		// X input row
		var xContainer = new QWidget();
		var xLayout = new QHBoxLayout(xContainer);
		xLayout.setContentsMargins(0, 0, 0, 0);
		xLayout.setSpacing(5);

		var xLabel = new QLabel("X:");
		xLabel.minimumWidth = (15);
		xLabel.maximumWidth = (15);

		var xSpinbox = new QDoubleSpinBox();
		xSpinbox.setRange(-10000, 10000);
		xSpinbox.setValue(0);
		xSpinbox.minimumWidth = (65);
		xSpinbox.maximumWidth = (65);

		xLayout.addWidget(xLabel, 0, Qt.AlignmentFlag.AlignLeft);
		xLayout.addWidget(xSpinbox, 0, Qt.AlignmentFlag.AlignLeft);

		// Y input row
		var yContainer = new QWidget();
		var yLayout = new QHBoxLayout(yContainer);
		yLayout.setContentsMargins(0, 0, 0, 0);
		yLayout.setSpacing(5);

		var yLabel = new QLabel("Y:");
		yLabel.minimumWidth = (15);
		yLabel.maximumWidth = (15);

		var ySpinbox = new QDoubleSpinBox();
		ySpinbox.setRange(-10000, 10000);
		ySpinbox.setValue(0);
		ySpinbox.minimumWidth = (65);
		ySpinbox.maximumWidth = (65);

		yLayout.addWidget(yLabel, 0, Qt.AlignmentFlag.AlignLeft);
		yLayout.addWidget(ySpinbox, 0, Qt.AlignmentFlag.AlignLeft);

		spinboxLayout.addWidget(xContainer, 0, Qt.AlignmentFlag.AlignLeft);
		spinboxLayout.addWidget(yContainer, 0, Qt.AlignmentFlag.AlignLeft);

		mainLayout.addWidget(widget, 0, Qt.AlignmentFlag.AlignLeft);
		mainLayout.addWidget(spinboxContainer, 0, Qt.AlignmentFlag.AlignLeft);

		function updateIndicator(x, y) {
			// Calculate distance from center
			var distance = Math.sqrt(x * x + y * y);
			var scaledDistance = distance / scaleFactor;

			// Calculate position for indicator (scaled down)
			var scaledX = (x / distance) * scaledDistance;
			var scaledY = (y / distance) * scaledDistance;

			if (isNaN(scaledX)) scaledX = 0;
			if (isNaN(scaledY)) scaledY = 0;

			// Position indicator relative to widget center
			var indicatorSize = 10;
			indicator.setGeometry(
				centerX + scaledX - (indicatorSize / 2),
				centerY + scaledY - (indicatorSize / 2),
				indicatorSize,
				indicatorSize
			);
		}

		function updateSpinboxes(x, y) {
			xSpinbox.value = x;
			ySpinbox.value = y;
		}

		function updateFromSpinboxes() {
			currentX = xSpinbox.value;
			currentY = ySpinbox.value;
			offsetX = currentX;
			offsetY = currentY;
			updateIndicator(currentX, currentY);
			dragCallback(currentX, currentY);
		}

		// Connect spinbox value changes
		xSpinbox['valueChanged(double)'].connect(function (value) {
			updateFromSpinboxes();
		});

		ySpinbox['valueChanged(double)'].connect(function (value) {
			updateFromSpinboxes();
		});

		widget.mouseMoveEvent = G.Utils.bind(function (event) {
			if (isDragging) {
				// Always set position relative to center
				currentX = event.x() - centerX;
				currentY = event.y() - centerY;
				updateIndicator(currentX, currentY);
				updateSpinboxes(currentX, currentY);
				MessageLog.trace("PegController drag: (" + currentX + ", " + currentY + ")");
				MessageLog.trace("test " + this.test);
			G.Utils.bind(dragCallback, this)(currentX, currentY);

				// dragCallback(currentX, currentY);
			}
			else {
				isDragging = true;
				G.Utils.bind(dragStartCallback, this)(currentX, currentY);
				G.Utils.bind(dragCallback, this)(currentX, currentY);
				MessageLog.trace("down");
			}
		}, this);

		widget.mouseReleaseEvent = G.Utils.bind(function (event) {
			isDragging = false;
			G.Utils.bind(dragReleaseCallback, this)(currentX, currentY);
			MessageLog.trace("released");
			// Do not accumulate offset
		}, this);
	}
	
}


function SimpleColorPicker(colorChangedCallback?: (color: QColor) => void) {
	// Create wrapper dialog

	
	var dialog = new QDialog();
	dialog.windowTitle = "Color Picker";
	var mainLayout = new QVBoxLayout(dialog);

	var colorDialog = new QColorDialog();
	colorDialog.setOption(QColorDialog.NoButtons);
	colorDialog.setOption(QColorDialog.DontUseNativeDialog);

	// Get children and find Pick Screen Color button and color canvas
	var children = colorDialog.children();
	var pickScreenBtn = null;
	var colorCanvas = null;

	for (var i = 0; i < children.length; i++) {
		var child = children[i];
		// Hide basic colors label and grid
		if (child.text === "&Basic colors") {
			child.hide();
			// Also hide the grid widget before it (index 2)
			if (i > 0) children[i - 1].hide();
		}
		// Hide custom colors label
		else if (child.text === "&Custom colors") {
			child.hide();
			// Also hide the custom colors grid widget before it (index 6)
			if (i > 0) children[i - 1].hide();
		}
		// Hide "Add to Custom Colors" button
		else if (child.text === "&Add to Custom Colors") {
			child.hide();
		}
		// Find Pick Screen Color button
		else if (child.text === "&Pick Screen Color") {
			stringify(getMethods(child));
			stringify(child);
			pickScreenBtn = child;
			child.hide();  // Hide it from original position
		}
		// Find the color canvas (has selectedColumn and selectedRow properties)
		// else if (typeof child.selectedColumn !== "undefined" && typeof child.selectedRow !== "undefined") {
		// 	colorCanvas = child;
		// 	MessageLog.trace("Found color canvas at index " + i);
		// 	// stringify(child);
		// 	child.hide;
		// }
		else if (i === 8) {
			colorCanvas = child;
			// child.hide();
			stringify(getMethods(child));
		}
	}

	for (child of children) {
		child.mousePressEvent = function(event) {
			MessageLog.trace("Child mouse press: " + this.text + " at (" + event.x() + ", " + event.y() + ")");
		}
	}

	var isDragging = false;


	// Connect to color changes from the main color dialog
	colorDialog.currentColorChanged.connect(function (color) {
		MessageLog.trace("Color changed: " + color.name() + " RGB(" + color.red() + "," + color.green() + "," + color.blue() + ")");
		colorChangedCallback(color);
	});


	// Add color dialog to wrapper
	mainLayout.addWidget(colorDialog, 0, Qt.AlignmentFlag.AlignCenter);

	// Add Pick Screen Color button at bottom if found
	if (pickScreenBtn) {
		pickScreenBtn.setParent(dialog);
		pickScreenBtn.show();
		mainLayout.addWidget(pickScreenBtn, 0, Qt.AlignmentFlag.AlignCenter);
	}

	dialog.mousePressEvent = function(event) {
		MessageLog.trace("Color dialog mouse press at (" + event.x() + ", " + event.y() + ")");
	}

	// Implement drag-start callback
	colorCanvas.mousePressEvent = function(event) {
		isDragging = true;
		MessageLog.trace("[DRAG START] Mouse pressed on canvas at: (" + event.x() + ", " + event.y() + ")");
	};

	// Implement drag-release callback
	colorCanvas.mouseReleaseEvent = function(event) {
		if (isDragging) {
			MessageLog.trace("[DRAG RELEASE] Mouse released on canvas at: (" + event.x() + ", " + event.y() + ")");
			isDragging = false;
		}
	};

	dialog.show();
}

const Widgets = {
  ColorPickerButton: ColorPickerButton,
  ColorPickerDialog: ColorPickerDialog,
	PegController: PegController
}