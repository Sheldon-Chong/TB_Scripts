
include("Shapes.js");
include(specialFolders.userScripts + "/utils/Maths.js");
include("DrawingView.js");
include("GlobalTimeline.js");
include("Frame.js");
include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/Transformations.js");
include(specialFolders.userScripts + "/widgets/WidgetUtils.js");
include(specialFolders.userScripts + "/utils/ColorUtils.js");
include(specialFolders.userScripts + "/Layers.js");
include(specialFolders.userScripts + "/utils/FileUtils.js");
// include(specialFolders.userScripts + "/RenderUtils.js");
// include(specialFolders.userScripts + "/Renderer.js");
include(specialFolders.userScripts + "/CameraView.js");
include(specialFolders.userScripts + "/utils/DrawingDataUtils.js");
include(specialFolders.userScripts + "/utils/renderUtils.js");

include("Toolbar.js");
include(specialFolders.userScripts + "/utils/GlobalPalettes.js");

class HarmonyGlobals {
  // Shapes = Shapes;
  Math = Maths;
  Transformations = Transformations;
  DrawingView = DrawingView;
  GlobalTimeline = GlobalTimeline;
  Utils = Utils;
  ColorUtils = ColorUtils;
  Widgets = Widgets;
  LayerManager = LayerManager;
  FileUtils: typeof ReadWriteOperations = ReadWriteOperations;
  Frame = Frame;
  oSelection = oSelection;
  ColorObj = ColorObj;
  oElement = oElement;
  Renderer = Renderer;
  CameraView = CameraView;
  DrawingDataUtils = DrawingDataUtils;
  Cell = Cell;
  DrawingCell = DrawingCell;
  Column = Column;
  PathColumn3D = PathColumn3D;
  Palettes = GlobalPalettes;
  objDrawing = objDrawing;
  objElement = objElement;

  assign = function (target, source) {
    if (!target || !source) return target;
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
    return target;
  };

  constructor() {
    Object._ = this;
  }
}

const _ = new HarmonyGlobals();

// for (var key in HarmonyGlobals.prototype) {
//   MessageLog.trace("key " + key + " value " + HarmonyGlobals.prototype[key]);
//   this.__proto__[key] = HarmonyGlobals.prototype[key];
// }

Object._ = _;

const G = _;

this.__proto__.G = _;


var __extends = (this && this.__extends) || (function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
  };
  return function (d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();

this.__proto__.__extends = __extends;