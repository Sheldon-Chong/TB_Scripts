declare var column: {
  // Column Data
  numberOf(): number;
  getName(columnNumber: number): string;
  getDisplayName(columnName: string): string;
  getColorForXSheet(columnName: string): ColorRGBA;
  resetColorForXSheet(columnName: string): void;
  setColorForXSheet(columnName: string, color: ColorRGBA): void;
  type(columnName: string): string;
  velocityType(columnName: string): string;
  getEntry(columnName: string, subColumnIndex: number, atFrame: number): string;
  isKeyFrame(columnName: string, subColumn: number, atFrame: number): boolean;
  getElementIdOfDrawing(columnName: string): number;
  getTextOfExpr(columnName: string): string;

  // Column Edition
  add(columnName: string, columnType: string, position?: string): boolean;
  generateAnonymousName(): string;
  removeSoundColumn(columnName: string): boolean;
  removeUnlinkedFunctionColumn(columnName: string): boolean;
  rename(oldName: string, newName: string): boolean;
  setEntry(columnName: string, subColumn: number, atFrame: number, value: string): boolean;
  setKeyFrame(columnName: string, atFrame: number): boolean;
  clearKeyFrame(columnName: string, atFrame: number): boolean;

  // Drawing Column Edition
  setElementIdOfDrawing(columnName: string, elementId: number): boolean;
  getDrawingType(columnName: string, atFrame: number): string;
  setDrawingType(columnName: string, atFrame: number, drawingType: string): void;
  getDrawingColumnList(): StringList;
  getColumnListOfType(type: string): StringList;
  getDrawingTimings(columnName: string): StringList;
  getNextKeyDrawing(columnName: string, startFrame: number): number;
  getCurrentVersionForDrawing(columnName: string, timingName: string): number;
  importSound(columnName: string, atFrame: number, soundFilePath: string): boolean;

  // Expression Column Edition
  setTextOfExpr(columnName: string, text: string): boolean;
  getDrawingName(columnName: string, frame: number): string;

  // Move Columns
  getPos(columnName: string): number;
  move(columnFrom: number, columnTo: number): void;
  update(): void;
  selected(): string;

  // Misc
  generateTiming(columnName: string, forFrame: number, fileExists: boolean): string;
  createDrawing(columnName: string, timing: string): boolean;
  renameDrawing(columnName: string, oldTiming: string, newTiming: string): boolean;
  renameDrawingWithPrefix(columnName: string, oldTiming: string, prefix: string): boolean;
  deleteDrawingAt(columnName: string, frame: number): boolean;
  duplicateDrawingAt(columnName: string, frame: number): boolean;
  addKeyDrawingExposureAt(columnName: string, frame: number): boolean;
  removeKeyDrawingExposureAt(columnName: string, frame: number): boolean;
  removeDuplicateKeyDrawingExposureAt(columnName: string, frameNumber: number): boolean;
  fillEmptyCels(columnName: string, startFrame: number, endFrame: number): boolean;
  lineTestFill(
    columnName: string,
    startFrame: number,
    nbFrames: number,
    prefix: string,
    keyFramesOnly: boolean,
  ): boolean;
  soundColumn(columnName: string): QObject;
  columnMarkers(columnName: string): columnMarkers;
  getTimesheetEntry(columnName: string, subColumn: number, atFrame: number): QScriptValue;
  getImageBlock(columnName: string, startFrame: number, nbFrames: number): QImage;
};
