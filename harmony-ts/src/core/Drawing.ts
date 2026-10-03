function createDrawingClass(Core: CoreRuntime) {
  class Drawing {
    name: string;
    element: any;
    fullPath: string;

    constructor(name: string, element: any) {
      this.element = element;
      this.name = name;
    }

    toString(): string {
      return 'Drawing<' + this.element.folder + '-' + this.name + '.tvg>';
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
      return Core.Drawing.filename(this.element.id, this.name);
    }

    get filename(): string {
      return this.filepath.substring(this.filepath.lastIndexOf('/') + 1);
    }

    duplicate(destFileName?: string, override: boolean = false): any {
      var drawingName = destFileName || this.name;
      return this.element.duplicateDrawing(drawingName, this.name);
    }
  }

  return Drawing;
}

type DrawingClass = ReturnType<typeof createDrawingClass>;
