include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/SceneKit.js');
include(specialFolders.userScripts + '/core/TimelineKit.js');
include(specialFolders.userScripts + '/core/Element.js');
include(specialFolders.userScripts + '/core/Layers.js');
include(specialFolders.userScripts + '/core/ColumnGroupings.js');

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

  /*
   * DO NOT type this as any.
   *
   * This is the part TypeScript will infer.
   */
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

    PermanentFile: H.PermanentFile as typeof PermanentFile,

    QProcess: H.QProcess as typeof QProcess,

    about: H.about as typeof about,

    QApplication: H.QApplication as typeof QApplication,

    Qt: H.Qt as typeof Qt,

    func: H.func as typeof func,

    Array: Array,
    Object: Object,
    JSON: JSON,

    Shapes: Shapes,
    Maths: Maths,

    Vectors: vectors,
    Vec2: vectors.Vec2,
    Vec3: vectors.Vec3,

    // ColorObj: ColorObj,

    getAllNodesInScene: getAllNodesInScene,
  };

  /*
   * Runtime is the SAME object as Base.
   *
   * We allow factories to treat it dynamically because
   * the object is still being assembled.
   */
  var Runtime: any = Base;

  /*
   * Utils
   */
  var Utils = createUtils(Runtime);

  Runtime.Utils = Utils;

  /*
   * Elements
   */
  var ElementClass = createElementClass(Runtime);

  Runtime.oElement = ElementClass;

  /*
   * Base column
   */
  var ColumnClass = createColumnClass(Runtime);

  Runtime.oColumn = ColumnClass;

  /*
   * Column subclasses
   */
  var PathColumn3DClass = createPathColumn3DClass(Runtime);

  Runtime.oPathColumn3D = PathColumn3DClass;

  var DrawingElementColumnClass = createDrawingElementColumnClass(Runtime);

  Runtime.oDrawingElementColumn = DrawingElementColumnClass;

  /*
   * Column groupings
   */
  var ColumnGroupingClass = createColumnGroupingClass();

  Runtime.columnGrouping = ColumnGroupingClass;

  var ColumnGroupingColorClass = createColumnGroupingColorClass(Runtime);

  Runtime.columnGroupingColor = ColumnGroupingColorClass;

  /*
   * Base node
   */
  var NodeLayerClass = createNodeLayerClass(Runtime);

  Runtime.oNodeLayer = NodeLayerClass;

  /*
   * Node subclasses
   */
  var ColorCardNodeClass = createColorCardNodeClass(Runtime);

  Runtime.oColorCardNode = ColorCardNodeClass;

  /*
   * Temporary ones that you have not converted yet.
   */
  var PegNodeClass = oPegNode;

  Runtime.oPegNode = PegNodeClass;

  var DrawingNodeClass = oDrawingNode;

  Runtime.oDrawingNode = DrawingNodeClass;

  /*
   * Services
   */
  var LayerManager = createLayerManager(Runtime);

  Runtime.LayerManager = LayerManager;

  /*
   * Higher level modules
   */
  var TimelineKit = createTimelineKit(Runtime);

  Runtime.TimelineKit = TimelineKit;

  /*
   * This is the important part for TypeScript.
   *
   * mergeCore returns the SAME Base object, but its
   * return type contains all of these properties.
   */
  return mergeCore(Base, {
    Utils: Utils,

    oElement: ElementClass,

    oColumn: ColumnClass,

    oPathColumn3D: PathColumn3DClass,

    oDrawingElementColumn: DrawingElementColumnClass,

    columnGrouping: ColumnGroupingClass,

    columnGroupingColor: ColumnGroupingColorClass,

    oNodeLayer: NodeLayerClass,

    oColorCardNode: ColorCardNodeClass,

    oPegNode: PegNodeClass,

    oDrawingNode: DrawingNodeClass,

    LayerManager: LayerManager,

    TimelineKit: TimelineKit,
  });
}

function getCore(): HarmonyCore {
  var globalObject = Function('return this;')();

  return globalObject.__proto__.__TBTest as HarmonyCore;
}
