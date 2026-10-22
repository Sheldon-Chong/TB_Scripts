include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/SceneKit.js');
include(specialFolders.userScripts + '/core/TimelineKit.js');
include(specialFolders.userScripts + '/core/Drawing.js');
include(specialFolders.userScripts + '/core/Element.js');
include(specialFolders.userScripts + '/core/Layers.js');
include(specialFolders.userScripts + '/core/DrawingDataKit.js');
include(specialFolders.userScripts + '/core/ColumnGroupings.js');
include(specialFolders.userScripts + '/core/Toolbar.js');
include(specialFolders.userScripts + '/core/FileUtils.js');
include(specialFolders.userScripts + '/core/Attributes.js');
include(specialFolders.userScripts + '/core/UI/WidgetKit.js');
include(specialFolders.userScripts + '/core/Logging.js');
include(specialFolders.userScripts + '/core/columns/BaseColumn.js');
include(specialFolders.userScripts + '/core/columns/DrawingElementColumn.js');
include(specialFolders.userScripts + '/core/columns/Path3dColumn.js');
include(specialFolders.userScripts + '/core/colors/Colors.js');
include(specialFolders.userScripts + '/core/colors/PaletteColor.js');
include(specialFolders.userScripts + '/core/colors/Palette.js');
include(specialFolders.userScripts + '/core/colors/GlobalPaletteManager.js');
include(specialFolders.userScripts + '/core/colors/PalettesSingleton.js');
include(specialFolders.userScripts + '/core/colors/Palettes.js');
include(specialFolders.userScripts + '/core/Timer.js');

var __TB_DEV__ = true;
var __tbGlobal = Function('return this;')();
var __tbShared = __tbGlobal.__proto__;

function reportHarmonyError(context: string, error: any): void {
  MessageLog.trace('');
  MessageLog.trace('========== HARMONY ERROR ==========');
  MessageLog.trace('[Context] ' + context);

  var message = error && error.message ? error.message : String(error);

  MessageLog.trace('[Message] ' + message);

  if (error && error.fileName) {
    MessageLog.trace('[File] ' + error.fileName);
  }

  if (error && error.lineNumber !== undefined) {
    MessageLog.trace('[Line] ' + error.lineNumber);
  }

  // Stack traces vary between JavaScript engines.
  var stack = error && error.stack;

  if (typeof stack === 'string') {
    MessageLog.trace('[Stack] ' + stack);
  } else if (stack && typeof stack.length === 'number') {
    for (var i = 0; i < stack.length; i++) {
      var entry = stack[i];

      if (typeof entry === 'string') {
        MessageLog.trace('[Stack ' + i + '] ' + entry);
      } else {
        MessageLog.trace(
          '[Stack ' +
            i +
            '] ' +
            (entry.functionName || '<anonymous>') +
            ' | ' +
            (entry.fileName || 'unknown') +
            ':' +
            (entry.lineNumber !== undefined ? entry.lineNumber : '?'),
        );
      }
    }
  }

  // Available in some QtScript implementations.
  if (error && typeof error.backtrace === 'function') {
    try {
      var frames = error.backtrace();

      for (var j = 0; j < frames.length; j++) {
        MessageLog.trace('[Backtrace ' + j + '] ' + frames[j]);
      }
    } catch (ignored) {
      // Backtrace is optional.
    }
  }

  MessageLog.trace('===================================');
}

if (!__tbShared.__TBTest) {
  MessageLog.trace('[Core INIT] Creating Core');

  __tbShared.__TBTest = createCore();

  __tbShared.__TBContextID = 'CTX_' + new Date().getTime();

  MessageLog.trace('[Core INIT] Created successfully');
  MessageLog.trace('[Core INIT] Context: ' + __tbShared.__TBContextID);
}

function reloadDevelopmentCore() {
  include(specialFolders.userScripts + '/core/Shapes.js');
  include(specialFolders.userScripts + '/core/Maths.js');
  include(specialFolders.userScripts + '/core/Vectors.js');
  include(specialFolders.userScripts + '/core/SceneKit.js');
  include(specialFolders.userScripts + '/core/TimelineKit.js');
  include(specialFolders.userScripts + '/core/Drawing.js');
  include(specialFolders.userScripts + '/core/Element.js');
  include(specialFolders.userScripts + '/core/Layers.js');
  include(specialFolders.userScripts + '/core/DrawingDataKit.js');
  include(specialFolders.userScripts + '/core/ColumnGroupings.js');
  include(specialFolders.userScripts + '/core/Toolbar.js');
  include(specialFolders.userScripts + '/core/FileUtils.js');
  include(specialFolders.userScripts + '/core/Attributes.js');
  include(specialFolders.userScripts + '/core/UI/WidgetKit.js');
  include(specialFolders.userScripts + '/core/Logging.js');
  include(specialFolders.userScripts + '/core/columns/BaseColumn.js');
  include(specialFolders.userScripts + '/core/columns/DrawingElementColumn.js');
  include(specialFolders.userScripts + '/core/columns/Path3dColumn.js');
  include(specialFolders.userScripts + '/core/colors/Colors.js');
  include(specialFolders.userScripts + '/core/colors/PaletteColor.js');
  include(specialFolders.userScripts + '/core/colors/Palette.js');
  include(specialFolders.userScripts + '/core/colors/GlobalPaletteManager.js');
  include(specialFolders.userScripts + '/core/colors/PalettesSingleton.js');
  include(specialFolders.userScripts + '/core/colors/Palettes.js');
  include(specialFolders.userScripts + '/core/Timer.js');

  return reloadCore();
}

function reloadCore(): HarmonyCore {
  var current = getCore();

  if (!current) {
    var initial = createCore();
    __tbShared.__TBTest = initial;
    return initial;
  }

  var fresh = createCore();

  for (var key in fresh) {
    if (!Object.prototype.hasOwnProperty.call(fresh, key)) {
      continue;
    }

    // Preserve registered toolbar infrastructure.
    if (key === 'Toolbar') {
      continue;
    }

    (current as any)[key] = (fresh as any)[key];
  }

  current.MessageLog.trace('[Core] Hot reload complete');

  return current;
}
function mergeCore<TBase, TModules>(base: TBase, modules: TModules): TBase & TModules {
  var target: any = base;
  var source: any = modules;
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
}

type Constructor<T = any> = new (...args: any[]) => T;

type CoreBase = ReturnType<typeof createCoreBase>;

interface CoreModules {
  Utils: ReturnType<typeof createUtils>;
  FileUtils: ReturnType<typeof createFileUtilsKit>;
  oAttr: ReturnType<typeof createAttributeClasses>['oAttr'];
  oIntAttr: ReturnType<typeof createAttributeClasses>['oIntAttr'];
  oDoubleAttr: ReturnType<typeof createAttributeClasses>['oDoubleAttr'];
  oBoolAttr: ReturnType<typeof createAttributeClasses>['oBoolAttr'];
  oTextAttr: ReturnType<typeof createAttributeClasses>['oTextAttr'];
  oEnumAttr: ReturnType<typeof createAttributeClasses>['oEnumAttr'];
  oDrawingAttr: ReturnType<typeof createAttributeClasses>['oDrawingAttr'];
  oAliasAttr: ReturnType<typeof createAttributeClasses>['oAliasAttr'];
  oAttr3D: ReturnType<typeof createAttr3DClass>;
  oPosition3D: ReturnType<typeof createPosition3DClass>;
  oScale3D: ReturnType<typeof createScale3DClass>;
  oRotation3D: ReturnType<typeof createRotation3DClass>;
  oElement: ReturnType<typeof createElementClass>;
  oDrawing: DrawingClass;
  oColumn: ReturnType<typeof createColumnClass>;
  oPathColumn3D: ReturnType<typeof createPathColumn3DClass>;
  oDrawingElementColumn: ReturnType<typeof createDrawingElementColumnClass>;
  columnGrouping: ReturnType<typeof createColumnGroupingClass>;
  columnGroupingColor: ReturnType<typeof createColumnGroupingColorClass>;
  oBaseNode: ReturnType<typeof createBaseNodeClass>;
  oDrawingNode: ReturnType<typeof createDrawingNodeClass>;
  oColorCardNode: ReturnType<typeof createColorCardNodeClass>;
  oPegNode: ReturnType<typeof createPegNodeClass>;
  oWriteNode: ReturnType<typeof createWriteNodeClass>;
  DrawingDataKit: DrawingDataKitType;
  TimelineLayer: typeof TimelineLayer;
  LayerManager: ReturnType<typeof createLayerManager>;
  TimelineKit: ReturnType<typeof createTimelineKit>;
  SceneKit: ReturnType<typeof createSceneKit>;
  Toolbar: ReturnType<typeof createToolbarKit>;
  Vectors: ReturnType<typeof createVectors>;
  Vec2: ReturnType<typeof createVectors>['Vec2'];
  Vec3: ReturnType<typeof createVectors>['Vec3'];
  Shapes: ReturnType<typeof createShapes>;
  Action: typeof Action;
  ColorUtils: ReturnType<typeof createColorUtils>;
  ColorObj: ReturnType<typeof createColorObjClass>;
  column: typeof column;
  oSelection: ReturnType<typeof createSelectionClass>;
  log: ReturnType<typeof createLogger>;
  Timer: ReturnType<typeof createTimerKit>;
  QPushButton;
  PaletteKit: ReturnType<typeof createPaletteKit>;
  reloadDevelopmentCore: typeof reloadDevelopmentCore;
}
type CoreRuntime = CoreBase & Partial<CoreModules>;

/*
 * Public, completely constructed Core.
 */
type HarmonyCore = CoreBase & CoreModules;

function createCoreBase(H?: any) {
  if (!H) {
    H = Function('return this;')().__proto__;
  }
  return {
    scene: H.scene as typeof scene,
    node: H.node as typeof node,
    selection: H.selection as typeof selection,
    frame: H.frame as typeof frame,
    column: H.column as typeof column,
    element: H.element as typeof element,
    Timeline: H.Timeline as typeof Timeline,
    Drawing: H.Drawing as typeof Drawing,
    DrawingTools: H.DrawingTools as typeof DrawingTools,
    MessageLog: H.MessageLog as typeof MessageLog,
    Tools: H.Tools as typeof Tools,
    TimelineMarker: H.TimelineMarker as typeof TimelineMarker,
    preferences: H.preferences as typeof preferences,
    render: H.render as typeof render,
    ScriptManager: H.ScriptManager,
    ScriptToolbarDef: H.ScriptToolbarDef as typeof ScriptToolbarDef,
    PermanentFile: H.PermanentFile as typeof PermanentFile,
    QProcess: H.QProcess as typeof QProcess,
    about: H.about as typeof about,
    QApplication: H.QApplication as typeof QApplication,
    func: H.func as typeof func,
    specialFolders: H.specialFolders,
    Qt: H.Qt as typeof Qt,
    QDir: H.QDir as typeof QDir,
    QFile: H.QFile as typeof QFile,
    QWidget: H.QWidget as typeof QWidget,
    Widgets: WidgetKit,
    QDialog: H.QDialog as typeof QDialog,
    Array: Array,
    QVBoxLayout: H.QVBoxLayout as typeof QVBoxLayout,
    QLabel: H.QLabel as typeof QLabel,
    QPushButton: H.QPushButton as typeof QPushButton,
    Object: Object,
    JSON: JSON,
    Math: Math,
    QTimer: QTimer,
    Maths: Maths,
    parseInt: parseInt,
    QHBoxLayout: H.QHBoxLayout as typeof QHBoxLayout,
    getAllNodesInScene: getAllNodesInScene,
    Action: Action,
    PaletteManager: H.PaletteManager as typeof PaletteManager,
    PaletteObjectManager: H.PaletteObjectManager as typeof PaletteObjectManager,
    String: String,
    parseFloat: parseFloat,
    DEV: __TB_DEV__,
  };
}

function createCore(base?: CoreBase): HarmonyCore {
  var shared = Function('return this;')().__proto__;

  function setStage(name: string): void {
    shared.__TBBuildStage = name;
    MessageLog.trace('[Core BUILD] ' + name);
  }

  setStage('createCoreBase');
  var Runtime = (base || createCoreBase()) as CoreRuntime;

  try {
    setStage('reloadDevelopmentCore assignment');
    Runtime.reloadDevelopmentCore = reloadDevelopmentCore;

    setStage('createLogger');
    Runtime.log = createLogger(Runtime);

    setStage('createTimerKit');
    Runtime.Timer = createTimerKit(Runtime);

    setStage('createColorUtils');
    Runtime.ColorUtils = createColorUtils(Runtime);

    setStage('ColorObj assignment');
    Runtime.ColorObj = Runtime.ColorUtils.ColorObj;

    setStage('createPaletteKit');
    Runtime.PaletteKit = createPaletteKit(Runtime);

    setStage('createAttributeClasses (first)');
    var attrs = createAttributeClasses(Runtime);

    setStage('attribute class assignments');
    Runtime.oAttr = attrs.oAttr;
    Runtime.oIntAttr = attrs.oIntAttr;
    Runtime.oDoubleAttr = attrs.oDoubleAttr;
    Runtime.oBoolAttr = attrs.oBoolAttr;
    Runtime.oTextAttr = attrs.oTextAttr;
    Runtime.oEnumAttr = attrs.oEnumAttr;
    Runtime.oDrawingAttr = attrs.oDrawingAttr;
    Runtime.oAliasAttr = attrs.oAliasAttr;

    setStage('createAttr3DClass');
    Runtime.oAttr3D = createAttr3DClass(Runtime);

    setStage('createPosition3DClass');
    Runtime.oPosition3D = createPosition3DClass(Runtime);

    setStage('createScale3DClass');
    Runtime.oScale3D = createScale3DClass(Runtime);

    setStage('createRotation3DClass');
    Runtime.oRotation3D = createRotation3DClass(Runtime);

    setStage('createDrawingClass');
    Runtime.oDrawing = createDrawingClass(Runtime);

    setStage('createVectors');
    Runtime.Vectors = createVectors(Runtime);

    setStage('Vec2 assignment');
    Runtime.Vec2 = Runtime.Vectors.Vec2;

    setStage('Vec3 assignment');
    Runtime.Vec3 = Runtime.Vectors.Vec3;

    setStage('createShapes');
    Runtime.Shapes = createShapes(Runtime);

    setStage('createAttributeClasses (second)');
    attrs = createAttributeClasses(Runtime);

    setStage('createUtils');
    Runtime.Utils = createUtils(Runtime);

    setStage('createFileUtilsKit');
    Runtime.FileUtils = createFileUtilsKit(Runtime);

    setStage('createElementClass');
    Runtime.oElement = createElementClass(Runtime);

    setStage('createColumnClass');
    Runtime.oColumn = createColumnClass(Runtime);

    setStage('createPathColumn3DClass');
    Runtime.oPathColumn3D = createPathColumn3DClass(Runtime);

    setStage('createDrawingElementColumnClass');
    Runtime.oDrawingElementColumn = createDrawingElementColumnClass(Runtime);

    setStage('createColumnGroupingClass');
    Runtime.columnGrouping = createColumnGroupingClass();

    setStage('createColumnGroupingColorClass');
    Runtime.columnGroupingColor = createColumnGroupingColorClass(Runtime);

    setStage('createBaseNodeClass');
    Runtime.oBaseNode = createBaseNodeClass(Runtime);

    setStage('createWriteNodeClass');
    Runtime.oWriteNode = createWriteNodeClass(Runtime);

    setStage('createDrawingNodeClass');
    Runtime.oDrawingNode = createDrawingNodeClass(Runtime);

    setStage('createColorCardNodeClass');
    Runtime.oColorCardNode = createColorCardNodeClass(Runtime);

    setStage('createPegNodeClass');
    Runtime.oPegNode = createPegNodeClass(Runtime);

    setStage('getDrawingDataKit');
    Runtime.DrawingDataKit = getDrawingDataKit(Runtime);

    setStage('TimelineLayer assignment');
    Runtime.TimelineLayer = TimelineLayer;

    setStage('createLayerManager');
    Runtime.LayerManager = createLayerManager(Runtime);

    setStage('LayerManager.updateNodeLayers');
    Runtime.LayerManager.updateNodeLayers();

    setStage('createSelectionClass');
    Runtime.oSelection = createSelectionClass(Runtime);

    setStage('createTimelineKit');
    Runtime.TimelineKit = createTimelineKit(Runtime);

    setStage('createSceneKit');
    Runtime.SceneKit = createSceneKit(Runtime);

    setStage('createToolbarKit');
    Runtime.Toolbar = createToolbarKit(Runtime);

    setStage('COMPLETE');
    MessageLog.trace('[Core BUILD] All factories initialized successfully');

    return Runtime as HarmonyCore;
  } catch (error) {
    reportHarmonyError('createCore > ' + shared.__TBBuildStage, error);

    throw error;
  }
}

function getCore(): HarmonyCore {
  var shared = Function('return this;')().__proto__;

  if (!shared.__TBTest) {
    throw new Error(
      '[getCore] Core is unavailable. ' +
        'Last initialization stage: ' +
        (shared.__TBBuildStage || 'unknown') +
        '. Check earlier Core initialization errors.',
    );
  }

  return shared.__TBTest as HarmonyCore;
}
type CoreInstance<K extends keyof HarmonyCore> = HarmonyCore[K] extends new (
  ...args: any[]
) => infer T
  ? T
  : never;

type CoreInstances = {
  [K in keyof HarmonyCore]: HarmonyCore[K] extends new (...args: any[]) => infer T ? T : never;
};
