include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/DrawingView.js');
include(specialFolders.userScripts + '/core/GlobalTimeline.js');
include(specialFolders.userScripts + '/core/Frame.js');
include(specialFolders.userScripts + '/core/Transformations.js');
include(specialFolders.userScripts + '/core/ColorUtils.js');
include(specialFolders.userScripts + '/core/Layers.js');
include(specialFolders.userScripts + '/utils/FileUtils.js');
include(specialFolders.userScripts + '/utils/DrawingDataUtils.js');
include(specialFolders.userScripts + '/utils/renderUtils.js');
include(specialFolders.userScripts + '/utils/utils.js');
include(specialFolders.userScripts + '/utils/GlobalPalettes.js');

include(specialFolders.userScripts + '/widgets/WidgetUtils.js');

include(specialFolders.userScripts + '/core/Toolbar.js');

function listAll() {
  var allNodesList = [];

  // Recursive helper function to crawl through groups
  function findNodesInGroup(parentPath) {
    var count = node.numberOfSubNodes(parentPath);

    for (var i = 0; i < count; i++) {
      // Get the full path of the current sub-node
      var currentNode = node.subNode(parentPath, i);
      allNodesList.push(currentNode);

      // If this node is a group, look inside it too
      if (node.isGroup(currentNode)) {
        findNodesInGroup(currentNode);
      }
    }
  }

  // Start crawling from the very top layer of the project
  var sceneRoot = node.root();
  findNodesInGroup(sceneRoot);

  // Print the results to the Message Log
  MessageLog.trace('--- Found ' + allNodesList.length + ' Nodes ---');
  for (var j = 0; j < allNodesList.length; j++) {
    MessageLog.trace(allNodesList[j]);
  }

  return allNodesList;
}

listAll();
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

var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
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
