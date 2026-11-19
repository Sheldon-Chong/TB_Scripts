declare var frame: {
  current(): number;
  setCurrent(frame: number): void;
  numberOf(): number;
  insert(afterFrame: number, count: number, options?: { ripple_markers?: boolean; extend_exposure?: boolean }): boolean;
  remove(afterFrame: number, count: number, options?: { ripple_markers?: boolean }): boolean;
};
