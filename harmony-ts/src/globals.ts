include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/DrawingView.js');
include(specialFolders.userScripts + '/core/TimelineKit.js');
include(specialFolders.userScripts + '/core/Frame.js');
include(specialFolders.userScripts + '/core/Transformations.js');
include(specialFolders.userScripts + '/core/ColorUtils.js');
include(specialFolders.userScripts + '/core/Layers.js');
include(specialFolders.userScripts + '/core/FileUtils.js');
include(specialFolders.userScripts + '/core/DrawingDataUtils.js');
include(specialFolders.userScripts + '/core/renderUtils2.js');
include(specialFolders.userScripts + '/core/utils.js');
include(specialFolders.userScripts + '/core/GlobalPalettes.js');
include(specialFolders.userScripts + '/core/ColumnGroupings.js');
include(specialFolders.userScripts + '/core/MetadataKit.js');
include(specialFolders.userScripts + '/core/SceneKit.js');
include(specialFolders.userScripts + '/core/Toolbar.js');
include(specialFolders.userScripts + '/core/UI/WidgetKit.js');
include(specialFolders.userScripts + '/core/DrawingDataKit.js');

// --- ES6+ Array method polyfills for QtScript's ES5 engine ---
if (!Array.prototype.find) {
  Array.prototype.find = function (predicate, thisArg) {
    for (var i = 0; i < this.length; i++) {
      var value = this[i];
      if (predicate.call(thisArg, value, i, this)) {
        return value;
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function (predicate, thisArg) {
    for (var i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return i;
      }
    }
    return -1;
  };
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement, fromIndex) {
    var len = this.length;
    var n = fromIndex ? Number(fromIndex) : 0;
    if (n < 0) {
      n = len + n;
      if (n < 0) n = 0;
    }
    for (var i = n; i < len; i++) {
      if (this[i] === searchElement) {
        return true;
      }
    }
    return false;
  };
}


// listAll();
// IMPORTANT: Using a plain function constructor (NOT a TypeScript class) to avoid
// the IIFE wrapper that TS emits for classes targeting ES5.  IIFEs create closure
// scopes that interact badly with QtScript's GC — when Qt widget wrappers are
// created (e.g. in CameraSwipeToolPanel), the GC can corrupt built-in globals like
// Array, causing crashes or "Array is undefined" errors.

class HarmonyGlobals {
  Shapes = Shapes;
  Math = Maths;
  Vec2 = vectors.Vec2;
  Vec3 = vectors.Vec3;
  Transformations = Transformations;
  DrawingView = DrawingView;
  TimelineKit = TimelineKit;
  Utils = Utils;
  ColorUtils = ColorUtils;
  Vectors = vectors;
  Scene = SceneKit;

  Drawing = Drawing;
  DrawingTools = DrawingTools;
  DrawingDataKit = DrawingDataKit;

  // dgets = Widgets;
  LayerManager = LayerManager;
  FileUtils = ReadWriteOperations;
  Frame = Frame;
  oSelection = oSelection;
  ColorObj = ColorObj;
  oElement = oElement;
  Renderer = Renderer;
  DrawingDataUtils = DrawingDataUtils;
  Cell = Cell;
  oDrawingNode = oDrawingNode;
  DrawingCell = DrawingCell;

  Column = oColumn;
  PathColumn3D = oPathColumn3D;
  Palettes = GlobalPalettes;
  // Keep the legacy property name while exposing the unified drawing class.
  objDrawing = oDrawing;
  // objElement = objElement;
  oDrawingLayer = oDrawingNode;
  ColorCardNode = oColorCardNode;
  columnGroupingColor = columnGroupingColor;
  columnGrouping = columnGrouping;
  PermanentFile = PermanentFile;
  Widgets = WidgetKit;
  Metadata = MetadataKit;
}

var _ = new HarmonyGlobals();

var G: HarmonyGlobals = _;

var __assign =
  (this && this.__assign) ||
  function (target) {
    for (var source, i = 1, n = arguments.length; i < n; i++) {
      source = arguments[i];
      for (var prop in source) {
        if (Object.prototype.hasOwnProperty.call(source, prop)) {
          target[prop] = source[prop];
        }
      }
    }
    return target;
  };

if (Object.keys(this.__proto__).indexOf('G') === -1) {
  this.__proto__.__assign = __assign;
  this.__proto__.Array = Array;
  this.__proto__.G = _;

  this.__proto__.__spreadArray = function (to, from, pack) {
    if (pack || arguments.length === 2) {
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };

  // Object._ = _;

  this.__proto__.registeredTools = this.__proto__.registeredTools || {};
  this.__proto__.registeredActions = this.__proto__.registeredActions || {};
  this.__proto__.registeredToolbars = this.__proto__.registeredToolbars || {};
  this.__proto__.PermanentFile = PermanentFile;
  this.__proto__.Drawing = Drawing;
  this.__proto__.DrawingTools = DrawingTools;
  this.__proto__.column = column;
  // this.__proto__.TimelineMarker = TimelineMarker;

  this.__proto__.oColumn = oColumn;
  this.__proto__.oPathColumn3D = oPathColumn3D;
  this.__proto__.Vec2 = vectors.Vec2;
  this.__proto__.Vec3 = vectors.Vec3;
  this.__proto__.vectors = vectors;
  this.__proto__.selection = selection;

  var __extends =
    (this && this.__extends) ||
    (function () {
      var extendStatics = function (d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        return d;
      };
      return function (d, b) {
        if (typeof b !== 'function' && b !== null)
          throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null');
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();

  this.__proto__.__extends = __extends;
  MessageLog.trace('[globals.ts] G assigned to this.__proto__');
} else {
  MessageLog.trace(
    '[globals.ts] ' +
      JSON.stringify(Object.keys(this.__proto__).indexOf('G') !== -1, null, 2) +
      ' — G already exists in this.__proto__, skipping assignment',
  );
}

// __extends helper for ES5 class inheritance.
// NOTE: The usual __proto__ / Object.setPrototypeOf feature detection
// (e.g. ({ __proto__: [] } instanceof Array)) creates an object whose
// [[Prototype]] is an Array instance — an unusual prototype chain that
// QtScript's GC can't handle.  When the GC runs after creating Qt widget
// wrappers, it corrupts built-in globals like Array.
// We use only the safe for…in copy for static inheritance.
