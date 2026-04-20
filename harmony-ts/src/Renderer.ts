
include("globals.js");

function testRenderTask() {
  const currentSelection = new G.oSelection(frame.current(), frame.current());
  Renderer.renderTask({
    range: currentSelection,
    nodes: [currentSelection.selectedNodes[0].nodePath],
    outputFormat: "exr",
    resolution: { 
      width: 1920,
      height: 1080
    },
    outputPath: QFileDialog.getExistingDirectory(0, "Select Output Directory", ""),
    onFinished: (filepath, task) => {
      MessageLog.trace(`Rendered image for frame ${task.range.startFrame}: ${filepath}`);
    }
  });
}

function testRenderScene() {
  const currentSelection = G.GlobalTimeline.getSelection();

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
    onFinished: (filepath, task) => {
      if (filepath) {
        MessageLog.trace(`Rendered frame: ${filepath}`);
      }
    },
  });
}

class FrameChangeDialog extends (QDialog as any) {
  private notifier: any;

  constructor() {
    super();
    this.setWindowTitle("Frame Monitor");

    const layout = new (QVBoxLayout as any)(this);
    layout.addWidget(new (QLabel as any)("Monitoring frame changes in Message Log..."), 0, 0);
    this.setLayout(layout);

    // Initialize notifier and connect to frame change
    this.notifier = new (SceneChangeNotifier as any)(this);
    this.notifier.currentFrameChanged.connect(G.Utils.bind(() => {
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
          onFinished: (filepath, task) => {
            if (filepath) {
              MessageLog.trace(`Rendered frame: ${filepath}`);
            }
          },
        });
      }
      catch (e) {
        MessageLog.trace("error: " + e);
      }
    }, this));
  }

  closeEvent(event: any) {
    if (this.notifier) {
      this.notifier.disconnectAll();
    }
    super.closeEvent(event);
  }
}



function testLiveRender() {
  // Open the dialog
  try {
    const dialog = new FrameChangeDialog();
    dialog.show();
  } catch (e) {
    MessageLog.trace("Errsor: " + e);
  }

}