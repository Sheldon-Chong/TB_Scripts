include(specialFolders.userScripts + "/utils/FileUtils.js");
include("Frame.js");
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
function getPalletesUsed(canvasObj) {
    var palletes = PaletteObjectManager.getScenePaletteList();
    var colorIds = [];
    recursiveWalk(canvasObj.getData(), function (key, value) {
        if (key === "colorId")
            colorIds.push(value);
    });
    var palletesFoundDict = {};
    for (var i = 0; i < palletes.numPalettes; i++) {
        var pallete = palletes.getPaletteByIndex(i);
        for (var j = 0; j < colorIds.length; j++) {
            var color = pallete.getColorById(colorIds[j]);
            if (color.isValid === true) {
                var key = color.id || color.name || colorIds[j];
                if (!palletesFoundDict[key]) {
                    palletesFoundDict[key] = JSON.stringify(color, null, 2);
                }
            }
        }
    }
    var palletesFound = [];
    for (var k in palletesFoundDict) {
        if (palletesFoundDict.hasOwnProperty(k)) {
            palletesFound.push(palletesFoundDict[k]);
        }
    }
    return palletesFound;
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
var characters = [
    "Papyrus",
    "Sans",
    "CyberLegends",
    "Undyne",
    "Alphys",
    "Mettaton",
    "Chara"
];
function getFrameAt(nodeName, frameIndex) {
    var drawingColumn = node.linkedColumn(nodeName, "DRAWING.ELEMENT");
    var exposure = column.getEntry(drawingColumn, 1, frameIndex);
    var elementId = node.getElementId(nodeName);
    var frame = Drawing.Key({ node: nodeName, frame: frameIndex });
    return frame;
}
function listAllNodes() {
    var allNodes = node.getNodes(["READ"]);
    MessageLog.trace("All nodes in the scene:");
    for (var i = 0; i < allNodes.length; i++) {
        MessageLog.trace(i + ". " + allNodes[i]);
    }
    return allNodes;
}
function main_pallete() {
    MessageLog.clearLog();
    var dialog = new $.oProgressDialog("sdasd", 100, "Fwl", true);
    var nodes = node.getNodes(["READ"]);
    var canvas = new Canvas(frame.current(), nodes[0]);
    var palletesFound = getPalletesUsed(canvas);
    MessageLog.trace(">>" + palletesFound);
    MessageLog.trace("<<" + frame.current());
    MessageLog.trace("<<" + frame.numberOf());
    var scannedFrames = 0;
    var endFrame = 50;
    var drawingNodes = [];
    for (var i in nodes) {
        var currentNode = nodes[i];
        if (currentNode.indexOf("Top/Drawing_") !== -1) {
            drawingNodes.push(currentNode);
        }
    }
    for (var i in drawingNodes) {
        MessageLog.trace(i + ". " + drawingNodes[i]);
    }
    var profilesTally = {};
    for (i in characters) {
        var currentCharacter = characters[i];
        profilesTally[currentCharacter] = 0;
    }
    function getPalletesOfLayer(layerName) {
        var list = [];
        for (var currentFrame = 1; currentFrame < endFrame; currentFrame++) {
            var frame = new Frame({
                index: currentFrame,
                node: layerName
            });
            var palletesUsed = frame.getPalletesUsed();
            var profile = null;
            var max = -1;
            for (var j = 0; j < palletesUsed.length; j++) {
                if (palletesUsed[j].cumulativeCount > max &&
                    characters.indexOf(palletesUsed[j].pallete.getName()) !== -1) {
                    max = palletesUsed[j].cumulativeCount;
                    profile = palletesUsed[j];
                }
            }
            if (profile != null) {
                var name_1 = profile.pallete.getName();
                list.push({
                    profile: name_1,
                    drawing_name: frame.exposure,
                    frame_number: currentFrame
                });
                profilesTally[name_1]++;
                scannedFrames++;
            }
        }
        return list;
    }
    var outputJson = {};
    MessageLog.trace("parsing : ", drawingNodes);
    for (var i in drawingNodes) {
        MessageLog.trace(i + ". " + drawingNodes[i]);
    }
    for (var i in drawingNodes) {
        var currentNode = drawingNodes[i];
        MessageLog.trace(i + ". parsing node " + currentNode);
        var list = getPalletesOfLayer(currentNode);
        dialog.value++;
        outputJson[currentNode] = {
            project_path: workingStageFile,
            element_name: currentNode.substr(4),
            drawings: list,
        };
    }
    outputJson["tally"] = profilesTally;
    var projectPath = scene.currentProjectPath() + "/";
    var dir = new Dir(projectPath);
    var xStageFiles = dir.entryList("*.xstage");
    var workingStageFile = "";
    for (var currentFrame in xStageFiles) {
        if (xStageFiles[currentFrame].indexOf("_modified.xstage") === -1) {
            workingStageFile = projectPath + xStageFiles[currentFrame];
        }
        MessageLog.trace(xStageFiles[currentFrame]);
    }
    var outputPath = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\output.json";
    outputJson["project_path"] = workingStageFile;
    writeTo(outputPath, JSON.stringify(outputJson, null, 2));
    MessageLog.trace("Scanned " + scannedFrames + " frames");
    MessageLog.trace("nodes:");
}
