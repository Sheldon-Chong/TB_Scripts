namespace WidgetKit {
  export function button(settings: {
    text: string;
    objectName: string;
    bgColor?: string;
    borderColor?: string;
    onClick?: () => void;
  }): ComponentDef<QPushButton> {
    const btn = WidgetKit.defineComponent<QPushButton>({
      type: QPushButton,
      ctorArgs: [settings.text],
      props: {
        objectName: settings.objectName,
        text: settings.text,
        styleSheet: `QPushButton { font-size: 12pt; color: #ffffff; background-color: ${settings.bgColor || '#555555'}; border: 1px solid ${settings.borderColor || '#777777'}; border-radius: 8px; padding: 6px; }`,
      },
    });

    if (settings.onClick) {
      btn.setup = (widget: QPushButton) => widget.clicked.connect(settings.onClick);
    }

    return btn;
  }

  export class Label extends QLabel {
    constructor(settings: { text: string; objectName?: string }) {
      super(settings.text);
      this.wordWrap = true;
      this.textFormat = Qt.PlainText;
      this.styleSheet = 'font-size: 12pt; color: #e0e0e0;';
    }
  }

  export class Button extends QPushButton {
    constructor(settings: {
      text: string;
      objectName: string;
      bgColor?: string;
      borderColor?: string;
      onClick?: () => void;
    }) {
      super(settings.text);
      this.objectName = settings.objectName;
      this.styleSheet = `QPushButton { font-size: 12pt; color: #ffffff; background-color: ${settings.bgColor || '#555555'}; border: 1px solid ${settings.borderColor || '#777777'}; border-radius: 8px; padding: 6px; }`;
      this.clicked.connect(
        settings.onClick ||
          (() => {
            MessageLog.trace(`[Components.ts] ${settings.objectName} button clicked`);
          }),
      );
    }
  }

  export class LineEdit extends QLineEdit {
    constructor(settings: { placeholderText?: string; objectName?: string; text?: string }) {
      super();
      this.placeholderText = settings.placeholderText || '';
      this.text = settings.text || '';
      this.styleSheet =
        'QLineEdit { background-color: #3d3d3d; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; padding: 6px; font-size: 12pt; }';
    }
  }

  export class TextEdit extends QTextEdit {
    constructor(settings: { text?: string }) {
      super();
      this.plainText = settings.text || '';
      this.styleSheet =
        'QLineEdit { background-color: #3d3d3d; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; padding: 6px; font-size: 12pt; }';
    }
  }

  export class Dialog extends QDialog {
    constructor(settings: {
      title: string;
      windowFlags?: any;
      size?: { width: number; height: number };
    }) {
      super();
      this.windowTitle = settings.title;
      this.setWindowFlags(settings.windowFlags ?? Qt.WindowStaysOnTopHint);
      this.resize(settings.size?.width ?? 560, settings.size?.height ?? 340);

      this.styleSheet = `
    QDialog { background-color: #2d2d2d; }
    QTabWidget::pane {
      border: 1px solid #555555;
      border-radius: 4px;
    }
    QTabBar::tab {
      background-color: #2d2d2d;
      color: #bbbbbb;
      padding: 6px 16px;
      border: 1px solid #555555;
      border-bottom: none;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    QTabBar::tab:selected {
      background-color: #1f1f1f;
      color: #ffffff;
    }
    QTableWidget {
      background-color: #1f1f1f;
      gridline-color: #2d2d2d;
      color: #ffffff;
      border: none;
      font-size: 11pt;
    }
    QHeaderView::section {
      background-color: #2d2d2d;
      color: #bbbbbb;
      font-weight: bold;
      border: none;
      padding: 4px;
    }
    QTableWidget::item {
      padding: 2px 4px;
    }
  `;
    }
  }

  export class UI_QToolButton extends QToolButton {
    constructor(settings: { dialog: QDialog }) {
      super(settings.dialog);
      this.text = '☰';
      this.objectName = 'optionsButton';
      this.styleSheet =
        'QToolButton { font-size: 12pt; color: #ffffff; background-color: #555555; border: 1px solid #777777; border-radius: 8px; padding: 6px; }';
      this.popupMode = QToolButton.InstantPopup;
    }
  }
}
