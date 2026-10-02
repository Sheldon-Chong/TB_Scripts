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

type frameMarkerColor =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'Green'
  | 'Cyan'
  | 'Blue'
  | 'Purple'
  | 'Pink'
  | 'White'
  | 'Black';


  
declare class columnMarkers {
  /**
   * Creates a new marker on the current column.
   *
   * @param startFrame Frame where the marker starts.
   * @param length Length of the marker.
   * @param type User-defined marker type.
   * @returns The ID of the newly created marker.
   */
  createMarker(startFrame: number, length: number, type: string): number;

  /**
   * Deletes a marker.
   *
   * @param id Marker ID to delete.
   * @returns true if deletion succeeds, otherwise false.
   */
  removeMarker(id: number): boolean;

  /**
   * Returns all marker IDs managed by this marker manager.
   */
  markers(): number[];

  /**
   * Returns all marker IDs at the requested frame.
   *
   * @param startFrame Frame to query.
   */
  markers(startFrame: number): number[];

  /**
   * Gets a marker ID at the requested frame for the given type.
   *
   * @param startFrame Frame to query.
   * @param type Marker type to look for.
   * @returns Marker ID, or 0 if none was found.
   */
  marker(startFrame: number, type: string): number;

  /**
   * Returns the start frame of a marker.
   *
   * @param markerId Marker ID.
   */
  startFrame(markerId: number): number;

  /**
   * Returns the length of a marker.
   *
   * @param markerId Marker ID.
   */
  length(markerId: number): number;

  /**
   * Moves a marker and optionally changes its length.
   *
   * @param markerId Marker ID.
   * @param newStart New starting frame.
   * @param newLength New marker length.
   */
  moveMarker(markerId: number, newStart: number, newLength: number): void;

  /**
   * Returns marker IDs whose ranges overlap the requested frame.
   *
   * Note: "overlapingMarkers" is intentionally spelled this way
   * to match the Toon Boom API.
   *
   * @param startFrame Frame to query.
   */
  overlapingMarkers(startFrame: number): number[];

  /**
   * Gets a property value from a marker.
   *
   * Returns null if the property does not exist.
   *
   * @param markerId Marker ID.
   * @param propertyName Property key.
   */
  value(markerId: number, propertyName: string): any | null;

  /**
   * Sets a property value on a marker.
   *
   * @param markerId Marker ID.
   * @param propertyName Property key.
   * @param value Value to store.
   */
  setValue(markerId: number, propertyName: string, value: any): void;

  /**
   * Returns all property keys stored on a marker.
   *
   * @param markerId Marker ID.
   */
  keyValues(markerId: number): string[];
}
