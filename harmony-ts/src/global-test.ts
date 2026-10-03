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

type HarmonyCore = ReturnType<typeof createCore>;

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

function createCore() {
  var H = Function('return this;')().__proto__;

  var Base = {
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

    PermanentFile: H.PermanentFile as typeof PermanentFile,

    QProcess: H.QProcess as typeof QProcess,

    about: H.about as typeof about,

    QApplication: H.QApplication as typeof QApplication,

    Qt: H.Qt as typeof Qt,

    QDir: H.QDir as typeof QDir,

    func: H.func as typeof func,

    QFile: H.QFile as typeof QFile,
    QWidget: H.QWidget as typeof QWidget,

    Array: Array,

    Object: Object,

    JSON: JSON,

    Math: Math,

    Shapes: Shapes,

    Maths: Maths,

    Vectors: vectors,

    Vec2: vectors.Vec2,

    Vec3: vectors.Vec3,

    specialFolders: H.specialFolders,

    ScriptManager: H.ScriptManager,

    ScriptToolbarDef: H.ScriptToolbarDef as typeof ScriptToolbarDef,

    getAllNodesInScene: getAllNodesInScene,
  };

  var Runtime: any = Base;

  var AttributeClasses = createAttributeClasses(Runtime);

  Runtime.oAttr = AttributeClasses.oAttr;

  Runtime.oIntAttr = AttributeClasses.oIntAttr;

  Runtime.oDoubleAttr = AttributeClasses.oDoubleAttr;

  Runtime.oBoolAttr = AttributeClasses.oBoolAttr;

  Runtime.oTextAttr = AttributeClasses.oTextAttr;

  Runtime.oEnumAttr = AttributeClasses.oEnumAttr;

  Runtime.oDrawingAttr = AttributeClasses.oDrawingAttr;

  Runtime.oAliasAttr = AttributeClasses.oAliasAttr;

  var Attr3DClass = createAttr3DClass(Runtime);

  Runtime.oAttr3D = Attr3DClass;

  var Position3DClass = createPosition3DClass(Runtime);

  Runtime.oPosition3D = Position3DClass;

  var Scale3DClass = createScale3DClass(Runtime);

  Runtime.oScale3D = Scale3DClass;

  var Rotation3DClass = createRotation3DClass(Runtime);

  Runtime.oRotation3D = Rotation3DClass;

  /*
   * Basic services.
   */
  var Utils = createUtils(Runtime);

  Runtime.Utils = Utils;

  var FileUtils = createFileUtilsKit(Runtime);

  /*
   * Use the final Core property name here too.
   */
  Runtime.FileUtils = FileUtils;

  /*
   * Element classes.
   */
  var ElementClass = createElementClass(Runtime);

  Runtime.oElement = ElementClass;

  /*
   * Column base class first.
   */
  var ColumnClass = createColumnClass(Runtime);

  Runtime.oColumn = ColumnClass;

  /*
   * Column subclasses can now safely extend
   * Core.oColumn.
   */
  var PathColumn3DClass = createPathColumn3DClass(Runtime);

  Runtime.oPathColumn3D = PathColumn3DClass;

  var DrawingElementColumnClass = createDrawingElementColumnClass(Runtime);

  Runtime.oDrawingElementColumn = DrawingElementColumnClass;

  /*
   * Column grouping classes.
   */
  var ColumnGroupingClass = createColumnGroupingClass();

  Runtime.columnGrouping = ColumnGroupingClass;

  var ColumnGroupingColorClass = createColumnGroupingColorClass(Runtime);

  Runtime.columnGroupingColor = ColumnGroupingColorClass;

  /*
   * Node base class.
   */
  var NodeLayerClass = createNodeLayerClass(Runtime);

  Runtime.oNodeLayer = NodeLayerClass;

  /*
   * ALL oNodeLayer subclasses must exist
   * before LayerManager is created.
   */
  var DrawingNodeClass = createDrawingNodeClass(Runtime);

  Runtime.oDrawingNode = DrawingNodeClass;

  var ColorCardNodeClass = createColorCardNodeClass(Runtime);

  Runtime.oColorCardNode = ColorCardNodeClass;

  var PegNodeClass = createPegNodeClass(Runtime);

  Runtime.oPegNode = PegNodeClass;

  /*
   * TimelineKit immediately creates TimelineLayer
   * instances, so TimelineLayer must exist first.
   */
  Runtime.TimelineLayer = TimelineLayer;

  /*
   * LayerManager can now safely construct:
   *
   * Core.oNodeLayer
   * Core.oDrawingNode
   * Core.oPegNode
   * Core.oColorCardNode
   */
  var LayerManager = createLayerManager(Runtime);

  /*
   * Important:
   * assign it BEFORE populating node layers.
   */
  Runtime.LayerManager = LayerManager;

  /*
   * Now PegNode constructors can safely access
   * Core.LayerManager.
   */
  LayerManager.updateNodeLayers();

  /*
   * TimelineKit can now safely use:
   *
   * Core.TimelineLayer
   * Core.LayerManager
   */
  var TimelineKit = createTimelineKit(Runtime);

  Runtime.TimelineKit = TimelineKit;

  /*
   * Other services.
   */
  var SceneKit = createSceneKit(Runtime);

  Runtime.SceneKit = SceneKit;

  var Toolbar = createToolbarKit(Runtime);

  Runtime.Toolbar = Toolbar;

  return mergeCore(Base, {
    Utils: Utils,
    oAttr3D: Attr3DClass,

    oPosition3D: Position3DClass,

    oScale3D: Scale3DClass,

    oRotation3D: Rotation3DClass,

    FileUtils: FileUtils,

    oElement: ElementClass,

    oColumn: ColumnClass,

    oPathColumn3D: PathColumn3DClass,

    oDrawingElementColumn: DrawingElementColumnClass,

    columnGrouping: ColumnGroupingClass,

    columnGroupingColor: ColumnGroupingColorClass,

    oNodeLayer: NodeLayerClass,

    oDrawingNode: DrawingNodeClass,

    oColorCardNode: ColorCardNodeClass,

    oPegNode: PegNodeClass,

    TimelineLayer: TimelineLayer,

    LayerManager: LayerManager,

    TimelineKit: TimelineKit,

    SceneKit: SceneKit,

    Toolbar: Toolbar,
  });
}
function getCore(): HarmonyCore {
  var globalObject = Function('return this;')();

  return globalObject.__proto__.__TBTest as HarmonyCore;
}
