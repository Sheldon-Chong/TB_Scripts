include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/SceneKit.js');
include(specialFolders.userScripts + '/core/TimelineKit.js');
include(specialFolders.userScripts + '/core/Element.js');
include(specialFolders.userScripts + '/core/Layers.js');
include(specialFolders.userScripts + '/core/ColumnGroupings.js');
include(specialFolders.userScripts + '/core/Toolbar.js');
include(specialFolders.userScripts + '/core/FileUtils.js');
include(specialFolders.userScripts + '/core/Attributes.js');
include(specialFolders.userScripts + '/core/UI/WidgetKit.js');

var __tbGlobal = Function('return this;')();

var __tbShared = __tbGlobal.__proto__;

if (!__tbShared.__TBTest) {
  __tbShared.__TBTest = createCore();
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
  oColumn: ReturnType<typeof createColumnClass>;
  oPathColumn3D: ReturnType<typeof createPathColumn3DClass>;
  oDrawingElementColumn: ReturnType<typeof createDrawingElementColumnClass>;
  columnGrouping: ReturnType<typeof createColumnGroupingClass>;
  columnGroupingColor: ReturnType<typeof createColumnGroupingColorClass>;
  oBaseNode: ReturnType<typeof createBaseNodeClass>;
  oDrawingNode: ReturnType<typeof createDrawingNodeClass>;
  oColorCardNode: ReturnType<typeof createColorCardNodeClass>;
  oPegNode: ReturnType<typeof createPegNodeClass>;
  TimelineLayer: typeof TimelineLayer;
  LayerManager: ReturnType<typeof createLayerManager>;
  TimelineKit: ReturnType<typeof createTimelineKit>;
  SceneKit: ReturnType<typeof createSceneKit>;
  Toolbar: ReturnType<typeof createToolbarKit>;
  Vectors: ReturnType<typeof createVectors>;
  Vec2: ReturnType<typeof createVectors>['Vec2'];
  Vec3: ReturnType<typeof createVectors>['Vec3'];
  Shapes: ReturnType<typeof createShapes>;
}

type CoreRuntime = CoreBase & Partial<CoreModules>;

/*
 * Public, completely constructed Core.
 */
type HarmonyCore = CoreBase & CoreModules;

function createCoreBase() {
  var H = Function('return this;')().__proto__;
  return {
    scene: H.scene as typeof scene,
    node: H.node as typeof node,
    selection: H.selection as typeof selection,
    frame: H.frame as typeof frame,
    column: H.column as typeof column,
    element: H.element as typeof element,
    Timeline: H.Timeline as typeof Timeline,
    Drawing: H.Drawing as typeof Drawing,
    MessageLog: H.MessageLog as typeof MessageLog,
    Tools: H.Tools as typeof Tools,
    TimelineMarker: H.TimelineMarker as typeof TimelineMarker,
    preferences: H.preferences as typeof preferences,
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
    Array: Array,
    Object: Object,
    JSON: JSON,
    Math: Math,
    Maths: Maths,
    getAllNodesInScene: getAllNodesInScene,
  };
}

function createCore(): HarmonyCore {
  var Runtime = createCoreBase() as CoreRuntime;
  /*
   * Attributes
   */
  var attrs = createAttributeClasses(Runtime);
  Runtime.oAttr = attrs.oAttr;
  Runtime.oIntAttr = attrs.oIntAttr;
  Runtime.oDoubleAttr = attrs.oDoubleAttr;
  Runtime.oBoolAttr = attrs.oBoolAttr;
  Runtime.oTextAttr = attrs.oTextAttr;
  Runtime.oEnumAttr = attrs.oEnumAttr;
  Runtime.oDrawingAttr = attrs.oDrawingAttr;
  Runtime.oAliasAttr = attrs.oAliasAttr;
  Runtime.oAttr3D = createAttr3DClass(Runtime);
  Runtime.oPosition3D = createPosition3DClass(Runtime);
  Runtime.oScale3D = createScale3DClass(Runtime);
  Runtime.oRotation3D = createRotation3DClass(Runtime);

  Runtime.Vectors = createVectors(Runtime);

  Runtime.Vec2 = Runtime.Vectors.Vec2;

  Runtime.Vec3 = Runtime.Vectors.Vec3;

  /*
   * Shapes depends on Vectors.
   */
  Runtime.Shapes = createShapes(Runtime);

  /*
   * Attributes
   */
  var attrs = createAttributeClasses(Runtime);
  /*
   * Services
   */
  Runtime.Utils = createUtils(Runtime);
  Runtime.FileUtils = createFileUtilsKit(Runtime);
  /*
   * Element
   */
  Runtime.oElement = createElementClass(Runtime);
  /*
   * Columns
   */
  Runtime.oColumn = createColumnClass(Runtime);
  Runtime.oPathColumn3D = createPathColumn3DClass(Runtime);
  Runtime.oDrawingElementColumn = createDrawingElementColumnClass(Runtime);
  Runtime.columnGrouping = createColumnGroupingClass();
  Runtime.columnGroupingColor = createColumnGroupingColorClass(Runtime);
  /*
   * Node classes
   */
  Runtime.oBaseNode = createBaseNodeClass(Runtime);
  Runtime.oDrawingNode = createDrawingNodeClass(Runtime);
  Runtime.oColorCardNode = createColorCardNodeClass(Runtime);
  Runtime.oPegNode = createPegNodeClass(Runtime);
  /*
   * Timeline class
   */
  Runtime.TimelineLayer = TimelineLayer;
  /*
   * Layer manager
   *
   * Create, attach, then initialize.
   */
  Runtime.LayerManager = createLayerManager(Runtime);
  Runtime.LayerManager.updateNodeLayers();
  /*
   * Higher-level modules
   */
  Runtime.TimelineKit = createTimelineKit(Runtime);
  Runtime.SceneKit = createSceneKit(Runtime);
  Runtime.Toolbar = createToolbarKit(Runtime);
  /*
   * We know construction is complete here.
   */
  return Runtime as HarmonyCore;
}
function getCore(): HarmonyCore {
  var globalObject = Function('return this;')();
  return globalObject.__proto__.__TBTest as HarmonyCore;
}
