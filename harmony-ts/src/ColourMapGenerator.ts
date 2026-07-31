include('globals.js');

const MAX_PASS = 16;
const MIN_PASS = 1;

const PASS_PREFIX = 'Pass_';

const TRANSPARENCY_PREFIX = 'Transparency_';

const TOGGLE_ON = 0;
const TOGGLE_OFF = 100;
const PASSES_CONFIG_PATH = 'D:\\YT projects\\Coding\\ToonBoom\\harmony-ts\\src\\passes.json';

const DEFAULT_PALETTE = G.Palettes.get('Template_Lineart');
const LINEART_COLOR = DEFAULT_PALETTE.getColorById('0c0b25adddd01181');

const LINEART_COLOR_ON = {
  r: 0,
  g: 0,
  b: 0,
  a: 255,
};

const LINEART_COLOR_OFF = {
  r: 0,
  g: 0,
  b: 0,
  a: 0,
};

const COLOR_CARD_OFF = {
  r: 0,
  g: 0,
  b: 0,
  a: 0,
};

const ZOOM_ON = 1.5;
const ZOOM_OFF = 1.0;

const NODES = {
  PASS_GROUP: G.LayerManager.getNodeLayer('Top/Passes'),
  CAMERA_OFFSET_PEG: G.LayerManager.getNodeLayer('Top/Peg') as oPegNode,
  CAMERA_PEG: G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode,
  BG: G.LayerManager.getNodeLayer('Top/BG'),
  BACKDROP: G.LayerManager.getNodeLayer('Top/backdrop'),
} as const;

class _PassConfig {
  private _data: Record<string, any>;

  private constructor() {
    this._data = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
  }

  private static _instance: _PassConfig;
  static get instance(): _PassConfig {
    if (!this._instance) this._instance = new _PassConfig();
    return this._instance;
  }

  /** Re-parse the JSON file. Call after editing passes.json externally. */
  reload(): void {
    this._data = JSON.parse(G.FileUtils.readFrom(PASSES_CONFIG_PATH));
    MessageLog.trace('PassConfig reloaded from ' + PASSES_CONFIG_PATH);
  }

  get passes(): Record<string, string> {
    return this._data['passes'];
  }
}

const PassConfig = _PassConfig.instance;

class ColorMatte {
  index = 0;
  colorCard: oColorCardNode | null = null;
  drawingLayer: oDrawingNode | null = null;

  constructor(index: number) {
    this.index = index;
    this.drawingLayer = G.LayerManager.getNodeLayer(`Top/${index}`) as oDrawingNode | null;
    this.colorCard = G.LayerManager.getNodeLayer(`Top/Pass_${index}`) as oColorCardNode | null;
  }

  toString() {
    return `ColorMatte(index=${this.index}, color_card=${this.colorCard?.name}, drawing_layer=${this.drawingLayer?.name})`;
  }
}

namespace ColorMattes {
  export let list: ColorMatte[] = [];

  export function load(count: number = MAX_PASS): void {
    list = [];
    for (let i = 1; i <= count; i++) {
      list.push(new ColorMatte(i));
    }
    for (const matte of list) {
      MessageLog.trace(`Loaded ColorMatte: ${matte.toString()}`);
    }
  }

  export function reload(): void {
    load();
  }
}

ColorMattes.load();

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

function updateCameraOffsetForRange(startFrame: number, endFrame: number) {
  scene.beginUndoRedoAccum('Update Camera Offset Keyframes');

  for (let frame = startFrame; frame <= endFrame; frame++) {
    const originalPos = NODES.CAMERA_PEG.position.get(frame);
    NODES.CAMERA_OFFSET_PEG.position.set(
      { x: originalPos.x * -0.5, y: originalPos.y * -0.5, z: 0 },
      frame,
    );
  }
  scene.endUndoRedoAccum();
}

function configureNodes() {
  const passColors = PassConfig.passes;

  for (const matte of ColorMattes.list) {
    var passColor = passColors[`Pass_${matte.index}`];
    MessageLog.trace(`Configuring ColorMatte ${matte.index}: color ${passColor}`);
    matte.colorCard?.setColor(1, passColor);
  }

  return;
}

function updatePassKeyframes() {
  const selection = G.TimelineKit.getSelection();
  let startFrame: number;
  let endFrame: number;

  if (selection.length > 1) {
    startFrame = selection.startFrame;
    endFrame = selection.endFrame;
    MessageLog.trace(`Updating pass keyframes for selection: ${startFrame} to ${endFrame}...`);
  } else {
    startFrame = 1;
    endFrame = scene.getStopFrame();

    var confirmed = G.Utils.confirm(
      `Are you sure you want to update keyframes for all ${endFrame} frames?`,
      'Update Keyframes',
      'Update All',
      'Cancel',
    );
    if (!confirmed) {
      MessageLog.trace('Keyframe update cancelled.');
      return;
    }
    MessageLog.trace(`Updating pass keyframes for all ${endFrame} frames...`);
  }

  scene.beginUndoRedoAccum('Update Pass Keyframes');

  const passColors = PassConfig.passes;

  for (const matte of ColorMattes.list) {
    const colorCard = matte.colorCard;
    if (!colorCard || !matte.drawingLayer) continue;

    if (!node.isLinked(colorCard.nodePath, 1)) {
      MessageLog.trace(`  ${colorCard.name}: matte port not linked, skipping`);
      continue;
    }

    const passKey = `Pass_${matte.index}`;
    const hexColor = passColors[passKey];
    if (!hexColor) {
      MessageLog.trace(`  ${passKey}: no color in passes.json, skipping`);
      continue;
    }

    const color = ColorObj.fromColorInput(hexColor, 255);
    const drawingCol = matte.drawingLayer.drawing;

    for (let frame = startFrame; frame <= endFrame; frame++) {
      colorCard?.setColor(frame, drawingCol.getAt(frame) !== '' ? color : COLOR_CARD_OFF);
    }
  }

  updateCameraOffsetForRange(startFrame, endFrame);
  scene.endUndoRedoAccum();
}

function toggleColorMapMode2() {
  scene.beginUndoRedoAccum('Toggle Color Map Mode');

  const isAnyEnabled = ColorMattes.list.some(
    (m) => m.colorCard && node.getEnable(m.colorCard.nodePath),
  );
  const toggleOn = !isAnyEnabled;

  MessageLog.trace(toggleOn ? 'Enabling color map mode...' : 'Disabling color map mode...');

  // Enable/disable each COLOR_CARD and rewire ports
  for (const matte of ColorMattes.list) {
    if (!matte.colorCard || !matte.drawingLayer) continue;

    matte.colorCard.setEnabled(toggleOn);
    if (toggleOn) {
      disconnectAllOutputPorts(matte.drawingLayer.nodePath);
      disconnectAllOutputPorts(matte.colorCard.nodePath);
      node.link(matte.drawingLayer.nodePath, 0, matte.colorCard.nodePath, 1);
      node.link(matte.colorCard.nodePath, 0, 'Top/Composite', matte.index - 1, false, true);
    } else {
      disconnectAllOutputPorts(matte.colorCard.nodePath);
      disconnectAllOutputPorts(matte.drawingLayer.nodePath);

      const currentPorts = node.numberOfInputPorts('Top/Composite');
      node.link(matte.drawingLayer.nodePath, 0, 'Top/Composite', currentPorts, false, true);
    }
  }

  if (!toggleOn) {
    NODES.BG.setEnabled(true);
    NODES.CAMERA_OFFSET_PEG.scale.setGlobal(new Vec3(1));

    NODES.CAMERA_OFFSET_PEG.setEnabled(false);

    LINEART_COLOR.colorData = LINEART_COLOR_ON;
  } else {
    NODES.BG.setEnabled(false);
    NODES.CAMERA_OFFSET_PEG.scale.setGlobal(new Vec3(ZOOM_ON, ZOOM_ON, 1));
    NODES.CAMERA_OFFSET_PEG.setEnabled(true);
    LINEART_COLOR.colorData = LINEART_COLOR_OFF;
  }

  scene.endUndoRedoAccum();
}
