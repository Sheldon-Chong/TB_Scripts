function createDrawingElementColumnClass(Core: any) {
  var BaseColumn = Core.oColumn;

  class DrawingElementColumn extends BaseColumn {
    element: any;

    constructor(name: string, parentLayer: any) {
      Core.MessageLog.trace('name ' + name);

      Core.MessageLog.trace('name ' + Core.column.getEntry(name, 1, Core.frame.current()));

      super(name, parentLayer);

      this.element = new Core.oElement(Core.node.getElementId(parentLayer.nodePath));
    }

    getKeyframe(frameNumber: number): any {
      var drawingName = super.getKeyframe(frameNumber);

      if (drawingName === '') {
        return null;
      }

      return new Core.oDrawing(drawingName, this.element);
    }

    setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;

    setKeyFrame(selection: any, value: any): boolean;

    setKeyFrame(startOrSelection: any, value: any, endFrame?: number): boolean {
      if (value instanceof Core.oDrawing) {
        return super.setKeyFrame(startOrSelection, value.name, endFrame);
      }

      return super.setKeyFrame(startOrSelection, value, endFrame);
    }

    protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
      var drawing = sourceValue;

      if (!drawing) {
        return super.setKeyFrame(destinationFrame, '');
      }

      var copiedDrawing = drawing.duplicate();

      if (!copiedDrawing) {
        return false;
      }

      return super.setKeyFrame(destinationFrame, copiedDrawing.name);
    }

    copyDrawingRangeTo(selection: any, destFrame: number): boolean {
      /*
       * Core.TimelineKit is intentionally looked up
       * when this method runs.
       *
       * It does not need to exist yet when this class
       * factory is created.
       */
      var pasteSelection = new Core.TimelineKit.oSelection(
        destFrame,

        destFrame + selection.endFrame - selection.startFrame,
      );

      return this.loopKeyframes(selection, pasteSelection);
    }

    copyDrawingTo(drawing: any, destFrame: number): boolean {
      var copiedDrawing = drawing.duplicate();

      if (!copiedDrawing) {
        Core.MessageLog.trace('Failed to copy drawing for duplication.');

        return false;
      }

      return this.setKeyFrame(destFrame, copiedDrawing.name);
    }
  }

  return DrawingElementColumn;
}
