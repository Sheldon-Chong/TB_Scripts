include(specialFolders.userScripts + "/lighting/backend.js");
include(specialFolders.userScripts + "/lighting/frontend.js");
function quickSelectConnectedExposure() {
    var currentSelection = new G.oSelection();
    var selectedNode = currentSelection.selectedNodes[0];
    var elementCol = selectedNode.getColumn("DRAWING.ELEMENT");
    MessageLog.trace("Element col : " + elementCol);
    var end = currentSelection.startFrame;
    var currentVal = elementCol.getKeyframe(end);
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
    GlobalTimeline.resetFocusedNodes();
    var window = QApplication.activeWindow();
    var dialog = new PopupPresetDialog("C:/Users/emers/Desktop/Coding projects/Python Bot/ToonBoom_Automations/test/lightingPresets", function (selectedFile) {
        MessageLog.trace("Selected preset file: " + selectedFile);
    });
    dialog.parentWindow = window;
    dialog.lightingPage.parentWindow = window;
    dialog.show();
    return;
}
var global_test = "test";
var ToggleButton = (function (_super) {
    __extends(ToggleButton, _super);
    function ToggleButton(text, selected, onToggle, toggleGroup) {
        if (selected === void 0) { selected = false; }
        if (onToggle === void 0) { onToggle = null; }
        if (toggleGroup === void 0) { toggleGroup = null; }
        var _this = _super.call(this, text) || this;
        _this._selected = selected;
        _this.updateStyle();
        _this._onToggle = onToggle;
        _this._toggleGroup = toggleGroup || null;
        _this['clicked()'].connect(function () {
            if (_this._toggleGroup) {
                if (!_this._selected) {
                    _this._toggleGroup.select(_this);
                    _this.setSelected(true);
                    if (_this._onToggle) {
                        _this._onToggle(true, _this);
                    }
                }
            }
            else {
                _this._selected = !_this._selected;
                _this.updateStyle();
                if (_this._onToggle) {
                    _this._onToggle(_this._selected, _this);
                }
            }
        });
        if (_this._toggleGroup) {
            _this._toggleGroup.add(_this);
        }
        return _this;
    }
    ToggleButton.prototype.updateStyle = function () {
        if (this._selected) {
            this.setStyleSheet("border: 2px solid #2196f3; border-radius: 8px;");
        }
        else {
            this.setStyleSheet("");
        }
    };
    ToggleButton.prototype.setSelected = function (selected, silent) {
        if (silent === void 0) { silent = false; }
        this._selected = selected;
        this.updateStyle();
        if (!silent && this._onToggle) {
            this._onToggle(this._selected, this);
        }
    };
    ToggleButton.prototype.isSelected = function () {
        return this._selected;
    };
    return ToggleButton;
}(QPushButton));
