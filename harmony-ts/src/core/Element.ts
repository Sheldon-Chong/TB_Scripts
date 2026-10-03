include('FileUtils.js');

// class oElement {
//   readonly id: number;
//   associatedNode?: oNodeLayer;

//   constructor(elementId: number, associatedNode?: oNodeLayer) {
//     this.id = elementId;
//     this.associatedNode = associatedNode;
//   }

//   // Basic element information

//   get name(): string {
//     return element.getNameById(this.id);
//   }

//   get scanType(): string {
//     return element.scanType(this.id);
//   }

//   get fieldChart(): number {
//     return element.fieldChart(this.id);
//   }

//   get vectorType(): number {
//     return element.vectorType(this.id);
//   }

//   get pixmapFormat(): string {
//     return element.pixmapFormat(this.id);
//   }

//   get folder(): string {
//     return element.folder(this.id);
//   }

//   get completeFolder(): string {
//     return element.completeFolder(this.id);
//   }

//   get physicalName(): string {
//     return element.physicalName(this.id);
//   }

//   // Element management

//   modify(scanType: string, fieldChart: number, pixmapFormat: string, vectorType: number): boolean {
//     return element.modify(this.id, scanType, fieldChart, pixmapFormat, vectorType);
//   }

//   rename(name: string): boolean {
//     return element.renameById(this.id, name);
//   }

//   remove(deleteDiskFile = false): boolean {
//     return element.remove(this.id, deleteDiskFile);
//   }

//   // Drawings

//   getDrawings(): string[] {
//     const drawings: string[] = [];

//     for (let i = 0; i < Drawing.numberOf(this.id); i++) {
//       drawings.push(Drawing.name(this.id, i));
//     }
//     return drawings;
//   }

//   exists(drawingName: string): boolean {
//     const path = `${this.completeFolder}/${this.name}-${drawingName}.tvg`;
//     MessageLog.trace(`[Element.ts] ${path}`);
//     return exists(path);
//   }

//   registered(drawingName: string): boolean {
//     return Drawing.isExists(this.id, drawingName);
//   }

//   getDrawing(drawingName: string): oDrawing | null {
//     if (!this.registered(drawingName)) {
//       return null;
//     }

//     return new oDrawing(drawingName, this);
//   }

//   generateUniqueDrawingName(baseName: string): string {
//     let name = baseName;
//     let counter = 1;

//     while (this.registered(name)) {
//       name = `${baseName}_${counter}`;
//       counter++;
//     }

//     return name;
//   }

//   /**
//    * Duplicates a drawing in the element.
//    *
//    * @param baseName The name of the new drawing.
//    * @param sourceDrawingName The name of the source drawing.
//    * @returns The new drawing or null if it failed to create.
//    */
//   duplicateDrawing(baseName: string, sourceDrawingName: string): oDrawing | null {
//     const uniqueName = this.generateUniqueDrawingName(baseName);
//     return this.copyDrawing(sourceDrawingName, uniqueName);
//   }

//   constructDrawingPath(drawingName: string): string {
//     return `${this.completeFolder}/${this.name}-${drawingName}.tvg`;
//   }

//   copyDrawing(
//     sourceDrawingName: string,
//     destinationDrawingName: string,
//     override: boolean = false,
//   ): oDrawing | null {
//     if (!this.exists(sourceDrawingName)) {
//       throw new Error(
//         `Source drawing '${sourceDrawingName}' does not exist in element '${this.name}'.`,
//       );
//     }

//     const sourcePath = Drawing.filename(this.id, sourceDrawingName);
//     const destinationPath = this.constructDrawingPath(destinationDrawingName);
//     if (!override && (this.registered(destinationDrawingName) || exists(destinationPath))) {
//       MessageLog.trace('File already exists at destination path: ' + destinationPath);
//       throw new Error(
//         `Destination drawing '${destinationDrawingName}' already exists in element '${this.name}'.`,
//       );
//     }

//     const result = Drawing.create(this.id, destinationDrawingName, true, true);

//     if (!copyFile(sourcePath, destinationPath)) {
//       throw new Error(`Failed to copy drawing from '${sourcePath}' to '${destinationPath}'.`);
//     }

//     return new oDrawing(destinationDrawingName, this);
//   }

//   revealInFileExplorer(): boolean {
//     return openInFileExplorer(this.completeFolder);
//   }

//   toString(): string {
//     return `Element<${this.id}:${this.name}>`;
//   }
// }

function createElementClass(Core: CoreRuntime) {
  function Element(this: any, elementId: number, associatedNode?: any) {
    this.id = elementId;
    this.associatedNode = associatedNode;
  }

  /*
   * Basic element information
   */

  Object.defineProperty(Element.prototype, 'name', {
    get: function () {
      return Core.element.getNameById(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'scanType', {
    get: function () {
      return Core.element.scanType(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'fieldChart', {
    get: function () {
      return Core.element.fieldChart(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'vectorType', {
    get: function () {
      return Core.element.vectorType(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'pixmapFormat', {
    get: function () {
      return Core.element.pixmapFormat(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'folder', {
    get: function () {
      return Core.element.folder(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'completeFolder', {
    get: function () {
      return Core.element.completeFolder(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(Element.prototype, 'physicalName', {
    get: function () {
      return Core.element.physicalName(this.id);
    },

    enumerable: true,
    configurable: true,
  });

  /*
   * Element management
   */

  Element.prototype.modify = function (
    scanType: string,
    fieldChart: number,
    pixmapFormat: string,
    vectorType: number,
  ) {
    return Core.element.modify(this.id, scanType, fieldChart, pixmapFormat, vectorType);
  };

  Element.prototype.rename = function (name: string) {
    return Core.element.renameById(this.id, name);
  };

  Element.prototype.remove = function (deleteDiskFile?: boolean) {
    if (deleteDiskFile === undefined) {
      deleteDiskFile = false;
    }

    return Core.element.remove(this.id, deleteDiskFile);
  };

  /*
   * Drawings
   */

  Element.prototype.getDrawings = function () {
    var drawings = [];

    for (var i = 0; i < Core.Drawing.numberOf(this.id); i++) {
      drawings.push(Core.Drawing.name(this.id, i));
    }

    return drawings;
  };

  Element.prototype.exists = function (drawingName: string) {
    var path = this.completeFolder + '/' + this.name + '-' + drawingName + '.tvg';

    Core.MessageLog.trace('[Element.ts] ' + path);

    return Core.FileUtils.exists(path);
  };

  Element.prototype.registered = function (drawingName: string) {
    return Core.Drawing.isExists(this.id, drawingName);
  };

  Element.prototype.getDrawing = function (drawingName: string) {
    if (!this.registered(drawingName)) {
      return null;
    }

    return new Core.oDrawing(drawingName, this);
  };

  Element.prototype.generateUniqueDrawingName = function (baseName: string) {
    var name = baseName;

    var counter = 1;

    while (this.registered(name)) {
      name = baseName + '_' + counter;

      counter++;
    }

    return name;
  };

  Element.prototype.duplicateDrawing = function (baseName: string, sourceDrawingName: string) {
    var uniqueName = this.generateUniqueDrawingName(baseName);

    return this.copyDrawing(sourceDrawingName, uniqueName);
  };

  Element.prototype.constructDrawingPath = function (drawingName: string) {
    return this.completeFolder + '/' + this.name + '-' + drawingName + '.tvg';
  };

  Element.prototype.copyDrawing = function (
    sourceDrawingName: string,
    destinationDrawingName: string,
    override?: boolean,
  ) {
    if (override === undefined) {
      override = false;
    }

    if (!this.exists(sourceDrawingName)) {
      throw new Error(
        "Source drawing '" + sourceDrawingName + "' does not exist in element '" + this.name + "'.",
      );
    }

    var sourcePath = Core.Drawing.filename(this.id, sourceDrawingName);

    var destinationPath = this.constructDrawingPath(destinationDrawingName);

    if (
      !override &&
      (this.registered(destinationDrawingName) || Core.FileUtils.exists(destinationPath))
    ) {
      Core.MessageLog.trace('File already exists at destination path: ' + destinationPath);

      throw new Error(
        "Destination drawing '" +
          destinationDrawingName +
          "' already exists in element '" +
          this.name +
          "'.",
      );
    }

    Core.Drawing.create(this.id, destinationDrawingName, true, true);

    if (!Core.Utils.copyFile(sourcePath, destinationPath)) {
      throw new Error(
        "Failed to copy drawing from '" + sourcePath + "' to '" + destinationPath + "'.",
      );
    }

    return new Core.oDrawing(destinationDrawingName, this);
  };

  Element.prototype.revealInFileExplorer = function () {
    return Core.Utils.openInFileExplorer(this.completeFolder);
  };

  Element.prototype.toString = function () {
    return 'Element<' + this.id + ':' + this.name + '>';
  };

  return Element;
}
