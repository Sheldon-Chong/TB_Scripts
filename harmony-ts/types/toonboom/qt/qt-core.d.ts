interface QSignal {
  connect(fn: (...args: any[]) => any): void;
  disconnect(fn: (...args: any[]) => any): void;
  [key: string]: any;
}

declare class QTimer {
  constructor(...args: any[]);
  singleShot: boolean;
  timeout: QSignal;
  start(msec: number): void;
  [key: string]: any;
}

declare var QApplication: {
  activeWindow(): QWidget;
  [key: string]: any;
};
declare var Qt: {
  new (...args: any[]): any;
  (...args: any[]): any;
  WindowStaysOnTopHint: number;
  FramelessWindowHint: number;
  ToolTip: number;
  Dialog: number;
  LeftButton: number;
  WA_DeleteOnClose: number;
  PlainText: number;
  AlignmentFlag: {
    AlignLeft: number;
    AlignRight: number;
    AlignCenter: number;
    AlignTop: number;
    AlignBottom: number;
    AlignVCenter: number;
    [key: string]: any;
  };
  [key: string]: any;
};

declare class QAction {
  constructor(...args: any[]);
  text: string;
  triggered: QSignal;
  checkable: boolean;
  checked: boolean;
  [key: string]: any;
}
