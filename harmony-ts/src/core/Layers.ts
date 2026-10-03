include(specialFolders.userScripts + '/core/utils.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/Attributes.js');
include(specialFolders.userScripts + '/core/Element.js');

class oDrawing {
  public name: string;
  public element: oElement;
  public fullPath: string;

  constructor(name: string, element: oElement) {
    this.element = element;
    this.name = name;
  }

  toString() {
    return `Drawing<${this.element.folder}-${this.name}.tvg>`;
  }

  getName(): string {
    return this.name;
  }

  get exposureName(): string {
    return this.name.substring(
      this.name.lastIndexOf(this.element.folder) + this.element.folder.length + 1,
    );
  }

  get filepath(): string {
    return Drawing.filename(this.element.id, this.name);
  }

  get filename(): string {
    return this.filepath.substring(this.filepath.lastIndexOf('/') + 1);
  }

  duplicate(destFileName?: string, override: boolean = false): oDrawing | null {
    let drawingName = '';
    if (destFileName) {
      drawingName = destFileName;
    } else {
      drawingName = this.name;
    }

    return this.element.duplicateDrawing(drawingName, this.name);
  }
}

/* ====================== COLUMN ====================== */

class oColumn {
  name: string;
  parent: oNodeLayer;

  constructor(name: string, parentLayer: oNodeLayer) {
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
        throw new Error('endFrame is required when startFrame is provided');

      startFrame = startOrSelection;
    } else {
      startFrame = startOrSelection.startFrame;
      endFrame = startOrSelection.endFrame;
    }
    const values: any[] = [];
    for (let frame = startFrame; frame <= endFrame; frame++) {
      values.push(this.getKeyframe(frame));
    }
    return values;
  }

  getKeyframeRangeSimplify(
    startOrSelection: number | oSelection,
    endFrame?: number,
  ): string[] | string {
    let startFrame: number;
    if (typeof startOrSelection === 'number') {
      if (endFrame === undefined)
        throw new Error('endFrame is required when startFrame is provided');
      startFrame = startOrSelection;
    } else {
      startFrame = startOrSelection.startFrame;
      endFrame = startOrSelection.endFrame;
    }
    const values: string[] = [];
    for (let frame = startFrame; frame <= endFrame; frame++) {
      values.push(this.getKeyframe(frame));
    }
    if (values.length > 0 && values.every((v) => v === values[0])) {
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
      valueCounts[value] = value in valueCounts ? valueCounts[value] + 1 : 1;
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
      if (!status) return false;
    }
    return true;
  }

  /**
   * Repeat the values from sourceSelection across pasteSelection.
   * Subclasses can override pasteLoopKeyframe() when copying a value requires
   * more than writing the source value into the destination column.
   */
  loopKeyframes(sourceSelection: oSelection, pasteSelection: oSelection): boolean {
    if (sourceSelection.endFrame < sourceSelection.startFrame) return false;
    if (pasteSelection.endFrame < pasteSelection.startFrame) return false;

    const sourceLength = sourceSelection.endFrame - sourceSelection.startFrame + 1;
    const sourceValues: any[] = [];
    for (
      let sourceFrame = sourceSelection.startFrame;
      sourceFrame <= sourceSelection.endFrame;
      sourceFrame++
    ) {
      sourceValues.push(this.getKeyframe(sourceFrame));
    }

    for (
      let destinationFrame = pasteSelection.startFrame;
      destinationFrame <= pasteSelection.endFrame;
      destinationFrame++
    ) {
      const sourceValue =
        sourceValues[(destinationFrame - pasteSelection.startFrame) % sourceLength];
      if (!this.pasteLoopKeyframe(sourceValue, destinationFrame)) return false;
    }
    return true;
  }

  protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
    return this.setKeyFrame(destinationFrame, sourceValue);
  }

  /** Returns true if the specified frame is a keyframe (uses column.isKeyFrame with subColumn 0). */
  isKeyFrame(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 0, frameNumber);
  }
}

class oDrawingElementColumn extends oColumn {
  element: oElement;

  constructor(name: string, parentLayer: oNodeLayer) {
    MessageLog.trace('name ' + name);
    MessageLog.trace('name ' + column.getEntry(name, 1, frame.current()));
    super(name, parentLayer);
    this.element = new oElement(node.getElementId(parentLayer.nodePath));
  }

  getKeyframe(frameNumber: number): oDrawing | null {
    if (super.getKeyframe(frameNumber) === '') {
      return null;
    }
    return new oDrawing(super.getKeyframe(frameNumber), this.element);
  }

  setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;
  setKeyFrame(selection: oSelection, value: any): boolean;
  setKeyFrame(startOrSelection: number | oSelection, value: any, endFrame?: number): boolean {
    if (value instanceof oDrawing) {
      return super.setKeyFrame(startOrSelection as any, value.name, endFrame);
    }
    return super.setKeyFrame(startOrSelection as any, value, endFrame);
  }

  protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
    const drawing = sourceValue as oDrawing | null;
    if (!drawing) {
      return super.setKeyFrame(destinationFrame, '');
    }

    const copiedDrawing = drawing.duplicate();
    if (!copiedDrawing) return false;
    return super.setKeyFrame(destinationFrame, copiedDrawing.name);
  }

  copyDrawingRangeTo(selection: oSelection, destFrame: number): boolean {
    const pasteSelection = new oSelection(
      destFrame,
      destFrame + selection.endFrame - selection.startFrame,
    );
    return this.loopKeyframes(selection, pasteSelection);
  }

  copyDrawingTo(drawing: oDrawing, destFrame: number): boolean {
    const copiedDrawing = drawing.duplicate();
    if (!copiedDrawing) {
      MessageLog.trace('Failed to copy drawing for duplication.');
      return false;
    }
    return this.setKeyFrame(destFrame, copiedDrawing.name);
  }
}

class oPathColumn3D extends oColumn {
  constructor(name: string, parentLayer: oNodeLayer) {
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
    const formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' E' : ' W') : value;
    return column.setEntry(this.name, 1, frameNumber, formattedValue);
  }
  setY(frameNumber: number, value: string | number): boolean {
    const formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' N' : ' S') : value;
    return column.setEntry(this.name, 2, frameNumber, formattedValue);
  }
  setZ(frameNumber: number, value: string | number): boolean {
    const formattedValue =
      typeof value === 'number' ? Math.abs(value) + (value >= 0 ? ' F' : ' B') : value;
    return column.setEntry(this.name, 3, frameNumber, formattedValue);
  }

  /**
   * Set the 3D path position at a given frame using `func.addKeyFramePath3d`.
   *
   * @param frameNumber  The frame at which to set the keyframe.
   * @param position     Any VectorInput form:
   *   - `5`              → scalar: all components = 5
   *   - `[1, 2, 3]`      → array
   *   - `{ x:1, y:2, z:3 }` → object literal
   *   - `new Vec3(1,2,3)`   → another Vec3
   *   - `new Vec3(1, 2, 3)` → individual components (if supported)
   * @param tension      Spline tension (default 0).
   * @param continuity    Spline continuity (default 0).
   * @param bias          Spline bias (default 0).
   */
  setPosition(
    frameNumber: number,
    position: VectorInput,
    tension: number = 0,
    continuity: number = 0,
    bias: number = 0,
  ): void {
    const v = this.resolveVec3(position);
    func.addKeyFramePath3d(this.name, frameNumber, v.x, v.y, v.z, tension, continuity, bias);
  }

  /** Resolve a VectorInput into plain {x, y, z} numbers. */
  private resolveVec3(input: VectorInput): { x: number; y: number; z: number } {
    if (typeof input === 'number') {
      return { x: input, y: input, z: input };
    }
    if (input instanceof G.Vec3) {
      return { x: input.x, y: input.y, z: input.z };
    }
    if (Array.isArray(input)) {
      return { x: input[0] ?? 0, y: input[1] ?? 0, z: input[2] ?? 0 };
    }
    const obj = input as { x: number; y: number; z: number };
    return { x: obj.x, y: obj.y, z: obj.z };
  }

  /**
   * Check if a specific subcolumn has a keyframe at the given frame.
   * @param frameNumber The frame to check.
   * @param subColumn 1=X, 2=Y, 3=Z, 4=Velocity. Defaults to 1 (X).
   */
  isKeyFrame(frameNumber: number, subColumn?: number): boolean {
    return column.isKeyFrame(this.name, subColumn ?? 1, frameNumber);
  }

  isKeyFrameX(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 1, frameNumber);
  }
  isKeyFrameY(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 2, frameNumber);
  }
  isKeyFrameZ(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 3, frameNumber);
  }
  isKeyFrameVelocity(frameNumber: number): boolean {
    return column.isKeyFrame(this.name, 4, frameNumber);
  }

  /** Returns true if ANY subcolumn (X, Y, Z) has a keyframe at the given frame. */
  isKeyFrameAny(frameNumber: number): boolean {
    return (
      this.isKeyFrameX(frameNumber) ||
      this.isKeyFrameY(frameNumber) ||
      this.isKeyFrameZ(frameNumber)
    );
  }

  /** Returns true if ALL subcolumns (X, Y, Z) have a keyframe at the given frame. */
  isKeyFrameAll(frameNumber: number): boolean {
    return (
      this.isKeyFrameX(frameNumber) &&
      this.isKeyFrameY(frameNumber) &&
      this.isKeyFrameZ(frameNumber)
    );
  }

  toString(): string {
    return `PathColumn3D<${this.name}>`;
  }
}

/* ====================== NODES ====================== */
// class oNodeLayer {
//   displayOrder: number;
//   index: number;
//   nodePath: string;
//   name: string;

//   toString() {
//     return `NodeLayer<${this.nodePath}>`;
//   }

//   setEnabled(enabled: boolean) {
//     node.setEnable(this.nodePath, enabled);
//   }

//   isEnabled(): boolean {
//     return node.getEnable(this.nodePath);
//   }

//   constructor(displayOrder: number, index: number, nodePath: string, name: string) {
//     this.displayOrder = displayOrder;
//     this.index = index;
//     this.nodePath = nodePath;
//     this.name = name;
//   }

//   getAttributeNames(): string[] {
//     return node.getAllAttrNames(this.nodePath);
//   }

//   getAllAttributes(): Attribute[] {
//     var attributeNames = this.getAttributeKeywords();
//     var attributes = [];
//     for (let i = 0; i < attributeNames.length; i++) {
//       attributes.push(node.getAttr(this.nodePath, frame.current(), attributeNames[i]));
//     }
//     return attributes;
//   }

//   getAttributeKeywords(): string[] {
//     return node.getAllAttrKeywords(this.nodePath);
//   }

//   getEditableAttributes(): string[] {
//     function getAttributes(attribute, attributeList) {
//       attributeList.push(attribute);
//       var subAttrList = attribute.getSubAttributes();
//       for (var j = 0; j < subAttrList.length; ++j) {
//         if (typeof subAttrList[j].keyword() === 'undefined' || subAttrList[j].keyword().length == 0)
//           continue;
//         getAttributes(subAttrList[j], attributeList);
//       }
//     }

//     function getFullAttributeList(nodePath) {
//       var attributeList = [];
//       var topAttributeList = node.getAttrList(nodePath, 1);
//       for (var i = 0; i < topAttributeList.length; ++i) {
//         getAttributes(topAttributeList[i], attributeList);
//       }
//       return attributeList;
//     }

//     return getFullAttributeList(this.nodePath)
//       .filter((attr) => ['INT', 'DOUBLE'].indexOf(attr.typeName()) >= 0)
//       .map((attr) => attr.fullKeyword());
//   }

//   getColumn(
//     attrName: 'offset.attr3dpath',
//     linkType?: string,
//     createColumn?: boolean,
//   ): oPathColumn3D;
//   getColumn(
//     attrName: 'position.attr3dpath',
//     linkType?: string,
//     createColumn?: boolean,
//   ): oPathColumn3D;
//   getColumn(
//     attrName: 'DRAWING.ELEMENT',
//     linkType?: string,
//     createColumn?: boolean,
//   ): oDrawingElementColumn;
//   getColumn(attrName: string, linkType?: string, createColumn?: boolean): oColumn;
//   getColumn(attrName: string, linkType?: string, createColumn: boolean = true): oColumn {
//     if (attrName.indexOf('|') !== -1) {
//       const lastSlashIndex = attrName.lastIndexOf('|');
//       const path = attrName.substring(0, lastSlashIndex);
//       const node = LayerManager.getNodeLayer(this.nodePath + path);
//       if (node === null) {
//         throw new Error('Node not found for path: ' + this.nodePath + path);
//       }
//       const attributeName = attrName.substring(lastSlashIndex + 1);
//       return node.getColumn(attributeName, linkType);
//     }

//     const col = node.linkedColumn(this.nodePath, attrName);
//     if (!col) {
//       if (!createColumn) {
//         throw new Error(
//           "Column not found for attribute '" + attrName + "' on node '" + this.nodePath + "'.",
//         );
//       }
//       const colName = column.generateAnonymousName();
//       MessageLog.trace(
//         "⚠️ No column linked to attribute '" +
//           attrName +
//           "' on node '" +
//           this.nodePath +
//           "'. Creating new Bezier column: " +
//           colName,
//       );
//       column.add(colName, linkType ?? 'BEZIER');
//       var result = node.linkAttr(this.nodePath, attrName, colName);
//       if (!result) {
//         MessageLog.trace(
//           "❌ Failed to link new column '" +
//             colName +
//             "' to attribute '" +
//             attrName +
//             ' of type ' +
//             (linkType ?? 'BEZIER') +
//             "' on node '" +
//             this.nodePath +
//             "'.",
//         );
//       }
//       if (attrName === 'DRAWING.ELEMENT') {
//         return new oDrawingElementColumn(colName, this);
//       }
//       return new oColumn(colName, this);
//     }
//     if (attrName === 'offset.attr3dpath' || attrName === 'position.attr3dpath') {
//       return new oPathColumn3D(col, this);
//     }
//     if (attrName === 'DRAWING.ELEMENT') {
//       return new oDrawingElementColumn(col, this);
//     }
//     return new oColumn(col, this);
//   }

//   getType(): string {
//     return node.type(this.nodePath);
//   }

//   getFullAttributeList(): any[] {
//     function getAttributes(attribute: any, attributeList: any[]): void {
//       attributeList.push(attribute);
//       const subAttrList = attribute.getSubAttributes();
//       for (let j = 0; j < subAttrList.length; ++j) {
//         if (
//           typeof subAttrList[j].keyword() === 'undefined' ||
//           subAttrList[j].keyword().length === 0
//         ) {
//           continue;
//         }
//         getAttributes(subAttrList[j], attributeList);
//       }
//     }
//     const attributeList: any[] = [];
//     const topAttributeList = node.getAttrList(this.nodePath, frame.current());
//     for (let i = 0; i < topAttributeList.length; ++i) {
//       getAttributes(topAttributeList[i], attributeList);
//     }
//     return attributeList;
//   }

//   setAttribute(attrName: string, value: any): void {
//     const attr = node.getAttr(this.nodePath, frame.current(), attrName);
//     if (!attr) {
//       throw new Error("Attribute '" + attrName + "' not found on node '" + this.nodePath + "'.");
//     }
//     attr.setValue(value);
//   }

//   getChildren(): oNodeLayer[] {
//     if (!node.subNodes(this.nodePath)) {
//       return [];
//     }
//     return node
//       .subNodes(this.nodePath)
//       .map((childPath: string) => LayerManager.getNodeLayer(childPath))
//       .filter((layer): layer is oNodeLayer => layer !== null);
//   }

//   getLocked(): boolean {
//     return node.getLocked(this.nodePath);
//   }

//   setLocked(locked: boolean): void {
//     node.setLocked(this.nodePath, locked);
//   }

//   getChild(name: string): oNodeLayer | null {
//     if (name.indexOf('/') !== -1) {
//       return LayerManager.getNodeLayer(this.nodePath + '/' + name);
//     } else {
//       const childPath = node.subNodeByName(this.nodePath, name);
//       if (!childPath) {
//         return null;
//       }
//       return LayerManager.getNodeLayer(childPath);
//     }
//   }

//   getChildrenRecursive(): oNodeLayer[] {
//     const result: oNodeLayer[] = [];
//     const children = this.getChildren();
//     for (const child of children) {
//       result.push(child);
//       result.push(...child.getChildrenRecursive());
//     }
//     return result;
//   }

//   getParent(): oNodeLayer | null {
//     if (node.parentNode(this.nodePath) === node.root()) {
//       return null;
//     }
//     return LayerManager.getNodeLayer(node.parentNode(this.nodePath));
//   }

//   isGroup(): boolean {
//     return node.isGroup(this.nodePath);
//   }
// }

// class oDrawingNode extends oNodeLayer {
//   drawing = new oTextAttr(this.nodePath, 'DRAWING');
//   /** Position (OFFSET attribute, type POSITION_3D) */
//   position = new oPosition3D(this.nodePath, 'OFFSET');

//   scale = new oScale3D(this.nodePath);

//   /** The DRAWING.ELEMENT exposure column. Use setKeyFrame to set an exposure. */
//   get drawingElement(): oDrawingElementColumn {
//     return this.getColumn('DRAWING.ELEMENT');
//   }

//   getElement(): oElement {
//     return new oElement(node.getElementId(this.nodePath));
//   }

//   constructor(displayOrder: number, index: number, nodePath: string, name: string) {
//     super(displayOrder, index, nodePath, name);
//   }

//   getElementId(): number {
//     return node.getElementId(this.nodePath);
//   }

//   // pasteDuplicate(selection: oSelection, value: string) {
//   //   var folder = element.completeFolder(this.getElementId());
//   //   var folderName = element.folder(this.getElementId());
//   //   MessageLog.trace("folder: " + folder);
//   //   MessageLog.trace("folderName: " + folderName);
//   // }

//   createDrawing(baseName: string): string | null {
//     const uniqueName = this.getUniqueDrawingName(baseName);
//     if (!uniqueName) {
//       return null;
//     }

//     const colName = node.linkedColumn(this.nodePath, 'DRAWING.ELEMENT');
//     if (!colName) {
//       MessageLog.trace(`[Layers.ts] No DRAWING.ELEMENT column found on ${this.nodePath}`);
//       return null;
//     }

//     const result = column.createDrawing(colName, uniqueName);
//     MessageLog.trace(`[Layers.ts] createDrawing('${uniqueName}') -> ${result}`);
//     return result ? uniqueName : null;
//   }

//   getUniqueDrawingName(baseName: string) {
//     // 1. Fetch the element ID linked to the node
//     var elementId = node.getElementId(this.nodePath);
//     if (elementId === -1) {
//       System.println('Node not found or invalid element ID.');
//       return null;
//     }

//     var counter = 1;
//     var uniqueName = baseName + '_' + counter;

//     // 2. Query the database using the documentation's isExists method
//     // Keep incrementing the counter as long as the drawing name already exists
//     while (Drawing.isExists(elementId, uniqueName)) {
//       counter++;
//       uniqueName = baseName + '_' + counter;
//     }

//     return uniqueName;
//   }

//   toString() {
//     return `DrawingLayer<${this.nodePath}>`;
//   }
// }

function getAllNodesInScene() {
  var accumulatedNodes = [];

  // Recursive helper function to crawl nested group layers
  function crawlGroup(groupPath) {
    var subNodeCount = node.numberOfSubNodes(groupPath);

    for (var i = 0; i < subNodeCount; i++) {
      // Get the full path of the current child node
      var currentChild = node.subNode(groupPath, i);
      accumulatedNodes.push(currentChild);

      // If this child is a Group, recursively look inside it
      if (node.isGroup(currentChild)) {
        crawlGroup(currentChild);
      }
    }
  }

  // Start crawling from the absolute top layer ("Top")
  var absoluteRoot = node.root();
  crawlGroup(absoluteRoot);

  // Output findings to the Message Log
  // MessageLog.trace('--- total nodes found: ' + accumulatedNodes.length + ' ---');
  // for (var j = 0; j < accumulatedNodes.length; j++) {
  //   MessageLog.trace(accumulatedNodes[j]);
  // }

  return accumulatedNodes;
}

/* ====================== COLUMN GROUPING ====================== */

/**
 * Base class for grouping related oColumns together.
 * Provides shared utilities for checking keyframes and iterating over grouped columns.
 */
class columnGrouping {
  protected columns: oColumn[] = [];

  /** Add a column to this grouping. */
  addColumn(col: oColumn): void {
    this.columns.push(col);
  }

  /** Returns all columns in this grouping. */
  getColumns(): oColumn[] {
    return this.columns;
  }

  /** Returns true if ANY column in the group has a keyframe at the given frame. */
  isKeyFrameAny(frameNumber: number): boolean {
    for (const col of this.columns) {
      if (col.isKeyFrame(frameNumber)) return true;
    }
    return false;
  }

  /** Returns true if ALL columns in the group have a keyframe at the given frame. */
  isKeyFrameAll(frameNumber: number): boolean {
    if (this.columns.length === 0) return false;
    for (const col of this.columns) {
      if (!col.isKeyFrame(frameNumber)) return false;
    }
    return true;
  }

  /** Insert a keyframe on all grouped columns at the given frame. */
  insertKeyFrame(frameNumber: number): boolean {
    for (const col of this.columns) {
      if (!col.insertKeyFrame(frameNumber)) return false;
    }
    return true;
  }

  toString(): string {
    return `columnGrouping<${this.columns.map((c) => c.name).join(', ')}>`;
  }
}

/* ====================== COLOR COLUMN GROUPING ====================== */

/**
 * Groups the four RGBA colour columns and provides intuitive get/set methods.
 *
 * Accepts any ColorInput:
 *   cc.setColor(frame, "#FF8040");                           // alpha untouched
 *   cc.setColor(frame, { r: 255, g: 128, b: 64 });           // alpha untouched
 *   cc.setColor(frame, { r: 255, g: 128, b: 64, a: 128 });   // alpha set
 *   cc.setColor(frame, { h: 30, s: 75, v: 100 });             // alpha untouched
 *   cc.setColor(frame, new ColorObj("#FF8040"));              // alpha from ColorObj
 */

/* ====================== COLOR CARD NODE ====================== */

// use toonboom "func" namespace

// class oPegNode extends oNodeLayer {
//   /** Position (POSITION attribute, type POSITION_3D) — access .x, .y, .z or use .get() / .set(). */
//   position = is3DPath(this) ? return3DPath(this) : new oPosition3D(this.nodePath, 'POSITION');

//   /** Scale (SCALE_3D) — access .x, .y, .z or use .get() / .set(). */
//   scale = new oScale3D(this.nodePath);

//   /** Rotation (ROTATION_3D) — Euler angles via .x, .y, .z or .get() / .set(). */
//   rotation = new oRotation3D(this.nodePath);

//   constructor(displayOrder: number, index: number, nodePath: string, name: string) {
//     super(displayOrder, index, nodePath, name);
//     MessageLog.trace('oPegNode created for ' + this.nodePath);
//   }
// }

type NodeLayerInstance = {
  displayOrder: number;
  index: number;
  nodePath: string;
  name: string;
};

type NodeLayerConstructor = new (
  displayOrder: number,
  index: number,
  nodePath: string,
  name: string,
) => NodeLayerInstance;

function createPegNodeClass(Core: any) {
  var NodeLayer = Core.oNodeLayer as NodeLayerConstructor;

  class PegNode extends NodeLayer {
    position: any;
    scale: any;
    rotation: any;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);

      this.position = Core.LayerManager.is3DPath(this)
        ? Core.LayerManager.return3DPath(this)
        : new Core.oPosition3D(this.nodePath, 'POSITION');

      this.scale = new Core.oScale3D(this.nodePath);

      this.rotation = new Core.oRotation3D(this.nodePath);

      Core.MessageLog.trace('oPegNode created for ' + this.nodePath);
    }
  }

  return PegNode;
}
// /**
//  * Specialised oNodeLayer for COLOR_CARD nodes.
//  * Provides type-safe access to the RGBA colour columns instead of relying
//  * on generic getColumn() calls.
//  */
// class oColorCardNode extends oNodeLayer {
//   private _colorGrouping: columnGroupingColor | null = null;

//   constructor(displayOrder: number, index: number, nodePath: string, name: string) {
//     super(displayOrder, index, nodePath, name);
//   }

//   get color(): columnGroupingColor {
//     if (!this._colorGrouping) {
//       this._colorGrouping = columnGroupingColor.fromNode(this);
//     }
//     return this._colorGrouping;
//   }

//   getColor(frameNumber: number): ColorObj {
//     return this.color.getColor(frameNumber);
//   }
//   setColor(frameNumber: number, color: ColorInput): boolean {
//     return this.color.setColor(frameNumber, color);
//   }

//   toString() {
//     return `ColorCardNode<${this.nodePath}>`;
//   }
// }

// class _LayerManager {
//   nodeLayers: oNodeLayer[] = [];

//   constructor() {
//     this.updateNodeLayers();
//   }

//   updateNodeLayers(): void {
//     this.nodeLayers = [];

//     const timelineIndices: { [nodePath: string]: number } = {};
//     for (let timelineIndex = 0; timelineIndex < Timeline.numLayers; timelineIndex++) {
//       const nodePath = Timeline.layerToNode(timelineIndex);
//       if (nodePath) {
//         timelineIndices[nodePath] = timelineIndex;
//       }
//     }

//     const allNodes = getAllNodesInScene();
//     for (const nodePath of allNodes) {
//       const nodeType = node.type(nodePath);
//       const timelineIndex = timelineIndices[nodePath] ?? -1;
//       if (nodeType === 'COLOR_CARD') {
//         this.nodeLayers.push(
//           new oColorCardNode(
//             this.nodeLayers.length,
//             timelineIndex,
//             nodePath,
//             node.getName(nodePath),
//           ),
//         );
//       }
//       if (nodeType === 'PEG') {
//         this.nodeLayers.push(
//           new oPegNode(this.nodeLayers.length, timelineIndex, nodePath, node.getName(nodePath)),
//         );
//       }
//       if (nodeType === 'READ') {
//         this.nodeLayers.push(
//           new oDrawingNode(this.nodeLayers.length, timelineIndex, nodePath, node.getName(nodePath)),
//         );
//       } else {
//         this.nodeLayers.push(
//           new oNodeLayer(this.nodeLayers.length, timelineIndex, nodePath, node.getName(nodePath)),
//         );
//       }
//     }
//   }

//   getSelected(): oNodeLayer[] {
//     const selectedNodePaths = selection.selectedNodes();
//     const selected = selectedNodePaths
//       .map((nodePath: string) => this.getNodeLayer(nodePath))
//       .filter((layer): layer is oNodeLayer => layer !== null);

//     // Sort by displayOrder property
//     selected.sort((a, b) => a.displayOrder - b.displayOrder);
//     return selected;
//   }

//   getNodeLayers(): oNodeLayer[] {
//     return this.nodeLayers;
//   }

//   getNodeLayer(index: string | number): oNodeLayer | null {
//     for (var i = 0; i < this.nodeLayers.length; i++) {
//       if (typeof index === 'string') {
//         if (this.nodeLayers[i].nodePath === index) return this.nodeLayers[i];
//       } else {
//         if (this.nodeLayers[i].index === index) return this.nodeLayers[i];
//       }
//     }
//     return null;
//   }
// }

// const LayerManager = new _LayerManager();

// class _Selection {
//   getSelectedNodes(): oNodeLayer[] {
//     const selectedNodePaths = selection.selectedNodes();
//     return selectedNodePaths
//       .map((nodePath: string) => LayerManager.getNodeLayer(nodePath))
//       .filter((layer): layer is oNodeLayer => layer !== null);
//   }
// }

// const GlobalSelection = new _Selection();

function createColorCardNodeClass(Core: HarmonyCore) {
  var BaseNodeLayer = Core.oNodeLayer;

  function ColorCardNode(
    this: any,
    displayOrder: number,
    index: number,
    nodePath: string,
    name: string,
  ) {
    /*
     * Equivalent to:
     *
     * super(displayOrder, index, nodePath, name)
     */
    BaseNodeLayer.call(this, displayOrder, index, nodePath, name);

    this._colorGrouping = null;
  }

  /*
   * ES5 inheritance.
   */
  ColorCardNode.prototype = Object.create(BaseNodeLayer.prototype);

  ColorCardNode.prototype.constructor = ColorCardNode;

  /*
   * Equivalent to:
   *
   * get color()
   */
  Object.defineProperty(ColorCardNode.prototype, 'color', {
    get: function () {
      if (!this._colorGrouping) {
        this._colorGrouping = Core.columnGroupingColor.fromNode(this);
      }

      return this._colorGrouping;
    },

    enumerable: true,
    configurable: true,
  });

  ColorCardNode.prototype.getColor = function (frameNumber: number) {
    return this.color.getColor(frameNumber);
  };

  ColorCardNode.prototype.setColor = function (frameNumber: number, color: any) {
    return this.color.setColor(frameNumber, color);
  };

  ColorCardNode.prototype.toString = function () {
    return 'ColorCardNode<' + this.nodePath + '>';
  };

  return ColorCardNode;
}

function createColumnGroupingClass() {
  function ColumnGrouping(this: any) {
    this.columns = [];
  }

  ColumnGrouping.prototype.addColumn = function (col: any) {
    this.columns.push(col);
  };

  ColumnGrouping.prototype.getColumns = function () {
    return this.columns;
  };

  /*
   * Returns true if ANY column in the group
   * has a keyframe at the given frame.
   */
  ColumnGrouping.prototype.isKeyFrameAny = function (frameNumber: number) {
    for (var i = 0; i < this.columns.length; i++) {
      if (this.columns[i].isKeyFrame(frameNumber)) {
        return true;
      }
    }

    return false;
  };

  /*
   * Returns true if ALL columns in the group
   * have a keyframe at the given frame.
   */
  ColumnGrouping.prototype.isKeyFrameAll = function (frameNumber: number) {
    if (this.columns.length === 0) {
      return false;
    }

    for (var i = 0; i < this.columns.length; i++) {
      if (!this.columns[i].isKeyFrame(frameNumber)) {
        return false;
      }
    }

    return true;
  };

  /*
   * Insert a keyframe on all grouped columns.
   */
  ColumnGrouping.prototype.insertKeyFrame = function (frameNumber: number) {
    for (var i = 0; i < this.columns.length; i++) {
      if (!this.columns[i].insertKeyFrame(frameNumber)) {
        return false;
      }
    }

    return true;
  };

  ColumnGrouping.prototype.toString = function () {
    var names = [];

    for (var i = 0; i < this.columns.length; i++) {
      names.push(this.columns[i].name);
    }

    return 'columnGrouping<' + names.join(', ') + '>';
  };

  return ColumnGrouping;
}

/* ============================== */

function createNodeLayerClass(Core: HarmonyCore) {
  class NodeLayer {
    displayOrder: number;
    index: number;
    nodePath: string;
    name: string;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      this.displayOrder = displayOrder;

      this.index = index;

      this.nodePath = nodePath;

      this.name = name;
    }

    toString(): string {
      return 'NodeLayer<' + this.nodePath + '>';
    }

    setEnabled(enabled: boolean): void {
      Core.node.setEnable(this.nodePath, enabled);
    }

    isEnabled(): boolean {
      return Core.node.getEnable(this.nodePath);
    }

    getAttributeNames(): string[] {
      return Core.node.getAllAttrNames(this.nodePath);
    }

    getAllAttributes(): Attribute[] {
      var attributeNames = this.getAttributeKeywords();

      var attributes: Attribute[] = [];

      for (var i = 0; i < attributeNames.length; i++) {
        attributes.push(Core.node.getAttr(this.nodePath, Core.frame.current(), attributeNames[i]));
      }

      return attributes;
    }

    getAttributeKeywords(): string[] {
      return Core.node.getAllAttrKeywords(this.nodePath);
    }

    getColumn(attrName: 'offset.attr3dpath', linkType?: string, createColumn?: boolean): any;

    getColumn(attrName: 'position.attr3dpath', linkType?: string, createColumn?: boolean): any;

    getColumn(attrName: 'DRAWING.ELEMENT', linkType?: string, createColumn?: boolean): any;

    getColumn(attrName: string, linkType?: string, createColumn?: boolean): any;

    getColumn(attrName: string, linkType?: string, createColumn: boolean = true): any {
      if (attrName.indexOf('|') !== -1) {
        var lastSlashIndex = attrName.lastIndexOf('|');

        var path = attrName.substring(0, lastSlashIndex);

        var targetNode = Core.LayerManager.getNodeLayer(this.nodePath + path);

        if (targetNode === null) {
          throw new Error('Node not found for path: ' + this.nodePath + path);
        }

        var attributeName = attrName.substring(lastSlashIndex + 1);

        return targetNode.getColumn(attributeName, linkType);
      }

      var col = Core.node.linkedColumn(this.nodePath, attrName);

      if (!col) {
        if (!createColumn) {
          throw new Error(
            "Column not found for attribute '" + attrName + "' on node '" + this.nodePath + "'.",
          );
        }

        var colName = Core.column.generateAnonymousName();

        Core.MessageLog.trace(
          "No column linked to attribute '" +
            attrName +
            "' on node '" +
            this.nodePath +
            "'. Creating column: " +
            colName,
        );

        Core.column.add(colName, linkType !== undefined ? linkType : 'BEZIER');

        var result = Core.node.linkAttr(this.nodePath, attrName, colName);

        if (!result) {
          Core.MessageLog.trace(
            "Failed to link new column '" + colName + "' to attribute '" + attrName + "'.",
          );
        }

        if (attrName === 'DRAWING.ELEMENT') {
          return new Core.oDrawingElementColumn(colName, this);
        }

        return new Core.oColumn(colName, this);
      }

      if (attrName === 'offset.attr3dpath' || attrName === 'position.attr3dpath') {
        return new Core.oPathColumn3D(col, this);
      }

      if (attrName === 'DRAWING.ELEMENT') {
        return new Core.oDrawingElementColumn(col, this);
      }

      return new Core.oColumn(col, this);
    }

    getType(): string {
      return Core.node.type(this.nodePath);
    }

    getLocked(): boolean {
      return Core.node.getLocked(this.nodePath);
    }

    setLocked(locked: boolean): void {
      Core.node.setLocked(this.nodePath, locked);
    }

    getChildren(): any[] {
      var childPaths = Core.node.subNodes(this.nodePath);

      if (!childPaths) {
        return [];
      }

      return childPaths
        .map(function (childPath: string) {
          return Core.LayerManager.getNodeLayer(childPath);
        })
        .filter(function (layer: any) {
          return layer !== null;
        });
    }

    getChild(name: string): any {
      if (name.indexOf('/') !== -1) {
        return Core.LayerManager.getNodeLayer(this.nodePath + '/' + name);
      }

      var childPath = Core.node.subNodeByName(this.nodePath, name);

      if (!childPath) {
        return null;
      }

      return Core.LayerManager.getNodeLayer(childPath);
    }

    getChildrenRecursive(): any[] {
      var result: any[] = [];

      var children = this.getChildren();

      for (var i = 0; i < children.length; i++) {
        var child = children[i];

        result.push(child);

        var descendants = child.getChildrenRecursive();

        for (var j = 0; j < descendants.length; j++) {
          result.push(descendants[j]);
        }
      }

      return result;
    }

    getParent(): any {
      var parentPath = Core.node.parentNode(this.nodePath);

      if (parentPath === Core.node.root()) {
        return null;
      }

      return Core.LayerManager.getNodeLayer(parentPath);
    }

    isGroup(): boolean {
      return Core.node.isGroup(this.nodePath);
    }

    // Move your getEditableAttributes(),
    // getFullAttributeList(),
    // setAttribute(), etc. here too,
    // replacing node/frame with Core.node/Core.frame.
  }

  return NodeLayer;
}

function createDrawingNodeClass(Core: CoreRuntime) {
  /*
   * extends is resolved NOW, while the factory
   * is executing.
   */
  var NodeLayer = Core.oNodeLayer;

  class DrawingNode extends NodeLayer {
    drawing: any;
    position: any;
    scale: any;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);

      /*
       * Create these AFTER super(), once
       * this.nodePath has been assigned.
       */
      this.drawing = new Core.oTextAttr(this.nodePath, 'DRAWING');

      this.position = new Core.oPosition3D(this.nodePath, 'OFFSET');

      this.scale = new Core.oScale3D(this.nodePath);
    }

    get drawingElement(): any {
      return this.getColumn('DRAWING.ELEMENT');
    }

    getElement(): any {
      return new Core.oElement(Core.node.getElementId(this.nodePath));
    }

    getElementId(): number {
      return Core.node.getElementId(this.nodePath);
    }

    createDrawing(baseName: string): string | null {
      var uniqueName = this.getUniqueDrawingName(baseName);

      if (!uniqueName) {
        return null;
      }

      var colName = Core.node.linkedColumn(this.nodePath, 'DRAWING.ELEMENT');

      if (!colName) {
        Core.MessageLog.trace('[Layers.ts] No DRAWING.ELEMENT column found on ' + this.nodePath);

        return null;
      }

      var result = Core.column.createDrawing(colName, uniqueName);

      Core.MessageLog.trace("[Layers.ts] createDrawing('" + uniqueName + "') -> " + result);

      return result ? uniqueName : null;
    }

    getUniqueDrawingName(baseName: string): string | null {
      var elementId = Core.node.getElementId(this.nodePath);

      if (elementId === -1) {
        Core.System.println('Node not found or invalid element ID.');

        return null;
      }

      var counter = 1;

      var uniqueName = baseName + '_' + counter;

      while (Core.Drawing.isExists(elementId, uniqueName)) {
        counter++;

        uniqueName = baseName + '_' + counter;
      }

      return uniqueName;
    }

    toString(): string {
      return 'DrawingLayer<' + this.nodePath + '>';
    }
  }

  return DrawingNode;
}
