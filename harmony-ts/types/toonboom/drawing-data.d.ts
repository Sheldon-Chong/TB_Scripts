
interface DrawingDescriptor {
  node: string;
  frame: number;
}

interface DrawingPoint {
  x: number;
  y: number;
}

/**
 * A point in a Harmony Bezier path.
 *
 * The documentation only guarantees x/y in these examples, while some
 * returned paths may additionally contain Bezier-specific information.
 */
interface BezierPoint {
  x: number;
  y: number;

  onCurve?: boolean;

  [key: string]: any;
}

interface BezierContour {
  polygon?: boolean;
  path: BezierPoint[];
  holes?: BezierPoint[][];
}

interface DrawingToolsBaseOptions {
  drawing: DrawingDescriptor;
  art: DrawingArt;
  label?: string;
}

interface DrawingToolsShader {
  colorId: string;

  /**
   * Leave open for shader properties not documented on this page.
   */
  [key: string]: any;
}

interface DrawingToolsContour {
  /**
   * If true, the contour is a polygon.
   * If false or omitted, it is a Bezier path.
   */
  polygon?: boolean;

  /**
   * Create the contour as though it were created with the Stroke Tool.
   */
  stroke?: boolean;

  /**
   * If greater than 0, creates the contour using a Pencil line.
   */
  thickness?: number;

  /** Pencil color used to trace the contour. */
  pencilColorId?: string;

  /** Fill color ID. */
  colorId?: string;

  /** Contour geometry. */
  path?: BezierPoint[];
}

interface DrawingToolsStroke {
  /** Index into the layer's shaders array for the left side. */
  shaderLeft?: number;

  /** Index into the layer's shaders array for the right side. */
  shaderRight?: number;

  /**
   * Whether this geometry should be treated as a stroke.
   */
  stroke?: boolean;

  pencilColorId?: string;
  thickness?: number;

  polygon?: boolean;
  closed?: boolean;

  path: BezierPoint[];

  /**
   * Preserve compatibility with additional Harmony stroke properties.
   */
  [key: string]: any;
}

interface DrawingToolsCreateLayer {
  /**
   * Create this layer relative to the specified layer.
   *
   * -1 or omitted means relative to the entire drawing.
   *
   * @default -1
   */
  referenceLayer?: number;

  /**
   * If true, create below referenceLayer or below all layers.
   *
   * @default false
   */
  under?: boolean;

  /**
   * Harmony-created layers generally use 0-9.
   * Imported layers generally use 100-104.
   * Applications may use larger custom values.
   *
   * @default 0
   */
  type?: number;

  shaders?: DrawingToolsShader[];
  contours?: DrawingToolsContour[];
  strokes?: DrawingToolsStroke[];
}

interface DrawingToolsCreateLayersOptions extends DrawingToolsBaseOptions {
  /** Layers to create. */
  layers?: DrawingToolsCreateLayer[];

  /**
   * Masks applied to the newly created layers.
   */
  masks?: BezierContour[];
}

interface DrawingToolsCreateLayer {
  referenceLayer?: number;
  under?: boolean;

  type?: number;

  /** Seen in Toon Boom examples. */
  layerType?: number;

  shaders?: DrawingToolsShader[];
  contours?: DrawingToolsContour[];
  strokes?: DrawingToolsStroke[];
}

interface DrawingToolsDeleteLayersOptions extends DrawingToolsBaseOptions {
  /** Layer indices to delete. */
  layers?: number[];
}

interface DrawingToolsStrokeReference {
  /** Layer containing the stroke. */
  layer: number;

  /** Index of the stroke within the layer. */
  strokeIndex: number;
}

interface DrawingToolsDeleteStrokesOptions extends DrawingToolsBaseOptions {
  strokes?: DrawingToolsStrokeReference[];
}

interface DrawingToolsEraseLayersOptions extends DrawingToolsBaseOptions {
  /**
   * Layers affected by the eraser.
   *
   * If omitted or empty, all layers are affected.
   */
  layers?: number[];

  /** Eraser masks. */
  masks?: BezierContour[];
}

interface DrawingToolsModifyLayer {
  /** Existing layer index to modify. */
  layer: number;

  type?: number;

  shaders?: DrawingToolsShader[];
  contours?: DrawingToolsContour[];
  strokes?: DrawingToolsStroke[];
}

interface DrawingToolsModifyLayersOptions extends DrawingToolsBaseOptions {
  layers?: DrawingToolsModifyLayer[];
}

interface DrawingToolsModifyStroke extends DrawingToolsStrokeReference {
  /** Replacement Bezier path. */
  path?: BezierPoint[];

  /** Whether the path is closed. */
  closed?: boolean;

  /** Whether the path is a polygon. */
  polygon?: boolean;

  /**
   * Parameters along the existing Bezier path at which new points
   * should be inserted.
   *
   * Used when path is not supplied.
   */
  insertPoints?: number[];
}

interface DrawingToolsModifyStrokesOptions extends DrawingToolsBaseOptions {
  strokes?: DrawingToolsModifyStroke[];
}

interface DrawingToolsPaintPoint {
  x: number;
  y: number;
  colorId: string;
}

interface DrawingToolsPaintAtOptions extends DrawingToolsBaseOptions {
  points?: DrawingToolsPaintPoint[];
}

interface DrawingToolsStatic {
  createLayers(arg: DrawingToolsCreateLayersOptions): void;

  deleteLayers(arg: DrawingToolsDeleteLayersOptions): void;

  deleteStrokes(arg: DrawingToolsDeleteStrokesOptions): void;

  eraseLayers(arg: DrawingToolsEraseLayersOptions): void;

  modifyLayers(arg: DrawingToolsModifyLayersOptions): void;

  modifyStrokes(arg: DrawingToolsModifyStrokesOptions): void;

  paintAt(arg: DrawingToolsPaintAtOptions): void;
}

declare const DrawingTools: DrawingToolsStatic;
