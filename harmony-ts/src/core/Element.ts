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
    return Drawing.isExists(this.id, drawingName);
  }

  getDrawing(drawingName: string): oDrawing | null {
    if (!this.exists(drawingName)) {
      return null;
    }

    return new oDrawing(drawingName, this);
  }

  generateUniqueDrawingName(baseName: string): string {
    let name = baseName;
    let counter = 1;

    while (this.exists(name)) {
      name = `${baseName}_${counter}`;
      counter++;
    }

    return name;
  }

  revealInFileExplorer(): boolean {
    return openInFileExplorer(this.completeFolder);
  }

  toString(): string {
    return `Element<${this.id}:${this.name}>`;
  }
}
