include("globals.js");
var FrameChangeDialog = (function (_super) {
    __extends(FrameChangeDialog, _super);
    function FrameChangeDialog() {
        var _this = _super.call(this) || this;
        _this.setWindowTitle("Frame Monitor");
        var layout = new QVBoxLayout(_this);
        layout.addWidget(new QLabel("Monitoring frame changes in Message Log..."), 0, 0);
        _this.setLayout(layout);
        _this.notifier = new SceneChangeNotifier(_this);
        _this.notifier.sceneChanged.connect(function () {
            MessageLog.trace("Frame changed: " + frame.current());
        });
        return _this;
    }
    FrameChangeDialog.prototype.closeEvent = function (event) {
        if (this.notifier) {
            this.notifier.disconnectAll();
        }
        _super.prototype.closeEvent.call(this, event);
    };
    return FrameChangeDialog;
}(QDialog));
try {
    var dialog = new FrameChangeDialog();
    dialog.show();
}
catch (e) {
    MessageLog.trace("Error: " + e);
}
