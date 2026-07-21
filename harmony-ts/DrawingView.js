function getCurrent4Query() {
    var settings = Tools.getToolSettings();
    return {
        drawing: settings.currentDrawing,
        art: settings.activeArt
    };
}
function DrawingView() { }
;
function calculateBoundingBox(obj) {
    var minX = Number.POSITIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    var maxX = Number.NEGATIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;
    function recurse(obj) {
        if (Array.isArray(obj)) {
            for (var i = 0; i < obj.length; i++) {
                var item = obj[i];
                if (typeof item === "object")
                    recurse(item);
            }
        }
        else if (typeof obj === "object" && obj !== null) {
            if ("x" in obj && "y" in obj) {
                var coordX = new SingularCoordinate(obj.x, "x");
                var coordY = new SingularCoordinate(obj.y, "y");
                if (coordX.type === SingularCoordinateType.X) {
                    if (coordX.value < minX)
                        minX = coordX.value;
                    if (coordX.value > maxX)
                        maxX = coordX.value;
                }
                if (coordY.type === SingularCoordinateType.Y) {
                    if (coordY.value < minY)
                        minY = coordY.value;
                    if (coordY.value > maxY)
                        maxY = coordY.value;
                }
            }
            if ("x0" in obj && "x1" in obj && "y0" in obj && "y1" in obj) {
                var boxKeys = ["x0", "x1", "y0", "y1"];
                for (var k = 0; k < boxKeys.length; k++) {
                    var key = boxKeys[k];
                    var coord = new SingularCoordinate(obj[key], key);
                    if (coord.type === SingularCoordinateType.X) {
                        if (coord.value < minX)
                            minX = coord.value;
                        if (coord.value > maxX)
                            maxX = coord.value;
                    }
                    else if (coord.type === SingularCoordinateType.Y) {
                        if (coord.value < minY)
                            minY = coord.value;
                        if (coord.value > maxY)
                            maxY = coord.value;
                    }
                }
            }
            for (var key in obj) {
                if (!obj.hasOwnProperty(key))
                    continue;
                recurse(obj[key]);
            }
        }
    }
    recurse(obj);
    return {
        x0: minX,
        y0: minY,
        x1: maxX,
        y1: maxY
    };
}
function getBoundingBoxCenter(bbox) {
    return {
        x: (bbox.x0 + bbox.x1) / 2,
        y: (bbox.y0 + bbox.y1) / 2
    };
}
DrawingView.calculateBoundingBox = calculateBoundingBox;
DrawingView.getBoundingBoxCenter = getBoundingBoxCenter;
DrawingView.selectAll = function () { Action.perform("selectAll()", "cameraView"); };
DrawingView.groupSelection = function () { Action.perform("onActionGroup()", "cameraView"); };
DrawingView.getCurrentSelection = function (override) {
    var input = getCurrent4Query();
    if (override !== undefined) {
        return Drawing.selection.get(override);
    }
    return Drawing.selection.get(input);
};
DrawingView.getSelection = function () {
    var settings = Tools.getToolSettings();
    var data = Drawing.query.getData(getCurrent4Query());
    var arts = data.arts.map(function (currentArt) {
        var selectedLayers = Drawing.selection.get({
            drawing: settings.currentDrawing,
            art: currentArt.art
        }).selectedLayers;
        return {
            layerIndexes: selectedLayers,
            layers: selectedLayers.map(function (i_Layer) {
                return currentArt.layers[i_Layer];
            }),
            art: currentArt.art
        };
    });
    return { arts: arts };
};
DrawingView.ShapeUtils = {
    ShapeTypes: [
        { keys: ["x0", "y0", "x1", "y1"], paired: [["x0", "y0"], ["x1", "y1"]] },
        { keys: ["ox", "oy"], paired: [["ox", "oy"]] },
        { keys: ["x", "y"], paired: [["x", "y"]] }
    ],
    getShape: function (obj) {
        for (var i = 0; i < DrawingView.ShapeUtils.ShapeTypes.length; i++) {
            var shape = DrawingView.ShapeUtils.ShapeTypes[i];
            if (hasKeys(obj, shape.keys))
                return shape;
        }
        return null;
    }
};
function rotatePoint2d(x, y, angleRad, pivot) {
    var dx = x - pivot.x;
    var dy = y - pivot.y;
    var cosA = Math.cos(angleRad);
    var sinA = Math.sin(angleRad);
    var rx = dx * cosA - dy * sinA + pivot.x;
    var ry = dx * sinA + dy * cosA + pivot.y;
    return { x: rx, y: ry };
}
function recursiveApply(obj, methodName, args) {
    var stack = [obj];
    while (stack.length > 0) {
        var current = stack.pop();
        if (typeof current !== "object" || current === null)
            continue;
        var matchedShape = DrawingView.ShapeUtils.getShape(current);
        if (matchedShape)
            applyTransform(current, matchedShape.paired, methodName, args);
        if (Array.isArray(current)) {
            for (var j = 0; j < current.length; j++)
                stack.push(current[j]);
            continue;
        }
        for (var key in current)
            if (current.hasOwnProperty(key))
                stack.push(current[key]);
    }
}
function applyTransform(obj, pairs, methodName, args) {
    var ops = {
        translate: function (pair) {
            var vector = args[0];
            obj[pair[0]] += vector.x;
            obj[pair[1]] += vector.y;
        },
        scale: function (pair) {
            var scale = args[0];
            var origin = args[1];
            obj[pair[0]] = (obj[pair[0]] - origin.x) * scale.x + origin.x;
            obj[pair[1]] = (obj[pair[1]] - origin.y) * scale.y + origin.y;
        },
        rotate: function (pair) {
            var angleRad = args[0];
            var pivot = args[1];
            var p = rotatePoint2d(obj[pair[0]], obj[pair[1]], angleRad, pivot);
            obj[pair[0]] = p.x;
            obj[pair[1]] = p.y;
        }
    };
    var fn = ops[methodName];
    if (!fn)
        return;
    for (var i in pairs)
        fn(pairs[i]);
}
DrawingView.translateRecursive = function (obj, vector) { recursiveApply(obj, "translate", [vector]); };
DrawingView.scaleRecursive = function (obj, scaleVec, origin) { recursiveApply(obj, "scale", [scaleVec, origin]); };
DrawingView.rotateRecursive = function (obj, angleRad, pivot) { recursiveApply(obj, "rotate", [angleRad, pivot]); };
DrawingView.positionRecursive = function (obj, targetPosition, pivot) {
    var translateVector = {
        x: targetPosition.x - pivot.x,
        y: targetPosition.y - pivot.y
    };
    DrawingView.translateRecursive(obj, translateVector);
};
DrawingView.setScaleRecursive = function (obj, targetSize, center) {
    var bbox = calculateBoundingBox(obj);
    var currentWidth = bbox.x1 - bbox.x0;
    var currentHeight = bbox.y1 - bbox.y0;
    var scaleX, scaleY;
    if (targetSize.x > 0 && targetSize.y > 0) {
        scaleX = targetSize.x / currentWidth;
        scaleY = targetSize.y / currentHeight;
    }
    else if (targetSize.x > 0 && targetSize.y === 0) {
        scaleX = scaleY = targetSize.x / currentWidth;
    }
    else if (targetSize.y > 0 && targetSize.x === 0) {
        scaleX = scaleY = targetSize.y / currentHeight;
    }
    else {
        return;
    }
    DrawingView.scaleRecursive(obj, { x: scaleX, y: scaleY }, center);
};
DrawingView.paste = function (options) {
    var settings = Tools.getToolSettings();
    var data = options.data;
    if (options.layers !== undefined) {
        data = {
            arts: [{
                    layers: options.layers,
                    art: options.artLayer
                }]
        };
    }
    else {
        if (options.artLayer !== undefined) {
            data.arts = [{
                    layers: data,
                    art: options.artLayer
                }];
        }
    }
    var transformations = options.transformations || [];
    var bbox = calculateBoundingBox(data.arts);
    var center = options.pivot || getBoundingBoxCenter(bbox);
    var drawing = options.drawing || {
        node: selection.selectedNode(0),
        frame: frame.current()
    };
    var artsCompiled = data.arts.map(function (artLayer) {
        var layers = artLayer.layers;
        layers.forEach(function (layer) {
            (layer.strokes || []).forEach(function (stroke) {
                stroke.pencilColorId = stroke.colorId;
            });
        });
        transformations.forEach(function (curr_Transformation) {
            if (curr_Transformation instanceof Scale)
                DrawingView.scaleRecursive(layers, curr_Transformation.size, center);
            else if (curr_Transformation instanceof Rotate)
                DrawingView.rotateRecursive(layers, curr_Transformation.degrees, center);
            else if (curr_Transformation instanceof Translate)
                DrawingView.translateRecursive(layers, curr_Transformation.vector);
            else if (curr_Transformation instanceof Position)
                DrawingView.positionRecursive(layers, curr_Transformation.vector, center);
            else if (curr_Transformation instanceof SetScale) {
                var layerBbox = calculateBoundingBox(layers);
                var layerCenter = getBoundingBoxCenter(layerBbox);
                MessageLog.trace("=== SetScale Debug ===");
                MessageLog.trace("Art: " + artLayer.art);
                MessageLog.trace("Layer bbox: x0=" + layerBbox.x0 + ", y0=" + layerBbox.y0 + ", x1=" + layerBbox.x1 + ", y1=" + layerBbox.y1);
                MessageLog.trace("Layer size: w=" + (layerBbox.x1 - layerBbox.x0) + ", h=" + (layerBbox.y1 - layerBbox.y0));
                MessageLog.trace("Layer center: x=" + layerCenter.x + ", y=" + layerCenter.y);
                MessageLog.trace("Combined center: x=" + center.x + ", y=" + center.y);
                MessageLog.trace("Target size: x=" + curr_Transformation.size.x + ", y=" + curr_Transformation.size.y);
                DrawingView.setScaleRecursive(layers, curr_Transformation.size, layerCenter);
            }
        });
        var output = {
            drawing: drawing,
            art: artLayer.art || settings.activeArt,
            layers: layers
        };
        DrawingTools.createLayers(output);
        return output;
    });
    return artsCompiled;
};
DrawingView.createCircle = function (position, radius, outline) {
    var circlePath = Drawing.geometry.createCircle({
        x: position.x,
        y: position.y,
        radius: radius
    });
    var data;
    if (outline) {
        data = [{
                strokes: [{
                        colorId: "0c0b25adddd01181",
                        thickness: {
                            minThickness: 20,
                            maxThickness: 20,
                            fromThickness: 0,
                            toThickness: 1,
                            thicknessPath: 0
                        },
                        path: circlePath,
                        numBeziers: 4,
                        closed: true
                    }],
            }];
    }
    else {
        data = [{
                contours: [{
                        stroke: true,
                        pencilColorddId: "0000000000000003",
                        thickness: 1,
                        path: circlePath
                    }]
            }];
    }
    DrawingView.paste({
        layers: data,
    });
};
DrawingView.createRectangle = function (box, outline) {
    var rectPath = Drawing.geometry.createRectangle({
        x0: box.x0,
        y0: box.y0,
        x1: box.x1,
        y1: box.y1
    });
    var data;
    if (outline) {
        data = [{
                strokes: [{
                        colorId: "0000000000000003",
                        thickness: {
                            minThickness: 20,
                            maxThickness: 20,
                            fromThickness: 0,
                            toThickness: 1,
                            thicknessPath: 0
                        },
                        path: rectPath,
                        numBeziers: 4,
                        closed: true
                    }]
            }];
    }
    else {
        data = [{
                contours: [{
                        colorId: "0000000000000003",
                        path: rectPath
                    }]
            }];
    }
    DrawingView.paste({
        layers: data
    });
};
DrawingView.setSelection = function (selection) {
    var settings = Tools.getToolSettings();
    var input = {
        drawing: settings.currentDrawing,
        art: settings.activeArt,
        selectedStrokes: selection,
    };
    output = Drawing.selection.set(input);
    return output;
};
DrawingView.pasteGroup = function (data, pasteTo, transformations, options) {
    scene.beginUndoRedoAccum("Create Drawing example");
    var artMap = {};
    artMap[ArtLayers.UNDERLAY_ART] = DrawingTools.underlayArt;
    artMap[ArtLayers.COLOUR_ART] = DrawingTools.colourArt;
    artMap[ArtLayers.LINE_ART] = DrawingTools.lineArt;
    artMap[ArtLayers.OVERLAY_ART] = DrawingTools.overlayArt;
    var options = options || {};
    var transformations = transformations || [
        new Position(new Vector2d(0, 0)),
    ];
    var drawingData = pasteTo.getDrawingData();
    var pivot = getBoundingBoxCenter(calculateBoundingBox(data.arts));
    var pastedSelections = {};
    $.log("arts length: " + data.arts.length);
    var totalLayersPasted = 0;
    data.arts.forEach(function (sourceArt) {
        var currArt = null;
        if (drawingData.arts) {
            drawingData.arts.forEach(function (art) {
                if (art.art === sourceArt.art) {
                    currArt = art;
                }
            });
        }
        else {
        }
        var priorLayersLength = 0;
        if (currArt) {
            priorLayersLength = currArt.layers ? currArt.layers.length : 0;
        }
        DrawingTools.setCurrentArt(artMap[sourceArt.art]);
        pasteTo.paste({
            data: sourceArt.layers,
            artLayer: sourceArt.art,
            pivot: pivot,
            transformations: transformations
        });
        totalLayersPasted += sourceArt.layers.length;
        DrawingView.selectAll();
        var selectedStrokes = DrawingView.getCurrentSelection({
            drawing: { node: selection.selectedNode(0), frame: frame.current() },
            art: sourceArt.art
        });
        selectedStrokes = selectedStrokes.selectedStrokes || [];
        var narrowedSelection = selectedStrokes.filter(function (sel) {
            return sel.layer >= priorLayersLength;
        });
        if (narrowedSelection.length <= 0) {
            $.log("skipping : " + priorLayersLength + "/" + selectedStrokes.length);
            return;
        }
        DrawingView.setSelection(narrowedSelection);
        DrawingView.groupSelection();
        if (options.sendToBack === true) {
            Action.perform("onActionSendToBack()", "cameraView");
            MessageLog.trace("Sent group to back.");
        }
        validateAction("onActionGroup()");
        var groupedSelection = DrawingView.getCurrentSelection({
            drawing: { node: selection.selectedNode(0), frame: frame.current() },
            art: sourceArt.art
        });
        pastedSelections[sourceArt.art] = groupedSelection.selectedStrokes || [];
    });
    scene.endUndoRedoAccum();
};
