include('globals.js');
include('KeyframeProfiles.js');

function createMarker() {
  const selection = new G.oSelection();
  MessageLog.trace('selection: ' + selection.toString());

  const name = G.Utils.prompt('name');

  TimelineMarker.createMarker({
    frame: selection.startFrame,
    length: selection.length,
    color: '#9caddb',
    name: name,
    notes: 'extended exposures',
  });
}

function testApplyScalar() {
  const startFrame = new G.oSelection().startFrame;
  const camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
  const pos = camPeg.position as oPathColumn3D;

  const width = 1920;
  const height = 1080;

  const topRightDir = new G.Vec2(width / 2, height / 2).normalized();
  const topLeftDir = new G.Vec2(-width / 2, height / 2).normalized();
  const bottomRightDir = new G.Vec2(width / 2, -height / 2).normalized();
  const bottomLeftDir = new G.Vec2(-width / 2, -height / 2).normalized();

  const directionVec = [-1, 0.2];
  G.CameraSwipe.applyCameraSwipe(pos, startFrame, directionVec, 0);
}

function serializeKeyframesOfSelection() {
  const selection = new G.oSelection();

  const pos = (G.LayerManager.getNodeLayer('Top/Drawing') as oDrawingNode).position;
  const scale = (G.LayerManager.getNodeLayer('Top/Drawing') as oDrawingNode).scale;

  let keyframes: any[] = [];
  for (let i = selection.startFrame; i <= selection.endFrame; i++) {
    const p = pos.get(i);
    const s = scale.get(i);
    keyframes.push({
      x: p.x,
      y: p.y,
      z: p.z,
      scaleX: s.x,
      scaleY: s.y,
      scaleZ: s.z,
    });
  }

  MessageLog.trace('keyframes: ' + JSON.stringify(keyframes, null, 2));
}
