function createColorCardNodeClass(Core: CoreRuntime) {
  var BaseNodeLayer = Core.oBaseNode!;

  class ColorCardNode extends BaseNodeLayer {
    private _colorGrouping: any;

    constructor(displayOrder: number, index: number, nodePath: string, name: string) {
      super(displayOrder, index, nodePath, name);

      this._colorGrouping = null;
    }

    get color(): any {
      if (!this._colorGrouping) {
        this._colorGrouping = Core.columnGroupingColor!.fromNode(this);
      }

      return this._colorGrouping;
    }

    getColor(frameNumber: number): any {
      return this.color.getColor(frameNumber);
    }

    setColor(frameNumber: number, color: any): any {
      return this.color.setColor(frameNumber, color);
    }

    toString(): string {
      return 'ColorCardNode<' + this.nodePath + '>';
    }
  }

  return ColorCardNode;
}
