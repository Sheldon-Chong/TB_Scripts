declare class QWidget {
  constructor(...args: any[]);
  objectName: string;
  enabled: boolean;
  visible: boolean;
  minimumWidth: number;
  maximumWidth: number;
  minimumHeight: number;
  maximumHeight: number;
  styleSheet: string;
  windowTitle: string;
  modal: boolean;
  layout: any;
  geometry: any;
  children(): QWidget[];
  setStyleSheet(styleSheet: string): void;
  setFixedSize(width: number, height: number): void;
  setMinimumSize(width: number, height: number): void;
  setMaximumSize(width: number, height: number): void;
  setSizePolicy(horizontal: number, vertical: number): void;
  setWindowFlags(flags: number): void;
  setWindowTitle(title: string): void;
  setAttribute(attribute: number, on?: boolean): void;
  resize(width: number, height: number): void;
  move(x: number, y: number): void;
  show(): void;
  hide(): void;
  close(): void;
  [key: string]: any;
}

declare class QLabel extends QWidget {
  constructor(...args: any[]);
  text: string;
  wordWrap: boolean;
  textFormat: number;
  alignment: number;
}
declare class QLineEdit extends QWidget {
  constructor(...args: any[]);
  text: string;
  editingFinished: QSignal;
}
declare class QTextEdit extends QWidget {
  constructor(...args: any[]);
  plainText: string;
  lineWrapMode: number;
  static NoWrap: number;
  static WidgetWidth: number;
  static FixedPixelWidth: number;
  static FixedColumnWidth: number;
}
declare class QTableWidget extends QWidget {
  constructor(...args: any[]);
}
declare class QTableWidgetItem {
  constructor(...args: any[]);
  [key: string]: any;
}
declare class SceneChangeNotifier {
  constructor(...args: any[]);
  currentFrameChanged: QSignal;
  selectionChanged: QSignal;
  sceneMarkersChanged: QSignal;
  [key: string]: any;
}
declare class QDialog extends QWidget {
  constructor(...args: any[]);
}
declare class QSlider extends QWidget {
  constructor(...args: any[]);
}
declare class QSpinBox extends QWidget {
  constructor(...args: any[]);
}
declare class QGroupBox extends QWidget {
  constructor(...args: any[]);
}
declare class QPushButton extends QWidget {
  constructor(...args: any[]);
  text: string;
  clicked: QSignal;
}
declare class QToolButton extends QWidget {
  constructor(...args: any[]);
  text: string;
  toolTip: string;
  popupMode: number;
  menu: QMenu;
  setPopupMode(mode: number): void;
  setMenu(menu: QMenu): void;
  static InstantPopup: number;
  static DelayedPopup: number;
  static MenuButtonPopup: number;
}
declare class QMenu extends QWidget {
  constructor(...args: any[]);
  addAction(text: string): QAction;
  addMenu(title: string): QMenu;
  addSeparator(): QAction;
  exec(pos?: any): QAction;
}
declare class QListWidget extends QWidget {
  constructor(...args: any[]);
}
declare class QScrollArea extends QWidget {
  constructor(...args: any[]);
  widgetResizable: boolean;
  setWidget(widget: QWidget): void;
}
declare class QCheckBox extends QWidget {
  constructor(...args: any[]);
}
declare class QTabWidget extends QWidget {
  constructor(...args: any[]);
  addTab(widget: QWidget, label: string): number;
  setTabPosition(position: number): void;
  static North: number;
  static South: number;
  static West: number;
  static East: number;
}
