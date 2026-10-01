declare class QLayout {
  spacing: number;
  setContentsMargins(left: number, top: number, right: number, bottom: number): void;
  addWidget(widget: QWidget, stretch?: number, alignment?: number): void;
  [key: string]: any;
}
declare class QVBoxLayout extends QLayout {
  constructor(parent?: QWidget);
}
declare class QHBoxLayout extends QLayout {
  constructor(parent?: QWidget);
}
