include("globals.js");
var BaseTooltip = (function (_super) {
    __extends(BaseTooltip, _super);
    function BaseTooltip() {
        var _this = _super.call(this) || this;
        _this.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
        _this.setStyleSheet("QWidget { background-color: #333; color: white; border-radius: 10px; padding: 4px; font-family: Arial; font-size: 10pt; }");
        _this.setAttribute(Qt.WA_DeleteOnClose);
        BaseTooltip.allToasts.push(_this);
        return _this;
    }
    BaseTooltip.destroyAllTooltips = function () {
        for (var _i = 0, _a = BaseTooltip.allToasts; _i < _a.length; _i++) {
            var toast_1 = _a[_i];
            toast_1.close();
        }
    };
    BaseTooltip.allToasts = [];
    return BaseTooltip;
}(QWidget));
var DropdownTooltipButton = (function (_super) {
    __extends(DropdownTooltipButton, _super);
    function DropdownTooltipButton(label, options, onSelect, tooltipHeight) {
        if (tooltipHeight === void 0) { tooltipHeight = 200; }
        var _this = _super.call(this, label) || this;
        _this.selectedWidget = null;
        _this.onSelect = onSelect;
        _this.setStyleSheet("QPushButton {\n\t\t\t\tbackground-color: #000;\n\t\t\t\tcolor: #fff;\n\t\t\t\tborder: 2px solid #fff;\n\t\t\t\tborder-radius: 6px;\n\t\t\t\tpadding: 4px 12px;\n\t\t\t}\n\t\t\tQPushButton:pressed {\n\t\t\t\tbackground-color: #222;\n\t\t\t}");
        _this.tooltip = new BaseTooltip();
        _this.tooltip.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
        _this.tooltip.setFixedHeight(tooltipHeight);
        _this.tooltip.setFixedWidth(220);
        var scrollArea = new QScrollArea(_this.tooltip);
        scrollArea.setFixedHeight(tooltipHeight);
        _this.optionContainer = new QWidget();
        _this.optionLayout = new QVBoxLayout(_this.optionContainer);
        _this.optionLayout.setSpacing(2);
        _this.optionLayout.setContentsMargins(2, 2, 2, 2);
        options.forEach(function (widget, i) {
            widget.mousePressEvent = function (event) {
                _this.setSelected(widget);
                if (_this.onSelect)
                    _this.onSelect(widget, i);
                _this.tooltip.hide();
            };
            _this.optionLayout.addWidget(widget, 0, 0);
        });
        _this.optionContainer.setLayout(_this.optionLayout);
        scrollArea.setWidget(_this.optionContainer);
        var tooltipLayout = new QVBoxLayout(_this.tooltip);
        tooltipLayout.setContentsMargins(0, 0, 0, 0);
        tooltipLayout.addWidget(scrollArea, 0, 0);
        _this['clicked()'].connect(function () {
            var pos = _this.mapToGlobal(new QPoint(0, _this.height));
            _this.tooltip.move(pos.x(), pos.y());
            _this.tooltip.show();
        });
        return _this;
    }
    DropdownTooltipButton.prototype.setSelected = function (widget) {
        this.selectedWidget = widget;
        if (widget.text) {
            this.text = widget.text;
        }
    };
    return DropdownTooltipButton;
}(QPushButton));
var StringListWithButtons = (function (_super) {
    __extends(StringListWithButtons, _super);
    function StringListWithButtons(stringList, buttonText, buttonCallback) {
        if (buttonText === void 0) { buttonText = "Action"; }
        var _this = _super.call(this) || this;
        _this.items = [];
        _this.setWindowTitle("String List with Buttons");
        _this.setMinimumSize(300, 400);
        _this.scrollArea = new QScrollArea();
        _this.scrollArea.setWidgetResizable(true);
        _this.scrollArea.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded);
        _this.scrollArea.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded);
        _this.contentWidget = new QWidget();
        _this.layout = new QVBoxLayout(_this.contentWidget);
        _this.layout.setSpacing(5);
        _this.layout.setContentsMargins(5, 5, 5, 5);
        var _loop_1 = function (i) {
            var itemWidget = new QWidget();
            var itemLayout = new QHBoxLayout(itemWidget);
            itemLayout.setContentsMargins(0, 0, 0, 0);
            var label = new QLabel(stringList[i]);
            label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred);
            var button = new QPushButton(buttonText);
            button.setFixedWidth(80);
            if (buttonCallback) {
                button['clicked()'].connect(function () {
                    buttonCallback(i, stringList[i]);
                });
            }
            itemLayout.addWidget(label);
            itemLayout.addWidget(button);
            this_1.layout.addWidget(itemWidget);
            this_1.items.push({ label: label, button: button, widget: itemWidget });
        };
        var this_1 = this;
        for (var i = 0; i < stringList.length; i++) {
            _loop_1(i);
        }
        _this.scrollArea.setWidget(_this.contentWidget);
        var mainLayout = new QVBoxLayout(_this);
        mainLayout.addWidget(_this.scrollArea);
        _this.setLayout(mainLayout);
        return _this;
    }
    StringListWithButtons.prototype.updateList = function (newStringList) {
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var item = _a[_i];
            this.layout.removeWidget(item.widget);
            item.widget.close();
        }
        this.items = [];
        for (var i = 0; i < newStringList.length; i++) {
            var itemWidget = new QWidget();
            var itemLayout = new QHBoxLayout(itemWidget);
            itemLayout.setContentsMargins(0, 0, 0, 0);
            var label = new QLabel(newStringList[i]);
            label.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred);
            var button = new QPushButton("Action");
            button.setFixedWidth(80);
            itemLayout.addWidget(label);
            itemLayout.addWidget(button);
            this.layout.addWidget(itemWidget);
            this.items.push({ label: label, button: button, widget: itemWidget });
        }
    };
    return StringListWithButtons;
}(BaseTooltip));
var ToolTipText = (function (_super) {
    __extends(ToolTipText, _super);
    function ToolTipText(text) {
        var _this = _super.call(this) || this;
        var layout = new QHBoxLayout(_this);
        _this.label = new QLabel(text);
        layout.addWidget(_this.label, 0, 0);
        return _this;
    }
    ToolTipText.prototype.showAt = function (pos) {
        this.move(pos.x(), pos.y());
        this.show();
    };
    ToolTipText.prototype.setText = function (text) {
        this.label.text = text;
    };
    return ToolTipText;
}(BaseTooltip));
G.TooltipToast = ToolTipText;
var ColumnDiscrepancyIndicator = (function (_super) {
    __extends(ColumnDiscrepancyIndicator, _super);
    function ColumnDiscrepancyIndicator() {
        var _this = _super.call(this) || this;
        _this._tooltipVisible = false;
        _this.text = (" ⚠️ ");
        _this.setFixedSize(18, 18);
        _this.hide();
        _this.toast = new ToolTipText("Multiple values in selection for current lighting group");
        _this['clicked()'].connect(function () {
            if (!_this._tooltipVisible) {
                var pos = _this.mapToGlobal(new QPoint(0, _this.height));
                _this.toast.showAt(pos);
                _this._tooltipVisible = true;
            }
            else {
                MessageLog.trace("Hiding discrepancy tooltip");
                _this.toast.hide();
                _this._tooltipVisible = false;
            }
        });
        _this.setStyleSheet("padding:0; margin:0; font-size:12px; min-width:0; min-height:0;max-width:18px; max-height:18px;");
        return _this;
    }
    return ColumnDiscrepancyIndicator;
}(QPushButton));
var ParamController = (function () {
    function ParamController(objectRef, path) {
        this.objectRef = objectRef;
        this.path = path;
    }
    ParamController.prototype.getValue = function () {
        return G.Utils.getValueByPath(this.objectRef, this.path);
    };
    ParamController.prototype.setValue = function (newValue) {
        var parts = this.path.split(".");
        var obj = this.objectRef;
        for (var i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = newValue;
    };
    return ParamController;
}());
function initializeButtons(objects, mappings) {
    for (var _i = 0, objects_1 = objects; _i < objects_1.length; _i++) {
        var obj = objects_1[_i];
        if (!obj.param)
            continue;
        var _loop_2 = function (key, value) {
            if (obj.param === key && obj.controllerType === "Button") {
                obj['clicked()'].connect(function () {
                    try {
                        value();
                    }
                    catch (e) {
                        MessageLog.trace("Error in button callback for param " + key + ": " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
                    }
                });
            }
        };
        for (var _a = 0, _b = Object.entries(mappings); _a < _b.length; _a++) {
            var _c = _b[_a], key = _c[0], value = _c[1];
            _loop_2(key, value);
        }
    }
}
var ColorPickerController = (function () {
    function ColorPickerController(button, param, startingColor, redColumn, greenColumn, blueColumn, onDragStart, onDragEnd, onDragMove) {
        var _this = this;
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
        this.button['clicked()'].connect(wrapWithCatch(function () {
            var color = new G.ColorUtils.ColorObj({
                r: _this.colors.red.value,
                g: _this.colors.green.value,
                b: _this.colors.blue.value
            });
            var colorPicker = new G.Widgets.ColorPickerDialog({
                initialColor: color,
                onDragStart: G.Utils.bind(onDragStart, _this) || (function () { scene.beginUndoRedoAccum("Color picker drag"); }),
                onDragEnd: G.Utils.bind(onDragEnd, _this) || (function () { scene.endUndoRedoAccum(); }),
                onDragMove: function (color) {
                    var rgb = color.toRgb();
                    _this.button.setStyleSheet("background-color: rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ");  border: 3px solid #454545; border-radius: 10px;");
                    _this.colors.red.column.setKeyFrame(new G.oSelection(), rgb.r);
                    _this.colors.green.column.setKeyFrame(new G.oSelection(), rgb.g);
                    _this.colors.blue.column.setKeyFrame(new G.oSelection(), rgb.b);
                    _this.colors.red.value = rgb.r;
                    _this.colors.green.value = rgb.g;
                    _this.colors.blue.value = rgb.b;
                    if (onDragMove) {
                        onDragMove({ r: rgb.r, g: rgb.g, b: rgb.b, a: 255 });
                    }
                }
            });
            colorPicker.show();
        }));
    }
    ColorPickerController.prototype.updateColor = function (newValues) {
        this.colors.red.value = newValues.r;
        this.colors.green.value = newValues.g;
        this.colors.blue.value = newValues.b;
        var color = new G.ColorObj({
            r: this.colors.red.value,
            g: this.colors.green.value,
            b: this.colors.blue.value
        });
        this.button.setStyleSheet("background-color: " + color.toHex() + "; border: 3px solid #454545; border-radius: 10px;");
    };
    return ColorPickerController;
}());
Object.PassManager = PassManager;
var SliderController = (function () {
    function SliderController(params) {
        var _this = this;
        this.min = 0;
        this.max = 100;
        G.assign(this, params);
        if (this.onDragStart) {
            this.slider.sliderPressed.connect(G.Utils.bind(this.onDragStart, this));
        }
        if (this.onDragEnd) {
            this.slider.sliderReleased.connect(G.Utils.bind(this.onDragEnd, this));
        }
        this.slider['valueChanged(int)'].connect(G.Utils.bind(function (value) {
            var modifiedValue = _this.modifier ? _this.modifier(value) : value;
            _this.spinbox.value = value;
            if (_this.callback) {
                _this.callback(modifiedValue);
            }
            MessageLog.trace("Slider changed for param: " + _this.param);
        }, this));
        this.spinbox['valueChanged(int)'].connect(G.Utils.bind(function (value) {
            var modifiedValue = _this.modifier ? _this.modifier(value) : value;
            _this.slider.value = value;
            if (_this.callback) {
                _this.callback(modifiedValue);
            }
        }, this));
    }
    SliderController.prototype.setValue = function (value) {
        this.slider.blockSignals(true);
        this.spinbox.blockSignals(true);
        this.slider.value = value;
        this.spinbox.value = value;
        this.slider.blockSignals(false);
        this.spinbox.blockSignals(false);
    };
    return SliderController;
}());
var LightingPage = (function () {
    function LightingPage(lightingGroup, parent) {
        var _this = this;
        this.groupBoxes = {};
        this.drawingEditorControls = [];
        this.sliderControls = [];
        this.controls = {};
        var controlInterface = UiLoader.load(specialFolders.userScripts + "/widget.ui");
        this.lightingGroup = lightingGroup;
        this.layout = controlInterface.toolBox.widget(0).vertical_layout_widget.vertical_layout;
        this.groupBoxes = {
            moodGroupBox: this.layout.itemAt(0).widget(),
            lightGroupBox: this.layout.itemAt(1).widget(),
            shadowGroupBox: this.layout.itemAt(2).widget(),
            rimlightGroupBox: this.layout.itemAt(3).widget()
        };
        this.controlInterface = controlInterface;
        this.initialize(this.lightingGroup.getValues());
        initializeButtons(controlInterface.children(), {
            "copy": function () {
                G.GlobalTimeline.setMetadata("lighting_copy_data", JSON.stringify(_this.lightingGroup.getValues(), null, 2));
                MessageLog.trace("Copied lighting data to metadata." + G.GlobalTimeline.getMetadata("lighting_copy_data"));
            },
            "paste": function () {
                var dataStr = G.GlobalTimeline.getMetadata("lighting_copy_data");
                if (!dataStr)
                    throw new Error("No lighting data found in metadata to paste.");
                _this.setLighting(JSON.parse(dataStr));
                G.Utils.toast("Pasted lighting data from metadata successfully!", { x: 100, y: 100 }, 2000, "#4BB543", _this.parentWindow);
            },
            "import": function () { _this.importLighting(); },
            "export": function () { _this.exportLighting(); },
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
        var _loop_3 = function (layer) {
            customItem = new QListWidgetItem();
            widget = new QWidget();
            layout = new QHBoxLayout(widget);
            checkbox = new QCheckBox();
            label = new QLabel(layer.name);
            layout.addWidget(checkbox, 0, 0);
            layout.addWidget(label, 1, 0);
            widget.setLayout(layout);
            widget.setFixedHeight(40);
            listWidget.addItem(customItem);
            listWidget.setItemWidget(customItem, widget);
            listWidget.spacing = 5;
            checkbox.setChecked(this_2.lightingGroup.passManager.isNodeInGroup(new oSelection(undefined, undefined, [layer])));
            checkboxes.push(checkbox);
            checkbox.stateChanged.connect(function (state) {
                if (state === 0)
                    this.lightingGroup.passManager.removeFromGroup([layer]);
                else
                    this.lightingGroup.passManager.addToGroup([layer]);
            });
        };
        var this_2 = this, customItem, widget, layout, checkbox, label;
        for (var _i = 0, layers_1 = layers; _i < layers_1.length; _i++) {
            var layer = layers_1[_i];
            _loop_3(layer);
        }
        selectAll['clicked()'].connect(function () {
            checkboxes.forEach(wrapWithCatch(function (checkbox) {
                checkbox.setChecked(true);
                this.lightingGroup.passManager.addToGroup([layers[checkboxes.indexOf(checkbox)]]);
            }));
        });
        deselectAll['clicked()'].connect(function () {
            checkboxes.forEach(wrapWithCatch(function (checkbox) {
                checkbox.setChecked(false);
                this.lightingGroup.passManager.removeFromGroup([layers[checkboxes.indexOf(checkbox)]]);
            }));
        });
    }
    LightingPage.prototype.toString = function () { return "Lighting Page<".concat(this.lightingGroup.index, ">"); };
    LightingPage.prototype.exportLighting = function () {
        this.lightingGroup.exportLighting();
    };
    LightingPage.prototype.importLighting = function (path) {
        var output = this.lightingGroup.importLighting(path);
        if (!output)
            return;
        this.update(output);
        MessageLog.trace(this.toString() + " | " + this.lightingGroup.toString() + " imported succesfully !");
    };
    LightingPage.prototype.setLighting = function (lightingData) {
        this.lightingGroup.setLighting(lightingData);
        this.update(lightingData);
    };
    LightingPage.prototype.initialize = function (initialValue) {
        var lightingGroup = this.lightingGroup;
        var initialColumns = this.lightingGroup.getColumns();
        for (var _i = 0, _a = Object.entries(this.groupBoxes); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], groupBox = _b[1];
            var controllerFrames = groupBox.children();
            var _loop_4 = function (controllerFrame) {
                var param = controllerFrame.param;
                if (!param)
                    return "continue";
                if (param === "none")
                    return "continue";
                switch (controllerFrame.controllerType) {
                    case "Drawing": {
                        drawingLayout = new QVBoxLayout(controllerFrame.layout().itemAt(1).widget());
                        controllerFrame.controller = new DrawingController(controllerFrame.layout().itemAt(0).widget(), drawingLayout, controllerFrame.layout().itemAt(2).widget(), this_3.lightingGroup, this_3);
                        this_3.drawingEditorControls.push(controllerFrame);
                        break;
                    }
                    case "Color Picker": {
                        var button = controllerFrame.layout().itemAt(1).widget();
                        var colorPath = G.Utils.getValueByPath(initialColumns, param);
                        var startingColor = { r: 0, g: 0, b: 0, a: 255 };
                        controllerFrame.colorPicker = new ColorPickerController(button, param, startingColor, colorPath.r, colorPath.g, colorPath.b, function () {
                            scene.beginUndoRedoAccum("Color picker drag");
                            this.colors.red.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).r;
                            this.colors.green.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).g;
                            this.colors.blue.column = G.Utils.getValueByPath(this.lightingPage.lightingGroup.getColumns(), this.param).b;
                            MessageLog.trace(" >>>> " + this.colors.red.column.parent.nodePath);
                        }, function () { scene.endUndoRedoAccum(); }, function (newColor) {
                        });
                        controllerFrame.colorPicker.lightingPage = this_3;
                        break;
                    }
                    case "Slider": {
                        layout_1 = controllerFrame.layout();
                        var currentColumn = G.Utils.getValueByPath(initialColumns, param);
                        controller = new SliderController({
                            label: layout_1.itemAt(0).widget(),
                            slider: layout_1.itemAt(1).widget(),
                            spinbox: layout_1.itemAt(2).widget(),
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
                            onDragEnd: function () {
                                scene.endUndoRedoAccum();
                            },
                            callback: function (value) {
                                MessageLog.trace("".concat(this.currentColumn.parent.nodePath, " set to ").concat(value));
                                this.currentColumn.setKeyFrame(new G.oSelection(), value);
                            },
                        });
                        G.assign(controller, { param: param, currentColumn: currentColumn, lightingPage: this_3 });
                        this_3.sliderControls.push(controller);
                        controllerFrame.linearParamController = controller;
                        break;
                    }
                    case "Peg": {
                        layout_1 = controllerFrame.layout();
                        labelWidget = layout_1.itemAt(0).widget();
                        frameWidget = layout_1.itemAt(1).widget();
                        pegController = new PegController({
                            size: 60,
                            dragStartCallback: function (x, y) {
                                MessageLog.trace("STARTED  !!!");
                                this.axis = {
                                    "x": this.lightingPage.lightingGroup.layer.getColumn(param + ".X"),
                                    "y": this.lightingPage.lightingGroup.layer.getColumn(param + ".Y"),
                                };
                            },
                            dragReleaseCallback: function (x, y) {
                                var selection = new G.oSelection();
                                this.axis.x.setKeyFrame(selection, x / 200);
                                this.axis.y.setKeyFrame(selection, y / 200);
                                MessageLog.trace("Set  ".concat(this.lightingPage.lightingGroup.layer.nodePath, " | ").concat(param, " to ").concat(x, ", ").concat(y));
                            },
                            dragCallback: function (x, y) {
                            }
                        });
                        pegController.lightingPage = this_3;
                        drawingLayout = new QVBoxLayout(frameWidget);
                        drawingLayout.setContentsMargins(0, 0, 0, 0);
                        drawingLayout.addWidget(pegController, 0, Qt.AlignmentFlag.AlignCenter);
                        break;
                    }
                    default: return "continue";
                }
                this_3.controls[param] = controllerFrame;
                var columnDiscrepancyIndicator = new ColumnDiscrepancyIndicator();
                controllerFrame.columnDiscrepancyIndicator = columnDiscrepancyIndicator;
                var layout_1 = controllerFrame.layout && controllerFrame.layout();
                if (layout_1 && typeof layout_1.addWidget === "function") {
                    layout_1.addWidget(columnDiscrepancyIndicator, 0, Qt.AlignmentFlag.AlignRight);
                }
            };
            var this_3 = this, drawingLayout, layout, controller, layout, labelWidget, frameWidget, pegController, drawingLayout;
            for (var _c = 0, controllerFrames_1 = controllerFrames; _c < controllerFrames_1.length; _c++) {
                var controllerFrame = controllerFrames_1[_c];
                _loop_4(controllerFrame);
            }
        }
        this.update(initialValue);
        MessageLog.trace("controls " + Object.keys(this.controls).join("\n - "));
    };
    LightingPage.prototype.updateDrawingControls = function () {
        var _this = this;
        render.cancelRender();
        var lightings = ["Mood", "Light", "Shadow", "Rimlight"];
        var number = this.lightingGroup.index;
        G.Renderer.renderTask({
            frame: frame.current(),
            nodes: [
                "Top/lighting_controller_".concat(number, "/Lighting_Drawings/Drawing_Mood"),
                "Top/lighting_controller_".concat(number, "/Lighting_Drawings/Drawing_Light"),
                "Top/lighting_controller_".concat(number, "/Lighting_Drawings/Drawing_Shadow"),
                "Top/lighting_controller_".concat(number, "/Lighting_Drawings/Drawing_Rimlight")
            ],
            onFinished: function (outputPath, renderTask) {
                var nodeNames = ["Drawing_Mood", "Drawing_Light", "Drawing_Shadow", "Drawing_Rimlight"];
                for (var i = 0; i < nodeNames.length; i++) {
                    if (outputPath.indexOf(nodeNames[i]) !== -1) {
                        _this.drawingEditorControls[i].controller.setThumbnail(outputPath);
                        break;
                    }
                }
            }
        });
    };
    LightingPage.prototype.update = function (value) {
        for (var _i = 0, _a = Object.entries(this.groupBoxes); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], groupBox = _b[1];
            var controllerFrames = groupBox.children();
            for (var _c = 0, controllerFrames_2 = controllerFrames; _c < controllerFrames_2.length; _c++) {
                var controllerFrame = controllerFrames_2[_c];
                var param = controllerFrame.param;
                if (!param || param === "none")
                    continue;
                var columnDiscrepancyIndicator = controllerFrame.columnDiscrepancyIndicator;
                if (columnDiscrepancyIndicator) {
                    if (this.lightingGroup.multipleValueColumns[param]) {
                        columnDiscrepancyIndicator.toast.setText("Multiple values in selection for parameter: \n[".concat(this.lightingGroup.multipleValueColumns[param].join(", "), "]"));
                        columnDiscrepancyIndicator.show();
                    }
                    else
                        columnDiscrepancyIndicator.hide();
                }
                switch (controllerFrame.controllerType) {
                    case "Color Picker": {
                        controllerFrame.colorPicker.updateColor({
                            r: G.Utils.getValueByPath(value, param).r,
                            g: G.Utils.getValueByPath(value, param).g,
                            b: G.Utils.getValueByPath(value, param).b
                        });
                        break;
                    }
                    case "Slider": {
                        var controller = controllerFrame.linearParamController;
                        var currentValue = G.Utils.getValueByPath(value, param);
                        var setVal = Number(currentValue);
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
    };
    return LightingPage;
}());
this.__proto__.LightingPage = LightingPage;
var PresetListItemWidget = (function (_super) {
    __extends(PresetListItemWidget, _super);
    function PresetListItemWidget(fileName, presetDir, lightingPage) {
        var _this = _super.call(this) || this;
        _this.fileName = fileName;
        _this.presetDir = presetDir;
        _this.lightingPage = lightingPage;
        _this.filePath = _this.presetDir + "/" + _this.fileName;
        MessageLog.trace("filepath: " + _this.filePath);
        var itemLayout = new QHBoxLayout();
        itemLayout.setContentsMargins(8, 4, 8, 4);
        _this.nameLabel = new QLabel(fileName);
        _this.applyButton = new QPushButton("Apply");
        _this.minimumHeight = (30);
        _this.applyButton.maximumWidth = (50);
        _this.openButton = new QPushButton("📝");
        _this.openButton.maximumWidth = (20);
        itemLayout.addWidget(_this.openButton, 0, 0);
        itemLayout.addWidget(_this.nameLabel, 1, 0);
        itemLayout.addWidget(_this.applyButton, 0, 0);
        _this.openButton['clicked()'].connect(G.Utils.bind(function () {
            var filePath = _this.presetDir + "/" + _this.fileName;
            MessageLog.trace("opening file: " + filePath);
            G.Utils.openWithDefaultApp(filePath);
        }, _this));
        _this.setLayout(itemLayout);
        _this.applyButton['clicked()'].connect(function () {
            try {
                var filePath = _this.presetDir + "/" + _this.fileName;
                _this.lightingPage.importLighting(filePath);
                MessageLog.trace("filepath: " + filePath);
            }
            catch (error) {
                MessageLog.trace("Error applying preset from file " + _this.fileName + ": " + error.toString());
            }
        });
        return _this;
    }
    return PresetListItemWidget;
}(QWidget));
this.__proto__.PresetListItemWidget = PresetListItemWidget;
var InitialPreset = (function (_super) {
    __extends(InitialPreset, _super);
    function InitialPreset(presetData, lightingPage) {
        var _this = _super.call(this, "", undefined, lightingPage) || this;
        _this.presetData = (G.Utils.shallowCopy(presetData));
        _this.lightingPage = lightingPage;
        _this.applyButton.text = "Revert";
        _this.applyButton['clicked()'].connect(G.Utils.bind(function () {
            _this.lightingPage.setLighting(G.Utils.shallowCopy(_this.presetData));
            MessageLog.trace("Reverted to initial preset.");
        }, _this));
        _this.nameLabel.text = "Initial Preset";
        return _this;
    }
    return InitialPreset;
}(PresetListItemWidget));
this.__proto__.InitialPreset = InitialPreset;
if (typeof globalThis === "undefined") {
    globalThis = this;
}
var getCircularReplacer = function () {
    var seen = new WeakSet();
    return function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};
function attachTooltip(widget) {
    widget.enterEvent = (wrapWithCatch(function () {
        if (!widget.tooltip)
            widget.tooltip = new G.TooltipToast("test");
        var pos = widget.mapToGlobal(new QPoint(0, widget.height));
        widget.tooltip.showAt(pos);
        MessageLog.trace("Show");
    }));
    widget.leaveEvent = (function () {
        if (widget.tooltip)
            widget.tooltip.hide();
        MessageLog.trace("hide");
    });
}
var DrawingController = (function () {
    function DrawingController(label, imageFrame, editButton, lightingGroup, lightingPage) {
        if (lightingGroup === void 0) { lightingGroup = null; }
        if (lightingPage === void 0) { lightingPage = null; }
        var _this = this;
        this.label = label;
        this.imageFrame = imageFrame;
        this.editButton = editButton;
        this.label = label;
        this.imageFrame = imageFrame;
        this.imageFrame.setContentsMargins(0, 0, 0, 0);
        this.lightingGroup = lightingGroup;
        this.lightingPage = lightingPage;
        this.drawingImage = new QLabel();
        var imagePath = specialFolders.userScripts + "/1.png";
        var pixmap = new QPixmap(imagePath);
        if (!pixmap.isNull()) {
            var scaledPixmap = pixmap.scaledToWidth(60);
            this.drawingImage.setPixmap(scaledPixmap);
            this.drawingImage.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed);
        }
        else {
            this.drawingImage.text = "Image not found";
            MessageLog.trace("Failed to load image: " + imagePath);
        }
        this.imageFrame.addWidget(this.drawingImage, 0, Qt.AlignmentFlag.AlignCenter);
        attachTooltip(this.drawingImage);
        editButton['clicked()'].connect(function () { });
        editButton["pressed()"].connect(function () {
            G.GlobalTimeline.resetFocusedNodes();
        });
        editButton["released()"].connect(G.Utils.bind(function () {
            _this.lightingPage.lightingGroup.editProperty(editButton.param);
            G.CameraView.showCurrentDrawingOnTop(true);
        }, this));
    }
    DrawingController.prototype.setThumbnail = function (imagePath) {
        var pixmap = new QPixmap(imagePath);
        if (!pixmap.isNull()) {
            var scaledPixmap = pixmap.scaledToWidth(60);
            this.drawingImage.setPixmap(scaledPixmap);
        }
        else {
            MessageLog.trace("Failed to load image: " + imagePath);
        }
    };
    return DrawingController;
}());
var Section = (function (_super) {
    __extends(Section, _super);
    function Section(orientation) {
        if (orientation === void 0) { orientation = "horizontal"; }
        var _this = _super.call(this) || this;
        if (orientation === "vertical") {
            _this.sectionLayout = new QVBoxLayout(_this);
        }
        else {
            _this.sectionLayout = new QHBoxLayout(_this);
        }
        _this.sectionLayout.setContentsMargins(2, 2, 2, 2);
        _this.objectName = ("mainContainer");
        _this.setStyleSheet("#mainContainer { border: 2px solid #666666; border-radius: 5px; }");
        return _this;
    }
    Section.prototype.addWidget = function (widget) {
        this.sectionLayout.addWidget(widget, 1, 0);
    };
    Section.prototype.addLayout = function (layout) {
        this.sectionLayout.addLayout(layout, 1);
    };
    return Section;
}(QWidget));
var PopupPresetDialog = (function (_super) {
    __extends(PopupPresetDialog, _super);
    function PopupPresetDialog(presetDir, onSelect) {
        var _this = _super.call(this) || this;
        _this.lightingPage = null;
        _this.initialPreset = null;
        _this.settings = {
            liveControlsEnabled: true,
            followSelectionLightingGroup: true
        };
        _this.liveControlsEnabled = true;
        var parsed = JSON.parse(GlobalTimeline.getMetadata("lighting_preset_dialog_settings")) || {};
        for (var key in parsed) {
            if (_this.settings.hasOwnProperty(key)) {
                _this.settings[key] = parsed[key];
            }
        }
        _this.presetDir = presetDir;
        _this.masterLightingController = new MasterLightingController();
        _this.lightingGroup = _this.masterLightingController.getLightingGroup(1);
        GlobalTimeline.resetFocusedNodes();
        _this.setupWindow();
        var mainVerticalLayout = new QVBoxLayout(_this);
        var dropdownBox = _this.LightingGroupPicker(mainVerticalLayout);
        _this.mainLayout = new QHBoxLayout();
        var lightingPageContainer = _this.setupLightingPage();
        var leftLayout = _this.setupPresetListSection();
        _this.mainLayout.addWidget(leftLayout, 0, 0);
        _this.mainLayout.addWidget(lightingPageContainer, 1, 0);
        mainVerticalLayout.addLayout(_this.mainLayout, 1);
        _this.setLayout(mainVerticalLayout);
        _this.initialPreset = _this.lightingGroup.getValues();
        _this.setupDropdownHandler(dropdownBox);
        var renderPreviewRow = _this.setupRenderPreviewRow();
        mainVerticalLayout.addWidget(renderPreviewRow, 0, 0);
        var nodeEnabledSection = _this.setupNodeEnabledSection();
        mainVerticalLayout.addWidget(nodeEnabledSection, 0, 0);
        _this.addNotifiers();
        return _this;
    }
    PopupPresetDialog.prototype.refreshPresetList = function () {
        try {
            this.listWidget.clear();
            var fileNames = G.Utils.listFilesInDirectory(this.presetDir, ["*"]);
            var initialPresetItem = new InitialPreset(this.initialPreset, this.lightingPage);
            var initialPresetListItem = new QListWidgetItem();
            this.listWidget.addItem(initialPresetListItem);
            this.listWidget.setItemWidget(initialPresetListItem, initialPresetItem);
            for (var i = 0; i < fileNames.length; i++) {
                MessageLog.trace("creating item with lighing page" + this.lightingPage.toString());
                var itemWidget = new PresetListItemWidget(fileNames[i], this.presetDir, this.lightingPage);
                var item = new QListWidgetItem();
                this.listWidget.addItem(item);
                this.listWidget.setItemWidget(item, itemWidget);
            }
        }
        catch (e) {
            MessageLog.trace("Error refreshing preset list: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
        }
    };
    PopupPresetDialog.prototype.updateLightingPage = function () {
        var values = this.lightingGroup.getValues();
        this.lightingPage.update(values);
        this.selectLightingGroupDropdown.setCurrentIndex(this.lightingGroup.index - 1);
    };
    PopupPresetDialog.prototype.addNotifiers = function () {
        var _this = this;
        try {
            MessageLog.trace("notifiers added");
            this.myNotifier = new SceneChangeNotifier(this.mainLayout);
            this.myNotifier.currentFrameChanged.connect(G.Utils.bind(function () {
                _this.updateLightingPage();
                if (_this.settings.followSelectionLightingGroup) {
                    MessageLog.trace(JSON.stringify(G.GlobalTimeline.getSelection(), null, 2));
                }
            }, this));
            this.myNotifier.selectionChanged.connect(G.Utils.bind(function () {
                try {
                    if (!_this.settings.liveControlsEnabled)
                        return;
                    if (_this.settings.followSelectionLightingGroup) {
                    }
                }
                catch (error) {
                    MessageLog.trace("Error in selectionChanged notifier: " + error.toString() + " | " + error.lineNumber + " |  " + error.fileName);
                }
            }, this));
        }
        catch (e) {
            MessageLog.trace("Error adding notifiers: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
        }
    };
    PopupPresetDialog.prototype.removeNotifiers = function () {
        try {
            if (this.myNotifier) {
                this.myNotifier.disconnectAll();
                MessageLog.trace("removed notifiers");
            }
        }
        catch (e) {
            MessageLog.trace("Error removing notifiers: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
        }
    };
    PopupPresetDialog.prototype.closeEvent = function (event) {
        try {
            G.TooltipToast.destroyAllTooltips();
            MessageLog.trace("closed");
            this.removeNotifiers();
            G.GlobalTimeline.setMetadata("lighting_preset_dialog_settings", JSON.stringify(this.settings));
        }
        catch (e) {
            MessageLog.trace("Error saving settings on close: " + e.toString() + " | " + e.lineNumber + " |  " + e.fileName);
        }
    };
    PopupPresetDialog.prototype.enterEvent = function (event) {
        MessageLog.trace("Mouse entered the dialog area!");
        this.lightingPage.updateDrawingControls();
        var currentSelection = G.GlobalTimeline.getSelection();
        var marker = Timeline.getFrameMarker(currentSelection.selectedNodes[0].index, frame.current());
        if (marker) {
            MessageLog.trace(JSON.stringify(marker));
        }
        this.updateLightingPage();
        _super.prototype.enterEvent.call(this, event);
    };
    PopupPresetDialog.prototype.setupWindow = function () {
        this.setWindowTitle("Select Lighting Preset");
        this.setMinimumSize(320, 400);
        this.setWindowFlags(Qt.WindowStaysOnTopHint);
    };
    PopupPresetDialog.prototype.LightingGroupPicker = function (parentLayout) {
        var _this = this;
        var dropdownRow = new Section("horizontal");
        var dropdownLabel = new QLabel("Select:");
        dropdownLabel.setFixedWidth(50);
        this.selectLightingGroupDropdown = new QComboBox();
        dropdownRow.addWidget(dropdownLabel);
        dropdownRow.addWidget(this.selectLightingGroupDropdown);
        parentLayout.addWidget(dropdownRow, 0, 0);
        {
            var options = [];
            for (var _i = 0, _a = this.masterLightingController.getAllLightingGroups(); _i < _a.length; _i++) {
                var lightingGroup = _a[_i];
                options.push("".concat(PassManager.MAPPINGS[lightingGroup.index].symbol, " ").concat(lightingGroup.getName()));
            }
            this.selectLightingGroupDropdown.addItems(options);
        }
        {
            this.currentLightingGroupEnabledBtn = new QPushButton(this.lightingGroup.isEnabled() ? "👀" : "🙈");
            this.currentLightingGroupEnabledBtn.setFixedWidth(30);
            dropdownRow.addWidget(this.currentLightingGroupEnabledBtn, 0, 0);
            this.currentLightingGroupEnabledBtn['clicked()'].connect(bind(function () {
                _this.lightingGroup.setEnabled(!_this.lightingGroup.isEnabled());
                _this.currentLightingGroupEnabledBtn.text = _this.lightingGroup.isEnabled() ? "👀" : "🙈";
            }, this));
        }
        {
            var applyBtn = new QPushButton("Apply to selected");
            applyBtn.setFixedWidth(120);
            dropdownRow.addWidget(applyBtn, 0, 0);
            applyBtn['clicked()'].connect(bind(function () {
                var currentSelection = new G.oSelection();
                G.Utils.toast("Applied \"".concat(_this.lightingGroup.getName(), "\" to ").concat(currentSelection.getSelectSize(), " frames"), { x: 100, y: 100 }, 1000, "#444444", _this.parentWindow);
                _this.masterLightingController.setLightingGroupOfSelection(_this.lightingGroup, currentSelection);
            }, this));
        }
        {
            var clearSelectedBtn = new QPushButton("Clear selected");
            clearSelectedBtn.setFixedWidth(120);
            dropdownRow.addWidget(clearSelectedBtn, 0, 0);
            clearSelectedBtn['clicked()'].connect(wrapWithCatch(bind(function () {
                G.Utils.toast("Cleared lighting for ".concat(new G.oSelection().getSelectSize(), " frames"), { x: 100, y: 100 }, 1000, "#444444");
                _this.masterLightingController.clearLighting(new G.oSelection());
            }, this)));
        }
        return this.selectLightingGroupDropdown;
    };
    PopupPresetDialog.prototype.setupPresetListSection = function () {
        var _this = this;
        var leftLayout = new Section("vertical");
        var titleRow = new QHBoxLayout();
        var label = new QLabel("Choose a preset:");
        var refreshButton = new QPushButton();
        refreshButton.text = "↻";
        refreshButton.setFixedWidth(30);
        titleRow.addWidget(label, 1, 0);
        titleRow.addWidget(refreshButton, 0, Qt.AlignmentFlag.AlignRight);
        var openDirectoryButton = new QPushButton();
        openDirectoryButton.text = "📂";
        openDirectoryButton.setFixedWidth(30);
        titleRow.addWidget(openDirectoryButton, 0, Qt.AlignmentFlag.AlignRight);
        leftLayout.addLayout(titleRow);
        refreshButton['clicked()'].connect(bind(function () {
            MessageLog.trace("Refreshing preset list.");
            _this.refreshPresetList();
        }, this));
        openDirectoryButton['clicked()'].connect(bind(function () {
            MessageLog.trace("Opening preset directory: " + _this.presetDir);
            G.Utils.openInFileExplorer(_this.presetDir);
        }, this));
        this.listWidget = new QListWidget();
        this.listWidget.minimumHeight = 300;
        this.listWidget.spacing = 4;
        this.refreshPresetList();
        var selectedFile = null;
        this.listWidget['itemClicked(QListWidgetItem*)'].connect(function (item) {
            selectedFile = item.text;
        });
        leftLayout.addWidget(this.listWidget);
        return leftLayout;
    };
    PopupPresetDialog.prototype.setupLightingPage = function () {
        var _this = this;
        var lightingPageContainer = new QWidget();
        this.lightingPage = new LightingPage(this.lightingGroup, lightingPageContainer);
        MessageLog.trace("lighting page " + this.lightingPage.toString());
        initializeButtons(this.lightingPage.controlInterface.children(), {
            "export": bind(function () {
                MessageLog.trace("Exporting current lighting as new preset.");
                _this.refreshPresetList();
            }, this)
        });
        return lightingPageContainer;
    };
    PopupPresetDialog.prototype.setupDropdownHandler = function (dropdownBox) {
        var _this = this;
        dropdownBox['currentIndexChanged(int)'].connect(bind(function (index) {
            var selectedLightingGroup = _this.masterLightingController.getLightingGroup(index + 1);
            _this.lightingGroup = selectedLightingGroup;
            _this.lightingPage.lightingGroup = selectedLightingGroup;
            var initialValue = _this.lightingGroup.getValues();
            _this.lightingPage.update(initialValue);
            _this.currentLightingGroupEnabledBtn.text = _this.lightingGroup.isEnabled() ? "👀" : "🙈";
            for (var i = 0; i < _this.masterLightingController.getAllLightingGroups().length; i++) {
                var lightingGroup = _this.masterLightingController.getLightingGroup(i + 1);
                dropdownBox.setItemText(i, "".concat(true ? PassManager.MAPPINGS[lightingGroup.index].symbol : "🔿", " ").concat(lightingGroup.getName(), " ").concat(lightingGroup.isEnabled() ? "" : "🙈"));
            }
        }, this));
        var selection = G.GlobalTimeline.getSelection();
        var appliedLightingGroup = this.masterLightingController.getAppliedLightingGroup(selection);
        MessageLog.trace("applied lighting group : " + appliedLightingGroup);
        if (appliedLightingGroup) {
            dropdownBox.setCurrentIndex(appliedLightingGroup.index - 1);
        }
    };
    PopupPresetDialog.prototype.setupRenderPreviewRow = function () {
        var _this = this;
        var renderPreviewRow = new Section();
        {
            var toggleEnableAllBtn_1 = new QPushButton("👁️‍🗨️");
            toggleEnableAllBtn_1.setFixedWidth(30);
            toggleEnableAllBtn_1['clicked()'].connect(bind(function () {
                var allEnabled = _this.masterLightingController.areAllLightingGroupsEnabled();
                _this.masterLightingController.setAllLightingGroupsEnabled(!allEnabled);
                if (allEnabled) {
                    toggleEnableAllBtn_1.text = "🙈";
                    G.Utils.toast("Disabled all lighting groups", { x: 100, y: 100 }, 1000, "#444444", _this.parentWindow);
                }
                else {
                    toggleEnableAllBtn_1.text = "👁️‍🗨️";
                    G.Utils.toast("Enabled all lighting groups", { x: 100, y: 100 }, 1000, "#444444", _this.parentWindow);
                }
            }, this));
            renderPreviewRow.addWidget(toggleEnableAllBtn_1, 0, 0);
        }
        {
            var renderPreviewLabel = new QLabel("Render res:");
            renderPreviewRow.addWidget(renderPreviewLabel);
        }
        {
            var RENDER_PREVIEW_SCALE_1 = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "1/1"];
            var renderPreviewValueLabel_1 = new QLabel("Off");
            var renderPreviewSlider = new QSlider(Qt.Horizontal);
            renderPreviewSlider.minimum = (0);
            renderPreviewSlider.maximum = (RENDER_PREVIEW_SCALE_1.length);
            renderPreviewSlider.tickInterval = (1);
            renderPreviewSlider.singleStep = (1);
            renderPreviewSlider.setFixedWidth(120);
            renderPreviewRow.addWidget(renderPreviewSlider);
            var textValue = node.getAttr(this.masterLightingController.renderPreviewNode.nodePath, 1, "scaling").textValue();
            var initialScale = this.masterLightingController.isRenderPreviewEnabled()
                ? RENDER_PREVIEW_SCALE_1.indexOf(textValue) + 1
                : 0;
            renderPreviewValueLabel_1.setText(initialScale === 0 ? "Off" : textValue);
            renderPreviewSlider.setValue(initialScale);
            renderPreviewSlider.valueChanged.connect(bind(function (value) {
                if (value === 0) {
                    _this.masterLightingController.setRenderPreviewEnabled(false);
                    renderPreviewValueLabel_1.setText("Off");
                }
                else {
                    _this.masterLightingController.setRenderPreviewEnabled(true);
                    var scale = RENDER_PREVIEW_SCALE_1[value - 1];
                    node.setTextAttr(_this.masterLightingController.renderPreviewNode.nodePath, "scaling", 1, scale);
                    renderPreviewValueLabel_1.setText(scale);
                }
            }, this));
            renderPreviewRow.addWidget(renderPreviewValueLabel_1);
        }
        {
            var liveControlsEnabledCheckbox = new QCheckBox();
            liveControlsEnabledCheckbox.text = "live updates";
            liveControlsEnabledCheckbox.setChecked(this.settings.liveControlsEnabled !== false);
            liveControlsEnabledCheckbox.stateChanged.connect(bind(function (state) {
                _this.liveControlsEnabled = (state === 2);
                if (_this.liveControlsEnabled) {
                    _this.settings.liveControlsEnabled = true;
                    _this.addNotifiers();
                }
                else {
                    _this.settings.liveControlsEnabled = false;
                    _this.removeNotifiers();
                }
            }, this));
            renderPreviewRow.addWidget(liveControlsEnabledCheckbox, 0, 0);
        }
        {
            var resetFocusNodeButton = new QPushButton();
            resetFocusNodeButton.text = "reset timeline view";
            renderPreviewRow.addWidget(resetFocusNodeButton, 0, 0);
            resetFocusNodeButton['clicked()'].connect(function () {
                G.GlobalTimeline.resetFocusedNodes();
                G.CameraView.showCurrentDrawingOnTop(false);
            });
        }
        return renderPreviewRow;
    };
    PopupPresetDialog.prototype.setupNodeEnabledSection = function () {
        var _this = this;
        function setBatch(nodes, lightingGroupLayer, state) {
            scene.beginUndoRedoAccum("Set Node Enabled State");
            MessageLog.trace(state === 2 ? "Enabling" : "Disabling" + " nodes: " + nodes.join(", "));
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var nodePath = nodes_1[_i];
                var node = lightingGroupLayer.getChild(nodePath);
                if (!node)
                    continue;
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
        };
        var section = new Section();
        var _loop_5 = function (key, obj) {
            checkbox = new QCheckBox();
            checkbox.text = key;
            isChecked = this_4.masterLightingController.getAllLightingGroups().every(function (group) {
                return obj.nodes.every(function (nodePath) {
                    var node = group.layer.getChild(nodePath);
                    if (!node)
                        MessageLog.trace("cant find " + nodePath + " in " + group.layer.name);
                    return node && node.isEnabled();
                });
            });
            checkbox.setChecked(isChecked);
            checkbox.stateChanged.connect(bind(function (state) {
                G.Utils.toast("".concat(state === 2 ? "Enabled" : "Disabled", " ").concat(key, " | ").concat(obj.nodes.length, " nodes"), { x: 100, y: 100 }, 1000, "#444444", _this.parentWindow);
                scene.beginUndoRedoAccum("Set Lighting Nodes Enabled State");
                _this.masterLightingController.getAllLightingGroups().forEach(function (group) {
                    setBatch(obj.nodes, group.layer, state);
                });
                scene.endUndoRedoAccum();
            }, this_4));
            section.addWidget(checkbox);
        };
        var this_4 = this, checkbox, isChecked;
        for (var _i = 0, _a = Object.entries(nodeEnabledCheckboxes); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], obj = _b[1];
            _loop_5(key, obj);
        }
        var enableAllCheckbox = new QCheckBox();
        enableAllCheckbox.text = "Enable All";
        enableAllCheckbox.setChecked(false);
        enableAllCheckbox.stateChanged.connect(bind(function (state) {
            try {
                G.Utils.toast("".concat(state === 2 ? "Enabled" : "Disabled", " all lighting nodes"), { x: 100, y: 100 }, 1000, "#444444", _this.parentWindow);
                scene.beginUndoRedoAccum("Set All Lighting Nodes Enabled State");
                for (var _i = 0, _a = section.children(); _i < _a.length; _i++) {
                    var child = _a[_i];
                    if (child.setChecked) {
                        child.setChecked(state === 2);
                    }
                }
                scene.endUndoRedoAccum();
            }
            catch (error) {
                MessageLog.trace("Error in Enable All checkbox handler: " + error.toString());
            }
        }, this));
        var spacer = new QSpacerItem(50, 10, QSizePolicy.Expanding, QSizePolicy.Minimum);
        section.sectionLayout.addItem(spacer);
        section.addWidget(enableAllCheckbox);
        return section;
    };
    return PopupPresetDialog;
}(QDialog));
function showButtonPopup(buttons, title) {
    var dialog = new QDialog();
    dialog.windowTitle = title || "Menu";
    var layout = new QVBoxLayout(dialog);
    layout.setContentsMargins(0, 0, 0, 0);
    layout.setSpacing(0);
    for (var i = 0; i < buttons.length; ++i) {
        (function (btn) {
            var button = new QPushButton(btn.label, dialog);
            button.setStyleSheet("QPushButton { border: none; padding: 5px 10px; text-align: left; background-color: transparent; } QPushButton:hover { background-color: #a0a0a0; }");
            button.clicked.connect(function () {
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
