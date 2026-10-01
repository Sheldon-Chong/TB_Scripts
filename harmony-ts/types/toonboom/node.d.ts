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
