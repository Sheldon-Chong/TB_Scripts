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

const NODES = {
  PASS_GROUP: G.LayerManager.getNodeLayer('Top/Passes'),
  CAMERA_OFFSET_PEG: G.LayerManager.getNodeLayer('Top/Peg'),
  CAMERA_PEG: G.LayerManager.getNodeLayer('Top/Camera-P'),
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
  color_card: oColorCardNode | null = null;
  drawing_layer: oNodeLayer | null = null;

  constructor(index: number) {
    this.index = index;
    this.drawing_layer = G.LayerManager.getNodeLayer(`Top/${index}`);
    this.color_card = G.LayerManager.getNodeLayer(`Top/Pass_${index}`) as oColorCardNode | null;
  }

  toString() {
    return `ColorMatte(index=${this.index}, color_card=${this.color_card?.name}, drawing_layer=${this.drawing_layer?.name})`;
  }
}

function loadColorMattes(count: number = MAX_PASS): ColorMatte[] {
  const colorMattes: ColorMatte[] = [];
  for (let i = 1; i <= count; i++) {
    colorMattes.push(new ColorMatte(i));
  }
  return colorMattes;
}

var colorMattes = loadColorMattes();
for (const matte of colorMattes) {
  MessageLog.trace(`Loaded ColorMatte: ${matte.toString()}`);
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

function updateColorMattes() {
  colorMattes = loadColorMattes();
}

function disconnectAllOutputPorts(sourceNode) {
  var numOutputPorts = node.numberOfOutputPorts(sourceNode);
  for (var portIndex = 0; portIndex < numOutputPorts; portIndex++) {
    disconnectOutputPort(sourceNode, portIndex);
  }
}

function updateCameraOffsetForRange(startFrame: number, endFrame: number) {
  scene.beginUndoRedoAccum('Update Camera Offset Keyframes');

  var originalPositionCol = NODES.CAMERA_PEG.getColumn('position.attr3dpath') as oPathColumn3D;
  var offsetPositionCol = NODES.CAMERA_OFFSET_PEG.getColumn('position.attr3dpath') as oPathColumn3D;
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
  const passColors = PassConfig.passes;

  for (const colorMatte of colorMattes) {
    var passColor = passColors[`Pass_${colorMatte.index}`];
    MessageLog.trace(`Configuring ColorMatte ${colorMatte.index}: color ${passColor}`);
    colorMatte.color_card?.setColor(1, passColor);
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

    var response = MessageBox.warning(
      `Are you sure you want to update keyframes for ${endFrame} frames?`,
      1,
      1,
      0,
      'Update Keyframes',
    );
    if (response !== 1) {
      MessageLog.trace('Keyframe update cancelled.');
      return;
    }
    MessageLog.trace(`Updating pass keyframes for all ${endFrame} frames...`);
  }

  scene.beginUndoRedoAccum('Update Pass Keyframes');

  const passColors = PassConfig.passes;

  for (const matte of colorMattes) {
    if (!matte.color_card || !matte.drawing_layer) continue;

    // Only process COLOR_CARDs that are actually linked via the matte port
    if (!node.isLinked(matte.color_card.nodePath, 1)) {
      MessageLog.trace(`  ${matte.color_card.name}: matte port not linked, skipping`);
      continue;
    }

    const passKey = `Pass_${matte.index}`;
    const hexColor = passColors[passKey];
    if (!hexColor) {
      MessageLog.trace(`  ${passKey}: no color in passes.json, skipping`);
      continue;
    }

    const color = ColorObj.fromColorInput(hexColor);
    const drawingCol = matte.drawing_layer.getColumn('DRAWING.ELEMENT');

    for (let frame = startFrame; frame <= endFrame; frame++) {
      if (drawingCol.getKeyframe(frame) !== null) {
        matte.color_card?.setColor(frame, color);
      } else {
        matte.color_card?.setColor(frame, { r: 0, g: 0, b: 0, a: 0 });
      }
    }

    MessageLog.trace(
      `  ${passKey}: updated frames ${startFrame}-${endFrame}  (color: ${hexColor})`,
    );
  }

  updateCameraOffsetForRange(startFrame, endFrame);
  scene.endUndoRedoAccum();
}

function toggleColorMapMode2() {
  scene.beginUndoRedoAccum('Toggle Color Map Mode');

  const isAnyEnabled = colorMattes.some(
    (m) => m.color_card && node.getEnable(m.color_card.nodePath),
  );
  const toggleOn = !isAnyEnabled;

  MessageLog.trace(toggleOn ? 'Enabling color map mode...' : 'Disabling color map mode...');

  // Enable/disable each COLOR_CARD and rewire ports
  for (const matte of colorMattes) {
    if (!matte.color_card || !matte.drawing_layer) continue;

    matte.color_card.setEnabled(toggleOn);
    if (toggleOn) {
      disconnectAllOutputPorts(matte.drawing_layer.nodePath);
      disconnectAllOutputPorts(matte.color_card.nodePath);
      node.link(matte.drawing_layer.nodePath, 0, matte.color_card.nodePath, 1);
      node.link(matte.color_card.nodePath, 0, 'Top/Composite', matte.index - 1, false, true);
    } else {
      disconnectAllOutputPorts(matte.color_card.nodePath);
      disconnectAllOutputPorts(matte.drawing_layer.nodePath);

      const currentPorts = node.numberOfInputPorts('Top/Composite');
      node.link(matte.drawing_layer.nodePath, 0, 'Top/Composite', currentPorts, false, true);
    }
  }

  if (!toggleOn) {
    NODES.BG.setEnabled(true);
    NODES.CAMERA_OFFSET_PEG.getColumn('scale.x').setKeyFrame(1, 1);
    NODES.CAMERA_OFFSET_PEG.getColumn('scale.y').setKeyFrame(1, 1);
    NODES.CAMERA_OFFSET_PEG.setEnabled(false);

    LINEART_COLOR.colorData = LINEART_COLOR_ON;
  } else {
    NODES.BG.setEnabled(false);
    NODES.CAMERA_OFFSET_PEG.getColumn('scale.x').setKeyFrame(1, 1.5);
    NODES.CAMERA_OFFSET_PEG.getColumn('scale.y').setKeyFrame(1, 1.5);
    NODES.CAMERA_OFFSET_PEG.setEnabled(true);
    LINEART_COLOR.colorData = LINEART_COLOR_OFF;
  }

  scene.endUndoRedoAccum();
}
