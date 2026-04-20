include("globals.js");

/**
 * Simple dialog that logs frame changes to the Message Log
 */
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
		this.notifier.sceneChanged.connect(() => {
			MessageLog.trace("Frame changed: " + frame.current());
		});
	}

	closeEvent(event: any) {
		if (this.notifier) {
			this.notifier.disconnectAll();
		}
		super.closeEvent(event);
	}
}

// Open the dialog
try {
	const dialog = new FrameChangeDialog();
	dialog.show();
} catch (e) {
	MessageLog.trace("Error: " + e);
}
