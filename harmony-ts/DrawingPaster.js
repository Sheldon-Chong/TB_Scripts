include(specialFolders.userScripts + "/utils/FileUtils.js");
include("JsonParser.js");
include("PositionTransformer.js");
include("Palletes.js");
function printAllMethods(objectToInspect) {
    MessageLog.trace("--- Methods for object: " + String(objectToInspect) + " ---");
    for (var propertyName in objectToInspect) {
        try {
            if (typeof objectToInspect[propertyName] === 'function') {
                MessageLog.trace(propertyName);
            }
        }
        catch (e) {
            MessageLog.trace("Could not access property: " + propertyName);
        }
    }
    MessageLog.trace("--- End of methods ---");
}
function getActions() {
    var responders = Action.getResponderList();
    for (var i in responders) {
        MessageLog.trace(responders[i]);
    }
}
function selectAllStrokes(node, frame, art) {
    var all = Drawing.selection.get({ drawing: { node: node, frame: frame }, art: art });
    if (!all || !all.selectedStrokes)
        return;
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
        }
        catch (err) {
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
var ArtLayers = {
    UNDERLAY_ART: 0,
    COLOUR_ART: 1,
    LINE_ART: 2,
    OVERLAY_ART: 3
};
var ArtLayersList = [
    ArtLayers.UNDERLAY_ART,
    ArtLayers.COLOUR_ART,
    ArtLayers.LINE_ART,
    ArtLayers.OVERLAY_ART
];
function main_paste() {
    MessageLog.trace("> selected: " + JSON.stringify(getSelection(), null, 2));
    var selectedStrokes = [
        { stroke: true, strokeIndex: 0, layer: 0 },
    ];
    var config = {
        drawing: { node: "Top/Drawing", frame: 1 },
        art: 3,
        selectedStrokes: selectedStrokes,
        selectedLayers: [0]
    };
    return;
    var new_frame = new Frame({
        index: 2,
        node: "Top/Drawing_16",
    });
    var data = new_frame.getDrawingData();
    data = getSelection();
    MessageLog.clearLog();
    MessageLog.trace("Data from file: " + JSON.stringify(data, null, 2));
    paste(data["arts"][0]);
    layers = data["arts"][0]["layers"];
}
