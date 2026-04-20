
include(specialFolders.userScripts + "/utils/utils.js");

class oDrawing {
  public name: string;
  public element: oElement;
  public fullPath: string;

  constructor(
    name: string,
    element: oElement
  )
  {
    this.element = element;
    this.name = name;


  }

  toString() { 
    return `Drawing<${this.element.folder}-${this.name}.tvg>`;
  }
}

class oElement {
  associatedNode?: NodeLayer
  folder: string;
  completeFolder: string;
  drawings: string[];

  elementId?: number;

  constructor(elementId: number, associatedNode?: NodeLayer) {
    this.elementId = elementId;
    this.completeFolder = element.completeFolder(elementId);
    this.folder = element.folder(elementId);
    this.associatedNode = associatedNode;
    this.updateDrawingsList();

    MessageLog.trace(JSON.stringify(this.drawings, null, 2));
  }

  updateDrawingsList() {
    this.drawings = listFilesInDirectory(this.completeFolder, ["*.tvg"]);
  }

  getDrawings(): string[] {
    this.updateDrawingsList();
    return this.drawings;
  }
  
  getDrawing(drawingName: string): oDrawing | null {
    this.updateDrawingsList();
    if (this.exists(drawingName)) {
      return new oDrawing(drawingName, this);
    }
    return null;
  }

  exists(drawingName: string): boolean {
    this.updateDrawingsList();
    MessageLog.trace(this.completeFolder);
    return this.drawings.indexOf(`${this.folder}-${drawingName}.tvg`) !== -1;
  }

  generateUniqueDrawingName(baseName: string): string {
    this.updateDrawingsList();
    let uniqueName = baseName;
    let counter = 1;
    while (this.exists(uniqueName)) {
      uniqueName = `${baseName}_${counter}`;
      counter++;
    }
    return uniqueName;
  }

  duplicateDrawing(
    newDrawingName: string, 
    sourceDrawingName: string
  ): oDrawing| null {
    var sourcePath = this.completeFolder + "/" + `${this.folder}-${sourceDrawingName}.tvg`;
    var uniqueName = this.generateUniqueDrawingName(newDrawingName);
    var destPath = this.completeFolder + "/" + `${this.folder}-${uniqueName}.tvg`;
    
    if (copyFile(sourcePath, destPath)) {
      Drawing.create(this.elementId!, uniqueName, true, true);

      return new oDrawing(uniqueName, this);
    }
    
    return null;
  }

  revealInFileExplorer(): boolean {
    return openInFileExplorer(this.completeFolder);
  }

  toString() {
    return `Element<${this.completeFolder}>`;
  }
}





/* ====================== COLUMN ====================== */
class Column {
  name: string;
  parent: NodeLayer;

  constructor(name: string, parentLayer: NodeLayer) {
    this.name = name;
    this.parent = parentLayer;
  }

  getType(): string {
    return column.type(this.name);
  }
  
  getKeyframe(frameNumber: number): any {
    return column.getEntry(this.name, 1, frameNumber);
  }

  toString() {
    return `Column<${this.name}>`;
  }
  
  insertKeyFrame(frameNumber: number): boolean {
    return column.setKeyFrame(this.name, frameNumber);
  }

  deleteKeyframes(selection: oSelection) { 
    for (let frame = selection.startFrame; frame <= selection.endFrame; frame++) {
      column.clearKeyFrame(this.name, frame);
    }
  }

  getKeyframeRange(startFrame: number, endFrame: number): any[];
  getKeyframeRange(selection: oSelection): any[];
  getKeyframeRange(startOrSelection: number | oSelection, endFrame?: number): any[] {
    let startFrame: number;
    if (typeof startOrSelection === 'number') {
      if (endFrame === undefined) 
        throw new Error("endFrame is required when startFrame is provided");
      
      startFrame = startOrSelection;
    } 
    else {
      startFrame = startOrSelection.startFrame;
      endFrame = startOrSelection.endFrame;
    }
    const values: any[] = [];
    for (let frame = startFrame; frame <= endFrame; frame++) {
      values.push(this.getKeyframe(frame));
    }
    return values;
  }

  getKeyframeRangeSimplify(startOrSelection: number | oSelection, endFrame?: number): string[] | string {
    let startFrame: number;
    if (typeof startOrSelection === 'number') {
      if (endFrame === undefined) 
        throw new Error("endFrame is required when startFrame is provided");
      startFrame = startOrSelection;
    } 
    else {
      startFrame = startOrSelection.startFrame;
      endFrame = startOrSelection.endFrame;
    }
    const values: string[] = [];
    for (let frame = startFrame; frame <= endFrame; frame++) {
      values.push(this.getKeyframe(frame));
    }
    if (values.length > 0 && values.every(v => v === values[0])) {
      return values[0];
    }
    return values;
  }

  /** Returns the most common keyframe value in the specified range */
  getMostCommonKeyframeFromRange(selection: oSelection): string | null {
    
    const values = this.getKeyframeRange(selection); 
    const valueCounts: { [key: string]: number } = {};

    let mostCommonValue: string | null = null;
    let highestCount = 0;

    for (const value of values) {
      valueCounts[value] = (value in valueCounts) ? valueCounts[value] + 1 : 1;
      if (valueCounts[value] > highestCount) {
        highestCount = valueCounts[value];
        mostCommonValue = value;
      }
    }
    return mostCommonValue;
  }

  setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;
  setKeyFrame(selection: oSelection, value: any): boolean;
  setKeyFrame(startOrSelection: number | oSelection, value: any, endFrame?: number): boolean {
    let startFrame: number;
    let endFrameLocal: number;
    if (typeof startOrSelection === 'number') {
      startFrame = startOrSelection;
      if (endFrame === undefined) {
        endFrameLocal = startFrame;
      } else {
        endFrameLocal = endFrame;
      }
    } else {
      startFrame = startOrSelection.startFrame;
      endFrameLocal = startOrSelection.endFrame;
    }
    for (let frame = startFrame; frame <= endFrameLocal; frame++) {
      const status = column.setEntry(this.name, 1, frame, value.toString());
      if (!status) 
        return false;
    }
    return true;
  }


  /** Returns true if the specified frame is a keyframe (uses column.isKeyFrame with subColumn 0). */
  isKeyFrame(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 0, frameNumber);
  }
}

class PathColumn3D extends Column {
  constructor(name: string, parentLayer: NodeLayer) {
    super(name, parentLayer);
  }

  
  getX(frameNumber: number): string {
    return column.getEntry(this.name, 1, frameNumber);
  }
  getY(frameNumber: number): string {
    return column.getEntry(this.name, 2, frameNumber);
  }
  getZ(frameNumber: number): string {
    return column.getEntry(this.name, 3, frameNumber);
  }

  getXVal(frameNumber: number): number {
    const entry = this.getX(frameNumber);
    return this.parseDirectionalValue(entry, 'E', 'W');
  }
  getYVal(frameNumber: number): number {
    const entry = this.getY(frameNumber);
    return this.parseDirectionalValue(entry, 'N', 'S');
  }
  getZVal(frameNumber: number): number {
    const entry = this.getZ(frameNumber);
    return this.parseDirectionalValue(entry, 'F', 'B');
  }

  private parseDirectionalValue(entry: string, positive: string, negative: string): number {
    const value = parseFloat(entry);
    return entry.indexOf(positive) !== -1 ? value : -value;
  }

  setX(frameNumber: number, value: string | number): boolean {
    const formattedValue = typeof value === 'number' 
      ? Math.abs(value) + (value >= 0 ? " E" : " W")
      : value;
    return column.setEntry(this.name, 1, frameNumber, formattedValue);
  }
  setY(frameNumber: number, value: string | number): boolean {
    const formattedValue = typeof value === 'number' 
      ? Math.abs(value) + (value >= 0 ? " N" : " S")
      : value;
    return column.setEntry(this.name, 2, frameNumber, formattedValue);
  }
  setZ(frameNumber: number, value: string | number): boolean {
    const formattedValue = typeof value === 'number' 
      ? Math.abs(value) + (value >= 0 ? " F" : " B")
      : value;
    return column.setEntry(this.name, 3, frameNumber, formattedValue);
  }

  /**
   * Check if a specific subcolumn has a keyframe at the given frame.
   * @param frameNumber The frame to check.
   * @param subColumn 1=X, 2=Y, 3=Z, 4=Velocity. Defaults to 1 (X).
   */
  isKeyFrame(frameNumber: number, subColumn?: number): boolean {
    return column.isKeyFrame(this.name, subColumn ?? 1, frameNumber);
  }

  isKeyFrameX(frameNumber: number): boolean { return column.isKeyFrame(this.name, 1, frameNumber); }
  isKeyFrameY(frameNumber: number): boolean { return column.isKeyFrame(this.name, 2, frameNumber); }
  isKeyFrameZ(frameNumber: number): boolean { return column.isKeyFrame(this.name, 3, frameNumber); }
  isKeyFrameVelocity(frameNumber: number): boolean { return column.isKeyFrame(this.name, 4, frameNumber); }

  /** Returns true if ANY subcolumn (X, Y, Z) has a keyframe at the given frame. */
  isKeyFrameAny(frameNumber: number): boolean {
    return this.isKeyFrameX(frameNumber)
        || this.isKeyFrameY(frameNumber)
        || this.isKeyFrameZ(frameNumber);
  }

  /** Returns true if ALL subcolumns (X, Y, Z) have a keyframe at the given frame. */
  isKeyFrameAll(frameNumber: number): boolean {
    return this.isKeyFrameX(frameNumber)
        && this.isKeyFrameY(frameNumber)
        && this.isKeyFrameZ(frameNumber);
  }

  toString(): string {
    return `PathColumn3D<${this.name}>`;
  }
  
}

/* ====================== NODES ====================== */
class NodeLayer {
  displayOrder: number;
  index: number;
  nodePath: string;
  name: string;

  toString() {
    return `NodeLayer<${this.nodePath}>`;
  }

  setEnabled(enabled: boolean) {
    node.setEnable(this.nodePath, enabled);
  }
  
  isEnabled(): boolean {
    return node.getEnable(this.nodePath);
  }

  constructor(displayOrder: number, index: number, nodePath: string, name: string) {
    this.displayOrder = displayOrder;
    this.index = index;
    this.nodePath = nodePath;
    this.name = name;
  }

  getAttributeNames(): string[] {
    return node.getAllAttrNames(this.nodePath);
  }

  getAllAttributes(): Attribute[] {
    var attributeNames = this.getAttributeKeywords();
    var attributes = [];
    for (let i = 0; i < attributeNames.length; i++) {
      attributes.push(node.getAttr(this.nodePath, frame.current(), attributeNames[i]));
    }
    return attributes;
  }

  getAttributeKeywords(): string[] {
    return node.getAllAttrKeywords(this.nodePath);
  }

  getEditableAttributes(): string[] {

    function getAttributes(attribute, attributeList) {
      attributeList.push(attribute);
      var subAttrList = attribute.getSubAttributes();
      for (var j = 0; j < subAttrList.length; ++j) {
        if (typeof (subAttrList[j].keyword()) === 'undefined' || subAttrList[j].keyword().length == 0)
          continue;
        getAttributes(subAttrList[j], attributeList);
      }
    }

    function getFullAttributeList(nodePath) {
      var attributeList = [];
      var topAttributeList = node.getAttrList(nodePath, 1);
      for (var i = 0; i < topAttributeList.length; ++i) {
        getAttributes(topAttributeList[i], attributeList);
      }
      return attributeList;
    }

    return getFullAttributeList(this.nodePath).filter(
      (attr) => ["INT", "DOUBLE"].indexOf(attr.typeName()) >= 0)
      .map((attr) => attr.fullKeyword());
  }

  

  getColumn(attrName: string, linkType?: string): Column {

    if (attrName.indexOf("|") !== -1) {
      const lastSlashIndex = attrName.lastIndexOf("|");
      const path = attrName.substring(0, lastSlashIndex);
      const node = LayerManager.getNodeLayer(this.nodePath + path);
      if (node === null) {
        throw new Error("Node not found for path: " + this.nodePath+ path);
      }
      const attributeName = attrName.substring(lastSlashIndex + 1);
      return node.getColumn(attributeName, linkType);
    }

    const col = node.linkedColumn(this.nodePath, attrName);
    if (!col) {
      const colName = column.generateAnonymousName();
      MessageLog.trace("⚠️ No column linked to attribute '" + attrName + "' on node '" + this.nodePath + "'. Creating new Bezier column: " + colName);
      column.add(colName, linkType ?? "BEZIER");
      var result = node.linkAttr(this.nodePath, attrName, colName);
      if (!result) {
        MessageLog.trace("❌ Failed to link new column '" + colName + "' to attribute '" + attrName + " of type " + (linkType ?? "BEZIER") + "' on node '" + this.nodePath + "'.");
      }
      return new G.Column(colName, this);
    }
    if (attrName === "offset.attr3dpath" || attrName === "position.attr3dpath") {
      MessageLog.trace(">> 3d PATH");
      return new G.PathColumn3D(col, this);
    }
    if (attrName === "DRAWING.ELEMENT") {
      return new DrawingElementColumn(col, this);
    }

    return new G.Column(col, this);
  }

  getType(): string {
    return node.type(this.nodePath);
  }
  
  getFullAttributeList(): any[] {
    function getAttributes(attribute: any, attributeList: any[]): void {
      attributeList.push(attribute);
      const subAttrList = attribute.getSubAttributes();
      for (let j = 0; j < subAttrList.length; ++j) {
        if (typeof(subAttrList[j].keyword()) === 'undefined' || subAttrList[j].keyword().length === 0) {
          continue;
        }
        getAttributes(subAttrList[j], attributeList);
      }
    }
    const attributeList: any[] = [];
    const topAttributeList = node.getAttrList(this.nodePath, frame.current());
    for (let i = 0; i < topAttributeList.length; ++i) {
      getAttributes(topAttributeList[i], attributeList);
    }
    return attributeList;
  }

  setAttribute(attrName: string, value: any): void {
    const attr = node.getAttr(this.nodePath, frame.current(), attrName);
    if (!attr) {
      throw new Error("Attribute '" + attrName + "' not found on node '" + this.nodePath + "'.");
    }
    attr.setValue(value);
  }

  getChildren(): NodeLayer [] {
    if (!node.subNodes(this.nodePath)) {
      return [];
    }
    return node.subNodes(this.nodePath).map((childPath: string) => LayerManager.getNodeLayer(childPath)).filter( (layer): layer is NodeLayer => layer !== null);
  }

  getLocked(): boolean {
    return node.getLocked(this.nodePath);
  }

  setLocked(locked: boolean): void {
    node.setLocked(this.nodePath, locked);
  }

  getChild(name: string): NodeLayer | null {
    if (name.indexOf("/") !== -1) {
      return LayerManager.getNodeLayer(this.nodePath + "/" + name);
    }
    else {
      const childPath = node.subNodeByName(this.nodePath, name);
      if (!childPath) {
        return null;
      }
      return LayerManager.getNodeLayer(childPath);
    }
  }

  getChildrenRecursive(): NodeLayer[] {
    const result: NodeLayer[] = [];
    const children = this.getChildren();
    for (const child of children) {
      result.push(child);
      result.push(...child.getChildrenRecursive());
    }
    return result;
  }

  getParent(): NodeLayer | null {
    if (node.parentNode(this.nodePath) === node.root()) {
      return null;
    }
    return LayerManager.getNodeLayer(node.parentNode(this.nodePath));
  }

  isGroup(): boolean {
    return node.isGroup(this.nodePath);
  }
}

class objElement {
  id: number;

  constructor(elementId: number) {
    this.id = elementId;
  }

  get elementName(): string { return element.getNameById(this.id); }
  get scanType(): string { return element.scanType(this.id); }
  get fieldChart(): number { return element.fieldChart(this.id); }
  get vectorType(): number { return element.vectorType(this.id); }
  get pixmapFormat(): string { return element.pixmapFormat(this.id); }
  get folder(): string { return element.folder(this.id); }
  get completeFolder(): string { return element.completeFolder(this.id); }
  get physicalName(): string { return element.physicalName(this.id); }
  
  modify(scanType: string, fieldChart: number, pixmapFormat: string, vectorType: number): boolean { return element.modify(this.id, scanType, fieldChart, pixmapFormat, vectorType); }

  rename(name: string): boolean {
    return element.renameById(this.id, name);
  }

  remove(deleteDiskFile: boolean): boolean {
    return element.remove(this.id, deleteDiskFile);
  }
}

class objDrawing {
  
  name: string
  element: objElement;

  getName(): string {
    return this.name;
  }

  get exposureName():string {
    return this.name.substring(this.name.lastIndexOf(this.element.folder) + this.element.folder.length + 1);
  }

  get filepath (): string {
    return Drawing.filename(this.element.id, this.name);
  }

  // returns path without folder
  get filename (): string {
    return this.filepath.substring(this.filepath.lastIndexOf("/") + 1);
  }

  constructor(name: string, element: objElement) {
    this.name = name;
    this.element = element;
  }
  
  copy(destFileName?: string, override: boolean = false): objDrawing | null {
    let drawingName = "";
    if (destFileName) {
      drawingName = destFileName;
    }
    else { 
      const filename = this.filename.substring(0, this.filename.lastIndexOf(".tvg"));
      drawingName = G.FileUtils.getUniqueFileName(this.element.completeFolder, filename, ".tvg").replace(".tvg", "");
    }
    
    const destPath = this.element.completeFolder + "/" + drawingName + ".tvg";
    
    if (!override && G.FileUtils.exists(destPath)) {
      MessageLog.trace("File already exists at destination path: " + destPath);
      return null;
    }
    
    // MessageLog.trace("drawing name " + this.exposureName);
    const copiedFile = new G.objDrawing(drawingName, this.element);
    const result = Drawing.create(this.element.id, copiedFile.exposureName, true, true);
    MessageLog.trace("result " + result);
    G.FileUtils.copyTo(this.filepath, destPath);
    return copiedFile
  }
}

class DrawingElementColumn extends Column {
  element: objElement;

  constructor(name: string, parentLayer: NodeLayer) {
    MessageLog.trace("name " + name);
    MessageLog.trace("name " + column.getEntry(name, 1, frame.current()));
    super(name, parentLayer);
    this.element = new G.objElement(node.getElementId(parentLayer.nodePath));
  }

  getKeyframe(frameNumber: number): any {
    if (super.getKeyframe(frameNumber) === "") {
      return null;
    } 
    return new G.objDrawing(super.getKeyframe(frameNumber), this.element);
  }


  setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;
  setKeyFrame(selection: oSelection, value: any): boolean;
  setKeyFrame(startOrSelection: number | oSelection, value: any, endFrame?: number): boolean {
    if (value instanceof G.objDrawing) {
      return super.setKeyFrame(startOrSelection as any, value.exposureName, endFrame);
    }
    return super.setKeyFrame(startOrSelection as any, value, endFrame);
  }

  copyDrawingTo(drawing: objDrawing, destFrame: number): boolean {
    const copiedDrawing = drawing.copy();
    if (!copiedDrawing) {
      MessageLog.trace("Failed to copy drawing for duplication.");
      return false;
    }
    MessageLog.trace(copiedDrawing.exposureName);
    
    return this.setKeyFrame(destFrame, copiedDrawing.exposureName);
  }
}

class DrawingLayer extends NodeLayer {
  constructor(displayOrder: number, index: number, nodePath: string, name: string) {
    super(displayOrder, index, nodePath, name);
  }

  getElementId(): number {
    return node.getElementId(this.nodePath);
  }

  // pasteDuplicate(selection: oSelection, value: string) {
  //   var folder = element.completeFolder(this.getElementId());
  //   var folderName = element.folder(this.getElementId());
  //   MessageLog.trace("folder: " + folder);
  //   MessageLog.trace("folderName: " + folderName);
  // }

  toString() {
    return `DrawingLayer<${this.nodePath}>`;
  }
}



class _LayerManager {
  nodeLayers: NodeLayer[] = [];

  constructor() {
    this.updateNodeLayers();
  }

  updateNodeLayers(): void {
    this.nodeLayers = [];
    for (var i = 0; i < Timeline.numLayers; i++) {
      var nodePath = Timeline.layerToNode(i);
      if (Timeline.layerIsNode(i)) {
        if (node.type(nodePath) === "READ") {
          this.nodeLayers.push(new DrawingLayer(
            this.nodeLayers.length,
            i,
            nodePath,
            node.getName(nodePath)
          ));
        }
        else {
          this.nodeLayers.push(new NodeLayer(
            this.nodeLayers.length,
            i,
            nodePath,
            node.getName(nodePath)
          ));
        }
      }
    }

    
  }
  getSelectedNodes(): NodeLayer[] {
    const selectedNodePaths = selection.selectedNodes();
    const selectedNodes = selectedNodePaths
      .map((nodePath: string) => this.getNodeLayer(nodePath))
      .filter((layer): layer is NodeLayer => layer !== null);

    // Sort by displayOrder property
    selectedNodes.sort((a, b) => a.displayOrder - b.displayOrder);

    return selectedNodes;
  }

  getNodeLayers(): NodeLayer[] {
    return this.nodeLayers;
  }

  getNodeLayer(index: string | number): NodeLayer | null {
    for (var i = 0; i < this.nodeLayers.length; i++) {
      if (typeof index === "string") {
        if (this.nodeLayers[i].nodePath === index) 
          return this.nodeLayers[i];
      } else {
        if (this.nodeLayers[i].index === index) 
          return this.nodeLayers[i];
      }
    }
    return null;
  }
}

const LayerManager = new _LayerManager();




class _Selection {
  getSelectedNodes(): NodeLayer[] {
    const selectedNodePaths = selection.selectedNodes();
    return selectedNodePaths.map((nodePath: string) => LayerManager.getNodeLayer(nodePath)).filter((layer): layer is NodeLayer => layer !== null);
  }
}

const GlobalSelection = new _Selection();