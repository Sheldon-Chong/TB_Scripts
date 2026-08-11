include(specialFolders.userScripts + '/Tools/CameraSwipeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyShakeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyZoomTool.js');
include('globals.js');

function registerAllTools() {
  registerCameraSwipeTool();
  registerApplyShakeTool();
  registerApplyZoomTool();
  updateToolbars();
}
