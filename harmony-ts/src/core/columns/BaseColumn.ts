function createColumnClass(Core: HarmonyCore) {
  class Column {
    name: string;
    parent: any;

    constructor(name: string, parentLayer: any) {
      this.name = name;
      this.parent = parentLayer;
    }

    getType(): string {
      return Core.column.type(this.name);
    }

    getKeyframe(frameNumber: number): any {
      return Core.column.getEntry(this.name, 1, frameNumber);
    }

    toString(): string {
      return 'Column<' + this.name + '>';
    }

    insertKeyFrame(frameNumber: number): boolean {
      return Core.column.setKeyFrame(this.name, frameNumber);
    }

    deleteKeyframes(selection: any): void {
      for (var frame = selection.startFrame; frame <= selection.endFrame; frame++) {
        Core.column.clearKeyFrame(this.name, frame);
      }
    }

    getKeyframeRange(startOrSelection: number | any, endFrame?: number): any[] {
      var startFrame: number;

      if (typeof startOrSelection === 'number') {
        if (endFrame === undefined) {
          throw new Error('endFrame is required when startFrame is provided');
        }

        startFrame = startOrSelection;
      } else {
        startFrame = startOrSelection.startFrame;

        endFrame = startOrSelection.endFrame;
      }

      var values = [];

      for (var frame = startFrame; frame <= endFrame; frame++) {
        values.push(this.getKeyframe(frame));
      }

      return values;
    }

    getKeyframeRangeSimplify(startOrSelection: number | any, endFrame?: number): string[] | string {
      var startFrame: number;

      if (typeof startOrSelection === 'number') {
        if (endFrame === undefined) {
          throw new Error('endFrame is required when startFrame is provided');
        }

        startFrame = startOrSelection;
      } else {
        startFrame = startOrSelection.startFrame;

        endFrame = startOrSelection.endFrame;
      }

      var values: string[] = [];

      for (var frame = startFrame; frame <= endFrame; frame++) {
        values.push(this.getKeyframe(frame));
      }

      if (values.length > 0) {
        var firstValue = values[0];

        var allSame = true;

        for (var i = 1; i < values.length; i++) {
          if (values[i] !== firstValue) {
            allSame = false;
            break;
          }
        }

        if (allSame) {
          return firstValue;
        }
      }

      return values;
    }

    getMostCommonKeyframeFromRange(selection: any): string | null {
      var values = this.getKeyframeRange(selection);

      var valueCounts: {
        [key: string]: number;
      } = {};

      var mostCommonValue: string | null = null;

      var highestCount = 0;

      for (var i = 0; i < values.length; i++) {
        var value = values[i];

        var key = String(value);

        if (valueCounts[key] !== undefined) {
          valueCounts[key]++;
        } else {
          valueCounts[key] = 1;
        }

        if (valueCounts[key] > highestCount) {
          highestCount = valueCounts[key];

          mostCommonValue = value;
        }
      }

      return mostCommonValue;
    }

    setKeyFrame(frameNumber: number, value: any, endFrame?: number): boolean;

    setKeyFrame(selection: any, value: any): boolean;

    setKeyFrame(startOrSelection: number | any, value: any, endFrame?: number): boolean {
      var startFrame: number;
      var endFrameLocal: number;

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

      for (var frame = startFrame; frame <= endFrameLocal; frame++) {
        var status = Core.column.setEntry(this.name, 1, frame, value.toString());

        if (!status) {
          return false;
        }
      }

      return true;
    }

    loopKeyframes(sourceSelection: any, pasteSelection: any): boolean {
      if (sourceSelection.endFrame < sourceSelection.startFrame) {
        return false;
      }

      if (pasteSelection.endFrame < pasteSelection.startFrame) {
        return false;
      }

      var sourceLength = sourceSelection.endFrame - sourceSelection.startFrame + 1;

      var sourceValues = [];

      for (
        var sourceFrame = sourceSelection.startFrame;
        sourceFrame <= sourceSelection.endFrame;
        sourceFrame++
      ) {
        sourceValues.push(this.getKeyframe(sourceFrame));
      }

      for (
        var destinationFrame = pasteSelection.startFrame;
        destinationFrame <= pasteSelection.endFrame;
        destinationFrame++
      ) {
        var sourceIndex = (destinationFrame - pasteSelection.startFrame) % sourceLength;

        var sourceValue = sourceValues[sourceIndex];

        if (!this.pasteLoopKeyframe(sourceValue, destinationFrame)) {
          return false;
        }
      }

      return true;
    }

    protected pasteLoopKeyframe(sourceValue: any, destinationFrame: number): boolean {
      return this.setKeyFrame(destinationFrame, sourceValue);
    }

    isKeyFrame(frameNumber: number): boolean {
      return Core.column.isKeyFrame(this.name, 0, frameNumber);
    }
  }

  return Column;
}
