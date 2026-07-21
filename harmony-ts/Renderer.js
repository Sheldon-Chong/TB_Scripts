include("globals.js");
function testRenderTask() {
    var currentSelection = new G.oSelection(frame.current(), frame.current());
    Renderer.renderTask({
        range: currentSelection,
        nodes: [currentSelection.selectedNodes[0].nodePath],
        outputFormat: "exr",
        resolution: {
            width: 1920,
            height: 1080
        },
        outputPath: QFileDialog.getExistingDirectory(0, "Select Output Directory", ""),
        onFinished: function (filepath, task) {
            MessageLog.trace("Rendered image for frame ".concat(task.range.startFrame, ": ").concat(filepath));
        }
    });
}
function testRenderScene() {
    var currentSelection = G.GlobalTimeline.getSelection();
    render.setWriteEnabled(false);
    render.setRenderDisplay("Top/Display");
    render.setWhiteBackground(false);
    G.Renderer.renderTask({
        range: currentSelection,
        outputFormat: "exr",
        resolution: {
            width: 1954,
            height: 1541
        },
        outputPath: "C:\\Users\\emers\\Downloads",
        onFinished: function (filepath, task) {
            if (filepath) {
                MessageLog.trace("Rendered frame: ".concat(filepath));
            }
        },
    });
}
var FrameChangeDialog = (function (_super) {
    __extends(FrameChangeDialog, _super);
    function FrameChangeDialog() {
        var _this = _super.call(this) || this;
        _this.setWindowTitle("Frame Monitor");
        var layout = new QVBoxLayout(_this);
        layout.addWidget(new QLabel("Monitoring frame changes in Message Log..."), 0, 0);
        _this.setLayout(layout);
        _this.notifier = new SceneChangeNotifier(_this);
        _this.notifier.currentFrameChanged.connect(G.Utils.bind(function () {
            try {
                render.setWriteEnabled(false);
                render.setRenderDisplay("Top/Display");
                render.setWhiteBackground(false);
                G.Renderer.renderTask({
                    range: {
                        startFrame: frame.current(),
                        endFrame: frame.current()
                    },
                    outputFormat: "exr",
                    resolution: {
                        width: 1954,
                        height: 1541
                    },
                    outputPath: "C:\\Users\\emers\\Downloads",
                    onFinished: function (filepath, task) {
                        if (filepath) {
                            MessageLog.trace("Rendered frame: ".concat(filepath));
                        }
                    },
                });
            }
            catch (e) {
                MessageLog.trace("error: " + e);
            }
        }, _this));
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
function testLiveRender() {
    try {
        var dialog = new FrameChangeDialog();
        dialog.show();
    }
    catch (e) {
        MessageLog.trace("Errsor: " + e);
    }
}
