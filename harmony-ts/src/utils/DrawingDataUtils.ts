
type DrawingData = any;

class DrawingDataUtils {
  static getPalletesUsedFromDrawingData(drawingData: DrawingData): Array<{
    pallete: PaletteObject;
    colors: Array<{
      color: DrawingColor;
      count: number;
    }>;
    cumulativeCount: number;
  }> {

    MessageLog.trace("test");

    if (!drawingData) {
      return [];
    }

    var palletes = PaletteObjectManager.getScenePaletteList();

    // Use recursiveWalk to collect colorIds from raw JSON data
    var colorIds: string[] = [];
    recursiveWalk(drawingData, function (key: string, value: any) {
      if (key === "colorId") colorIds.push(value);
    });

    var palletesFound: Array<{
      pallete: PaletteObject;
      colors: Array<{
        color: DrawingColor;
        count: number;
      }>;
      cumulativeCount: number;
    }> = [];
    for (var i = 0; i < palletes.numPalettes; i++) {
      var pallete = palletes.getPaletteByIndex(i);
      var colorsDict: { [key: string]: { color: DrawingColor; count: number } } = {};
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
      var colorsArr: { color: DrawingColor; count: number }[] = [];
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

    // Sort by cumulativeCount descending
    palletesFound.sort(function (a, b) {
      return b.cumulativeCount - a.cumulativeCount;
    });

    return palletesFound;
  }

  static getDrawingData(selection: oSelection, art: number) {
    const currentCell = selection.getCell();
    var data = Drawing.query.getData({
      drawing: {
        node: currentCell.node.nodePath,
        frame: selection.startFrame
      },
      art: art
    });
    return data;
  }
}

