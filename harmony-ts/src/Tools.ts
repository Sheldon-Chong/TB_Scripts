include(specialFolders.userScripts + '/Tools/CameraSwipeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyShakeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyZoomTool.js');
include(specialFolders.userScripts + '/Tools/PositionDebugTool.js');
include('globals.js');

function registerAllTools() {
  registerCameraSwipeTool();
  registerApplyShakeTool();
  registerApplyZoomTool();
  // registerPositionDebugTool();
  registerAction({
    name: 'Previous Boundary Marker',
    icon: `${specialFolders.userScripts}\\script-icons\\previous_boundary.png`,
    callback: function () {
      G.FrameSnapping.gotoPreviousBoundaryMarker();
    },
    shortcut: 'Ctrl+Alt+Left',
    category: 'custom',
  });
  registerAction({
    name: 'Next Boundary Marker',
    icon: `${specialFolders.userScripts}\\script-icons\\next_boundary.png`,
    callback: function () {
      G.FrameSnapping.gotoNextBoundaryMarker();
    },
    shortcut: 'Ctrl+Alt+Right',
    category: 'custom',
  });
  registerAction({
    name: 'Apply Tool',
    icon: 'earth.png',
    callback: function () {
      MessageLog.trace('Apply Tool action triggered');
    },
    shortcut: 'Ctrl+Alt+R',
    category: 'custom',
  }); // register a phony tool due to QT engine bug where running another file before this one causes all tools to fail registration, unless this tool is registered
  updateToolbars();
}
