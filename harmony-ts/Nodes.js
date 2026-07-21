include("GlobalTimeline.js");
include("openHarmony.ts");
var destinationNode = "Top/lighting_controller_8";
var outputSlot = 7;
function saveSelection() {
    setMetadata("selectedNodes", JSON.stringify(selection.selectedNodes()));
}
var _NodeUtils = (function () {
    function _NodeUtils() {
    }
    _NodeUtils.prototype.findAvailablePort = function (inputNode) {
        for (var i = node.numberOfInputPorts(inputNode) - 1; i >= 0; i--) {
            if (node.isLinked(inputNode, i) === false) {
                return i;
            }
        }
        return -1;
    };
    _NodeUtils.prototype.quickLinkNodes = function (currentNode, destinationNodes) {
        for (var _i = 0, destinationNodes_1 = destinationNodes; _i < destinationNodes_1.length; _i++) {
            var destinationNode = destinationNodes_1[_i];
            var port = this.findAvailablePort(destinationNode);
            if (port >= 0) {
                node.link(currentNode, 0, destinationNode, port);
            }
        }
    };
    _NodeUtils.prototype.numberOfAvailablePorts = function (inputNode) {
        var count = 0;
        for (var i = node.numberOfInputPorts(inputNode) - 1; i >= 0; i--) {
            if (node.isLinked(inputNode, i) === false) {
                count++;
            }
        }
        return count;
    };
    return _NodeUtils;
}());
var NodeUtils = new _NodeUtils();
include("Toolbar.js");
include("globals.ts");
function registerTestAction() {
    var nodeUtils = NodeUtils;
    registerAction({
        name: "collectInitialNodes",
        icon: "C:\\Users\\emers\\Downloads\\9g5myzcb8i0g1.jpeg",
        callback: function (_) {
            var saveNodes = selection.selectedNodes();
            try {
                MessageLog.trace("saved " + saveNodes.length + " nodes");
                saveNodes.sort(function (a, b) {
                    return node.coordX(a) - node.coordX(b);
                });
                _.GlobalTimeline.setMetadata("selectedNodes", JSON.stringify(saveNodes));
            }
            catch (e) {
                MessageLog.trace("Error collecting selected nodes: " + e.message + " | line number " + e.lineNumber);
            }
        },
    });
    registerAction({
        name: "perform operation",
        icon: "C:\\Users\\emers\\Downloads\\9g5myzcb8i0g1.jpeg",
        callback: function (_) {
            try {
                var destinationNodes = selection.selectedNodes();
                destinationNodes.sort();
                if (destinationNodes.length === 0) {
                    MessageLog.trace("No destination nodes selected.");
                    destinationNodes = JSON.parse(_.GlobalTimeline.getMetadata("savedDestinationNodes"));
                }
                var savedNodes = JSON.parse(_.GlobalTimeline.getMetadata("selectedNodes"));
                MessageLog.trace(JSON.stringify(savedNodes, null, 2));
                MessageLog.trace(JSON.stringify(destinationNodes, null, 2));
                MessageLog.trace(JSON.stringify(node.numberOfOutputPorts(savedNodes[0]), null, 2));
                _.GlobalTimeline.setMetadata("savedDestinationNodes", JSON.stringify(destinationNodes));
                var allDestNodesHaveSamePortCount = true;
                var firstNodePortCount = node.numberOfInputPorts(destinationNodes[0]);
                for (var i = 0; i < destinationNodes.length; i++) {
                    if (node.numberOfInputPorts(destinationNodes[i]) !== firstNodePortCount) {
                        allDestNodesHaveSamePortCount = false;
                        break;
                    }
                }
                MessageLog.trace("All destination nodes have same port count: " + allDestNodesHaveSamePortCount);
                if (destinationNodes.length === 1) {
                    MessageLog.trace("Only one destination node, linking all saved nodes to it...");
                    var destNode = destinationNodes[0];
                    if (allDestNodesHaveSamePortCount) {
                        var destNodePortCount = node.numberOfInputPorts(destNode);
                        for (var i = 0; i < destNodePortCount; i++) {
                            node.link(savedNodes[0], i, destNode, i);
                        }
                    }
                }
                else {
                    scene.beginUndoRedoAccum("Apply Lighting Effects");
                    if (savedNodes.length === 1) {
                        MessageLog.trace("Matching number of ports, linking nodes...");
                        nodeUtils.quickLinkNodes(savedNodes[0], destinationNodes);
                    }
                    else {
                        if (allDestNodesHaveSamePortCount && savedNodes.length === node.numberOfInputPorts(destinationNodes[0])) {
                            MessageLog.trace("Matching number of nodes and ports, linking nodes one-to-one...");
                            for (var i = 0; i < savedNodes.length; i++) {
                                nodeUtils.quickLinkNodes(savedNodes[i], destinationNodes);
                            }
                        }
                    }
                    scene.endUndoRedoAccum();
                }
            }
            catch (e) {
                MessageLog.trace("Error performing operation: " + e.message);
            }
        },
    });
    registerAction({
        name: "unlinkAllInputs",
        icon: "C:\\Users\\emers\\Downloads\\9g5myzcb8i0g1.jpeg",
        callback: function (_) {
            var selectedNodes = selection.selectedNodes();
            scene.beginUndoRedoAccum("Unlink All Inputs");
            for (var _i = 0, selectedNodes_1 = selectedNodes; _i < selectedNodes_1.length; _i++) {
                var nodePath = selectedNodes_1[_i];
                for (var i = node.numberOfInputPorts(nodePath) - 1; i >= 0; i--) {
                    node.unlink(nodePath, i);
                }
            }
            scene.endUndoRedoAccum();
        },
    });
    finalizeToolbars();
}
