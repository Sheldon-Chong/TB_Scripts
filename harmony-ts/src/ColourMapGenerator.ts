include("globals.js");

const MAX_PASS = 16;
const MIN_PASS = 1;

const PASS_PATH = "Top/";
const PASS_PREFIX = "Passes/Pass_";

const TRANSPARENCY_PREFIX = "Passes/Transparency_";

const TOGGLE_ON = 0;
const TOGGLE_OFF = 100;

const PASS_GROUP = G.LayerManager.getNodeLayer("Top/Passes");
const CAMERA_OFFSET_PEG = G.LayerManager.getNodeLayer("Top/Peg");
const CAMERA_PEG = G.LayerManager.getNodeLayer("Top/Camera-P");
const BG = G.LayerManager.getNodeLayer("Top/bg");

const BACKDROP = G.LayerManager.getNodeLayer("Top/Backdrop");




class ColorMatte {
  drawingLayer: Column;
  transparencyLayer: Column;
  passLayer: Column;
  initialPassDrawing: string;

  constructor(public passNumber: number) {

    MessageLog.trace("initializing ColorMatte for Pass_" + passNumber);

    try {
      this.drawingLayer = G.LayerManager.getNodeLayer(`${PASS_PATH}${passNumber}`).getColumn("DRAWING.ELEMENT");
      this.transparencyLayer = G.LayerManager.getNodeLayer(`${PASS_PATH}${TRANSPARENCY_PREFIX}${passNumber}`).getColumn("transparency");
      this.passLayer = G.LayerManager.getNodeLayer(`${PASS_PATH}${PASS_PREFIX}${passNumber}`).getColumn("DRAWING.ELEMENT");
      this.initialPassDrawing = this.passLayer.getKeyframe(1);
    }
    catch (error) {

      if (!this.drawingLayer)
        MessageLog.trace(`⚠️ Error initializing drawing layer for Pass_${passNumber}: \n - ${error}`);
      if (!this.transparencyLayer)
        MessageLog.trace(`⚠️ Error initializing transparency layer for Pass_${passNumber}: \n - ${error}`);
      if (!this.passLayer)
        MessageLog.trace(`⚠️ Error initializing pass layer for Pass_${passNumber}: \n - ${error}`);
      // MessageLog.trace(`Error initializing ColorMatte for Pass_${passNumber}: ${error}`);
      throw error;
    }
  }

  toggleForFrame(frame: number): void {
    const drawingValue = this.drawingLayer.getKeyframe(frame);
    this.transparencyLayer.setKeyFrame(frame, drawingValue === "" ? TOGGLE_OFF : TOGGLE_ON);
    // this.passLayer.setKeyFrame(frame, this.initialPassDrawing);
  }

  toggleForFrameRange(startFrame: number, endFrame: number): void {
    for (let frame = startFrame; frame <= endFrame; frame++) {
      this.toggleForFrame(frame);
    }
  }

  setMatteEnabled(enabled: boolean): void {
    // this.drawingLayer.parent.setEnabled(enabled);
    this.transparencyLayer.parent.setEnabled(enabled);
    // this.passLayer.parent.setEnabled(enabled);
  }

  isMatteEnabled(): boolean {
    return this.transparencyLayer.parent.isEnabled() && this.passLayer.parent.isEnabled();
  }
}

// Initialize all color mattes globally
const colorMattes: ColorMatte[] = [];
for (let i = MIN_PASS; i <= MAX_PASS; i++) {
  colorMattes.push(new ColorMatte(i));
}


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


    // if (!originalPositionCol.isKeyFrameAny(i)) {
    //   MessageLog.trace("continuing");
    //   continue;
    // }

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

const PASSES_CONFIG_PATH = "C:\\Users\\emers\\AppData\\Roaming\\Toon Boom Animation\\Toon Boom Harmony Premium\\2400-scripts\\harmony-ts\\src\\passes.json";
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
  const isAnyEnabled = colorMattes.some(matte => matte.isMatteEnabled());

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

  if (isAnyEnabled) {
    setColorMapEnabled(false);
    PASS_GROUP.setEnabled(false);
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
    PASS_GROUP.setEnabled(true);
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
}


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
