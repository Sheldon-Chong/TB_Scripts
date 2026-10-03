// include('globals.js');

include('global-test.js');
include(specialFolders.userScripts + '/core/DrawingDataKit.js');

function getFirstPaletteColors(): {
  id: string;
  name: string;
  hex: string | null;
}[] {
  var Core = getCore();

  var palette = Core.PaletteKit.Palettes.get(0);

  if (!palette) {
    Core.MessageLog.trace('No palette found.');

    return [];
  }

  var colors = palette.getColors();

  var result: {
    id: string;
    name: string;
    hex: string | null;
  }[] = [];

  for (var i = 0; i < colors.length; i++) {
    var color = colors[i];

    var hex: string | null = null;

    /*
     * A gradient does not have one single hex value,
     * so only convert solid colours here.
     */
    if (color.isSolid) {
      var colorObj = Core.ColorUtils.ColorObj.fromColorInput(color.colorData);

      hex = colorObj.toHex();
    }

    result.push({
      id: color.id,

      name: color.name,

      hex: hex,
    });
  }

  return result;
}

function testPaletteColors(): void {
  var Core = getCore();

  var colors = getFirstPaletteColors();

  for (var i = 0; i < colors.length; i++) {
    Core.MessageLog.trace(colors[i].name + ': ' + colors[i].hex);
  }

  const res = Core.PaletteKit.Palettes.getColorById(Core.PaletteKit.Palettes.get(0).id);
  Core.MessageLog.trace(
    '[Test-duplicate-drawing.ts] getColorById: ' + JSON.stringify(res.palette.name, null, 2),
  );
}

function runCycle(): void {
  var Core = getCore();
  var DrawingDataKit = Core.DrawingDataKit;
  var sel = Core.TimelineKit.getSelection();
  var selNode = sel.selectedNodes[0];

  /*
   * oDrawingNode as a TypeScript alias is type-only.
   *
   * instanceof needs the real runtime constructor.
   */
  if (!(selNode instanceof Core.oDrawingNode)) {
    Core.MessageLog.trace('Selected node is not a drawing node.');
    return;
  }

  Core.scene.saveAll();

  var drawingElement = selNode.drawingElement;
  var drawing1 = drawingElement.getKeyframe(sel.startFrame);
  var drawing2 = drawingElement.getKeyframe(sel.startFrame + 1);
  var drawing3 = drawingElement.getKeyframe(sel.startFrame + 2);

  Core.MessageLog.trace(
    '[Test-duplicate-drawing.ts] ' + drawing1 + '\n, ' + drawing2 + '\n, ' + drawing3 + '\n',
  );

  Core.scene.beginUndoRedoAccum('Duplicate Drawing');

  try {
    drawingElement.copyDrawingTo(drawing1, sel.startFrame + 1);
    drawingElement.copyDrawingTo(drawing1, sel.startFrame + 2);
    drawingElement.copyDrawingTo(drawing2, sel.startFrame + 3);
    drawingElement.copyDrawingTo(drawing3, sel.startFrame + 4);
    drawingElement.copyDrawingTo(drawing3, sel.startFrame + 5);
    drawingElement.copyDrawingTo(drawing3, sel.startFrame + 6);
    drawingElement.copyDrawingTo(drawing2, sel.startFrame + 7);

    Core.scene.saveAll();
  } finally {
    Core.scene.endUndoRedoAccum();
  }

  /*
   * Everything referenced here is a true lexical
   * capture and survives the delayed callback.
   */
  var test = function (): void {
    Core.scene.beginUndoRedoAccum('Translate Drawing Strokes');

    try {
      DrawingDataKit.translateDrawingStrokes(
        {
          frame: sel.startFrame + 1,

          node: selNode.nodePath,
        },

        {
          x: 0,
          y: 50,
        },
      );

      DrawingDataKit.translateDrawingStrokes(
        {
          frame: sel.startFrame + 5,

          node: selNode.nodePath,
        },

        {
          x: 0,
          y: 50,
        },
      );

      Core.MessageLog.trace('[Test-duplicate-drawing.ts] done');
    } catch (error: any) {
      Core.MessageLog.trace(
        '[Test-duplicate-drawing.ts]>>> Error: ' +
          error.message +
          ' ' +
          error.lineNumber +
          ' ' +
          error.fileName,
      );
    } finally {
      Core.scene.endUndoRedoAccum();
    }
  };

  var timer = new Core.QTimer();

  timer.singleShot = true;

  timer.timeout.connect(test);

  timer.start(200);
  Core.scene.beginUndoRedoAccum('Set Start/End Frame');

  Core.scene.setStartFrame(sel.startFrame);
  Core.scene.setStopFrame(sel.startFrame + 7);
}

function labelDrawing(frame: number, node: CoreInstance<'oDrawingNode'>): void {
  const Core = getCore();

  const col = node.getColumn('DRAWING.ELEMENT') as CoreInstance<'oDrawingElementColumn'>;
  if (col.getKeyframe(frame) === null || col.getKeyframe(frame) === '') {
    return;
  }
  const strokes = Core.DrawingDataKit.query.getStrokes({
    drawing: {
      frame: frame,
      node: node.nodePath,
    },
    art: 2,
  });

  function getColorTally(
    strokes: DrawingStrokesResult,
    excludedPaletteNames: string[] = ['Template_Lineart'],
  ): string | null {
    const tally: Record<string, number> = {};

    strokes.layers.forEach((layer) => {
      layer.strokes.forEach((stroke) => {
        const colorIds: string[] = [];

        // Pencil / centerline stroke
        if (stroke.pencilColorId) {
          colorIds.push(stroke.pencilColorId);
        }

        // Colour on left side of contour
        if (typeof stroke.shaderLeft === 'number' && layer.shaders[stroke.shaderLeft]) {
          const colorId = layer.shaders[stroke.shaderLeft].colorId;

          if (colorId) {
            colorIds.push(colorId);
          }
        }

        // Colour on right side of contour
        if (typeof stroke.shaderRight === 'number' && layer.shaders[stroke.shaderRight]) {
          const colorId = layer.shaders[stroke.shaderRight].colorId;

          if (colorId) {
            colorIds.push(colorId);
          }
        }

        // Avoid counting the same color twice on one stroke
        const uniqueColorIds: string[] = [];

        for (let i = 0; i < colorIds.length; i++) {
          if (uniqueColorIds.indexOf(colorIds[i]) === -1) {
            uniqueColorIds.push(colorIds[i]);
          }
        }

        for (let i = 0; i < uniqueColorIds.length; i++) {
          const colorId = uniqueColorIds[i];

          tally[colorId] = (tally[colorId] || 0) + 1;
        }
      });
    });

    MessageLog.trace(`[Test-duplicate-drawing.ts] tally: ${JSON.stringify(tally, null, 2)}`);

    const colorIds = Object.keys(tally);

    let largestColorId: string | null = null;
    let largestCount = -1;

    for (let i = 0; i < colorIds.length; i++) {
      const colorId = colorIds[i];

      const match = Core.PaletteKit.Palettes.getColorById(colorId);

      if (!match) {
        continue;
      }

      if (excludedPaletteNames.indexOf(match.palette.name) !== -1) {
        continue;
      }

      if (tally[colorId] > largestCount) {
        largestCount = tally[colorId];
        largestColorId = colorId;
      }
    }

    return largestColorId;
  }

  const excludedPaletteNames = ['Template_Lineart'];

  const largestTallyColorId = getColorTally(strokes, excludedPaletteNames);

  MessageLog.trace(`[Test-duplicate-drawing.ts] largest color: ${largestTallyColorId}`);

  if (!largestTallyColorId) {
    Core.MessageLog.trace('[Test-duplicate-drawing.ts] No eligible color found for frame ' + frame);
    return;
  }

  const match = Core.PaletteKit.Palettes.getColorById(largestTallyColorId);

  if (!match) {
    Core.MessageLog.trace('[Test-duplicate-drawing.ts] No matching color found for frame ' + frame);
    return;
  }

  MessageLog.trace(
    'largestTallyColorId: ' + largestTallyColorId + ', match.palette.name: ' + match.palette.name,
  );

  col.setDrawingType(frame, match.palette.name);
}

function testQueryStrokes() {
  scene.beginUndoRedoAccum('Label Drawing');
  const Core = getCore();
  const sel = Core.TimelineKit.getSelection();

  for (const node of sel.selectedNodes) {
    for (let frame = sel.startFrame; frame <= sel.endFrame; frame++) {
      labelDrawing(frame, node);
    }
  }
  scene.endUndoRedoAccum();
}

function testTranslateDrawing() {
  const sel = G.TimelineKit.getSelection();
  const selNode = sel.selectedNodes[0];
  if (!(selNode instanceof getCore().oDrawingNode)) {
    MessageLog.trace('Selected node is not a drawing node.');
    return;
  }
  getCore().DrawingDataKit.translateDrawingStrokes(
    { frame: 83, node: 'Top/Drawing_4' },
    { x: 0, y: 50 },
    DrawingArt.LineArt,
  );
}

function testDuplicateDrawing() {
  getTools(getCore()).loopCurrentSelection();
}
