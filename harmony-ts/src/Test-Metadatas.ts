include('globals.js');

function testMetadata() {
  const metadatas = SceneKit.metadata.getAll();
  MessageLog.trace('[Scenekit.ts] ' + JSON.stringify(metadatas));
}
