declare namespace DrawingTools {
  // --------------------------------------------------------------------------
  // Properties (Art Level Masks)
  // --------------------------------------------------------------------------

  /** Underlay art mask constant (0) */
  const underlayArt: number;
  /** Line art mask constant (1) */
  const lineArt: number;
  /** Colour art mask constant (2) */
  const colourArt: number;
  /** Overlay art mask constant (3) */
  const overlayArt: number;
  /** Mask representing all 4 art layers */
  const allArts: number;

  // --------------------------------------------------------------------------
  // Core Drawing Selection & Navigation
  // --------------------------------------------------------------------------

  /**
   * Sets the active art level.
   * @param currentArt Use DrawingTools.underlayArt, lineArt, colourArt, or overlayArt.
   */
  function setCurrentArt(currentArt: number): void;

  /**
   * Sets the active drawing using a column name and frame number.
   * @param columnName Target timing column name.
   * @param frame Target frame number (default: 1).
   */
  function setCurrentDrawingFromColumnName(columnName: string, frame?: number): boolean;

  /**
   * Sets the active drawing using a node path and frame number.
   * @param nodeName Target node path (e.g., "Top/Drawing").
   * @param frame Target frame number (default: 1).
   */
  function setCurrentDrawingFromNodeName(nodeName: string, frame?: number): boolean;

  // --------------------------------------------------------------------------
  // Vector & Bitmap Conversions / Calculations
  // --------------------------------------------------------------------------

  /**
   * Converts selected pencil lines in specified art layer into brush strokes.
   * @param art Art layer mask (default: LineArtMask).
   * @param params Optional drawing tool parameters.
   */
  function convertPencilToBrush(art?: number, params?: DrawingToolParams): void;

  /**
   * Extracts centerlines from source art layer and outputs them to target art layer.
   * @param srcArt Source art layer mask (default: LineArtMask).
   * @param dstArt Destination art layer mask (default: ColourArtMask).
   * @param params Optional drawing tool parameters.
   */
  function extractCenterline(srcArt?: number, dstArt?: number, params?: DrawingToolParams): void;

  /**
   * Computes breaking triangles of current layer using supplied parameters.
   */
  function computeBreakingTriangles(params?: DrawingToolParams): void;

  /**
   * Vectorizes a drawing from source key/file to destination key/file.
   * Passing options string or config object modifies vectorization thresholds.
   */
  function vectorize(...args: (DrawingKey | string | VectorizeOptions)[]): boolean | unknown;

  namespace vectorize {
    /** Prints or returns CLI options help for vectorization. */
    function help(): string;
  }

  // --------------------------------------------------------------------------
  // Resolution & Color Management
  // --------------------------------------------------------------------------

  /** Changes vector layer resolution for a drawing key. */
  function changeDrawingVectorLayerResolution(
    drawingKey: DrawingKey,
    pixelPerModelUnit: number,
    options?: VectorResolutionOptions,
  ): void;

  /** Changes bitmap layer resolution for a drawing key. */
  function changeDrawingBitmapLayerResolution(
    drawingKey: DrawingKey,
    pixelPerModelUnit: number,
    options?: BitmapResolutionOptions,
  ): void;

  /** Returns an array of color IDs used in the specified drawing. */
  function getDrawingUsedColors(drawingKey: DrawingKey): string[];

  /** Returns an array of color IDs with their palette sources used in the drawing. */
  function getDrawingUsedColorsWithSource(drawingKey: DrawingKey): UsedColorWithSource[];

  /** Returns an array of color IDs used across multiple drawing keys. */
  function getMultipleDrawingsUsedColors(drawingKeyArray: DrawingKey[]): string[];

  /** Recolors strokes in a drawing based on a mapping array. */
  function recolorDrawing(drawingKey: DrawingKey, colorMap: ColorMapEntry[]): void;

  // --------------------------------------------------------------------------
  // Optimization & Art Cleanup
  // --------------------------------------------------------------------------

  /** Clears artwork on specified layer of a drawing key. */
  function clearArt(config: ClearArtConfig): boolean;

  /** Performs the same operation as Drawing -> Optimize -> Flatten menu item. */
  function flatten(config: OptimizeConfig): boolean;

  /** Performs the same operation as Drawing -> Optimize -> Optimize menu item. */
  function optimize(config: OptimizeConfig): boolean;

  // --------------------------------------------------------------------------
  // Extended API (Path & Layer Manipulation)
  // --------------------------------------------------------------------------

  /** Creates new vector layers in a specified drawing and art level. */
  function createLayers(config: CreateLayersConfig): void;

  /** Deletes entire layers by index in a specified drawing. */
  function deleteLayers(config: DeleteLayersConfig): void;

  /** Deletes specific strokes inside a layer (can unpaint contours). */
  function deleteStrokes(config: DeleteStrokesConfig): void;

  /** Applies eraser contours/masks to specified layers in a drawing. */
  function eraseLayers(config: EraseLayersConfig): void;

  /** Modifies existing drawing layers by replacing strokes/contours. */
  function modifyLayers(config: ModifyLayersConfig): void;

  /** Modifies specific strokes in a layer (path adjustment, point insertion, closing). */
  function modifyStrokes(config: ModifyStrokesConfig): void;

  /** Simulates painting at target vector coordinates using a designated color ID. */
  function paintAt(config: PaintAtConfig): void;
}

interface HarmonyToolDefinition {
  name: string;
  displayName: string;
  icon: string;
  toolType: string;
  canBeOverridenBySelectOrTransformTool: boolean;
  options: { snapToBoundary: boolean };
  resourceFolder: string;
  defaultOptions: { snapToBoundary: boolean };
  [key: string]: any;

  preferenceName: () => string;
  loadFromPreferences: () => void;
  storeToPreferences: () => void;
  onRegister: () => void;
  onCreate: (ctx: any) => void;
  onMouseDown: (ctx: any) => boolean;
  onMouseMove: (ctx: any) => boolean;
  onMouseUp: (ctx: any) => boolean;
  onResetTool: (ctx: any) => void;
  showMeasureToast?: (labelText: string, duration: number) => void;
  loadPanel: (dialog: any, responder: any) => void;
  refreshPanel: (dialog: any, responder: any) => void;

  ui?: {
    snapCheckbox: any;
  };
}

declare var Tools: {
  createDrawing(): any;
  getToolSettings(): any;
  registerTool(toolDefinition: HarmonyToolDefinition): number;
  setCurrentTool(tool: any): boolean;
  setToolSettings(arg): any;
};
