var DrawingDataUtils = (function () {
    function DrawingDataUtils() {
    }
    DrawingDataUtils.getPalletesUsedFromDrawingData = function (drawingData) {
        MessageLog.trace("test");
        if (!drawingData) {
            return [];
        }
        var palletes = PaletteObjectManager.getScenePaletteList();
        var colorIds = [];
        recursiveWalk(drawingData, function (key, value) {
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
        palletesFound.sort(function (a, b) {
            return b.cumulativeCount - a.cumulativeCount;
        });
        return palletesFound;
    };
    DrawingDataUtils.getDrawingData = function (selection, art) {
        var currentCell = selection.getCell();
        var data = Drawing.query.getData({
            drawing: {
                node: currentCell.node.nodePath,
                frame: selection.startFrame
            },
            art: art
        });
        return data;
    };
    return DrawingDataUtils;
}());
