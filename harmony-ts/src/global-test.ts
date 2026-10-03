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

    getAllNodesInScene: getAllNodesInScene,
  };

  var Runtime: any = Base;

  /*
   * Factory-created modules.
   *
   * Keep these variables because their inferred types
   * are used in the final mergeCore().
   */

  var Utils = createUtils(Runtime);
  Runtime.Utils = Utils;

  var ElementClass = createElementClass(Runtime);
  Runtime.oElement = ElementClass;

  var ColumnClass = createColumnClass(Runtime);
  Runtime.oColumn = ColumnClass;

  var PathColumn3DClass = createPathColumn3DClass(Runtime);
  Runtime.oPathColumn3D = PathColumn3DClass;

  var DrawingElementColumnClass = createDrawingElementColumnClass(Runtime);
  Runtime.oDrawingElementColumn = DrawingElementColumnClass;

  var ColumnGroupingClass = createColumnGroupingClass();

  Runtime.columnGrouping = ColumnGroupingClass;

  var ColumnGroupingColorClass = createColumnGroupingColorClass(Runtime);
  Runtime.columnGroupingColor = ColumnGroupingColorClass;

  var NodeLayerClass = createNodeLayerClass(Runtime);
  Runtime.oNodeLayer = NodeLayerClass;

  var ColorCardNodeClass = createColorCardNodeClass(Runtime);
  Runtime.oColorCardNode = ColorCardNodeClass;

  /*
   * Existing constructors don't need
   * temporary variables.
   */

  Runtime.oPegNode = oPegNode;

  Runtime.oDrawingNode = oDrawingNode;

  Runtime.TimelineLayer = TimelineLayer;

  /*
   * Services/modules.
   */

  var LayerManager = createLayerManager(Runtime);
  Runtime.LayerManager = LayerManager;

  var TimelineKit = createTimelineKit(Runtime);
  Runtime.TimelineKit = TimelineKit;

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
    /*
     * Direct references retain their
     * original TypeScript types.
     */
    oPegNode: oPegNode,
    oDrawingNode: oDrawingNode,
    TimelineLayer: TimelineLayer,
    LayerManager: LayerManager,
    TimelineKit: TimelineKit,
  });
}

function getCore(): HarmonyCore {
  var globalObject = Function('return this;')();

  return globalObject.__proto__.__TBTest as HarmonyCore;
}
