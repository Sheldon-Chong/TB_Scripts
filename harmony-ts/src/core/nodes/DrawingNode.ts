function createDrawingNodeClass(Core: CoreRuntime) {
  var NodeLayer = Core.oBaseNode;

  class DrawingNode extends NodeLayer {
    drawing: any;
    position: any;
    scale: any;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);
      this.drawing = new Core.oTextAttr(this.nodePath, 'DRAWING');
      this.position = new Core.oPosition3D(this.nodePath, 'OFFSET');
      this.scale = new Core.oScale3D(this.nodePath);
    }

    get drawingElement(): CoreInstance<'oDrawingElementColumn'> {
      return this.getColumn('DRAWING.ELEMENT');
    }

    getElement():CoreInstance<'oElement'> {
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
        Core.MessageLog.trace('[DrawingNode] No DRAWING.ELEMENT column found on ' + this.nodePath);
        return null;
      }

      var result = Core.column.createDrawing(colName, uniqueName);
      Core.MessageLog.trace("[DrawingNode] createDrawing('" + uniqueName + "') -> " + result);
      return result ? uniqueName : null;
    }

    getUniqueDrawingName(baseName: string): string | null {
      var elementId = Core.node.getElementId(this.nodePath);

      if (elementId === -1) {
        Core.MessageLog.trace('Node not found or invalid element ID.');
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
