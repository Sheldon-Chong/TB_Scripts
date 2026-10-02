include('FileUtils.js');

class oElement {
  readonly id: number;
  associatedNode?: oNodeLayer;

  constructor(elementId: number, associatedNode?: oNodeLayer) {
    this.id = elementId;
    this.associatedNode = associatedNode;
  }

  // Basic element information

  get name(): string {
    return element.getNameById(this.id);
  }

  get scanType(): string {
    return element.scanType(this.id);
  }

  get fieldChart(): number {
    return element.fieldChart(this.id);
  }

  get vectorType(): number {
    return element.vectorType(this.id);
  }

  get pixmapFormat(): string {
    return element.pixmapFormat(this.id);
  }

  get folder(): string {
    return element.folder(this.id);
  }

  get completeFolder(): string {
    return element.completeFolder(this.id);
  }

  get physicalName(): string {
    return element.physicalName(this.id);
  }

  // Element management

  modify(scanType: string, fieldChart: number, pixmapFormat: string, vectorType: number): boolean {
    return element.modify(this.id, scanType, fieldChart, pixmapFormat, vectorType);
  }

  rename(name: string): boolean {
    return element.renameById(this.id, name);
  }

  remove(deleteDiskFile = false): boolean {
    return element.remove(this.id, deleteDiskFile);
  }

  // Drawings

  getDrawings(): string[] {
    const drawings: string[] = [];

    for (let i = 0; i < Drawing.numberOf(this.id); i++) {
      drawings.push(Drawing.name(this.id, i));
    }
    return drawings;
  }

  exists(drawingName: string): boolean {
    const path = `${this.completeFolder}/${this.name}-${drawingName}.tvg`;
    MessageLog.trace(`[Element.ts] ${path}`);
    return exists(path);
  }

  registered(drawingName: string): boolean {
    return Drawing.isExists(this.id, drawingName);
  }

  getDrawing(drawingName: string): oDrawing | null {
    if (!this.registered(drawingName)) {
      return null;
    }

    return new oDrawing(drawingName, this);
  }

  generateUniqueDrawingName(baseName: string): string {
    let name = baseName;
    let counter = 1;

    while (this.registered(name)) {
      name = `${baseName}_${counter}`;
      counter++;
    }

    return name;
  }

  /**
   * Duplicates a drawing in the element.
   *
   * @param baseName The name of the new drawing.
   * @param sourceDrawingName The name of the source drawing.
   * @returns The new drawing or null if it failed to create.
   */
  duplicateDrawing(baseName: string, sourceDrawingName: string): oDrawing | null {
    const uniqueName = this.generateUniqueDrawingName(baseName);
    return this.copyDrawing(sourceDrawingName, uniqueName);
  }

  copyDrawing(
    sourceDrawingName: string,
    destinationDrawingName: string,
    override: boolean = false,
  ): oDrawing | null {
    if (!this.exists(sourceDrawingName)) {
      throw new Error(
        `Source drawing '${sourceDrawingName}' does not exist in element '${this.name}'.`,
      );
    }

    const sourcePath = Drawing.filename(this.id, sourceDrawingName);
    const destinationPath = `${this.completeFolder}/${this.name}-${destinationDrawingName}.tvg`;
    if (!override && (this.registered(destinationDrawingName) || exists(destinationPath))) {
      MessageLog.trace('File already exists at destination path: ' + destinationPath);
      return null;
    }

    const result = Drawing.create(this.id, destinationDrawingName, true, true);

    if (!copyFile(sourcePath, destinationPath)) {
      return null;
    }

    return new oDrawing(destinationDrawingName, this);
  }

  revealInFileExplorer(): boolean {
    return openInFileExplorer(this.completeFolder);
  }

  toString(): string {
    return `Element<${this.id}:${this.name}>`;
  }
}
