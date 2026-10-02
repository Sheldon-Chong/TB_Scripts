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

namespace DrawingDataKit {
  const ALL_ARTS: DrawingArt[] = [
    DrawingArt.Underlay,
    DrawingArt.ColorArt,
    DrawingArt.LineArt,
    DrawingArt.Overlay,
  ];

  export function cloneBezierPoint(point: BezierPoint): BezierPoint {
    const result: any = {};

    for (const key in point) {
      if (point.hasOwnProperty(key)) {
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
    MessageLog.trace('ok');
    MessageLog.trace(`[DrawingDataKit.ts] >>> ${Drawing}`);
    const data = (G.Drawing as any).query.getStrokes({
      drawing: drawing,
      art: art,
    });

    const modifiedStrokes: DrawingToolsModifyStroke[] = [];

    for (let i = 0; i < data.layers.length; i++) {
      const layer = data.layers[i];

      for (let j = 0; j < layer.strokes.length; j++) {
        const stroke = layer.strokes[j];
        const transformedPath: BezierPoint[] = [];

        for (let k = 0; k < stroke.path.length; k++) {
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

    (G.DrawingTools as any).modifyStrokes({
      drawing: drawing,
      art: art,
      label: label || 'Transform Drawing',
      strokes: modifiedStrokes,
    });
  }

  export function transformDrawingStrokes(
    drawing: DrawingDescriptor,
    transform: (point: BezierPoint) => BezierPoint,
    label?: string,
    art?: DrawingArt,
  ): void {
    if (art !== undefined) {
      transformArtStrokes(drawing, art, transform, label);

      return;
    }

    for (let i = 0; i < ALL_ARTS.length; i++) {
      transformArtStrokes(drawing, ALL_ARTS[i], transform, label);
    }
  }

  export function translateDrawingStrokes(
    drawing: DrawingDescriptor,
    offset: XY,
    art?: DrawingArt,
  ): void {
    transformDrawingStrokes(
      drawing,
      function (point: BezierPoint): BezierPoint {
        const result = cloneBezierPoint(point);

        result.x = point.x + offset.x;
        result.y = point.y + offset.y;

        return result;
      },
      'Translate Drawing',
      art,
    );
  }

  export function scaleDrawingStrokes(
    drawing: DrawingDescriptor,
    scale: XY,
    pivot: XY,
    art?: DrawingArt,
  ): void {
    transformDrawingStrokes(
      drawing,
      function (point: BezierPoint): BezierPoint {
        const result = cloneBezierPoint(point);

        result.x = pivot.x + (point.x - pivot.x) * scale.x;

        result.y = pivot.y + (point.y - pivot.y) * scale.y;

        return result;
      },
      'Scale Drawing',
      art,
    );
  }

  export function rotateDrawingStrokes(
    drawing: DrawingDescriptor,
    angleDegrees: number,
    pivot: XY,
    art?: DrawingArt,
  ): void {
    const radians = (angleDegrees * Math.PI) / 180;

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    transformDrawingStrokes(
      drawing,
      function (point: BezierPoint): BezierPoint {
        const result = cloneBezierPoint(point);

        const x = point.x - pivot.x;
        const y = point.y - pivot.y;

        result.x = pivot.x + x * cos - y * sin;

        result.y = pivot.y + x * sin + y * cos;

        return result;
      },
      'Rotate Drawing',
      art,
    );
  }
}
