declare var MessageLog: {
  trace(msg: string): void;
};

declare var Action: {
  /** Perform the requested action (slot - menu item, toolbar item,...) */
  perform(slot: string): void;

  /** Perform the requested action (slot - menu item, toolbar item,...) */
  perform(slot: string, responder: string): void;

  /** Execute an action using the action manager on the given responder with parameters. */
  perform(slot: string, responder: string, parameters: any): void;

  /** Execute an action using the action manager on all responder instances. */
  performForEach(slot: string, responder: string): void;

  /** Validate the requested action (slot - menu item, toolbar item,...) */
  validate(slot: string): any;

  /** Validate the requested action (slot - menu item, toolbar item,...) */
  validate(slot: string, responder: string): any;

  /** Retrieve the list of responder names. */
  getResponderList(): string[];

  /** Retrieve the list of actions for a given responder. */
  getActionList(responder: string): string[];
};

declare var Timeline: {
  selIsColumn(selectionIndex: number): boolean;
  selToColumn(selectionIndex: number): string;
  selToNode(selectionIndex: number): string;
  selIsNode(selectionIndex: number): boolean;
  layerIsColumn(layerIndex: number): boolean;
  layerToColumn(layerIndex: number): string;
  layerIsNode(layerIndex: number): boolean;
  layerToNode(layerIndex: number): string;
  selToLayer(selectionIndex: number): number;
  parentNodeIndex(layerIndex: number): number;
  isAncestorOf(parentLayerIndex: number, layerIndex: number): boolean;
  setDisplayToUnconnected(): boolean;
  getFrameMarker(layerIndex: number, frameNumber: number): any; // QScriptValue
  getAllFrameMarkers(layerIndex: number): any; // QScriptValue
  filterFrameMarkers(layerIndex: number, markerType: string): any; // QScriptValue
  createFrameMarker(layerIndex: number, markerType: string, frameNumber: number): number;
  deleteFrameMarker(layerIndex: number, markerId: number): boolean;
  moveFrameMarker(layerIndex: number, markerId: number, newFrame: number): boolean;
  changeFrameMarkerType(layerIndex: number, markerId: number, markerType: string): boolean;
  frameMarkerTypes(): string[]; // StringList
  centerOnFrame(frameNum: number): void;
  numLayerSel(): number;
  firstFrameSel(): number;
  numFrameSel(): number;
  numLayers: number;
};

interface oTimelineMarker {
  frame: number;
  length: number;
  color: number | string;
  name: string;
  notes: string;
}

declare var specialFolders: {
  userScripts: string;
  userConfig: string;
};

declare var TimelineMarker: {
  createMarker(marker: oTimelineMarker): oTimelineMarker;
  setMarker(marker: any): any;
  deleteMarker(marker: oTimelineMarker): boolean;
  getAllMarkers(): oTimelineMarker[];
  getMarkersAtFrame(atFrame: number): oTimelineMarker[];
  getFirstMarkerAt(atFrame: number): oTimelineMarker;
};

declare interface ToolbarDef {
  id: string;
  text: string;
  customizable?: boolean;
}

declare interface ButtonDef {
  text?: string;
  icon?: string;
  checkable?: boolean;
  action?: string;
  slot?: string;
  itemParameter?: string;
  shortcut?: string;
}

declare class ScriptToolbarDef {
  constructor(toolbarDef: ToolbarDef);
  id: string;
  text: string;
  customizable?: boolean;
  addButton(button: ButtonDef): void;
}

declare interface ActionDef {
  id: string;
  text: string;
  icon?: string;
  checkable?: boolean;
  isEnabled?: boolean | (() => boolean);
  isChecked?: boolean | (() => boolean);
  onTrigger?: () => void;
  onSelectionChanged?: () => void;
  onCurrentFrameChanged?: () => void;
  onNetworkChanged?: () => void;
  onPreferenceChanged?: () => void;
}

declare var ScriptManager: {
  addAction(action: ActionDef): void;
  addShortcut(shortcut: any): void;
  addToolbar(toolbar: ScriptToolbarDef): void;
};

declare var scene: {
  currentVersion(): number;
  currentVersionName(): string;
  currentEnvironment(): string;
  currentEnvironmentPath(): string;
  currentJob(): string;
  currentJobPath(): string;
  currentScene(): string;
  currentProjectPath(): string;
  currentContainerPath(): string;
  currentProjectPathRemapped(): string;
  tempProjectPath(): string;
  tempProjectPathRemapped(): string;
  beginUndoRedoAccum(commandName: string): void;
  endUndoRedoAccum(): void;
  cancelUndoRedoAccum(): void;
  undo(depth?: number): void;
  redo(depth?: number): void;
  clearHistory(): void;
  clearRedo(): void;
  unitsAspectRatioX(): number;
  unitsAspectRatioY(): number;
  numberOfUnitsX(): number;
  numberOfUnitsY(): number;
  numberOfUnitsZ(): number;
  coordAtCenterX(): number;
  coordAtCenterY(): number;
  currentResolutionX(): number;
  currentResolutionY(): number;
  defaultResolutionName(): string;
  defaultResolutionX(): number;
  defaultResolutionY(): number;
  defaultResolutionFOV(): number;
  namedResolutions(): string[];
  namedResolutionX(name: string): number;
  namedResolutionY(name: string): number;
  getFrameRate(): number;
  setDefaultTexturePixelDensityforVectorDrawings(normalizedDensity: number): void;
  setDefaultTexturePixelDensityforBitmapDrawings(normalizedDensity: number): void;
  getStartFrame(): number;
  getStopFrame(): number;
  colorSpace(): string;
  colorSpaceNames(): string[];
  isDirty(): boolean;
  hasBeenDirty(): boolean;
  description(): string;
  setDescription(description: string): void;
  saveAll(): boolean;
  saveAsNewVersion(name: string, markAsDefault: boolean): boolean;
  saveAs(pathname: string): boolean;
  checkFiles(options: any): void;
  setUnitsAspectRatio(x: number, y: number): boolean;
  setNumberOfUnits(x: number, y: number, z: number): boolean;
  setCoordAtCenter(x: number, y: number): boolean;
  setDefaultResolution(x: number, y: number, fov: number): boolean;
  setDefaultResolutionName(name: string): boolean;
  setFrameRate(frameRate: number): boolean;
  setStartFrame(frame: number): boolean;
  setStopFrame(frame: number): boolean;
  setColorSpace(name: string): boolean;
  getCameraMatrix(frame: number): any;
  toOGL(pointOrVector: any): any;
  toOGLX(fieldX: number): number;
  toOGLY(fieldY: number): number;
  toOGLZ(fieldZ: number): number;
  fromOGL(pointOrVector: any): any;
  fromOGLX(oglX: number): number;
  fromOGLY(oglY: number): number;
  fromOGLZ(oglZ: number): number;
  getDefaultDisplay(): string;
  closeScene(): void;
  closeSceneAndExit(): void;
  closeSceneAndOpen(
    envName: string,
    jobName: string,
    sceneName: string,
    versionName?: string,
    isReadOnly?: boolean,
  ): boolean;
  closeSceneAndOpenOffline(filePath: string): boolean;
  getMissingPalettes(unrecovered: boolean, recoveredNotYetSaved: boolean): string[];
  metadatas(): any;
  metadata(name: string, type?: string): any;
  setMetadata(meta: any): void;
  removeMetadata(meta: any): boolean;
  setProcessingBitDepth(bitDepth: number): void;
  getProcessingBitDepth(): number;
  /** The current frame number. */
  current(): number;
  /** Set the current frame number. */
  setCurrent(frame: number): void;
};

declare class Point2d {
  x: number;
  y: number;
  constructor(x: number, y: number);
}

declare var Vector2d: {
  new (x: number, y: number): Point2d;
};

interface QSignal {
  connect(fn: (...args: any[]) => any): void;
  disconnect(fn: (...args: any[]) => any): void;
  [key: string]: any;
}

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
declare class QAction {
  constructor(...args: any[]);
  text: string;
  triggered: QSignal;
  checkable: boolean;
  checked: boolean;
  [key: string]: any;
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
declare class QTimer {
  constructor(...args: any[]);
  singleShot: boolean;
  timeout: QSignal;
  start(msec: number): void;
  [key: string]: any;
}
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

declare var System: {
  println(text: String): void;
  getenv(environmentVariable: String): String;
  processOneEvent(): void;
};

declare var Tools: {
  createDrawing(): any;
  getToolSettings(): any;
  registerTool(toolDefinition: HarmonyToolDefinition): number;
  setCurrentTool(tool: any): boolean;
  setToolSettings(arg): any;
};

declare interface ObjectConstructor {
  _: HarmonyGlobals;
  assign(target: any, ...sources: any[]): any;
  (...args: any[]): any;
  [key: string]: any;
}

declare var preferences: {
  setString(key: string, value: string): void;
  getString(key: string, defaultValue: string): string;
};

interface HarmonyToolDefinition {
  name: string;
  displayName: string;
  icon: string;
  toolType: string;
  canBeOverridenBySelectOrTransformTool: boolean;
  options: { snapToBoundary: boolean };
  resourceFolder: string;
  defaultOptions: { snapToBoundary: boolean };
  [key: string]: any;

  preferenceName: () => string;
  loadFromPreferences: () => void;
  storeToPreferences: () => void;
  onRegister: () => void;
  onCreate: (ctx: any) => void;
  onMouseDown: (ctx: any) => boolean;
  onMouseMove: (ctx: any) => boolean;
  onMouseUp: (ctx: any) => boolean;
  onResetTool: (ctx: any) => void;
  showMeasureToast?: (labelText: string, duration: number) => void;
  loadPanel: (dialog: any, responder: any) => void;
  refreshPanel: (dialog: any, responder: any) => void;

  ui?: {
    snapCheckbox: any;
  };
}

declare var node: {
  root(): string;
  isGroup(node: string): boolean;
  getName(node: string): string;
  type(node: string): string;
  numberOfSubNodes(parent: string): number;
  subNodes(parentGroup: string): any; // QScriptValue
  addCompositeToGroup(node: string): boolean;
  subNode(parent: string, iSubNode: number): string;
  subNodeByName(parent: string, name: string): string;
  parentNode(node: string): string;
  noNode(): string;
  equals(node1: string, node2: string): boolean;
  isControlShown(node: string): boolean;
  showControls(node: string, show: boolean): boolean;
  getTextAttr(node: string, atFrame: number, attrName: string): string;
  getAttr(node: string, atFrame: number, attrName: string): any; // Attribute *
  getAttrList(node: string, atFrame: number, attrName?: string): any[]; // QList<Attribute *>
  getAllAttrNames(node: string): string[];
  getAllAttrKeywords(node: string): string[];
  linkedColumn(node: string, attrName: string): string;
  coordX(node: string): number;
  coordY(node: string): number;
  coordZ(node: string): number;
  width(node: string): number;
  height(node: string): number;
  setCoord(node: string, x: number, y: number): boolean;
  setCoord(node: string, x: number, y: number, z: number): boolean;
  numberOfInputPorts(node: string): number;
  isLinked(node: string, iPort: number): boolean;
  srcNode(node: string, iPort: number): string;
  flatSrcNode(node: string, iPort: number): string;
  srcNodeInfo(node: string, iPort: number): any; // QScriptValue
  srcPortIsMattePort(node: string, iPort: number): boolean;
  numberOfOutputPorts(node: string): number;
  numberOfOutputLinks(node: string, iPort: number): number;
  dstNode(sourceNode: string, iPort: number, iLink: number): string;
  dstNodeInfo(sourceNode: string, iPort: number, iLink: number): any; // QScriptValue
  groupAtNetworkBuilding(node: string): boolean;
  add(parentGroup: string, name: string, type: string, x: number, y: number, z: number): string;
  getGroupInputModule(parentGroup: string, name: string, x: number, y: number, z: number): string;
  getGroupOutputModule(parentGroup: string, name: string, x: number, y: number, z: number): string;
  deleteNode(nodePath: string, deleteTimedValues?: boolean, deleteElements?: boolean): boolean;
  createGroup(nodes: string, groupName: string): string;
  moveToGroup(node: string, groupName: string): string;
  explodeGroup(groupName: string): boolean;
  rename(node: string, newName: string, renameElement?: boolean): boolean;
  createDynamicAttr(
    node: string,
    type: string,
    attrName: string,
    displayName: string,
    linkable: boolean,
  ): boolean;
  removeDynamicAttr(node: string, attrName: string): boolean;
  setTextAttr(node: string, attrName: string, atFrame: number, attrValue: string): boolean;
  linkAttr(node: string, attrName: string, columnName: string): boolean;
  unlinkAttr(node: string, attrName: string): boolean;
  link(srcNode: string, srcPort: number, dstNode: string, dstPort: number): boolean;
  link(
    srcNode: string,
    srcPort: number,
    dstNode: string,
    dstPort: number,
    mayAddOutputPort: boolean,
    mayAddInputPort: boolean,
  ): boolean;
  unlink(dstNode: string, inPort: number): boolean;
  setEnable(node: string, flag: boolean): boolean;
  getEnable(node: string): boolean;
  setCached(node: string, cached: boolean): boolean;
  getCached(node: string): boolean;
  isSupportingCache(node: string): boolean;
  getAllCachedNodes(root: string): string[];
  getAllCachedNodes(): string[];
  getCacheFillLevel(): number;
  clearCacheDisabledState(): void;
  clearCacheDisabledState(vNodes: string[]): void;
  clearCacheDisabledState(vNode: string): void;
  setLocked(node: string, lock: boolean): boolean;
  getLocked(node: string): boolean;
  setTimelineTag(node: string, tag: boolean): boolean;
  getTimelineTag(node: string): boolean;
  getTimelineTagList(node?: string, list?: string[]): string[];
  setColor(node: string, color: ColorRGBA): boolean;
  resetColor(node: string): boolean;
  getColor(node: string): ColorRGBA;
  setAsGlobalDisplay(node: string): boolean;
  setGlobalToDisplayAll(): boolean;
  setAsDefaultCamera(node: string): boolean;
  getDefaultCamera(): string;
  getCameras(): string[];
  getMaxVersionNumber(node: string): number;
  getVersion(node: string): number;
  setVersion(node: string, version: number): void;
  getNodes(types: string[]): string[];
  getMatrix(node: string, frame: number): any; // QObject *
  getPivot(node: string, frame: number): any; // QObject *
  getColorOverride(node: string): any; // ColorOverride *
  getElementId(nodeName: string): number;
  explodeElementSymbolsInGroups(
    element: string,
    disableElement: boolean,
    clearExposure: boolean,
    prefix?: string,
  ): void;
  setShowTimelineThumbnails(node: string, bShow: boolean): boolean;
  getShowTimelineThumbnails(node: string): boolean;
  setOutlineMode(node: string, bOutlineMode: boolean): boolean;
};

declare var frame: {
  current(): number;
  setCurrent(frame: number): void;
  numberOf(): number;
};

declare var selection: {
  numberOfNodesSelected(): number;
  selectedNode(i: number): string;
  selectedWaypoint(i: number): string;
  numberOfColumnsSelected(): number;
  selectedColumn(i: number): string;
  clearSelection(): boolean;
  addNodeToSelection(node: string): boolean;
  addNodesToSelection(nodes: any): void;
  removeNodeFromSelection(node: string): boolean;
  addBackdropToSelection(backdrop: any): boolean;
  removeBackdropFromSelection(backdrop: any): boolean;
  addBackdropToSelection(groupPath: string, idx: number): boolean;
  removeBackdropFromSelection(groupPath: string, idx: number): boolean;
  addWaypointToSelection(waypoint: string): boolean;
  removeWaypointFromSelection(waypoint: string): boolean;
  addColumnToSelection(column: string): boolean;
  addDrawingColumnToSelection(columnName: string): boolean;
  extendSelectionWithColumn(columnName: string): boolean;
  setSelectionFrameRange(start: number, length: number): void;
  isSelectionRange(): boolean;
  startFrame(): number;
  numberOfFrames(): number;
  selectAll(): void;
  selectedNodes(): any;
  selectedWaypoints(): any;
  selectedBackdrops(): any;
  subSelectionForNode(node: string): any;
  addSubSelectionForNode(node: string, subSelection: any): boolean;
  clearSubSelectionForNode(node: string): boolean;
  attributeFromSubSelectionId(node: string, subSelectionId: number): any;
  subSelectionIdFromAttribute(attribute: any): number;
};

declare var render: {
  setCombine(autoCombine: boolean, secondFieldFirst: boolean): void;
  setFieldType(type: number): void;
  setBgColor(bgColor: ColorRGBA): void;
  setResolution(x: number, y: number): void;
  setResolutionName(name: string): void;
  setRenderDisplay(name: string): void;
  setWriteEnabled(enabled: boolean): void;
  setAutoThumbnailCropping(enabled: boolean): void;
  setWhiteBackground(enabled: boolean): void;
  renderScene(fromFrame: number, toFrame: number): void;
  renderSceneAll(): void;
  renderNodes(nodeNameList: any, fromFrame: number, toFrame: number): void;
  cancelRender(): void;
  disconnect(): void;
  frameReady?: (frame: number, frameCel: any) => void;
  nodeFrameReady?: (frame: number, frameCel: any, nodePath: string) => void;
  renderFinished?: () => void;
};

declare var element: {
  numberOf(): number;
  id(elementIndex: number): number;
  getNameById(elementId: number): string;
  scanType(elementId: number): string;
  fieldChart(elementId: number): number;
  vectorType(elementId: number): number;
  pixmapFormat(elementId: number): string;
  folder(elementId: number): string;
  completeFolder(elementId: number): string;
  physicalName(elementId: number): string;
  modify(
    elementId: number,
    scanType: string,
    fieldChart: number,
    pixmapFormat: string,
    vectorType: number,
  ): boolean;
  add(
    name: string,
    scanType: string,
    fieldChart: number,
    fileFormat: string,
    vectorFormat: string,
  ): number;
  remove(elementId: number, deleteDiskFile: boolean): boolean;
  renameById(elementId: number, name: string): boolean;
};

declare interface Point3d {
  x: number;
  y: number;
  z: number;
}

declare interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

declare class Attribute {
  keyword(): string;
  name(): string;
  typeName(): string;
  boolValue(): boolean;
  intValue(): number;
  doubleValue(): number;
  textValue(): string;
  colorValue(): ColorRGBA;
  pos2dValue(): Point2d;
  pos3dValue(): Point3d;
  boolValueAt(frame: number): boolean;
  intValueAt(frame: number): number;
  doubleValueAt(frame: number): number;
  textValueAt(frame: number): string;
  colorValueAt(frame: number): ColorRGBA;
  pos2dValueAt(frame: number): Point2d;
  pos3dValueAt(frame: number): Point3d;
  setValue(value: any): void;
  setValue(value: number): void;
  setValue(value: boolean): void;
  setValue(value: string): void;
  setValueAt(value: any, frame: number): void;
  setValueAt(value: number, frame: number): void;
  setValueAt(value: boolean, frame: number): void;
  setValueAt(value: string, frame: number): void;
  getSubAttributes(): Attribute[];
  hasSubAttributes(): boolean;
  fullKeyword(): string;
  possibleTextValues(): string[];
}

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

declare var func: {
  /**
   * Add a keyframe to a 3D path column.
   * @param columnName  The name of the 3D path column.
   * @param frame       The frame number.
   * @param x           X coordinate.
   * @param y           Y coordinate.
   * @param z           Z coordinate.
   * @param tension     Spline tension.
   * @param continuity  Spline continuity.
   * @param bias        Spline bias.
   */
  addKeyFramePath3d(
    columnName: string,
    frame: number,
    x: number,
    y: number,
    z: number,
    tension: number,
    continuity: number,
    bias: number,
  ): void;
};

interface DrawingType {
  text: string;
  pixmapFile: string;
  commandIcon: string;
  flipIcon: string;
  onionIcon: string;
  timelineColor: string;
}
