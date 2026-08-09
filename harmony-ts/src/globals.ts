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

// function listAll() {
//   var allNodesList = [];

//   // Recursive helper function to crawl through groups
//   function findNodesInGroup(parentPath) {
//     var count = node.numberOfSubNodes(parentPath);

//     for (var i = 0; i < count; i++) {
//       // Get the full path of the current sub-node
//       var currentNode = node.subNode(parentPath, i);
//       allNodesList.push(currentNode);

//       // If this node is a group, look inside it too
//       if (node.isGroup(currentNode)) {
//         findNodesInGroup(currentNode);
//       }
//     }
//   }

//   // Start crawling from the very top layer of the project
//   var sceneRoot = node.root();
//   findNodesInGroup(sceneRoot);

//   // Print the results to the Message Log

//   return allNodesList;
// }

// listAll();
// IMPORTANT: Using a plain function constructor (NOT a TypeScript class) to avoid
// the IIFE wrapper that TS emits for classes targeting ES5.  IIFEs create closure
// scopes that interact badly with QtScript's GC — when Qt widget wrappers are
// created (e.g. in MeasureLineToolPanel), the GC can corrupt built-in globals like
// Array, causing crashes or "Array is undefined" errors.
function HarmonyGlobals() {
  this.Shapes = Shapes;
  this.Math = Maths;
  this.Vec2 = vectors.Vec2;
  this.Vec3 = vectors.Vec3;
  this.Transformations = Transformations;
  this.DrawingView = DrawingView;
  this.TimelineKit = TimelineKit;
  this.Utils = Utils;
  this.ColorUtils = ColorUtils;
  this.Vectors = vectors;
  this.Scene = SceneKit;

  // Widgets = Widgets;
  this.LayerManager = LayerManager;
  this.FileUtils = ReadWriteOperations;
  this.Frame = Frame;
  this.oSelection = oSelection;
  this.ColorObj = ColorObj;
  this.oElement = oElement;
  this.Renderer = Renderer;
  this.DrawingDataUtils = DrawingDataUtils;
  this.Cell = Cell;
  this.DrawingCell = DrawingCell;
  this.Column = oColumn;
  this.PathColumn3D = oPathColumn3D;
  this.Palettes = GlobalPalettes;
  this.objDrawing = objDrawing;
  this.objElement = objElement;
  this.oDrawingLayer = oDrawingNode;
  this.ColorCardNode = oColorCardNode;
  this.columnGroupingColor = columnGroupingColor;
  this.columnGrouping = columnGrouping;

  this.assign = function (target, source) {
    if (!target || !source) return target;
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
    return target;
  };
}

var _ = new HarmonyGlobals();

var G: HarmonyGlobals = _;

// MessageLog.trace(
//   '>>>>>' + JSON.stringify(Object.keys(this.__proto__).indexOf('G') !== -1, null, 2),
// );

if (Object.keys(this.__proto__).indexOf('G') === -1) {
  this.__proto__.G = _;

  Object._ = _;

  this.__proto__.registeredTools = this.__proto__.registeredTools || {};
  this.__proto__.registeredActions = this.__proto__.registeredActions || {};
  this.__proto__.registeredToolbars = this.__proto__.registeredToolbars || {};

  this.__proto__.oColumn = oColumn;
  this.__proto__.oPathColumn3D = oPathColumn3D;
  this.__proto__.PermanentFile = PermanentFile;
  this.__proto__.Array = Array;

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
