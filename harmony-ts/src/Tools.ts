include('global-test.js');

include(specialFolders.userScripts + '/FrameSnapping.js');
include(specialFolders.userScripts + '/KeyframeGenerator.js');
include(specialFolders.userScripts + '/Tools/CameraSwipeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyShakeTool.js');
include(specialFolders.userScripts + '/Tools/ApplyZoomTool.js');
include(specialFolders.userScripts + '/KeyframeProfiles.js');

include(specialFolders.userScripts + '/ToolsKit.js');

function registerAllTools(): void {
  var Core = getCore();

  /*
   * Capture the environment and dependencies
   * during normal script execution.
   */
  var includeScript = include;
  var shared = Function('return this;')().__proto__;

  var dependencies: ToolsKitDependencies = {
    getFrameSnappingKit: getFrameSnappingKit,
    createCameraSwipe: createCameraSwipe,
    createCameraSwipeToolKit: createCameraSwipeToolKit,
    getKeyframeGeneratorKit: getKeyframeGeneratorKit,
    createApplyShakeToolKit: createApplyShakeToolKit,
    createApplyZoomToolKit: createApplyZoomToolKit,
  };

  var toolsKitPath = Core.specialFolders.userScripts + '/ToolsKit.js';

  /*
   * Construct initial ToolsKit.
   */
  var factory = shared.__TBFactories.ToolsKit;

  if (typeof factory !== 'function') {
    throw '[Tools] ToolsKit factory unavailable';
  }

  if (!(Core as any).ToolsKit) {
    (Core as any).ToolsKit = factory(Core, dependencies);
  }

  /*
   * Install permanent development reloader.
   */
  Core.reloadDevelopmentCore = function (): HarmonyCore {
    Core.MessageLog.trace('[Reload] Reloading ToolsKit.js');

    includeScript(toolsKitPath);

    /*
     * Retrieve the newly published factory.
     */
    var latestFactory = shared.__TBFactories && shared.__TBFactories.ToolsKit;

    if (typeof latestFactory !== 'function') {
      throw '[Reload] ToolsKit factory unavailable';
    }

    var previous = (Core as any).ToolsKit;

    var next = latestFactory(Core, dependencies, previous);

    if (!next) {
      throw '[Reload] ToolsKit construction failed';
    }

    /*
     * Only replace after successful construction.
     */
    (Core as any).ToolsKit = next;

    Core.MessageLog.trace('[Reload] ToolsKit replaced');

    return Core;
  };

  /*
   * Register buttons against persistent ToolbarKit.
   */
  (Core as any).ToolsKit.registerAllTools();
}
