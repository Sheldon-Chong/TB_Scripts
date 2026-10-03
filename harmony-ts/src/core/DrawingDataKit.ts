interface XY {
  x: number;
  y: number;
}

enum DrawingArt {
  Underlay = 0,
  ColorArt = 1,
  LineArt = 2,
  Overlay = 3,
}

function createDrawingDataKit(Core: HarmonyCore) {
  var ALL_ARTS: DrawingArt[] = [
    DrawingArt.Underlay,
    DrawingArt.ColorArt,
    DrawingArt.LineArt,
    DrawingArt.Overlay,
  ];

  function cloneBezierPoint(point: BezierPoint): BezierPoint {
    var result: any = {};

    for (var key in point) {
      if (Core.Object.prototype.hasOwnProperty.call(point, key)) {
        result[key] = point[key];
      }
    }

    return result;
  }

  function transformArtStrokes(
    drawing: DrawingDescriptor,
    art: DrawingArt,
    transform: (point: BezierPoint) => BezierPoint,
    label?: string,
  ): void {
    Core.MessageLog.trace('[DrawingDataKit] Transforming art ' + art);

    var data = (Core.Drawing as any).query.getStrokes({ drawing: drawing, art: art });
    var modifiedStrokes: DrawingToolsModifyStroke[] = [];

    for (var i = 0; i < data.layers.length; i++) {
      var layer = data.layers[i];

      for (var j = 0; j < layer.strokes.length; j++) {
        var stroke = layer.strokes[j];
        var transformedPath: BezierPoint[] = [];

        for (var k = 0; k < stroke.path.length; k++) {
          transformedPath.push(transform(stroke.path[k]));
        }

        modifiedStrokes.push({
          layer: layer.index,
          strokeIndex: j,
          path: transformedPath,
        });
      }
    }

    if (modifiedStrokes.length === 0) {
      return;
    }

    (Core.DrawingTools as any).modifyStrokes({
      drawing: drawing,
      art: art,
      label: label || 'Transform Drawing',
      strokes: modifiedStrokes,
    });
  }

  var query = {
    evaluateStrokes(arg: EvaluateStrokesArguments): StrokeEvaluation[] {
      return (Core.Drawing as any).query.evaluateStrokes(arg);
    },

    getBox(args: DrawingQueryBasicArguments): DrawingBoundingBox | EmptyDrawingResult {
      return (Core.Drawing as any).query.getBox(args);
    },

    getClosestPoint(args: GetClosestPointArguments): ClosestDrawingPoint[] {
      return (Core.Drawing as any).query.getClosestPoint(args);
    },

    getData(args: DrawingQueryDataArguments): DrawingQueryData {
      return (Core.Drawing as any).query.getData(args);
    },

    getIntersections(args: GetIntersectionsArguments): DrawingIntersectionGroup[] {
      return (Core.Drawing as any).query.getIntersections(args);
    },

    getLayerStrokes(args: GetLayerStrokesArguments): DrawingStrokesResult {
      return (Core.Drawing as any).query.getLayerStrokes(args);
    },

    getNumberOfLayers(args: DrawingQueryBasicArguments): number {
      return (Core.Drawing as any).query.getNumberOfLayers(args);
    },

    getStrokes(args: DrawingQueryBasicArguments): DrawingStrokesResult {
      Core.MessageLog.trace('[DrawingDataKit] Querying strokes');
      return (Core.Drawing as any).query.getStrokes(args);
    },
  };

  var DrawingDataKit = {
    query: query,

    cloneBezierPoint: cloneBezierPoint,

    transformDrawingStrokes(
      drawing: DrawingDescriptor,
      transform: (point: BezierPoint) => BezierPoint,
      label?: string,
      art?: DrawingArt,
    ): void {
      if (art !== undefined) {
        transformArtStrokes(drawing, art, transform, label);
        return;
      }

      for (var i = 0; i < ALL_ARTS.length; i++) {
        transformArtStrokes(drawing, ALL_ARTS[i], transform, label);
      }
    },

    translateDrawingStrokes(drawing: DrawingDescriptor, offset: XY, art?: DrawingArt): void {
      this.transformDrawingStrokes(
        drawing,
        function (point: BezierPoint): BezierPoint {
          var result = cloneBezierPoint(point);
          result.x = point.x + offset.x;
          result.y = point.y + offset.y;
          return result;
        },
        'Translate Drawing',
        art,
      );
    },

    scaleDrawingStrokes(drawing: DrawingDescriptor, scale: XY, pivot: XY, art?: DrawingArt): void {
      this.transformDrawingStrokes(
        drawing,
        function (point: BezierPoint): BezierPoint {
          var result = cloneBezierPoint(point);
          result.x = pivot.x + (point.x - pivot.x) * scale.x;
          result.y = pivot.y + (point.y - pivot.y) * scale.y;
          return result;
        },
        'Scale Drawing',
        art,
      );
    },

    rotateDrawingStrokes(
      drawing: DrawingDescriptor,
      angleDegrees: number,
      pivot: XY,
      art?: DrawingArt,
    ): void {
      var radians = (angleDegrees * Math.PI) / 180;
      var cos = Math.cos(radians);
      var sin = Math.sin(radians);

      this.transformDrawingStrokes(
        drawing,
        function (point: BezierPoint): BezierPoint {
          var result = cloneBezierPoint(point);
          var x = point.x - pivot.x;
          var y = point.y - pivot.y;
          result.x = pivot.x + x * cos - y * sin;
          result.y = pivot.y + x * sin + y * cos;
          return result;
        },
        'Rotate Drawing',
        art,
      );
    },
  };

  return DrawingDataKit;
}

type DrawingDataKitType = ReturnType<typeof createDrawingDataKit>;

function getDrawingDataKit(Core: HarmonyCore): DrawingDataKitType {
  var Runtime: any = Core;

  if (!Runtime.DrawingDataKit) {
    Runtime.DrawingDataKit = createDrawingDataKit(Core);
  }

  return Runtime.DrawingDataKit as DrawingDataKitType;
}
