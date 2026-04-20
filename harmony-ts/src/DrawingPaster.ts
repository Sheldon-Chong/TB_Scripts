include(specialFolders.userScripts + "/utils/FileUtils.js");
include("JsonParser.js");
include("PositionTransformer.js");
include("Palletes.js");

// function getSelection() {

//     var currentNode = selection.selectedNode(0);
//     var currentFrame = frame.current();

//     var settings = Tools.getToolSettings();

//     var config = {
//         drawing: settings.currentDrawing,
//         art: settings.activeArt
//     }


//     var data = Drawing.query.getData(config);

//     var arts = data["arts"];

//     $.log(arts.length);

//     var newArts = [];

//     for (var x = 0; x < arts.length; x++) {
//         $.log(">>>>" + arts[x]["art"]);

//         var config = {
//             drawing: settings.currentDrawing,
//             art: data["arts"][x]["art"]
//         }

//         var layers = data["arts"][x]["layers"];
//         for (var i in layers) {
//             var strokes = layers[i].strokes;
//             if (!strokes || strokes.length === 0) continue;
//             for (var j = 0; j < strokes.length; j++)
//                 strokes[j].pencilColorId = strokes[j].colorId;
//         }

//         var selectedStrokes = Drawing.selection.get(config);

//         // $.log("\n\n\n>>>>>" + JSON.stringify(selectedStrokes, null, 2));
//         $.log("\n\n\n>>>>> length: " + selectedStrokes.selectedLayers.length);

//         var layers = [];

//         for (var i in selectedStrokes.selectedLayers) {
//             const strokeIndex = selectedStrokes.selectedLayers[i]
//             layers.push(data["arts"][x]["layers"][strokeIndex]);
//         }

//         newArts.push({
//             layers: layers,
//             art: data["arts"][x]["art"],
//             artName: data["arts"][x]["artName"]
//         });

//     }
//     $.log(JSON.stringify(newArts, null, 2));

//     return {
//         arts: newArts
//     };
// }


function printAllMethods(objectToInspect) {
    // A header for clarity in the message log
    MessageLog.trace("--- Methods for object: " + String(objectToInspect) + " ---");

    for (var propertyName in objectToInspect) {
        try {
            // Check if the property is a function
            if (typeof objectToInspect[propertyName] === 'function') {
                MessageLog.trace(propertyName);
            }
        } catch (e) {
            // Some properties may not be accessible and will throw an error
            MessageLog.trace("Could not access property: " + propertyName);
        }
    }

    MessageLog.trace("--- End of methods ---");
}


function getActions() {
    var responders = Action.getResponderList();
    for (var i in responders) {
        MessageLog.trace(responders[i]);
        // var actions = Action.getActionList(responders[i]);
        // for (var x in actions) {
        //     MessageLog.trace("\t" + actions[x]);
        // }
    }
}



function selectAllStrokes(node, frame, art) {
    var all = Drawing.selection.get({ drawing: { node: node, frame: frame }, art: art });
    if (!all || !all.selectedStrokes) return;

    // Create full selection first
    Drawing.selection.set({
        drawing: { node: node, frame: frame },
        art: art,
        selectedStrokes: all.selectedStrokes,
        selectedLayers: all.selectedLayers
    });
}

function findActionResponder(actionName) {
    var responders = Action.getResponderList();
    MessageLog.trace("Searching for: " + actionName);

    for (var i in responders) {
        try {
            var validateData = Action.validate(actionName, responders[i]);
            if (validateData && validateData.enabled) {
                MessageLog.trace("✔ " + actionName + " is ENABLED in responder: " + responders[i]);
            }
        } catch (err) {
            // Action not valid for this responder
        }
    }
}

function validateAction(action) {
    var validateData = Action.validate(action);
}

function validateAction2(action, context) {
    var validateData = Action.validate(action, context);
}

include("test.js");

const ArtLayers = {
    UNDERLAY_ART: 0,
    COLOUR_ART: 1,
    LINE_ART: 2,
    OVERLAY_ART: 3
}

const ArtLayersList = [
    ArtLayers.UNDERLAY_ART,
    ArtLayers.COLOUR_ART,
    ArtLayers.LINE_ART,
    ArtLayers.OVERLAY_ART
]

// function getSelection() {
//     var settings = Tools.getToolSettings();
//     if (!settings.currentDrawing) return;

//     var selected = {};
    
//     for (i_ArtLayer in ArtLayersList) { const currArtLayer = ArtLayersList[i_ArtLayer];
//         var output = Drawing.selection.get({
//             drawing: settings.currentDrawing,
//             art: currArtLayer
//         });
//         delete output["drawing"];
//         selected[currArtLayer] = output;
//     }

//     selected.toString = function () {
//         return ("vow");
//     };
//     return selected;
// } 




function main_paste() {

    // frame.setCurrent(1);
    MessageLog.trace("> selected: " + JSON.stringify(getSelection(), null, 2));


    // Action.perform("onActionMainGotoPreviousFrame()");
    // Action.perform("onActionChooseSelectToolOverride()", "cameraView");
    // Action.perform("onActionSelectAllCurrentPencilTexture()");

    var selectedStrokes = [
        { stroke: true, strokeIndex: 0, layer: 0 },
    ];
    var config = {
        drawing: { node: "Top/Drawing", frame: 1 },
        art: 3,
        selectedStrokes: selectedStrokes,
        selectedLayers: [0]
    };
    // var output = Drawing.selection.set(config);
    // Action.perform("onActionGroup()");



    // todo call select all command fisrt. Appears that set sleection only works after selectin gsomething else

    // todo sometimes works sometimes doesnt. Need to add a stroke


    // var sel = Drawing.selection.get(config.drawing, config.art);
    // MessageLog.trace(">>>> after set: " + JSON.stringify(sel, null, 2));

    // var tools = $.app.tools;

    // $.app.runMenuCommand("Mark Drawing As...", "Mark Drawing as: Sans");
    // $.app.runMenuCommand("Edit", "Group");
    // $.app.runMenuCommand("Tools", "Pencil");

    return;



    var new_frame = new Frame({
        index: 2,
        node: "Top/Drawing_16",
    })

    // var data = JSON.parse(GetFileContents(FileDialog.getOpenFileName()));
    var data = new_frame.getDrawingData();


    // // Parse the file data
    // var parsedData = JSON.parse(data);

    // paste(data["arts"][0]);

    data = getSelection();

    MessageLog.clearLog();
    MessageLog.trace("Data from file: " + JSON.stringify(data, null, 2));



    paste(data["arts"][0]);


    layers = data["arts"][0]["layers"];


}

// var widget = $.app.getWidgetByName("Tools");

// getActions();

// var validateData = Action.validate("asfasd()", "Camera View");
// // var activeView = Action.getResponder();
// Action.perform("groupSelection()", "Camera View");
// MessageLog.trace(">>>" + JSON.stringify(validateData));
// // MessageLog.trace(">>>" + Action.getActionList("sadads"));
// Action.perform("onActionGroup()");
// printAllMethods(Action);

// return ;



// var widgets = QApplication.topLevelWidgets();
// MessageLog.trace(JSON.stringify(widgets[0],null,2));
// for (var i in widgets) {var currentWidget = widgets[i];
//     if (currentWidget["title"] === "Edit") {
//         printAllMethods(currentWidget);
//         currentWidget.setFocus();
//     }
// }