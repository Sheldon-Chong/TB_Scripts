function showBasicCheckboxWidget() {
    var window = new QWidget();
    window.setWindowTitle("Checkbox Widget");
    var layout = new QVBoxLayout(window);
    var checkbox1 = new QCheckBox("Option 1");
    var checkbox2 = new QCheckBox("Option 2");
    var checkbox3 = new QCheckBox("Option 3");
    var checkboxes = [checkbox1, checkbox2, checkbox3];
    layout.addWidget(checkbox1, 0, 0);
    layout.addWidget(checkbox2, 0, 0);
    layout.addWidget(checkbox3, 0, 0);
    var button = new QPushButton("Check All");
    layout.addWidget(button, 0, 0);
    button.clicked.connect(function () {
        checkboxes.forEach(function (checkbox) {
            checkbox.setChecked(true);
        });
    });
    window.setLayout(layout);
    window.show();
    return window;
}
function getAllPathsFromStructure(structure) {
    var allPaths = [];
    if (!structure || !structure.arts)
        return allPaths;
    structure.arts.forEach(function (art) {
        if (!art.layers)
            return;
        art.layers.forEach(function (layer) {
            if (layer.strokes) {
                layer.strokes.forEach(function (stroke) {
                    if (stroke.path && Array.isArray(stroke.path)) {
                        allPaths.push(stroke.path);
                    }
                });
            }
            if (layer.contours) {
                layer.contours.forEach(function (contour) {
                    if (contour.path && Array.isArray(contour.path)) {
                        allPaths.push(contour.path);
                    }
                });
            }
        });
    });
    return allPaths;
}
include("openHarmony.js");
include("DrawingPaster.js");
include("test.js");
include("Transformations.js");
include(specialFolders.userScripts + "/utils/utils.js");
include(specialFolders.userScripts + "/utils/ColorUtils.js");
include("Frame.js");
include("GlobalTimeline.js");
include("DrawingView.js");
include(specialFolders.userScripts + "/utils/LogUtils.js");
include(specialFolders.userScripts + "/utils/Shapes.js");
include("Toolbar.js");
include("globals.js");
include("Layers.js");
var ArtLayers = {
    UNDERLAY_ART: 0,
    LINE_ART: 2,
    COLOUR_ART: 1,
    OVERLAY_ART: 3
};
var ArtLayersList = [ArtLayers.UNDERLAY_ART, ArtLayers.COLOUR_ART, ArtLayers.LINE_ART, ArtLayers.OVERLAY_ART];
function validateAction(action) {
    var validateData = Action.validate(action);
}
function pad(n) { return (n < 10 ? "0" : "") + n; }
function getTime() {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    var timeStr = pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    $.log(timeStr);
}
function recursiveWalk(obj, callback) {
    function recurse(o) {
        if (Array.isArray(o)) {
            for (var i = 0; i < o.length; i++)
                recurse(o[i]);
        }
        else if (typeof o === "object" && o !== null) {
            for (var key in o) {
                if (!o.hasOwnProperty(key))
                    continue;
                callback(key, o[key]);
                recurse(o[key]);
            }
        }
    }
    recurse(obj);
}
function getAllPalletes() {
    var palletes = {};
    var palletesInfo = PaletteObjectManager.getScenePaletteList();
    for (var i = 0; i < palletesInfo.numPalettes; i++) {
        var pallete = palletesInfo.getPaletteByIndex(i);
        pallete = new $.oPalette(pallete, palletesInfo);
        palletes[pallete.name] = pallete;
    }
    return palletes;
}
function getPalletesUsedFromJson(jsonData) {
    var palletes = PaletteObjectManager.getScenePaletteList();
    var colorIds = [];
    recursiveWalk(jsonData, function (key, value) {
        if (key === "colorId")
            colorIds.push(value);
    });
    var palletesFound = [];
    for (var i = 0; i < palletes.numPalettes; i++) {
        var pallete = palletes.getPaletteByIndex(i);
        var colorsDict = {};
        var cumulativeCount = 0;
        for (var j = 0; j < colorIds.length; j++) {
            var color = pallete.getColorById(colorIds[j]);
            if (color.isValid === true) {
                var colorKey = color.id || color.name || colorIds[j];
                if (!colorsDict[colorKey]) {
                    colorsDict[colorKey] = { color: color, count: 1 };
                }
                else {
                    colorsDict[colorKey].count += 1;
                }
                cumulativeCount += 1;
            }
        }
        var colorsArr = [];
        for (var k in colorsDict) {
            if (colorsDict.hasOwnProperty(k)) {
                colorsArr.push(colorsDict[k]);
            }
        }
        if (colorsArr.length > 0) {
            palletesFound.push({
                pallete: pallete,
                colors: colorsArr,
                cumulativeCount: cumulativeCount
            });
        }
    }
    return palletesFound;
}
function getProfile(selection) {
    var border = GlobalTimeline.getFrame({
        node: "Top/Drawing_9"
    });
    var selectionBoundingBox = calculateBoundingBox(selection);
    border.drawingData = border.getDrawingData();
    var color;
    border.drawingData.arts[0].layers.forEach(function (c_layer) {
        var boundingBox = calculateBoundingBox(c_layer);
        if (Maths.rectanglesCollide(boundingBox, selectionBoundingBox)) {
            color = getPalletesUsedFromJson(c_layer)[0].colors[0].color.name;
        }
    });
    return color;
}
var logger = new Logger("C:/Users/emers/AppData/Roaming/Toon Boom Animation/Toon Boom Harmony Premium/2400-scripts/log.json");
var Region = (function () {
    function Region(name, hitbox, centerline) {
        this.name = name;
        this.hitbox = hitbox;
        this.centerline = centerline;
    }
    return Region;
}());
function ProfileRegionSet(params) {
    this.drawing = GlobalTimeline.getFrame(params.drawing);
    this.regions = {};
    this.centerLines = [];
    var layers = this.drawing.getDrawingData().arts[0].layers;
    var foundCount = 0;
    layers.forEach(function (profileRegion) {
        var palInfo = getPalletesUsedFromJson(profileRegion);
        var regionName = (palInfo.length > 0) ? palInfo[0].colors[0].color.name : "";
        if (regionName === "centerline") {
            var hitbox = calculateBoundingBox(profileRegion);
            this.centerLines.push(hitbox);
            return;
        }
        if (ProfileSet.PROFILES.indexOf(regionName) === -1)
            return;
        var hitbox = calculateBoundingBox(profileRegion);
        this.regions[regionName] = new Region(regionName, hitbox, null);
        foundCount++;
    }, this);
    var self = this;
    Object.keys(self.regions).forEach(function (regionName) {
        var hitbox = self.regions[regionName].hitbox;
        self.centerLines.forEach(function (centerline) {
            if (Maths.rectanglesCollide(calculateBoundingBox(centerline), hitbox)) {
                self.regions[regionName].centerline = centerline;
            }
        });
    });
    $.log("Found " + foundCount + " out of " + ProfileSet.PROFILES.length + " profiles");
}
var DEFAULT_CHARACTER_PROFILES = "C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Premium\\2400-scripts\\characters";
var SEGMENT_MAPPING = {
    "Red": "upper",
    "Green": "middle",
    "Blue": "lower",
    "Black": "regions"
};
function saveProfilesToJSON(params) {
    var params = {};
    LayerManager.getNodeLayers().forEach(function (current) {
        var marker = Timeline.getFrameMarker(current.index, frame.current());
        if (marker) {
            var level = SEGMENT_MAPPING[marker.type];
            params[level] = { node: current.nodePath };
        }
    });
    var savePath = QFileDialog.getOpenFileName(0, "testing", DEFAULT_CHARACTER_PROFILES);
    if (!savePath)
        throw Error("Failed to load profiles from file: " + path);
    $.log("📁 Saving to \"" + savePath + "\"");
    var profileRegionSet = new ProfileRegionSet({
        drawing: params["regions"]
    });
    var levelLayers = {
        "upper": GlobalTimeline.getFrame(params.upper).getDrawingData(),
        "middle": GlobalTimeline.getFrame(params.middle).getDrawingData(),
        "lower": GlobalTimeline.getFrame(params.lower).getDrawingData()
    };
    var profiles = {};
    objectForEach(profileRegionSet.regions, function (profileName, profileRegion) {
        profiles[profileName] = {};
        ProfileSet.LEVEL_SHORT.forEach(function (levelName, i) {
            var levelData = levelLayers[ProfileSet.LEVEL[i]];
            var currentLayers = [];
            var artLayers = {};
            levelData.arts.forEach(function (artLayer) {
                var layers = [];
                objectForEach(artLayer.layers, function (i_layer, layer) {
                    if (Maths.rectanglesCollide(calculateBoundingBox(layer), profileRegion.hitbox)) {
                        layers.push(parseInt(i_layer));
                        currentLayers.push(layer);
                    }
                });
                artLayers[artLayer.art] = layers;
            });
            var bbox = calculateBoundingBox(currentLayers);
            var xOffset = 0;
            if (profileRegion.centerline) {
                var centerlineCenter = {
                    x: (profileRegion.centerline.x0 + profileRegion.centerline.x1) / 2,
                    y: (profileRegion.centerline.y0 + profileRegion.centerline.y1) / 2
                };
                var bboxCenter = {
                    x: (bbox.x0 + bbox.x1) / 2,
                    y: (bbox.y0 + bbox.y1) / 2
                };
                xOffset = bboxCenter.x - centerlineCenter.x;
            }
            profiles[profileName][levelName] = {
                artLayers: artLayers,
                bbox: bbox,
                xOffset: xOffset
            };
        });
    });
    var dataToSave = {
        profiles: profiles,
        project: getCurrentXstage(),
        frame: frame.current(),
        layers: {
            upper: params.upper,
            middle: params.middle,
            lower: params.lower
        },
        profileRegionHitboxes: profileRegionSet.regions
    };
    writeTo(savePath, JSON.stringify(dataToSave, null, 2));
}
var ProfileSet = (function () {
    function ProfileSet(path) {
        this._ = _;
        var fileContent = readFrom(path);
        if (!fileContent)
            throw Error("Failed to load profiles from file: " + path);
        var data = JSON.parse(fileContent);
        var profiles = data.profiles;
        var levelNames = ["upper", "middle", "lower"];
        var levels = {};
        levelNames.forEach(function (seg) {
            levels[seg] = {};
        });
        objectForEach(profiles, function (profileName, profileData) {
            levelNames.forEach(function (seg) {
                levels[seg][profileName] = (profileData[seg] && profileData[seg].artLayers) ? profileData[seg].artLayers : {};
            });
        });
        this.levels = levels;
        this.layers = data.layers;
        this.frame = data.frame;
        this.getAllPathsFromStructure = getAllPathsFromStructure;
    }
    ProfileSet.prototype.getLastSelectedNode = function () {
        return this._.GlobalTimeline.getSceneMetadata("LastSelectedNode", "string");
    };
    ProfileSet.prototype.updateLastSelectedNode = function (nodePath) {
        this._.GlobalTimeline.setSceneMetadata("LastSelectedNode", "string", nodePath, "MyScript", "1.0");
    };
    ProfileSet.prototype.getActiveNode = function () {
        var selNode = selection.selectedNode(0);
        if (selNode && selNode !== "")
            this.updateLastSelectedNode(selNode);
        else
            selNode = this.getLastSelectedNode();
        return selNode;
    };
    ProfileSet.prototype.pasteProfile = function (selectedProfile, selectedLevel, transformations, options) {
        var transformations = transformations || [];
        var options = options || {};
        var layersToPaste = {
            arts: []
        };
        var selNode = this.getActiveNode();
        if (!selNode)
            throw new Error("No destination node available");
        var activeProfileData = this.levels[selectedLevel][selectedProfile];
        if (!activeProfileData)
            throw new Error("Profile not found: " + selectedProfile);
        var srcFrame = this._.GlobalTimeline.getFrame({ node: this.layers[selectedLevel].node, index: this.frame });
        var data = srcFrame.getDrawingData();
        var dstFrame = this._.GlobalTimeline.getFrame({});
        data.arts.forEach(function (c_artLayer) {
            var artKey = c_artLayer.art;
            var layers = [];
            if (!activeProfileData[artKey])
                return;
            c_artLayer.layers.forEach(function (c_layer, i_layer) {
                if (activeProfileData[artKey].indexOf(i_layer) !== -1)
                    layers.push(c_layer);
            });
            layersToPaste.arts.push({
                layers: layers,
                art: c_artLayer.art
            });
        });
        this._.DrawingView.pasteGroup(layersToPaste, dstFrame, transformations, options);
    };
    ;
    ProfileSet.getAllPathsFromStructure = getAllPathsFromStructure;
    ProfileSet.LEVEL = ["upper", "middle", "lower"];
    ProfileSet.LEVEL_SHORT = ["upper", "middle", "lower"];
    ProfileSet.DEFAULT_CHARACTER_PROFILES = "C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Premium\\2400-scripts\\characters";
    ProfileSet.PROFILES = [
        "right_back",
        "right_3",
        "right_2",
        "right_1",
        "front",
        "left_1",
        "left_2",
        "left_3",
        "left_back"
    ];
    return ProfileSet;
}());
function showToast(labelText, position, duration, color) {
    var toast = new QWidget();
    toast.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.ToolTip);
    var bgColor = typeof color === "string" ? color : "rgba(" + color.r + "," + color.g + "," + color.b + ",0.5)";
    var styleSheet = "QWidget { background-color: " + bgColor + "; color: white; border-radius: 10px; padding: 10px; font-family: Arial; font-size: 12pt; }";
    toast.setStyleSheet(styleSheet);
    var layout = new QHBoxLayout(toast);
    layout.addWidget(new QLabel(labelText));
    toast.setAttribute(Qt.WA_DeleteOnClose);
    var win = QApplication.activeWindow();
    if (win && win.geometry) {
        var geom = win.geometry;
        var x = geom.x();
        var y = geom.y();
    }
    toast.move(x, y);
    toast.show();
    var timer = new QTimer();
    timer.singleShot = true;
    timer.timeout.connect(function () {
        toast.close();
    });
    timer.start(duration || 2000);
}
include(specialFolders.userScripts + "/utils/Maths.js");
var PasteProfileTool = (function () {
    function PasteProfileTool(profileSet) {
        this.GetFileContents = readFrom;
        this.ProfileSet = ProfileSet;
        this.name = "com.toonboom.pasteProfileTool";
        this.displayName = "Paste Profile Tool";
        this.icon = "MyTool.png";
        this.toolType = "drawing";
        this.canBeOverridenBySelectOrTransformTool = false;
        this.options = {};
        this.resourceFolder = "resources";
        this.defaultOptions = {};
        this.SNAP_THRESHOLD = 200;
        this.CAP_DISTANCE = 10000;
        this.pathBuffer = null;
        this.snapDistance = 2000;
        this._ = _;
        this.PasteProfileTool = PasteProfileTool;
        MessageLog.trace("Initializing PasteProfileTool");
        this.activeProfileSet = profileSet;
        stringify(_);
        MessageLog.trace("Loaded PasteProfileTool");
    }
    PasteProfileTool.prototype.updatePasteProfilePreview = function (selectedProfile, selectedLevel, srcFrameDrawingData) {
        var activeProfileData = this.activeProfileSet.levels[selectedLevel][selectedProfile];
        if (!activeProfileData)
            throw new Error("Profile not found: " + selectedProfile);
        var layersToPaste = {
            arts: []
        };
        srcFrameDrawingData.arts.forEach(function (c_artLayer) {
            var artKey = c_artLayer.art;
            var layers = [];
            if (!activeProfileData[artKey])
                return;
            c_artLayer.layers.forEach(function (c_layer, i_layer) {
                if (activeProfileData[artKey].indexOf(i_layer) !== -1)
                    layers.push(c_layer);
            });
            layersToPaste.arts.push({
                layers: layers,
                art: c_artLayer.art
            });
        });
        var pathBuffer = this.ProfileSet.getAllPathsFromStructure(layersToPaste);
        if (typeof scene !== "undefined" && typeof scene.setMetadata === "function") {
            this._.GlobalTimeline.setSceneMetadata("PasteProfileToolPreview", "string", JSON.stringify(pathBuffer), "PasteProfileTool", "1.0");
        }
        return layersToPaste;
    };
    PasteProfileTool.prototype.preferenceName = function () {
        return this.name + ".settings";
    };
    ;
    PasteProfileTool.prototype.loadFromPreferences = function () {
        try {
            var v = preferences.getString(this.preferenceName(), JSON.stringify(this.defaultOptions));
            this.options = JSON.parse(v);
        }
        catch (e) {
            this.options = this.defaultOptions;
        }
    };
    ;
    PasteProfileTool.prototype.storeToPreferences = function () {
        preferences.setString(this.preferenceName(), JSON.stringify(this.options));
    };
    ;
    PasteProfileTool.prototype.onRegister = function () {
        System.println("Registered tool: " + this.resourceFolder);
        this.loadFromPreferences();
    };
    ;
    PasteProfileTool.prototype.onCreate = function (ctx) {
        ctx.scale = 1.0;
    };
    ;
    PasteProfileTool.prototype.getLatestSelectedLevel = function () {
        return {
            selectedProfile: this.activeProfileSet._.GlobalTimeline.getSceneMetadata("SelectedProfile", "string"),
            currentLevelIndex: parseInt(this.activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string") || "0")
        };
    };
    PasteProfileTool.prototype.onMouseDown = function (ctx) {
        try {
            MessageLog.trace("On mouse down - Starting paste operation");
            var settings = Tools.getToolSettings();
            if (!settings.currentDrawing) {
                var settings = Tools.getToolSettings();
                if (settings.currentDrawing) {
                    return;
                }
                scene.beginUndoRedoAccum("Create Drawing example");
                settings = Tools.createDrawing();
                scene.endUndoRedoAccum();
            }
            var latestSelectedLevel = this.getLatestSelectedLevel();
            var currentLevel = this.ProfileSet.LEVEL[latestSelectedLevel.currentLevelIndex];
            var srcFrame = this.activeProfileSet._.GlobalTimeline.getFrame({
                node: this.activeProfileSet.layers[currentLevel].node,
                index: this.activeProfileSet.frame
            });
            var srcFrameDrawingData = srcFrame.getDrawingData();
            this.updatePasteProfilePreview(latestSelectedLevel.selectedProfile, currentLevel, srcFrameDrawingData);
            ctx.origin = ctx.currentPoint;
            ctx.scale = 1.0;
            var snapDistanceValue = null;
            if (typeof scene !== "undefined" && typeof scene.metadatas === "function") {
                var metadatas = scene.metadatas();
                for (var i = metadatas.length - 1; i >= 0; i--) {
                    var meta = metadatas[i];
                    if (meta.name === "SnapDistance" && meta.value !== undefined && meta.value !== null && meta.value !== "") {
                        snapDistanceValue = parseFloat(meta.value);
                        break;
                    }
                }
            }
            MessageLog.trace("Read SnapDistance from metadata: " + snapDistanceValue);
            this.snapDistance = (typeof snapDistanceValue === "number" && !isNaN(snapDistanceValue)) ? snapDistanceValue : PasteProfileTool.DEFAULT_SNAP_DISTANCE;
            return true;
        }
        catch (e) {
            MessageLog.trace("Error in onMouseDown: " + e.toString());
            return false;
        }
    };
    ;
    PasteProfileTool.prototype.onMouseMove = function (ctx) {
        var isPreviewUpdated = this._.GlobalTimeline.getSceneMetadata("isPreviewUpdated", "string");
        MessageLog.trace("On mouse move - Updating preview, isPreviewUpdated: " + isPreviewUpdated);
        var COLORS = this.PasteProfileTool.COLORS;
        if (!ctx.origin)
            return true;
        try {
            if (isPreviewUpdated === "true") {
                var selectedProfile = this.activeProfileSet._.GlobalTimeline.getSceneMetadata("SelectedProfile", "string");
                var currentLevelIndex = parseInt(this.activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string") || "0");
                var currentLevel = this.ProfileSet.LEVEL[currentLevelIndex];
                var srcFrame = this.activeProfileSet._.GlobalTimeline.getFrame({
                    node: this.activeProfileSet.layers[currentLevel].node,
                    index: this.activeProfileSet.frame
                });
                var srcFrameDrawingData = srcFrame.getDrawingData();
                this.updatePasteProfilePreview(selectedProfile, currentLevel, srcFrameDrawingData);
                this._.GlobalTimeline.setSceneMetadata("isPreviewUpdated", "string", "false", "PasteProfileTool", "1.0");
            }
            var diff = this._.Math.subtract2d(ctx.currentPoint, ctx.origin);
            var distance = this._.Math.distance2d(ctx.origin, ctx.currentPoint);
            var angle = Math.atan2(diff.y, diff.x);
            var snapped = false;
            if (!ctx.shiftPressed) {
                if (Math.abs(distance - this.snapDistance) < this.SNAP_THRESHOLD) {
                    distance = this.snapDistance;
                    snapped = true;
                }
            }
            if (distance > this.CAP_DISTANCE)
                distance = this.CAP_DISTANCE;
            ctx.currentPoint = this._.Math.getPointAtDistance(ctx.origin, angle, distance);
            diff = this._.Math.subtract2d(ctx.currentPoint, ctx.origin);
            ctx.lastDraggedDistance = distance;
            if (distance === 0) {
                ctx.overlay = {};
                return true;
            }
            var width = 600;
            var draggedArea = new this._.Shapes.Rectangle({
                start: ctx.origin,
                end: ctx.currentPoint
            });
            ctx.center = draggedArea.center;
            var scaleFactor = 100;
            ctx.scale = Math.max(0.1, distance / scaleFactor);
            ctx.rotationAngle = Math.atan2(diff.y, diff.x);
            var dragRect = new this._.Shapes.Rectangle({
                center: ctx.center,
                width: distance,
                height: width,
                rotation: ctx.rotationAngle,
                color: snapped ? COLORS.rectangleGreen : COLORS.rectangleRed
            });
            var overlayPaths = [{
                    path: dragRect.toPath(),
                    color: dragRect.color
                }];
            var previewPaths = null;
            if (typeof scene !== "undefined" && typeof scene.metadata === "function") {
                var meta = scene.metadata("PasteProfileToolPreview", "string");
                if (meta && meta.value) {
                    try {
                        previewPaths = JSON.parse(meta.value);
                    }
                    catch (e) {
                        MessageLog.trace("Failed to parse previewPaths from metadata: " + e.toString());
                        previewPaths = null;
                    }
                }
            }
            if (previewPaths && !Array.isArray(previewPaths)) {
                previewPaths = null;
            }
            if (Array.isArray(previewPaths) && previewPaths.length > 0) {
                var previewScale = ctx.scale || 1.0;
                var previewAngle = Math.atan2(diff.y, diff.x) + Math.PI / 2;
                var previewCenter = ctx.center || ctx.origin;
                var bbox = this._.DrawingView.calculateBoundingBox(previewPaths);
                var center = this._.DrawingView.getBoundingBoxCenter(bbox);
                this._.DrawingView.translateRecursive(previewPaths, { x: ctx.xOffset, y: 0 });
                this._.DrawingView.scaleRecursive(previewPaths, { x: previewScale / 20, y: previewScale / 20 }, center);
                this._.DrawingView.rotateRecursive(previewPaths, previewAngle, center);
                this._.DrawingView.translateRecursive(previewPaths, this._.Math.subtract2d(previewCenter, center));
                var color = { r: 0, g: 0, b: 255, a: 200 };
                previewPaths.forEach(function (pathObj) {
                    if (pathObj.strokes) {
                        pathObj.strokes.forEach(function (stroke) {
                            overlayPaths.push({
                                path: stroke.path,
                                color: color
                            });
                        });
                    }
                    if (pathObj.contours) {
                        pathObj.contours.forEach(function (contour) {
                            overlayPaths.push({
                                path: contour.path,
                                color: color
                            });
                        });
                    }
                    if (Array.isArray(pathObj)) {
                        overlayPaths.push({
                            path: pathObj,
                            color: color
                        });
                    }
                });
            }
            var snapLineDistance = this.snapDistance;
            var angle = Math.atan2(diff.y, diff.x);
            var snapLine = new this._.Shapes.Line({
                start: draggedArea.start,
                end: this._.Math.getPointAtDistance(draggedArea.start, angle, snapLineDistance),
                color: COLORS.snapLine
            });
            overlayPaths.push({
                path: snapLine.toPath(),
                color: snapLine.color
            });
            var selectedProfile = this.activeProfileSet._.GlobalTimeline.getSceneMetadata("SelectedProfile", "string");
            var currentLevelIndex = parseInt(this.activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string") || "0");
            var currentLevel = this.ProfileSet.LEVEL_SHORT[currentLevelIndex];
            var profilesData = this.activeProfileSet ? this.activeProfileSet : null;
            var bbox = null;
            if (profilesData && profilesData.levels && selectedProfile && currentLevel) {
                var fileContent = this.GetFileContents(this.ProfileSet.DEFAULT_CHARACTER_PROFILES + "\\papyrus.json");
                if (fileContent) {
                    var json = JSON.parse(fileContent);
                    if (json.profiles && json.profiles[selectedProfile] && json.profiles[selectedProfile][currentLevel] && json.profiles[selectedProfile][currentLevel].bbox) {
                        bbox = json.profiles[selectedProfile][currentLevel].bbox;
                    }
                    ctx.xOffset = json.profiles[selectedProfile][currentLevel].xOffset || 0;
                }
            }
            if (bbox) {
                var bboxRect = new this._.Shapes.Rectangle(bbox);
                overlayPaths.push({
                    path: bboxRect.toPath(),
                    color: bboxRect.color
                });
            }
        }
        catch (e) {
            MessageLog.trace("Error displaying bbox preview: " + e.toString());
        }
        ctx.overlay = {
            paths: overlayPaths
        };
        return true;
    };
    PasteProfileTool.prototype.onMouseUp = function (ctx) {
        if (!ctx.origin)
            return true;
        var levelIndex = this.activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string");
        var lastDragged = ctx.lastDraggedDistance;
        if (typeof scene !== "undefined" && typeof scene.metadatas === "function" && typeof scene.removeMetadata === "function") {
            var metadatas = scene.metadatas();
            for (var i = 0; i < metadatas.length; i++) {
                var meta = metadatas[i];
                if (meta.name === "SnapDistance" && meta.value !== undefined && meta.value !== null && meta.value !== "") {
                    var meta = scene.metadata("SnapDistance", "double");
                    if (meta)
                        scene.removeMetadata(meta);
                }
            }
        }
        this.activeProfileSet._.GlobalTimeline.setSceneMetadata("SnapDistance", "double", lastDragged, "MyScript", "1.0");
        if (typeof scene !== "undefined" && typeof scene.metadatas === "function") {
            var metadatas = scene.metadatas();
            MessageLog.trace("Scene metadatas:");
            metadatas.forEach(function (meta, idx) {
                MessageLog.trace("[" + idx + "] " + JSON.stringify(meta));
            });
        }
        else {
            MessageLog.trace("scene.metadatas() not available.");
        }
        try {
            var transformations = [
                new this._.Transformations.Translate(new Vector2d(ctx.xOffset, 0)),
                new this._.Transformations.Rotate(ctx.rotationAngle + this._.Math.degreesToRadians(90), ctx.center),
                new this._.Transformations.Scale(new Vector2d(ctx.scale / 20, ctx.scale / 20), ctx.center),
                new this._.Transformations.Position(ctx.center),
            ];
            var selectedProfile = this.activeProfileSet._.GlobalTimeline.getSceneMetadata("SelectedProfile", "string");
            if (!selectedProfile)
                throw new Error("No profile selected for pasting.");
            var currentLevelIndex = parseInt(this.activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string") || "0");
            var currentLevel = this.ProfileSet.LEVEL[currentLevelIndex];
            this.activeProfileSet.pasteProfile(selectedProfile, currentLevel, transformations, {
                sendToBack: (levelIndex === "1" || levelIndex === "2")
            });
            MessageLog.trace("Profile pasted at " + JSON.stringify({ x: ctx.center.x, y: ctx.center.y }) + " with scale " + ctx.scale);
            MessageLog.trace("Scale: " + ctx.scale + ", Rotation (radians): " + ctx.rotationAngle);
        }
        catch (e) {
            if (e.fileName)
                MessageLog.trace("File: " + e.fileName);
            MessageLog.trace("Error: " + e.toString());
            if (e.lineNumber)
                MessageLog.trace("Line: " + e.lineNumber);
        }
        ctx.origin = null;
        ctx.scale = 1.0;
        ctx.overlay = {};
        return true;
    };
    ;
    PasteProfileTool.prototype.onResetTool = function (ctx) {
        ctx.origin = null;
        ctx.scale = 1.0;
        ctx.overlay = {};
    };
    ;
    PasteProfileTool.prototype.loadPanel = function (dialog, responder) {
    };
    ;
    PasteProfileTool.prototype.refreshPanel = function (dialog, responder) {
    };
    ;
    PasteProfileTool.DEFAULT_SNAP_DISTANCE = 2000;
    PasteProfileTool.COLORS = {
        rectangleGreen: { r: 0, g: 255, b: 0, a: 128 },
        rectangleRed: { r: 255, g: 0, b: 0, a: 128 },
        snapLine: { r: 0, g: 0, b: 255, a: 200 },
        bboxPreview: { r: 0, g: 255, b: 255, a: 128 }
    };
    return PasteProfileTool;
}());
function evalData() {
    try {
        var activeProfileSet = new ProfileSet("C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Premium\\2400-scripts\\characters\\papyrus.json");
        var show_toast = showToast;
        var toolInstance = new PasteProfileTool(activeProfileSet);
        var tid = Tools.registerTool(toolInstance);
        Tools.setCurrentTool(tid);
        ProfileSet.PROFILES.forEach(function (profileName, index) {
            registerAction({
                name: "Paste Profile_" + profileName,
                icon: "earth.png",
                callback: function () {
                    try {
                        var latestSelectedLevel = toolInstance.getLatestSelectedLevel();
                        var currentLevel = toolInstance.ProfileSet.LEVEL[latestSelectedLevel.currentLevelIndex];
                        var srcFrame = toolInstance.activeProfileSet._.GlobalTimeline.getFrame({
                            node: toolInstance.activeProfileSet.layers[currentLevel].node,
                            index: toolInstance.activeProfileSet.frame
                        });
                        var srcFrameDrawingData = srcFrame.getDrawingData();
                        toolInstance.updatePasteProfilePreview(latestSelectedLevel.selectedProfile, currentLevel, srcFrameDrawingData);
                        activeProfileSet._.GlobalTimeline.setSceneMetadata("isPreviewUpdated", "string", "true", "PasteProfileTool", "1.0");
                        MessageLog.trace("updated preview");
                        MessageLog.trace("preview " + activeProfileSet._.GlobalTimeline.getSceneMetadata("isPreviewUpdated", "string"));
                        activeProfileSet._.GlobalTimeline.setSceneMetadata("SelectedProfile", "string", profileName, "MyScript", "1.0");
                        Tools.setCurrentTool(tid);
                        show_toast("Switch to " + profileName, undefined, 2000, { r: 0, g: 0, b: 0, a: 200 });
                    }
                    catch (e) {
                        MessageLog.trace("Error showing toast: " + e.toString());
                    }
                },
                shortcut: "Ctrl+Alt+1"
            });
        });
        var profileSet = ProfileSet;
        registerAction({
            name: "Cycle Level",
            icon: "earth.png",
            callback: function () {
                try {
                    var currentIndex = parseInt(activeProfileSet._.GlobalTimeline.getSceneMetadata("CurrentLevelIndex", "string") || "0");
                    currentIndex = (currentIndex + 1) % 3;
                    activeProfileSet._.GlobalTimeline.setSceneMetadata("CurrentLevelIndex", "string", currentIndex.toString(), "MyScript", "1.0");
                    var currentLevel = profileSet.LEVEL[currentIndex];
                    MessageLog.trace("Switched to level: " + currentLevel);
                    var toastLabel = "Switched to level: " + currentLevel;
                    var toastPosition = undefined;
                    var toastDuration = 1000;
                    var toastColor = "#222222ff";
                    show_toast(toastLabel, toastPosition, toastDuration, toastColor);
                }
                catch (e) {
                    MessageLog.trace("Error showing toast: " + e.toString());
                }
            },
            shortcut: "Ctrl+Alt+S"
        });
    }
    catch (e) {
        MessageLog.trace("Error initializing PasteProfileTool: " + e.toString());
        MessageLog.trace(e.stack);
    }
}
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
