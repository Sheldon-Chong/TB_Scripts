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

  return;

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

// todo : create function to read drawing type of selection
// serialize to json. Stores nodename as key and value is sequence of drawing types
// create another function that loads json

// - modify bobbing button to have another toggle, disable between smart pasting.
// - when pasting a bobbing preset with smart pasting enabled,
// it will check the currently selected drawing type, and infer character from it
// - It will paste around boundaries across all drawing nodes but only to matching drawing types

function serializeDrawingTypes(): void {
  const Core = getCore();
  const sel = Core.TimelineKit.getSelection();

  const node = sel.selectedNodes[0] as CoreInstance<'oDrawingNode'>;

  const nodes = {};

  for (const node of sel.selectedNodes) {
    nodes[node.nodePath] = [];
    for (let frame = sel.startFrame; frame <= sel.endFrame; frame++) {
      const drawingType = node.drawingElement.getDrawingType(frame);
      Core.MessageLog.trace(`[Test-duplicate-drawing.ts] drawingType: "${drawingType}"`);
      nodes[node.nodePath].push(drawingType);
    }
  }
  Core.Utils.setClipboardText(JSON.stringify(nodes, null, 2));
  Core.MessageLog.trace(`[Test-duplicate-drawing.ts] nodes: ${JSON.stringify(nodes, null, 2)}`);
}

function labelDrawing(frame: number, node: CoreInstance<'oDrawingNode'>): void {
  const Core = getCore();

  const col = node.getColumn('DRAWING.ELEMENT') as CoreInstance<'oDrawingElementColumn'>;

  if (col.getKeyframe(frame) === null || col.getKeyframe(frame) === '') {
    return;
  }

  const excludedPaletteNames = ['Template_Lineart'];

  function getColorTally(excludedPaletteNames: string[] = ['Template_Lineart']): string | null {
    const tally: Record<string, number> = {};

    /*
     * Check every art layer.
     */
    const artLayers = [0, 1, 2, 3];

    for (let artIndex = 0; artIndex < artLayers.length; artIndex++) {
      const art = artLayers[artIndex];

      const strokes = Core.DrawingDataKit.query.getStrokes({
        drawing: {
          frame: frame,
          node: node.nodePath,
        },
        art: art,
      });

      if (!strokes.layers) {
        continue;
      }

      strokes.layers.forEach((layer) => {
        layer.strokes.forEach((stroke) => {
          const colorIds: string[] = [];

          /*
           * Pencil / centerline stroke
           */
          if (stroke.pencilColorId) {
            colorIds.push(stroke.pencilColorId);
          }

          /*
           * Colour on left side of contour
           */
          if (typeof stroke.shaderLeft === 'number' && layer.shaders[stroke.shaderLeft]) {
            const colorId = layer.shaders[stroke.shaderLeft].colorId;

            if (colorId) {
              colorIds.push(colorId);
            }
          }

          /*
           * Colour on right side of contour
           */
          if (typeof stroke.shaderRight === 'number' && layer.shaders[stroke.shaderRight]) {
            const colorId = layer.shaders[stroke.shaderRight].colorId;

            if (colorId) {
              colorIds.push(colorId);
            }
          }

          /*
           * Avoid counting the same colour twice
           * for the same stroke.
           */
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
    }

    Core.MessageLog.trace('[Test-duplicate-drawing.ts] tally: ' + JSON.stringify(tally, null, 2));

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

  const largestTallyColorId = getColorTally(excludedPaletteNames);

  Core.MessageLog.trace('[Test-duplicate-drawing.ts] largest color: ' + largestTallyColorId);

  if (!largestTallyColorId) {
    Core.MessageLog.trace('[Test-duplicate-drawing.ts] No eligible color found for frame ' + frame);
    return;
  }

  const match = Core.PaletteKit.Palettes.getColorById(largestTallyColorId);

  if (!match) {
    Core.MessageLog.trace('[Test-duplicate-drawing.ts] No matching color found for frame ' + frame);
    return;
  }

  Core.MessageLog.trace(
    'largestTallyColorId: ' + largestTallyColorId + ', match.palette.name: ' + match.palette.name,
  );

  if (match.palette.name === 'Others') {
    col.setDrawingType(frame, match.color.name);
    return;
  }

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

function testSetAllFramesToDrawingType(drawingType: string): void {
  const Core = getCore();
  Core.scene.beginUndoRedoAccum('Set Drawing Type');
  reloadDevelopmentCore();

  const sel = Core.TimelineKit.getSelection();

  for (const node of sel.selectedNodes as CoreInstance<'oDrawingNode'>[]) {
    try {
      node.drawingElement.setDrawingType(
        { startFrame: sel.startFrame, endFrame: sel.endFrame },
        'Sans',
      );
    } catch (error) {
      MessageLog.trace(
        `[Test-duplicate-drawing.ts] ${error.message} | ${error.fileName} | ${error.lineNumber}`,
      );
    }
  }

  Core.scene.endUndoRedoAccum();
}

function setFramesToDrawingType(
  drawingType: string,
  node: CoreInstance<'oDrawingNode'>,
  startFrame: number,
  endFrame: number,
): void {
  const Core = getCore();
  Core.scene.beginUndoRedoAccum('Set Drawing Type');
  // reloadDevelopmentCore();

  node.drawingElement.setDrawingType({ startFrame, endFrame }, drawingType);

  Core.scene.endUndoRedoAccum();
}

function applyDrawingTypeFromFile() {
  const Core = getCore();
  reloadDevelopmentCore();

  const rawData = Core.Utils.getClipboardText();
  const data = JSON.parse(rawData);

  // MessageLog.trace(`[Test-duplicate-drawing.ts] ${JSON.stringify(Object.keys(data), null, 2)}`);

  for (const nodePath of Object.keys(data)) {
    const node = Core.LayerManager.getNodeLayer(nodePath) as CoreInstance<'oDrawingNode'>;
    // if (node.name !== '1') continue;
    // MessageLog.trace(
    //   `[Test-duplicate-drawing.ts] ${node.name} | ${JSON.stringify(data[nodePath], null, 2)}`,
    // );

    const drawingCol = node.getColumn('DRAWING.ELEMENT') as CoreInstance<'oDrawingElementColumn'>;

    for (let frame = 0; frame < data[nodePath].length; frame++) {
      const projectedFrame = frame * 32 + 1;
      // drawingCol.setDrawingType(projectedFrame, data[nodePath][frame]);
      setFramesToDrawingType(data[nodePath][frame], node, projectedFrame, projectedFrame + 31);
      if (data[nodePath][frame] === 'I') continue;
      MessageLog.trace(
        `[Test-duplicate-drawing.ts] applied ${data[nodePath][frame]} to frame ${projectedFrame}`,
      );
    }
  }
}
