/** Art layer index: 0 = Underlay, 1 = Color Art, 2 = Line Art, 3 = Overlay */
type ArtIndex = 0 | 1 | 2 | 3;

/** Node identifier path string (e.g., "Top/Drawing") */
type NodePath = string;

/**
 * Toon Boom Harmony Drawing global object.
 *
 * Provides methods for iterating over and manipulating drawings
 * belonging to an element.
 */
declare var Drawing: {
  query: {
    getData(options: any): any;
  };

  /**
   * Returns the number of drawings in an element.
   *
   * @param elementId The unique ID of the element.
   */
  numberOf(elementId: number): number;

  /**
   * Returns the drawing ID/name at the given index.
   *
   * @param elementId The unique ID of the element.
   * @param drawingIndex The drawing index.
   */
  name(elementId: number, drawingIndex: number): string;

  /**
   * Returns true if the given drawing exists in the element.
   *
   * @param elementId The unique ID of the element.
   * @param timing The drawing name/exposure.
   */
  isExists(elementId: number, timing: string): boolean;

  /**
   * Creates a new drawing inside an element.
   *
   * The drawing initially resides in the temporary folder until
   * the project is saved, unless storeInProjectFolder is specified.
   *
   * @param elementId The unique ID of the element.
   * @param timing The proposed drawing name/exposure.
   * @param fileExists Indicates that the drawing file exists.
   * @param storeInProjectFolder If true, the drawing exists in the
   * project folder rather than the temporary folder.
   *
   * @returns True if the drawing was created successfully.
   */
  create(
    elementId: number,
    timing: string,
    fileExists: boolean,
    storeInProjectFolder?: boolean,
  ): boolean;

  /**
   * Returns the filename of a drawing on disk.
   *
   * The returned path may point to either the temporary folder
   * or the project folder.
   *
   * @param elementId The unique ID of the element.
   * @param drawingName The drawing name/exposure.
   */
  filename(elementId: number, drawingName: string): string;

  /**
   * Creates a drawing key from a descriptor object.
   *
   * Supported descriptors:
   *
   * - A drawing file path
   * - A node and frame
   * - An element ID and exposure, optionally with a synced layer
   */
  Key(object: DrawingKeyInput): DrawingKey;

  /**
   * Creates a drawing key from an element ID and exposure.
   *
   * This overload is used by examples in the Toon Boom
   * documentation even though the primary API signature
   * documents the object form.
   */
  Key(elementId: number, exposure: string, layer?: string): DrawingKey;
};

/** Drawing Descriptor target */
interface DrawingDescriptor {
  node: NodePath;
  frame: number;
}

/** Mask object containing path boundaries and optional hole definitions */
interface MaskDefinition {
  polygon?: boolean;
  path: BezierContour;
  holes?: BezierContour[];
}

/** Shader configuration for dual-sided color strokes */
interface ShaderDefinition {
  colorId: string;
}

/** Stroke insertion payload */
interface StrokeDefinition {
  shaderLeft?: number;
  stroke?: boolean;
  pencilColorId?: string;
  thickness?: number;
  path?: BezierPath;
}

/** Contour creation options */
interface ContourDefinition {
  polygon?: boolean;
  stroke?: boolean;
  thickness?: number;
  pencilColorId?: string;
  colorId?: string;
  path?: BezierPath;
}

/** Layer definition payload used when creating or modifying drawing layers */
interface LayerDefinition {
  layer?: number;
  type?: number; // 0-9 for standard tools, 100-104 for imports
  layerType?: number;
  referenceLayer?: number;
  under?: boolean;
  shaders?: ShaderDefinition[];
  contours?: ContourDefinition[];
  strokes?: StrokeDefinition[];
  masks?: MaskDefinition[];
}

/**
 * Method Argument Configurations
 */

interface CreateLayersConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  layers?: LayerDefinition[];
}

interface DeleteLayersConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  layers?: number[]; // Array of layer indices
}

interface DeleteStrokesItem {
  layer: number;
  strokeIndex: number;
}

interface DeleteStrokesConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  strokes?: DeleteStrokesItem[];
}

interface EraseLayersConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  layers?: number[]; // If empty or omitted, erases all layers
  masks?: MaskDefinition[];
}

interface ModifyLayersConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  layers?: LayerDefinition[];
}

interface ModifyStrokesItem {
  layer: number;
  strokeIndex: number;
  path?: BezierPath;
  closed?: boolean;
  polygon?: boolean;
  insertPoints?: number[];
}

interface ModifyStrokesConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  strokes?: ModifyStrokesItem[];
}

interface PaintAtPoint {
  x: number;
  y: number;
  colorId: string;
}

interface PaintAtConfig {
  drawing: DrawingDescriptor;
  art: ArtIndex;
  label?: string;
  points?: PaintAtPoint[];
}

/**
 * Descriptor representing a specific drawing key.
 * Can be built from { elementId, exposure } or { node, frame }.
 */
type DrawingKey =
  | { elementId: number; exposure: string; layer?: string }
  | { node: string; frame: number }
  | Record<string, unknown>;

/**
 * Parameters passed to drawing tool algorithms (e.g., convertPencilToBrush, extractCenterline).
 */
interface DrawingToolParams {
  applyAllDrawings?: boolean;
  [key: string]: unknown;
}

/**
 * Options for changing vector layer resolution.
 */
interface VectorResolutionOptions {
  /** Will only apply the resolution to new strokes if set to false. Default: true */
  applyToExistingStrokes?: boolean;
  /** Controls target art layers (0=underlay, 1=line art, 2=color art, 3=overlay). Default: [0,1,2,3] */
  art?: number[];
}

/**
 * Options for changing bitmap layer resolution.
 */
interface BitmapResolutionOptions {
  /** Will only resample existing bitmaps if set to true. Default: true */
  resampleBitmap?: boolean;
  /** Controls target art layers (0=underlay, 1=line art, 2=color art, 3=overlay). Default: [0,1,2,3] */
  art?: number[];
}

/**
 * Structure representing color usage with its palette source type.
 */
interface UsedColorWithSource {
  colorId: string;
  colorSource: 'COLOR' | 'PENCIL_TEXTURE';
}

/**
 * Structure for color mapping operations in recolorDrawing.
 */
interface ColorMapEntry {
  from: string;
  to: string;
}

/**
 * Configuration object for clearArt.
 */
interface ClearArtConfig {
  drawing: DrawingKey;
  /** Art layer to clear: 0 = Underlay, 1 = Line Art, 2 = Colour Art, 3 = Overlay */
  art: number;
}

/**
 * Configuration object for optimize and flatten menu operations.
 */
interface OptimizeConfig {
  drawing: DrawingKey;
  removeInvisibleLines?: boolean;
}

/**
 * Vectorize options object or CLI argument string.
 */
type VectorizeOptions = Record<string, unknown> | string;

// Placeholder interfaces for Extended DrawingTools config signatures
interface CreateLayersConfig {
  [key: string]: unknown;
}
interface DeleteLayersConfig {
  [key: string]: unknown;
}
interface DeleteStrokesConfig {
  [key: string]: unknown;
}
interface EraseLayersConfig {
  [key: string]: unknown;
}
interface ModifyLayersConfig {
  [key: string]: unknown;
}
interface ModifyStrokesConfig {
  [key: string]: unknown;
}
interface PaintAtConfig {
  [key: string]: unknown;
}

interface DrawingType {
  text: string;
  pixmapFile: string;
  commandIcon: string;
  flipIcon: string;
  onionIcon: string;
  timelineColor: string;
}
