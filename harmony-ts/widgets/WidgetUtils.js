var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
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
var ColorPickerButton = (function (_super) {
    __extends(ColorPickerButton, _super);
    function ColorPickerButton(callback) {
        var _this = _super.call(this) || this;
        MessageLog.trace("object assign" + Object.test);
        MessageLog.trace("object assign" + Object.test);
        for (var _i = 0, _a = _this.children(); _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.text === "&Pick Screen Color")
                continue;
            if (child.hide)
                child.hide();
        }
        _this.currentColorChanged.connect(function (color) {
            callback(color);
        });
        return _this;
    }
    return ColorPickerButton;
}(QColorDialog));
var ColorPickerDialog = (function (_super) {
    __extends(ColorPickerDialog, _super);
    function ColorPickerDialog(params) {
        var _this = _super.call(this) || this;
        _this.initialColor = null;
        _this.WIDTH = 250;
        G.assign(_this, params);
        MessageLog.trace("ColorUtils loaded: " + (_.ColorUtils ? "yes" : "no"));
        _this.windowTitle = "Custom Color Picker";
        _this.setMinimumSize(400, 350);
        var mainLayout = new QVBoxLayout(_this);
        _this.currentColor = _this.initialColor || Object._.ColorUtils.ColorObj.fromHsv(0, 100, 100);
        _this.isDragging = false;
        _this.canvasContainer = new QWidget();
        _this.canvasContainer.setMinimumSize(_this.WIDTH, _this.WIDTH);
        _this.canvasContainer.setMaximumSize(_this.WIDTH, _this.WIDTH);
        _this.saturationCanvas = new QWidget(_this.canvasContainer);
        _this.saturationCanvas.setGeometry(0, 0, _this.WIDTH, _this.WIDTH);
        _this.brightnessCanvas = new QWidget(_this.canvasContainer);
        _this.brightnessCanvas.setGeometry(0, 0, _this.WIDTH, _this.WIDTH);
        _this.brightnessCanvas.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(0,0,0,0), stop:1 rgba(0,0,0,255)); border: 1px solid black;");
        _this.circleIndicator = new QWidget(_this.canvasContainer);
        _this.defaultCircleSize = 20;
        _this.enlargedCircleSize = 30;
        var circleSize = _this.defaultCircleSize;
        _this.circleIndicator.setGeometry(0, 0, circleSize, circleSize);
        _this.circleIndicator.setStyleSheet("background-color: white; border: 2px solid white; border-radius: " + (circleSize / 2) + "px;");
        _this.circleIndicator.raise();
        _this.hueBarContainer = new QWidget();
        _this.hueBarContainer.setMinimumSize(_this.WIDTH, 20);
        _this.hueBarContainer.setMaximumSize(_this.WIDTH, 20);
        _this.hueBar = new QWidget(_this.hueBarContainer);
        _this.hueBar.setGeometry(0, 0, _this.WIDTH, 20);
        _this.hueBar.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #FF0000, stop:0.16 #FFFF00, stop:0.33 #00FF00, stop:0.5 #00FFFF, stop:0.66 #0000FF, stop:0.83 #FF00FF, stop:1 #FF0000); border: 1px solid black;");
        _this.hueIndicator = new QWidget(_this.hueBarContainer);
        _this.hueIndicator.setGeometry(0, 0, 2, 20);
        _this.hueIndicator.setStyleSheet("background-color: white; border: 1px solid black;");
        _this.hueIndicator.raise();
        _this.colorPreview = new QWidget();
        _this.colorPreview.setMaximumSize(60, 60);
        _this.colorPreview.setStyleSheet("background-color: rgb(255, 255, 255); border: 1px solid black;");
        _this.hexInput = new QLineEdit();
        _this.hexInput.text = "#FFFFFF";
        _this.hexInput.maximumWidth = 63;
        var self = _this;
        _this.canvasContainer.mousePressEvent = function (event) {
            self.isDragging = true;
            var x = event.x();
            var y = event.y();
            var hsv = self.currentColor.toHsv();
            var newSat = Math.max(0, Math.min(100, (x / self.WIDTH) * 100));
            var newVal = Math.max(0, Math.min(100, 100 - (y / self.WIDTH) * 100));
            self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, newSat, newVal);
            if (self.onDragStart)
                self.onDragStart();
            self.updateAllUI();
        };
        _this.canvasContainer.mouseMoveEvent = function (event) {
            if (event.buttons() & Qt.LeftButton) {
                var x = event.x();
                var y = event.y();
                var hsv = self.currentColor.toHsv();
                var newSat = Math.max(0, Math.min(100, (x / self.WIDTH) * 100));
                var newVal = Math.max(0, Math.min(100, 100 - (y / self.WIDTH) * 100));
                self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, newSat, newVal);
                try {
                    if (self.onDragMove)
                        self.onDragMove(self.currentColor);
                }
                catch (e) {
                    MessageLog.trace("Error in onDragMove: " + e);
                }
                self.updateAllUI();
            }
        };
        _this.canvasContainer.mouseReleaseEvent = function (event) {
            self.isDragging = false;
            if (self.onDragEnd)
                self.onDragEnd();
            self.updateAllUI();
        };
        _this.brightnessCanvas.mousePressEvent = _this.canvasContainer.mousePressEvent;
        _this.brightnessCanvas.mouseMoveEvent = _this.canvasContainer.mouseMoveEvent;
        _this.brightnessCanvas.mouseReleaseEvent = _this.canvasContainer.mouseReleaseEvent;
        _this.hueBarContainer.mousePressEvent = function (event) {
            var x = event.x();
            var hsv = self.currentColor.toHsv();
            var newHue = Math.round((x / self.WIDTH) * 359);
            self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(newHue, hsv.s, hsv.v);
            if (self.onDragStart)
                self.onDragStart();
            if (self.onDragMove) {
                try {
                    self.onDragMove(self.currentColor);
                }
                catch (e) {
                    MessageLog.trace("Error in hueBar onDragMove: " + e);
                }
            }
            self.updateAllUI();
        };
        _this.hueBarContainer.mouseMoveEvent = function (event) {
            if (event.buttons() & Qt.LeftButton) {
                var x = event.x();
                var hsv = self.currentColor.toHsv();
                var newHue = Math.round((x / self.WIDTH) * 359);
                self.currentColor = Object._.ColorUtils.ColorObj.fromHsv(newHue, hsv.s, hsv.v);
                if (self.onDragMove) {
                    try {
                        self.onDragMove(self.currentColor);
                    }
                    catch (e) {
                        MessageLog.trace("Error in hueBar onDragMove: " + e);
                    }
                }
                self.updateAllUI();
            }
        };
        _this.hueBarContainer.mouseReleaseEvent = function (event) {
            if (self.onDragEnd)
                self.onDragEnd();
            self.updateAllUI();
        };
        mainLayout.addWidget(_this.canvasContainer, 0, Qt.AlignmentFlag.AlignCenter);
        mainLayout.addWidget(_this.hueBarContainer, 0, Qt.AlignmentFlag.AlignCenter);
        var previewHexContainer = new QWidget();
        previewHexContainer.minimumWidth = _this.WIDTH;
        previewHexContainer.maximumWidth = _this.WIDTH;
        var previewHexLayout = new QHBoxLayout(previewHexContainer);
        previewHexLayout.setContentsMargins(0, 0, 0, 0);
        _this.colorPreview.setMinimumSize(30, 30);
        _this.colorPreview.setMaximumSize(30, 30);
        previewHexLayout.addWidget(_this.colorPreview, 0, Qt.AlignmentFlag.AlignLeft);
        previewHexLayout.addWidget(_this.hexInput, 0, Qt.AlignmentFlag.AlignLeft);
        _this.colorPickerDialog = new _.Widgets.ColorPickerButton(function (color) {
            self.currentColor = Object._.ColorUtils.ColorObj.fromRgb(color.red(), color.green(), color.blue());
            self.updateAllUI();
        });
        previewHexLayout.addWidget(_this.colorPickerDialog, 0, Qt.AlignmentFlag.AlignLeft);
        mainLayout.addWidget(previewHexContainer, 0, Qt.AlignmentFlag.AlignCenter);
        _this.hexInput.editingFinished.connect(function () {
            var hexValue = self.hexInput.text.toUpperCase();
            try {
                self.currentColor = Object._.ColorUtils.ColorObj.fromHex(hexValue);
                self.updateAllUI();
            }
            catch (e) {
            }
        });
        _this.updateAllUI();
        return _this;
    }
    ColorPickerDialog.prototype.setHSV = function (hue, sat, val) {
        this.currentColor = Object._.ColorUtils.ColorObj.fromHsv(hue, sat, val);
        this.updateAllUI();
    };
    ColorPickerDialog.prototype.setColor = function (colorUtil) {
        this.currentColor = colorUtil;
        this.updateAllUI();
    };
    ColorPickerDialog.prototype.updateAllUI = function () {
        var hexColor = this.currentColor.toHex();
        var hsv = this.currentColor.toHsv();
        this.colorPreview.setStyleSheet("background-color: " + hexColor + "; border: 1px solid black.");
        this.hexInput.text = hexColor;
        var hueColor = Object._.ColorUtils.ColorObj.fromHsv(hsv.h, 100, 100);
        var hueHex = hueColor.toHex();
        this.saturationCanvas.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #FFFFFF, stop:1 " + hueHex + ");");
        var circleSize = this.isDragging ? this.enlargedCircleSize : this.defaultCircleSize;
        var x = Math.round((hsv.s / 100) * this.WIDTH);
        var y = Math.round((1 - (hsv.v / 100)) * this.WIDTH);
        this.circleIndicator.setGeometry(x - (circleSize / 2), y - (circleSize / 2), circleSize, circleSize);
        this.circleIndicator.setStyleSheet("background-color: " + hexColor + "; border: 2px solid white; border-radius: " + (circleSize / 2) + "px;");
        var hueX = Math.round((hsv.h / 359) * this.WIDTH);
        this.hueIndicator.setGeometry(hueX - 1, 0, 2, 20);
    };
    return ColorPickerDialog;
}(QDialog));
var PegController = (function (_super) {
    __extends(PegController, _super);
    function PegController(params) {
        var _this = _super.call(this) || this;
        _this.test = "Test";
        var size = params.size || 100;
        var dragCallback = G.Utils.bind(params.dragCallback, _this) || function (x, y) { };
        var dragStartCallback = G.Utils.bind(params.dragStartCallback, _this) || function (x, y) { };
        var dragReleaseCallback = G.Utils.bind(params.dragReleaseCallback, _this) || function (x, y) { };
        var scaleFactor = params.scaleFactor || 10;
        _this.minimumWidth = (size + 90);
        _this.maximumWidth = (size + 90);
        var mainLayout = new QHBoxLayout(_this);
        mainLayout.setContentsMargins(0, 0, 0, 0);
        mainLayout.setSpacing(5);
        var widget = new QWidget();
        widget.setMinimumSize(size, size);
        widget.setMaximumSize(size, size);
        widget.setStyleSheet("background-color: #333; border: 2px solid #666; border-radius: 5px;");
        var centerX = size / 2;
        var centerY = size / 2;
        var isDragging = false;
        var currentX = 0;
        var currentY = 0;
        var indicator = new QWidget(widget);
        indicator.setGeometry(centerX - 5, centerY - 5, 10, 10);
        indicator.setStyleSheet("background-color: #66CCFF; border: 2px solid white; border-radius: 5px;");
        indicator.raise();
        var spinboxContainer = new QWidget();
        spinboxContainer.minimumWidth = 85;
        spinboxContainer.maximumWidth = 85;
        var spinboxLayout = new QVBoxLayout(spinboxContainer);
        spinboxLayout.setContentsMargins(0, 0, 0, 0);
        spinboxLayout.setSpacing(2);
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
            var distance = Math.sqrt(x * x + y * y);
            var scaledDistance = distance / scaleFactor;
            var scaledX = (x / distance) * scaledDistance;
            var scaledY = (y / distance) * scaledDistance;
            if (isNaN(scaledX))
                scaledX = 0;
            if (isNaN(scaledY))
                scaledY = 0;
            var indicatorSize = 10;
            indicator.setGeometry(centerX + scaledX - (indicatorSize / 2), centerY + scaledY - (indicatorSize / 2), indicatorSize, indicatorSize);
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
        xSpinbox['valueChanged(double)'].connect(function (value) {
            updateFromSpinboxes();
        });
        ySpinbox['valueChanged(double)'].connect(function (value) {
            updateFromSpinboxes();
        });
        widget.mouseMoveEvent = G.Utils.bind(function (event) {
            if (isDragging) {
                currentX = event.x() - centerX;
                currentY = event.y() - centerY;
                updateIndicator(currentX, currentY);
                updateSpinboxes(currentX, currentY);
                MessageLog.trace("PegController drag: (" + currentX + ", " + currentY + ")");
                MessageLog.trace("test " + this.test);
                G.Utils.bind(dragCallback, this)(currentX, currentY);
            }
            else {
                isDragging = true;
                G.Utils.bind(dragStartCallback, this)(currentX, currentY);
                G.Utils.bind(dragCallback, this)(currentX, currentY);
                MessageLog.trace("down");
            }
        }, _this);
        widget.mouseReleaseEvent = G.Utils.bind(function (event) {
            isDragging = false;
            G.Utils.bind(dragReleaseCallback, this)(currentX, currentY);
            MessageLog.trace("released");
        }, _this);
        return _this;
    }
    return PegController;
}(QWidget));
function SimpleColorPicker(colorChangedCallback) {
    var dialog = new QDialog();
    dialog.windowTitle = "Color Picker";
    var mainLayout = new QVBoxLayout(dialog);
    var colorDialog = new QColorDialog();
    colorDialog.setOption(QColorDialog.NoButtons);
    colorDialog.setOption(QColorDialog.DontUseNativeDialog);
    var children = colorDialog.children();
    var pickScreenBtn = null;
    var colorCanvas = null;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.text === "&Basic colors") {
            child.hide();
            if (i > 0)
                children[i - 1].hide();
        }
        else if (child.text === "&Custom colors") {
            child.hide();
            if (i > 0)
                children[i - 1].hide();
        }
        else if (child.text === "&Add to Custom Colors") {
            child.hide();
        }
        else if (child.text === "&Pick Screen Color") {
            stringify(getMethods(child));
            stringify(child);
            pickScreenBtn = child;
            child.hide();
        }
        else if (i === 8) {
            colorCanvas = child;
            stringify(getMethods(child));
        }
    }
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        child = children_1[_i];
        child.mousePressEvent = function (event) {
            MessageLog.trace("Child mouse press: " + this.text + " at (" + event.x() + ", " + event.y() + ")");
        };
    }
    var isDragging = false;
    colorDialog.currentColorChanged.connect(function (color) {
        MessageLog.trace("Color changed: " + color.name() + " RGB(" + color.red() + "," + color.green() + "," + color.blue() + ")");
        colorChangedCallback(color);
    });
    mainLayout.addWidget(colorDialog, 0, Qt.AlignmentFlag.AlignCenter);
    if (pickScreenBtn) {
        pickScreenBtn.setParent(dialog);
        pickScreenBtn.show();
        mainLayout.addWidget(pickScreenBtn, 0, Qt.AlignmentFlag.AlignCenter);
    }
    dialog.mousePressEvent = function (event) {
        MessageLog.trace("Color dialog mouse press at (" + event.x() + ", " + event.y() + ")");
    };
    colorCanvas.mousePressEvent = function (event) {
        isDragging = true;
        MessageLog.trace("[DRAG START] Mouse pressed on canvas at: (" + event.x() + ", " + event.y() + ")");
    };
    colorCanvas.mouseReleaseEvent = function (event) {
        if (isDragging) {
            MessageLog.trace("[DRAG RELEASE] Mouse released on canvas at: (" + event.x() + ", " + event.y() + ")");
            isDragging = false;
        }
    };
    dialog.show();
}
var Widgets = {
    ColorPickerButton: ColorPickerButton,
    ColorPickerDialog: ColorPickerDialog,
    PegController: PegController
};
