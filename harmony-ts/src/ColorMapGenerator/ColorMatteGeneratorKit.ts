function createColourMapGeneratorKit(Core: CoreRuntime) {
  var MAX_PASS = 16;
  var MIN_PASS = 1;

  var PASS_PREFIX = 'Pass_';

  var PASSES_CONFIG_PATH = 'D:\\YT projects\\Coding\\ToonBoom\\harmony-ts\\src\\passes.json';

  var LINEART_COLOR_ON = {
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  };

  var LINEART_COLOR_OFF = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  };

  var COLOR_CARD_OFF = {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  };

  var ZOOM_ON = 1.5;

  /*
   * Config
   */

  var passConfigData: {
    passes: Record<string, string>;
  } = {
    passes: {},
  };

  function reloadPassConfig(): void {
    passConfigData = Core.JSON.parse(Core.FileUtils!.readFrom(PASSES_CONFIG_PATH));

    Core.MessageLog.trace('[ColourMapGenerator] PassConfig reloaded from ' + PASSES_CONFIG_PATH);
  }

  function getPasses(): Record<string, string> {
    return passConfigData.passes;
  }

  /*
   * Color matte
   */

  class ColorMatte {
    index: number;

    colorCard: CoreInstance<'oColorCardNode'> | null;

    drawingLayer: CoreInstance<'oDrawingNode'> | null;

    constructor(index: number) {
      this.index = index;

      this.colorCard = null;
      this.drawingLayer = null;

      this.refresh();
    }

    get colorCardName(): string {
      return PASS_PREFIX + this.index;
    }

    get colorCardPath(): string {
      return 'Top/' + this.colorCardName;
    }

    get drawingLayerPath(): string {
      return 'Top/' + this.index;
    }

    refresh(): void {
      Core.log(
        'refresh matte',
        this.index,
        'drawingPath:',
        this.drawingLayerPath,
        'drawingType:',
        Core.node.type(this.drawingLayerPath),
        'colorCardPath:',
        this.colorCardPath,
        'colorCardType:',
        Core.node.type(this.colorCardPath),
      );

      this.drawingLayer = Core.LayerManager!.getNodeLayer(
        this.drawingLayerPath,
      ) as CoreInstance<'oDrawingNode'> | null;

      this.colorCard = Core.LayerManager!.getNodeLayer(
        this.colorCardPath,
      ) as CoreInstance<'oColorCardNode'> | null;

      Core.log('LayerManager results:', this.drawingLayer, this.colorCard);
    }

    colorCardExists(): boolean {
      return this.colorCard !== null;
    }

    drawingLayerExists(): boolean {
      return this.drawingLayer !== null;
    }

    ensureColorCard(): void {
      MessageLog.trace(`[ColorMatteGeneratorKit.ts] ${'ensure color card'}`);
      if (this.colorCardExists()) {
        MessageLog.trace(`[ColorMatteGeneratorKit.ts] ${'already exists'}`);
        return;
      }

      Core.MessageLog.trace('[ColorMatte] Creating ' + this.colorCardName);
      Core.log(`[ColorMatte] Creating ${this.colorCardName}`);

      Core.node.add('Top', this.colorCardName, 'COLOR_CARD', 0, 0, 0);

      /*
       * LayerManager needs to discover the
       * newly created node.
       */
      Core.LayerManager!.updateNodeLayers();

      this.refresh();
    }

    setColor(frame: number, color: any): void {
      if (!this.colorCard) {
        return;
      }

      this.colorCard.setColor(frame, color);
    }
    isValid(): boolean {
      return this.colorCard !== null && this.drawingLayer !== null;
    }

    setEnabled(enabled: boolean): void {
      if (!this.colorCard) {
        return;
      }

      this.colorCard.setEnabled(enabled);
    }

    toString(): string {
      return (
        'ColorMatte(index=' +
        this.index +
        ', color_card=' +
        (this.colorCard ? this.colorCard.name : 'null') +
        ', drawing_layer=' +
        (this.drawingLayer ? this.drawingLayer.name : 'null') +
        ')'
      );
    }
  }
  /*
   * Color matte collection
   */

  var colorMattes: ColorMatte[] = [];

  function loadColorMattes(count: number = MAX_PASS): void {
    colorMattes = [];

    for (var i = 1; i <= count; i++) {
      colorMattes.push(new ColorMatte(i));
    }

    for (var j = 0; j < colorMattes.length; j++) {
      Core.MessageLog.trace('[ColourMapGenerator] Loaded ' + colorMattes[j].toString());
    }
  }

  function reloadColorMattes(): void {
    /*
     * LayerManager must know about any newly
     * created nodes first.
     */
    Core.LayerManager!.updateNodeLayers();

    loadColorMattes();
  }

  function getColorMattes(): ColorMatte[] {
    return colorMattes;
  }

  /*
   * Nodes
   */

  function getCameraOffsetPeg(): CoreInstance<'oPegNode'> | null {
    var layer = Core.LayerManager!.getNodeLayer('Top/Peg');

    if (layer instanceof Core.oPegNode!) {
      return layer;
    }

    return null;
  }

  function getCameraPeg(): CoreInstance<'oPegNode'> | null {
    var layer = Core.LayerManager!.getNodeLayer('Top/Camera-P');

    if (layer instanceof Core.oPegNode!) {
      return layer;
    }

    return null;
  }

  function getBackground() {
    return Core.LayerManager!.getNodeLayer('Top/BG');
  }

  /*
   * Palette
   */

  function getLineartColor() {
    var palette = Core.PaletteKit!.Palettes.get('Template_Lineart');

    if (!palette) {
      return null;
    }

    return palette.getColorById('0c0b25adddd01181');
  }

  /*
   * Pass nodes
   */

  function ensurePassColorCardsExist(): void {
    MessageLog.trace(`[ColorMatteGeneratorKit.ts] >>>> ${colorMattes.length}`);
    for (var i = 0; i < 16; i++) {
      colorMattes[i].ensureColorCard();
      Core.log(
        `[ColorMatteGeneratorKit.ts] ${'ensure color card ' + colorMattes[i].colorCardName}`,
      );
    }
  }

  /*`
   * Node connections
   */

  function disconnectOutputPort(sourceNode: string, outputPortIndex: number): void {
    var numLinks = Core.node.numberOfOutputLinks(sourceNode, outputPortIndex);

    /*
     * Walk backwards because unlinking changes
     * the link indices.
     */
    for (var i = numLinks - 1; i >= 0; i--) {
      var destinationNode = Core.node.dstNode(sourceNode, outputPortIndex, i);

      var targetInputPort = 0;

      var numInputs = Core.node.numberOfInputPorts(destinationNode);

      for (var p = 0; p < numInputs; p++) {
        if (Core.node.srcNode(destinationNode, p) === sourceNode) {
          targetInputPort = p;
          break;
        }
      }

      Core.node.unlink(destinationNode, targetInputPort);
    }
  }

  function disconnectAllOutputPorts(sourceNode: string): void {
    var numOutputPorts = Core.node.numberOfOutputPorts(sourceNode);

    for (var portIndex = 0; portIndex < numOutputPorts; portIndex++) {
      disconnectOutputPort(sourceNode, portIndex);
    }
  }

  /*
   * Camera
   */

  function updateCameraRange(): void {
    var selection = new Core.oSelection!();

    updateCameraOffsetForRange(selection.startFrame, selection.endFrame);
  }

  function updateCameraOffsetForRange(startFrame: number, endFrame: number): void {
    var cameraPeg = getCameraPeg();

    var cameraOffsetPeg = getCameraOffsetPeg();

    if (!cameraPeg || !cameraOffsetPeg) {
      Core.MessageLog.trace('[ColourMapGenerator] Camera peg missing.');

      return;
    }

    Core.scene.beginUndoRedoAccum('Update Camera Offset Keyframes');

    try {
      var pos = cameraPeg.position as CoreInstance<'oPathColumn3D'>;

      for (var frame = startFrame; frame <= endFrame; frame++) {
        var originalPos = {
          x: pos.getXVal(frame),
          y: pos.getYVal(frame),
          z: pos.getZVal(frame),
        };

        cameraOffsetPeg.position.setX(frame, originalPos.x * -0.5);

        cameraOffsetPeg.position.setY(frame, originalPos.y * -0.5);

        cameraOffsetPeg.position.setZ(frame, 0);

        Core.log(
          `[ColourMapGenerator] Frame ${frame}: originalPos=(${originalPos.x}, ${originalPos.y}, ${originalPos.z})`,
        );
        // Core.MessageLog.trace(
        //   '[ColourMapGenerator] Frame ' +
        //     frame +
        //     ': originalPos=(' +
        //     originalPos.x +
        //     ', ' +
        //     originalPos.y +
        //     ', ' +
        //     originalPos.z +
        //     ')',
        // );
      }
    } catch (e: any) {
      Core.MessageLog.trace('[ColourMapGenerator] Error updating camera offset: ' + e.toString());

      if (e.fileName !== undefined && e.lineNumber !== undefined) {
        Core.MessageLog.trace(e.fileName + ':' + e.lineNumber);
      }
    } finally {
      Core.scene.endUndoRedoAccum();
    }
  }

  /*
   * Pass configuration
   */

  function configureNodes(): void {
    var passColors = getPasses();

    for (var i = 0; i < colorMattes.length; i++) {
      var matte = colorMattes[i];

      var passColor = passColors[PASS_PREFIX + matte.index];

      if (!passColor) {
        continue;
      }

      var color = Core.ColorObj!.fromColorInput(passColor, 255);

      matte.setColor(1, color);
    }
  }
  /*
   * Pass keyframes
   */

  function updatePassKeyframes(): void {
    var selection = new Core.oSelection!();

    var startFrame: number;
    var endFrame: number;

    if (selection.length > 1) {
      startFrame = selection.startFrame;

      endFrame = selection.endFrame;

      Core.MessageLog.trace(
        '[ColourMapGenerator] Updating pass keyframes for selection: ' +
          startFrame +
          ' to ' +
          endFrame,
      );
    } else {
      startFrame = 1;
      endFrame = Core.scene.getStopFrame();

      var confirmed = Core.Utils!.confirm(
        'Are you sure you want to update keyframes for all ' + endFrame + ' frames?',
        'Update Keyframes',
        'Update All',
        'Cancel',
      );

      if (!confirmed) {
        Core.MessageLog.trace('[ColourMapGenerator] Keyframe update cancelled.');

        return;
      }

      Core.MessageLog.trace(
        '[ColourMapGenerator] Updating pass keyframes for all ' + endFrame + ' frames.',
      );
    }

    Core.scene.beginUndoRedoAccum('Update Pass Keyframes');

    try {
      var passColors = getPasses();

      for (var i = 0; i < colorMattes.length; i++) {
        var matte = colorMattes[i];

        var colorCard = matte.colorCard;

        var drawingLayer = matte.drawingLayer;

        if (!colorCard || !drawingLayer) {
          continue;
        }

        if (!Core.node.isLinked(colorCard.nodePath, 1)) {
          Core.MessageLog.trace('  ' + colorCard.name + ': matte port not linked, skipping');

          continue;
        }

        var passKey = PASS_PREFIX + matte.index;

        var hexColor = passColors[passKey];

        if (!hexColor) {
          Core.MessageLog.trace('  ' + passKey + ': no color in passes.json, skipping');

          continue;
        }

        var color = Core.ColorObj!.fromColorInput(hexColor, 255);

        var drawingCol = drawingLayer.drawing;

        for (var frame = startFrame; frame <= endFrame; frame++) {
          colorCard.setColor(frame, drawingCol.getAt(frame) !== '' ? color : COLOR_CARD_OFF);
        }
      }

      updateCameraOffsetForRange(startFrame, endFrame);
    } finally {
      Core.scene.endUndoRedoAccum();
    }
  }

  /*
   * Toggle pass mode
   */

  function isAnyPassEnabled(): boolean {
    for (var i = 0; i < colorMattes.length; i++) {
      var currentMatte = colorMattes[i];

      if (currentMatte.colorCard && Core.node.getEnable(currentMatte.colorCard.nodePath)) {
        return true;
      }
    }

    return false;
  }

  function toggleColorMapMode(): void {
    reloadColorMattes();

    Core.scene.beginUndoRedoAccum('Toggle Color Map Mode');

    try {
      var isAnyEnabled = isAnyPassEnabled();
      var toggleOn = !isAnyEnabled;

      MessageLog.trace(`[ColorMatteGeneratorKit.ts] ${isAnyEnabled}`);

      Core.log(
        `[ColorMatteGeneratorKit.ts] ${toggleOn ? 'Enabling color map mode...' : 'Disabling color map mode...'}`,
      );

      MessageLog.trace(`[ColorMatteGeneratorKit.ts] ${colorMattes.length}`);
      for (var matteIndex = 0; matteIndex < colorMattes.length; matteIndex++) {
        var matte = colorMattes[matteIndex];

        if (!matte.isValid()) {
          MessageLog.trace(
            `[ColorMatteGeneratorKit.ts] ${'Matte ' + matteIndex + ' is not valid, skipping'} ${matte.toString()}`,
          );
          continue;
        }
        matte.setEnabled(toggleOn);

        if (toggleOn) {
          MessageLog.trace(`[ColorMatteGeneratorKit.ts] ${'Enabling matte ' + matteIndex} `);
          disconnectAllOutputPorts(matte.drawingLayer.nodePath);

          disconnectAllOutputPorts(matte.colorCard.nodePath);

          Core.node.link(matte.drawingLayer.nodePath, 0, matte.colorCard.nodePath, 1);

          Core.node.link(
            matte.colorCard.nodePath,
            0,
            'Top/Composite',
            matte.index - 1,
            false,
            true,
          );
        } else {
          disconnectAllOutputPorts(matte.colorCard.nodePath);

          disconnectAllOutputPorts(matte.drawingLayer.nodePath);

          var currentPorts = Core.node.numberOfInputPorts('Top/Composite');

          Core.node.link(
            matte.drawingLayer.nodePath,
            0,
            'Top/Composite',
            currentPorts,
            false,
            true,
          );
        }
      }

      var background = getBackground();

      var cameraOffsetPeg = getCameraOffsetPeg();

      var lineartColor = getLineartColor();

      if (!toggleOn) {
        if (background) {
          background.setEnabled(true);
        }

        if (cameraOffsetPeg) {
          cameraOffsetPeg.scale.setGlobal(new Core.Vec3!(1));

          cameraOffsetPeg.setEnabled(false);
        }

        if (lineartColor) {
          lineartColor.colorData = LINEART_COLOR_ON;
        }
      } else {
        if (background) {
          background.setEnabled(false);
        }

        if (cameraOffsetPeg) {
          cameraOffsetPeg.scale.setGlobal(new Core.Vec3!(ZOOM_ON, ZOOM_ON, 1));

          cameraOffsetPeg.setEnabled(true);
        }

        if (lineartColor) {
          lineartColor.colorData = LINEART_COLOR_OFF;
        }
      }
    } finally {
      Core.scene.endUndoRedoAccum();
    }
  }

  /*
   * Initialization
   */

  function initialize(): void {
    reloadPassConfig();

    reloadColorMattes();

    ensurePassColorCardsExist();

    configureNodes();
  }

  return {
    initialize: initialize,

    reloadPassConfig: reloadPassConfig,

    reloadColorMattes: reloadColorMattes,

    getColorMattes: getColorMattes,

    ensurePassColorCardsExist: ensurePassColorCardsExist,

    configureNodes: configureNodes,

    updatePassKeyframes: updatePassKeyframes,

    updateCameraRange: updateCameraRange,

    updateCameraOffsetForRange: updateCameraOffsetForRange,

    toggleColorMapMode: toggleColorMapMode,
  };
}
type ColourMapGeneratorKit = ReturnType<typeof createColourMapGeneratorKit>;
