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
include(specialFolders.userScripts + "/CameraView.js");
include(specialFolders.userScripts + "/utils/DrawingDataUtils.js");
include(specialFolders.userScripts + "/utils/renderUtils.js");
include("Toolbar.js");
include(specialFolders.userScripts + "/utils/GlobalPalettes.js");
function listAll() {
    var allNodesList = [];
    function findNodesInGroup(parentPath) {
        var count = node.numberOfSubNodes(parentPath);
        for (var i = 0; i < count; i++) {
            var currentNode = node.subNode(parentPath, i);
            allNodesList.push(currentNode);
            if (node.isGroup(currentNode)) {
                findNodesInGroup(currentNode);
            }
        }
    }
    var sceneRoot = node.root();
    findNodesInGroup(sceneRoot);
    MessageLog.trace("--- Found " + allNodesList.length + " Nodes ---");
    for (var j = 0; j < allNodesList.length; j++) {
        MessageLog.trace(allNodesList[j]);
    }
    return allNodesList;
}
listAll();
var HarmonyGlobals = (function () {
    function HarmonyGlobals() {
        this.Math = Maths;
        this.Transformations = Transformations;
        this.DrawingView = DrawingView;
        this.GlobalTimeline = GlobalTimeline;
        this.Utils = Utils;
        this.ColorUtils = ColorUtils;
        this.Widgets = Widgets;
        this.LayerManager = LayerManager;
        this.FileUtils = ReadWriteOperations;
        this.Frame = Frame;
        this.oSelection = oSelection;
        this.ColorObj = ColorObj;
        this.oElement = oElement;
        this.Renderer = Renderer;
        this.CameraView = CameraView;
        this.DrawingDataUtils = DrawingDataUtils;
        this.Cell = Cell;
        this.DrawingCell = DrawingCell;
        this.Column = Column;
        this.PathColumn3D = PathColumn3D;
        this.Palettes = GlobalPalettes;
        this.objDrawing = objDrawing;
        this.objElement = objElement;
        this.assign = function (target, source) {
            if (!target || !source)
                return target;
            for (var key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
            return target;
        };
        Object._ = this;
    }
    return HarmonyGlobals;
}());
var _ = new HarmonyGlobals();
Object._ = _;
var G = _;
this.__proto__.G = _;
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
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
