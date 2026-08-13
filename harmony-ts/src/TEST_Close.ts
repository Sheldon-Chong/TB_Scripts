function closeScene() {
  scene.closeSceneAndExit();
}

function process() {
  var proc = new Process();
  // Specify the path to the application/binary and pass arguments
  proc.launch('Downloads');
}
