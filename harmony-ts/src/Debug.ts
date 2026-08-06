include('globals.js');
function debug() {
  MessageLog.trace('[Debug.ts] ' + JSON.stringify(G.Scene.metadata.keys(), null, 2));
  G.Scene.metadata.removeAll();
}
