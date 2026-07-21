include("globals.js");

const MAX_PASS = 16;
const MIN_PASS = 1;

const PASS_PATH = "Top/";
const PASS_PREFIX = "Pass_";

const TRANSPARENCY_PREFIX = "Transparency_";

const TOGGLE_ON = 0;
const TOGGLE_OFF = 100;

const PASS_GROUP = G.LayerManager.getNodeLayer("Top/Passes");
const CAMERA_OFFSET_PEG = G.LayerManager.getNodeLayer("Top/Peg");
const CAMERA_PEG = G.LayerManager.getNodeLayer("Top/Camera-P");
const BG = G.LayerManager.getNodeLayer("Top/BG");

const BACKDROP = G.LayerManager.getNodeLayer("Top/backdrop");



function updateCameraOffsetForRange(startFrame: number, endFrame: number) {
  scene.beginUndoRedoAccum("Update Camera Offset Keyframes");

  var originalPositionCol = CAMERA_PEG.getColumn("position.attr3dpath") as PathColumn3D;
  var offsetPositionCol = CAMERA_OFFSET_PEG.getColumn("position.attr3dpath") as PathColumn3D;
  for (let frame = startFrame; frame <= endFrame; frame++) {
    const originalX = originalPositionCol.getXVal(frame);
    const originalY = originalPositionCol.getYVal(frame);
    const originalZ = originalPositionCol.getZVal(frame);

    offsetPositionCol.setX(frame, originalX * -0.5);
    offsetPositionCol.setY(frame, originalY * -0.5);
    offsetPositionCol.setZ(frame, 0);
  }
  scene.endUndoRedoAccum();
}



function configureNodes() {
  const layers = G.LayerManager.getNodeLayers();

  const PASSES_CONFIG_PATH = "D:\\YT projects\\Coding\\ToonBoom\\harmony-ts\\src\\passes.json";
  const passesConfig = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
  const passColors: Record<string, string> = passesConfig["passes"];

  for (const layer of layers) {
    MessageLog.trace(`Node: ${layer.name}, type: ${layer.getType()}`);

    if (layer.getType() === "COLOR_CARD") {

      // matte port is port 1
      if (!node.isLinked(layer.nodePath, 1)) {
        MessageLog.trace(`  - Matte port is not connected.`);
        continue;
      }

      const matteSrcPath = node.srcNode(layer.nodePath, 1);
      MessageLog.trace(`${layer.name} has Matte port: ${matteSrcPath}`);

      const passIndex = parseInt(layer.name.split("_")[1]);
      const passKey = `Pass_${passIndex}`;
      MessageLog.trace(`  - Matte source: ${matteSrcPath}`);
      MessageLog.trace(`  - Pass index: ${passIndex}`);

      const hexColor = passColors[passKey];
      if (!hexColor) {
        MessageLog.trace(`  - No color found in passes.json for ${passKey}`);
        continue;
      }

      const rgb = hexToRgb(hexColor);
      if (!rgb) {
        MessageLog.trace(`  - Failed to parse hex color: ${hexColor}`);
        continue;
      }

      MessageLog.trace(`  - Applying color ${hexColor} → RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`);

      const r = layer.getColumn("COLOR.RED");
      const g = layer.getColumn("COLOR.GREEN");
      const b = layer.getColumn("COLOR.BLUE");

      r.setKeyFrame(1, rgb.r);
      g.setKeyFrame(1, rgb.g);
      b.setKeyFrame(1, rgb.b);
    }
  }
}

function updatePassKeyframes() {

  const selection = G.GlobalTimeline.getSelection();
  let startFrame: number;
  let endFrame: number;

  if (selection.length > 1) {
    startFrame = selection.startFrame;
    endFrame = selection.endFrame;
    MessageLog.trace(`Updating pass keyframes for selection: ${startFrame} to ${endFrame}...`);
  }
  else {
    startFrame = 1;
    endFrame = scene.getStopFrame();

    var response = MessageBox.warning(`Are you sure you want to update keyframes for ${endFrame} frames?`, 1, 1, 0, "Update Keyframes");
    if (response !== 1) {
      MessageLog.trace("Keyframe update cancelled.");
      return;
    }
    MessageLog.trace(`Updating pass keyframes for all ${endFrame} frames...`);
  }

  scene.beginUndoRedoAccum("Update Pass Keyframes");

  const passesConfig = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
  const passColors: Record<string, string> = passesConfig["passes"];

  const layers = G.LayerManager.getNodeLayers();
  for (const layer of layers) {
    if (layer.getType() !== "COLOR_CARD") continue;

    // Only process COLOR_CARDs that are actually linked to a drawing layer via the matte port
    if (!node.isLinked(layer.nodePath, 1)) {
      MessageLog.trace(`  ${layer.name}: matte port not linked, skipping`);
      continue;
    }

    const passIndex = parseInt(layer.name.split("_")[1]);
    if (isNaN(passIndex)) continue;

    const passKey = `Pass_${passIndex}`;
    const hexColor = passColors[passKey];
    if (!hexColor) {
      MessageLog.trace(`  ${passKey}: no color in passes.json, skipping`);
      continue;
    }

    const rgb = hexToRgb(hexColor);
    if (!rgb) continue;

    // Each COLOR_CARD's matte port is cabled to its drawing layer at Top/{passIndex}
    const drawingLayerPath = `${PASS_PATH}${passIndex}`;
    const drawingLayer = G.LayerManager.getNodeLayer(drawingLayerPath);
    if (!drawingLayer) {
      MessageLog.trace(`  ${passKey}: drawing layer ${drawingLayerPath} not found, skipping`);
      continue;
    }

    const drawingCol = drawingLayer.getColumn("DRAWING.ELEMENT");
    const r = layer.getColumn("COLOR.RED");
    const g = layer.getColumn("COLOR.GREEN");
    const b = layer.getColumn("COLOR.BLUE");
    const a = layer.getColumn("COLOR.ALPHA");

    for (let frame = startFrame; frame <= endFrame; frame++) {
      const hasDrawing = drawingCol.getKeyframe(frame) !== null;
      if (hasDrawing) {
        r.setKeyFrame(frame, rgb.r);
        g.setKeyFrame(frame, rgb.g);
        b.setKeyFrame(frame, rgb.b);
        a.setKeyFrame(frame, 255);
      } else {
        // No drawing at this frame → black out the color card
        r.setKeyFrame(frame, 0);
        g.setKeyFrame(frame, 0);
        b.setKeyFrame(frame, 0);
        a.setKeyFrame(frame, 0);
      }
    }

    MessageLog.trace(`  ${passKey}: updated frames ${startFrame}-${endFrame}  (color: ${hexColor})`);
  }

  updateCameraOffsetForRange(startFrame, endFrame);
  scene.endUndoRedoAccum();
}

function toggleColorMapMode2() {
  scene.beginUndoRedoAccum("Toggle Color Map Mode");

  // Collect all COLOR_CARD nodes and match them to their drawing layers by name index
  const layers = G.LayerManager.getNodeLayers();
  const colorCards: { card: NodeLayer; drawingPath: string; passIndex: number }[] = [];
  for (const layer of layers) {
    if (layer.getType() !== "COLOR_CARD") continue;
    const passIndex = parseInt(layer.name.split("_")[1]);
    if (isNaN(passIndex)) continue;
    const drawingPath = `${PASS_PATH}${passIndex}`;
    colorCards.push({ card: layer, drawingPath, passIndex });
    MessageLog.trace(`Found COLOR_CARD: ${layer.name} (pass ${passIndex}) → drawing ${drawingPath}`);
  }

  const colorGroups = colorCards.sort((a, b) => a.passIndex - b.passIndex);

  const isAnyEnabled = colorGroups.some(c => node.getEnable(c.card.nodePath));
  const toggleOn = !isAnyEnabled;

  MessageLog.trace(toggleOn ? "Enabling color map mode..." : "Disabling color map mode...");

  // Enable/disable each COLOR_CARD and rewire ports
  for (const { card, drawingPath, passIndex } of colorGroups) {
    card.setEnabled(toggleOn);

    // --- DIAGNOSTIC ---
    MessageLog.trace(`=== ${card.name} (${card.nodePath}) -> drawing ${drawingPath} ===`);

    if (toggleOn) {
      // Disconnect drawing from wherever it currently goes
      disconnectAllOutputPorts(drawingPath);
      disconnectAllOutputPorts(card.nodePath);

      // drawing(0) → COLOR_CARD matte port (1)
      node.link(drawingPath, 0, card.nodePath, 1);
      MessageLog.trace(`  -> linked ${drawingPath}(0) -> ${card.nodePath}(1) [matte]`);

      // COLOR_CARD(0) → Composite at the pass's input port
      node.link(card.nodePath, 0, "Top/Composite", passIndex - 1, false, true);
      MessageLog.trace(`  -> linked ${card.nodePath}(0) -> Top/Composite(${passIndex - 1})`);
    } else {
      // Bypass: drawing → Composite directly
      disconnectAllOutputPorts(card.nodePath);
      disconnectAllOutputPorts(drawingPath);

      const currentPorts = node.numberOfInputPorts("Top/Composite");
      node.link(drawingPath, 0, "Top/Composite", currentPorts, false, true);
      MessageLog.trace(`  -> linked ${drawingPath}(0) -> Top/Composite(${currentPorts})`);
    }
  }

  // --- DIAGNOSTIC: Composite input ports after rewiring ---
  MessageLog.trace("=== Top/Composite inputs after rewiring ===");
  const compInputs = node.numberOfInputPorts("Top/Composite");
  MessageLog.trace(`  Total input ports: ${compInputs}`);
  for (let p = 0; p < compInputs; p++) {
    const src = node.srcNode("Top/Composite", p);
    const srcName = src ? node.getName(src) : "(unconnected)";
    MessageLog.trace(`  Composite input ${p}: ${srcName} [${src || ""}]`);
  }

  // Apply pass colors to the palette
  const palette = G.Palettes.get("Passes");
  for (let i = MIN_PASS; i <= MAX_PASS; i++) {
    const color = palette.getColor(`Pass_${i}`);
    if (!color) continue;
    const passColor = hexToRgb(PASS_COLORS[`Pass_${i}`]);
    if (!passColor) continue;
    color.colorData = {
      r: passColor.r,
      g: passColor.g,
      b: passColor.b,
      a: 255
    };
  }

  const DEFAULT_PALETTE = G.Palettes.get("Template_Lineart");
  const LINEART_COLOR = DEFAULT_PALETTE.getColorById("0c0b25adddd01181");

  if (!toggleOn) {
    BG.setEnabled(true);
    CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1);
    CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1);
    CAMERA_OFFSET_PEG.setEnabled(false);

    LINEART_COLOR.colorData = {
      r: 0,
      g: 0,
      b: 0,
      a: 255
    };
  } else {
    BG.setEnabled(false);
    CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1.5);
    CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1.5);
    CAMERA_OFFSET_PEG.setEnabled(true);

    LINEART_COLOR.colorData = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    };
  }

  scene.endUndoRedoAccum();
}






// --- LEGACY CODE BELOW ---

class ColorMatte {
  drawingCol: Column;
  transparencyCol: Column;
  passCol: Column;
  initialPassDrawing: string;

  drawingLayer: NodeLayer;
  transparencyLayer: NodeLayer
  passLayer: NodeLayer;

  constructor(public passNumber: number) {

    MessageLog.trace("initializing ColorMatte for Pass_" + passNumber);
    const drawingLayerPath = `${PASS_PATH}${passNumber}`;
    const transparencyLayerPath = `${PASS_PATH}${TRANSPARENCY_PREFIX}${passNumber}`;
    const passLayerPath = `${PASS_PATH}${PASS_PREFIX}${passNumber}`;



    try {
      this.drawingLayer = G.LayerManager.getNodeLayer(drawingLayerPath);
      this.transparencyLayer = G.LayerManager.getNodeLayer(transparencyLayerPath);
      this.passLayer = G.LayerManager.getNodeLayer(passLayerPath);

      this.drawingCol = this.drawingLayer.getColumn("DRAWING.ELEMENT");
      this.transparencyCol = this.transparencyLayer.getColumn("transparency");
      this.passCol = this.passLayer.getColumn("DRAWING.ELEMENT");
      this.initialPassDrawing = this.passCol.getKeyframe(1);
    }
    catch (error) {

      if (!this.drawingCol)
        MessageLog.trace(`⚠️ Expected drawing layer at ${drawingLayerPath}, instead got ${G.LayerManager.getNodeLayer(drawingLayerPath)}`);
      if (!this.transparencyCol)
        MessageLog.trace(`⚠️ Expected transparency layer at ${transparencyLayerPath}, instead got ${G.LayerManager.getNodeLayer(transparencyLayerPath)}`);
      if (!this.passCol)
        MessageLog.trace(`⚠️ Expected pass layer at ${passLayerPath}, instead got ${G.LayerManager.getNodeLayer(passLayerPath)}`);
      throw error;
    }
  }

  toggleForFrame(frame: number): void {
    const drawingValue = this.drawingCol.getKeyframe(frame);
    MessageLog.trace(`Toggling Pass_${this.passNumber} for frame ${frame}. Current drawing value: ${JSON.stringify(drawingValue)}`);
    this.transparencyCol.setKeyFrame(frame, drawingValue === null ? TOGGLE_OFF : TOGGLE_ON);
    // this.passCol.setKeyFrame(frame, this.initialPassDrawing);
  }

  toggleForFrameRange(startFrame: number, endFrame: number): void {
    for (let frame = startFrame; frame <= endFrame; frame++) {
      this.toggleForFrame(frame);
    }
  }

  setMatteEnabled(enabled: boolean): void {
    // this.drawingLayer.parent.setEnabled(enabled);
    this.transparencyCol.parent.setEnabled(enabled);
    // this.passLayer.parent.setEnabled(enabled);
  }

  isMatteEnabled(): boolean {
    return this.transparencyCol.parent.isEnabled() && this.passCol.parent.isEnabled();
  }
}
function disconnectOutputPort(sourceNode, outputPortIndex) {
  // 1. Find out how many wires are coming out of this specific output port
  var numLinks = node.numberOfOutputLinks(sourceNode, outputPortIndex);

  // We loop backwards because unlinking modifies the link indices in real-time
  for (var i = numLinks - 1; i >= 0; i--) {

    // 2. Get the full path of the target node attached to this wire
    var destinationNode = node.dstNode(sourceNode, outputPortIndex, i);

    // 3. To unlink, we need to know WHICH input port on the target node it's hitting.
    // srcNodeInfo gives us the exact input port mapping.
    var targetInputPort = 0; // Default fallback
    var numInputs = node.numberOfInputPorts(destinationNode);

    for (var p = 0; p < numInputs; p++) {
      if (node.srcNode(destinationNode, p) === sourceNode) {
        targetInputPort = p;
        break;
      }
    }

    // 4. Break the connection from the destination side
    node.unlink(destinationNode, targetInputPort);
  }

}


function disconnectAllOutputPorts(sourceNode) {
  var numOutputPorts = node.numberOfOutputPorts(sourceNode);
  for (var portIndex = 0; portIndex < numOutputPorts; portIndex++) {
    disconnectOutputPort(sourceNode, portIndex);
  }
}


/* INITIALIZATION */

// Initialize all color mattes globally


// const colorMattes: ColorMatte[] = [];

// MessageLog.trace(`layer : ${G.LayerManager.getNodeLayer("Top/1")}`);
// MessageLog.trace(`all node layers : ${G.LayerManager.getNodeLayers().map(layer => layer.nodePath).join(", ")}`);
// MessageLog.trace(`timeline num layers: ${Timeline.numLayers}`);

// for (let i = MIN_PASS; i <= MAX_PASS; i++) {
//   colorMattes.push(new ColorMatte(i));
// }


/* UPDATE COLOR MAP FOR SELECTION */

function updateColorMapForSelectionSeperatePaths() {
  scene.beginUndoRedoAccum(`Toggle Color Map for Pass`);

  const selection = G.GlobalTimeline.getSelection();

  var originalPositionX = CAMERA_PEG.getColumn("position.x") as Column;
  var originalPositionY = CAMERA_PEG.getColumn("position.y") as Column;
  var originalPositionZ = CAMERA_PEG.getColumn("position.z") as Column;

  var offsetPositionColX = CAMERA_OFFSET_PEG.getColumn("position.x");
  var offsetPositionColY = CAMERA_OFFSET_PEG.getColumn("position.y");
  var offsetPositionColZ = CAMERA_OFFSET_PEG.getColumn("position.z");

  for (let i = selection.startFrame; i <= selection.endFrame; i++) {

    const originalX = originalPositionX.getKeyframe(i);
    const originalY = originalPositionY.getKeyframe(i);
    const originalZ = originalPositionZ.getKeyframe(i);
    offsetPositionColX.setKeyFrame(i, originalX * -0.5);
    offsetPositionColY.setKeyFrame(i, originalY * -0.5);
    offsetPositionColZ.setKeyFrame(i, 0);
    MessageLog.trace(`Frame ${i}: Original Position - X: ${originalX}, Y: ${originalY}, Z: ${originalZ}`);
    MessageLog.trace(">>> " + offsetPositionColX.getKeyframe(i) + " , " + offsetPositionColY.getKeyframe(i) + " , " + offsetPositionColZ.getKeyframe(i));
  }
  scene.endUndoRedoAccum();
}

function updateColorMapForSelection() {
  scene.beginUndoRedoAccum(`Toggle Color Map for Pass`);
  MessageLog.trace(">>> Updating color map for selection");
  const selection = G.GlobalTimeline.getSelection();

  for (let i = MIN_PASS; i <= MAX_PASS; i++) {
    MessageLog.trace(`----  Toggling Color Map for Pass_${i} ---- `);

    colorMattes[i - 1].toggleForFrameRange(selection.startFrame, selection.endFrame);
  }

  var originalPositionCol = CAMERA_PEG.getColumn("position.attr3dpath") as PathColumn3D;
  var offsetPositionCol = CAMERA_OFFSET_PEG.getColumn("position.attr3dpath") as PathColumn3D;
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {

    const originalX = originalPositionCol.getXVal(i);
    const originalY = originalPositionCol.getYVal(i);
    const originalZ = originalPositionCol.getZVal(i);

    offsetPositionCol.setX(i, originalX * -0.5);
    offsetPositionCol.setY(i, originalY * -0.5);
    offsetPositionCol.setZ(i, 0);
    MessageLog.trace(">>> " + offsetPositionCol.getX(i) + " , " + offsetPositionCol.getY(i) + " , " + offsetPositionCol.getZ(i));
  }
  scene.endUndoRedoAccum();
}



function getColorMatte(passNumber: number): ColorMatte | null {
  if (passNumber < MIN_PASS || passNumber > MAX_PASS) {
    MessageLog.trace(`Pass number ${passNumber} is out of range (${MIN_PASS}-${MAX_PASS}).`);
    return null;
  }
  return colorMattes[passNumber - 1];
}

/* GLOBAL FUNCTIONS */

function setColorMapEnabled(enabled: boolean) {
  for (let i = MIN_PASS; i <= MAX_PASS; i++) {
    getColorMatte(i)?.setMatteEnabled(enabled);
  }
}

const PASSES_CONFIG_PATH = "D:\\YT projects\\Coding\\ToonBoom\\harmony-ts\\src\\passes.json";
const PASSES_CONFIG = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
const PASS_COLORS = PASSES_CONFIG["passes"];


function serializeColorsOfPalette() {
  const palette = G.Palettes.get("Passes");
  const colorsData = palette.getColors().map(color => ({
    name: color.name,
    color: rgbToHex(color.colorData.r, color.colorData.g, color.colorData.b)
  }));
  MessageLog.trace(JSON.stringify(colorsData, null, 2));
  return colorsData;
}

function toggleColorMapMode() {
  scene.beginUndoRedoAccum(`Toggle Color Map Mode`);
  MessageLog.trace(`${node.numberOfInputPorts("Top/1")}`);

  const isAnyEnabled = colorMattes.some(matte => matte.isMatteEnabled());
  const toggleOn = !isAnyEnabled;

  if (toggleOn)
    MessageLog.trace("Enabling all color mattes...");
  else {
    MessageLog.trace("Disabling all color mattes...");
  }


  for (let i = MIN_PASS; i <= MAX_PASS; i++) {
    const color_matte = colorMattes[i - MIN_PASS];

    color_matte.passLayer.setEnabled(toggleOn);
    color_matte.transparencyLayer.setEnabled(toggleOn);

    color_matte.drawingLayer.setEnabled(true);

    if (toggleOn) { // enable all
      // path: drawing layer -> pass layer -> transparency layer -> composite
      disconnectAllOutputPorts(color_matte.drawingLayer.nodePath);
      disconnectAllOutputPorts(color_matte.passLayer.nodePath);
      node.link(color_matte.drawingLayer.nodePath, 0, color_matte.passLayer.nodePath, 1);
      node.link(color_matte.passLayer.nodePath, 0, color_matte.transparencyLayer.nodePath, 0);
      node.link(color_matte.transparencyLayer.nodePath, 0, `Top/Composite`, i - 1, false, true);
    }
    else { // disable all
      // disconnectAllOutputPorts(color_matte.drawingLayer.nodePath);
      disconnectAllOutputPorts(color_matte.transparencyLayer.nodePath);
      disconnectAllOutputPorts(color_matte.drawingLayer.nodePath);
      var currentPorts = node.numberOfInputPorts("Top/Composite");
      node.link(color_matte.drawingLayer.nodePath, 0, "Top/Composite", currentPorts, false, true);
    }
  }

  const palette = G.Palettes.get("Passes");

  for (let i = MIN_PASS; i <= MAX_PASS; i++) {
    const color = palette.getColor(`Pass_${i}`);
    if (!color)
      continue;
    const passColor = hexToRgb(PASS_COLORS[`Pass_${i}`]);
    color.colorData = {
      r: passColor.r,
      g: passColor.g,
      b: passColor.b,
      a: 255
    }
  }

  const DEFAULT_PALETTE = G.Palettes.get("Template_Lineart");
  const LINEART_COLOR = DEFAULT_PALETTE.getColorById("0c0b25adddd01181");

  if (!toggleOn) {
    setColorMapEnabled(false);
    BACKDROP.setEnabled(false);
    BG.setEnabled(true);
    CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1);
    CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1);
    CAMERA_OFFSET_PEG.setEnabled(false);

    LINEART_COLOR.colorData = {
      r: 0,
      g: 0,
      b: 0,
      a: 255
    }

  } else {
    setColorMapEnabled(true);
    // PASS_GROUP.setEnabled(true);
    BACKDROP.setEnabled(true);
    BG.setEnabled(false);
    CAMERA_OFFSET_PEG.getColumn("scale.x").setKeyFrame(1, 1.5);
    CAMERA_OFFSET_PEG.getColumn("scale.y").setKeyFrame(1, 1.5);
    CAMERA_OFFSET_PEG.setEnabled(true);

    LINEART_COLOR.colorData = {
      r: 0,
      g: 0,
      b: 0,
      a: 0
    }
  }
  scene.endUndoRedoAccum();
}
// if (!palette) {
//   MessageLog.trace("Palette not found");
// } else {
//   const color = palette.getColor("Pass_1"); // or palette.getColor(0)
//   if (!color) {
//     MessageLog.trace("Color not found");
//   } else {

//     color.colorData = { r: 255, g: 120, b: 0, a: 255 };
//   }
// }


function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) {
    return null;
  }
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  };
}






function printPaletteColors() {
  const passPalette = G.Palettes.get("Passes");

  const colors = [];

  passPalette.getColors().forEach((color, index) => {
    colors.push({
      color: rgbToHex(color.colorData.r, color.colorData.g, color.colorData.b)
    });
  })
  MessageLog.trace(JSON.stringify(colors, null, 2));
}

function loadColorMapFromFile() {
  var filePath = QFileDialog.getOpenFileName(0, "testing", "", "JSON Files (*.json)");
  if (!filePath) {
    MessageLog.trace("No file selected");
    return;
  }

  const colors = JSON.parse(G.FileUtils.readFrom(filePath));
  MessageLog.trace(JSON.stringify(colors));

  const passPalette = G.Palettes.get("Passes");
  passPalette.getColors().forEach((color, index) => {
    // MessageLog.trace(`Color: ${color.name}, RGB: ${
    //   rgbToHex(color.colorData.r, color.colorData.g, color.colorData.b)
    // }`);
    MessageLog.trace(">>> " + color.name + " , " + color.colorData.r + " , " + color.colorData.g + " , " + color.colorData.b);
    color.colorData = {
      r: hexToRgb(colors[index].color).r,
      g: hexToRgb(colors[index].color).g,
      b: hexToRgb(colors[index].color).b,
      a: 255
    }
  })
}
