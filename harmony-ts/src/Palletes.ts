// include("Shapes.js");
include(specialFolders.userScripts + "/utils/FileUtils.js");
include("Frame.js");


// Generic recursive walker: applies callback to each key/value pair
function recursiveWalk(obj, callback) {
  function recurse(o) {
    if (Array.isArray(o)) {
      for (var i = 0; i < o.length; i++)
        recurse(o[i]);
    }

    else if (typeof o === "object" && o !== null) {
      for (var key in o) {
        if (!o.hasOwnProperty(key)) continue;
        callback(key, o[key]);
        recurse(o[key]);
      }
    }
  }
  recurse(obj);
}

function getPalletesUsed(canvasObj) {
  var palletes = PaletteObjectManager.getScenePaletteList();

  // Use recursiveWalk to collect colorIds
  var colorIds = [];
  recursiveWalk(canvasObj.getData(), function (key, value) {
    if (key === "colorId") colorIds.push(value);
  });

  var palletesFoundDict = {};
  for (var i = 0; i < palletes.numPalettes; i++) {
    var pallete = palletes.getPaletteByIndex(i);
    for (var j = 0; j < colorIds.length; j++) {
      var color = pallete.getColorById(colorIds[j]);
      if (color.isValid === true) {
        // Use color.id or color.name as key, depending on your API
        var key = color.id || color.name || colorIds[j];
        if (!palletesFoundDict[key]) {
          palletesFoundDict[key] = JSON.stringify(color, null, 2);
        }
      }
    }
  }

  // Convert dictionary values to array
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

  // Use recursiveWalk to collect colorIds from raw JSON data
  var colorIds = [];
  recursiveWalk(jsonData, function (key, value) {
    if (key === "colorId") colorIds.push(value);
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
        } else {
          colorsDict[colorKey].count += 1;
        }
        cumulativeCount += 1;
      }
    }
    // Convert colorsDict to array
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
]


function getFrameAt(nodeName, frameIndex) {
  var drawingColumn = node.linkedColumn(nodeName, "DRAWING.ELEMENT");

  // get the value of a cell in a column at index i
  var exposure = column.getEntry(drawingColumn, 1, frameIndex);

  // get the corresponding element belonging to the node (Element refers to the drawing node)
  var elementId = node.getElementId(nodeName);

  // get the drawing object frame
  var frame = Drawing.Key({ node: nodeName, frame: frameIndex });
  // var frame = Drawing.Key({ elementId: elementId, exposure: exposure });


  // frame.exposure = exposure;

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
  const dialog =     new $.oProgressDialog("sdasd", 100, "Fwl", true);

  var nodes = node.getNodes(["READ"]);
  var canvas = new Canvas(frame.current(), nodes[0]);

  var palletesFound = getPalletesUsed(canvas);
  MessageLog.trace(">>" + palletesFound);
  MessageLog.trace("<<" + frame.current());
  MessageLog.trace("<<" + frame.numberOf());


  var scannedFrames = 0;
  const endFrame = 50;

  // -- get "drawing" nodes --

  const drawingNodes = [];
  for (var i in nodes) {
    const currentNode = nodes[i];
    if (currentNode.indexOf("Top/Drawing_") !== -1) {
      drawingNodes.push(currentNode);
    }
  }

  for (var i in drawingNodes) {
    MessageLog.trace(i + ". " + drawingNodes[i]);
  }


  // drawing nodes


  const profilesTally = {};

  for (i in characters) { const currentCharacter = characters[i];
    profilesTally[currentCharacter] = 0;
  }

  function getPalletesOfLayer(layerName) {
    var list = [];

    for (var currentFrame = 1; currentFrame < endFrame; currentFrame++) {

      var frame = new Frame({
        index: currentFrame,
        node: layerName
      })

      var palletesUsed = frame.getPalletesUsed();

      var profile = null;
      var max = -1;

      for (var j = 0; j < palletesUsed.length; j++) {
        if (
          palletesUsed[j].cumulativeCount > max &&
          characters.indexOf(palletesUsed[j].pallete.getName()) !== -1
        ) {
          max = palletesUsed[j].cumulativeCount;
          profile = palletesUsed[j];
        }
      }

      if (profile != null) {
        const name = profile.pallete.getName();
        list.push({
          profile: name,
          drawing_name: frame.exposure,
          frame_number: currentFrame
        });

        profilesTally[name] ++;

        scannedFrames++;
      }
    }

    return list;
  }

  const outputJson = {};

  MessageLog.trace("parsing : ", drawingNodes);

  for (var i in drawingNodes) {
    MessageLog.trace(i + ". " + drawingNodes[i]);
  }

  for (var i in drawingNodes) {
    const currentNode = drawingNodes[i];
    MessageLog.trace(i + ". parsing node " + currentNode);
    const list = getPalletesOfLayer(currentNode);
    dialog.value ++;
    outputJson[currentNode] = {
      project_path: workingStageFile,
      element_name: currentNode.substr(4),
      drawings: list,
    }
  }

  outputJson["tally"] = profilesTally;


  // - get current project dir --

  const projectPath = scene.currentProjectPath() + "/";


  // - get working xstage file --

  var dir = new Dir(projectPath);
  var xStageFiles = dir.entryList("*.xstage");

  var workingStageFile = "";
  for (var currentFrame in xStageFiles) {
    if (xStageFiles[currentFrame].indexOf("_modified.xstage") === -1) {
      workingStageFile = projectPath + xStageFiles[currentFrame];
    }
    MessageLog.trace(xStageFiles[currentFrame]);
  }


  // - write to output.json --
  const outputPath = "C:\\Users\\emers\\Desktop\\Coding projects\\Python Bot\\ToonBoom_Automations\\output.json";
  outputJson["project_path"] = workingStageFile;
  writeTo(outputPath, JSON.stringify(outputJson, null, 2));

  MessageLog.trace("Scanned " + scannedFrames + " frames")
  MessageLog.trace("nodes:");
}

  // for (var i = 0; i <  nodes.length; i ++) {
  //     var elementId = node.getElementId(nodes[i])
  //     MessageLog.trace("elem id "+ elementId);
  //     MessageLog.trace("elem id "+ nodes[i]);

  //     // MessageLog.trace(column.getName(1));
  //     // MessageLog.trace(">>>> "+ Drawing.numberOf(elementId));
  //     var columnName = column.getName(1);

  //     // MessageLog.trace(column.getDrawingColumnList()); // to get list of available columns
  //     // MessageLog.trace(JSON.stringify(data, null, 2));

  //     var elementKey = column.getElementIdOfDrawing(columnName);

  //     // MessageLog.trace(column.getDrawingTimings("ATV-0CE0C41F866E2A2B36B048AB"));
  //     // MessageLog.trace(elementKey);
  //     // MessageLog.trace(JSON.stringify(Drawing.Key(elementKey, 1), null, 2));
  
  //     var file1 = "C:/Users/emers/Downloads/New folder (17)/NewScene/elements/Drawing_1/Drawing_1-2.tvg";
  //     var file2 = "C:/Users/emers/Downloads/New folder (17)/NewScene/elements/vow/vow-2.tvg";

  // }










// var path = FileDialog.getSaveFileName();
// var file = new PermanentFile(path);
// if (!file.open(2)) {
//     MessageLog.trace("Failed to open file for reading.");
//     return;
// }

// file.write(list, -1);
// file.close();

  // for (var i = 0; i <  nodes.length; i ++) {
  //     var elementId = node.getElementId(nodes[i])
  //     MessageLog.trace("elem id "+ elementId);
  //     MessageLog.trace("elem id "+ nodes[i]);

  //     // MessageLog.trace(column.getName(1));
  //     // MessageLog.trace(">>>> "+ Drawing.numberOf(elementId));
  //     var columnName = column.getName(1);

  //     // MessageLog.trace(column.getDrawingColumnList()); // to get list of available columns
  //     // MessageLog.trace(JSON.stringify(data, null, 2));

  //     var elementKey = column.getElementIdOfDrawing(columnName);

  //     // MessageLog.trace(column.getDrawingTimings("ATV-0CE0C41F866E2A2B36B048AB"));
  //     // MessageLog.trace(elementKey);
  //     // MessageLog.trace(JSON.stringify(Drawing.Key(elementKey, 1), null, 2));

  //     var file1 = "C:/Users/emers/Downloads/New folder (17)/NewScene/elements/Drawing_1/Drawing_1-2.tvg";
  //     var file2 = "C:/Users/emers/Downloads/New folder (17)/NewScene/elements/vow/vow-2.tvg";

  // }

// var currentNode  = selection.selectedNode(0);
// var currentFrame = frame.current();

// var data = Drawing.query.getData({ drawing: { node: currentNode, frame: currentFrame } });
// MessageLog.trace("\t>>" + JSON.stringify(getPalletesUsedFromJson(data), null, 2));



// var elementNode = "Top/MyDrawing";
// // Get the name of the synced layer.
// var layerAttr = node.getAttr(elementNode, frame.current(), "DRAWING.ELEMENT.LAYER");
// var layerName = layerAttr.textValue();
// var elementId = node.getElementId(elementNode);
// var drawingColumn = node.linkedColumn(elementNode, "DRAWING.ELEMENT");
// var exposure = column.getEntry(drawingColumn, 1, frame.current());
// var drawingKey;
// if(layerName.length)
// {
//   drawingKey = Drawing.Key(elementId, exposure, layerName);
// }
// else
// {
//   // The given node isn't a synced layer, do not specify the layer name.
//   drawingKey = Drawing.Key(elementId, exposure);
// }








// var columnId = node.linkedColumn("Top/Drawing_2", "DRAWING.ELEMENT");
// var elementKey = column.getElementIdOfDrawing(columnId);
// var timings = column.getDrawingTimings(columnId);
// var dk = Drawing.Key(elementKey, timings[1]);
// DrawingTools.changeDrawingBitmapLayerResolution(dk, 0.1, {resampleBitmap:true, art:[2]});

// C:\Users\emers\AppData\Roaming\Toon Boom Animation\Toon Boom Harmony Premium\full-2400-pref\drawingTypes.d