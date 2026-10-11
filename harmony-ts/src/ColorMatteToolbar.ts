include('global-test.js');

include(specialFolders.userScripts + '/toolbars/ColorMapGenerator/ColorMatteGeneratorKit.js');

function registerColorMatteToolbar(): void {
  var Core = getCore() as CoreRuntime;
  var Runtime: any = Core;

  var includeScript = include;
  var shared = Function('return this;')().__proto__;

  var kitPath =
    Core.specialFolders.userScripts + '/toolbars/ColorMapGenerator/ColorMatteGeneratorKit.js';

  var iconsPath = Core.specialFolders.userScripts + '/script-icons/';

  /*
   * Construct the latest kit.
   */
  function buildKit(): any {
    var factories = shared.__TBFactories;
    var factory = factories && factories.ColorMatteKit;

    if (typeof factory !== 'function') {
      throw '[ColorMatte] Factory unavailable';
    }

    return factory(Core);
  }

  /*
   * Initial construction.
   */
  if (!Runtime.ColorMatteKit) {
    Runtime.ColorMatteKit = buildKit();
  }

  /*
   * Independent hot reloader for this toolbar.
   */
  Runtime.developmentReloaders = Runtime.developmentReloaders || {};

  Runtime.developmentReloaders.colorMatte = function (): CoreRuntime {
    Core.MessageLog.trace('[Reload] Reloading ColorMatteKit');

    includeScript(kitPath);

    /*
     * Build first, replace second.
     */
    var next = buildKit();

    if (!next) {
      throw '[ColorMatte] Failed to rebuild kit';
    }

    Runtime.ColorMatteKit = next;

    Core.MessageLog.trace('[Reload] ColorMatteKit replaced');

    return Core;
  };

  /*
   * Register the toolbar actions.
   *
   * Replace the example icons with
   * your actual filenames.
   */
  Core.Toolbar.registerAction({
    name: 'Configure Color Mattes',
    icon: iconsPath + 'configure_nodes.png',
    category: 'Color Matte',
    handler: 'ColorMatteKit.initialize',
    reloadGroup: 'colorMatte',
  });

  Core.Toolbar.registerAction({
    name: 'Update Pass Keyframes',
    icon: iconsPath + 'update_keyframe.png',
    category: 'Color Matte',
    handler: 'ColorMatteKit.updatePassKeyframes',
    reloadGroup: 'colorMatte',
  });

  Core.Toolbar.registerAction({
    name: 'Toggle Color Map Mode',
    icon: iconsPath + 'toggle_color_map_mode.png',
    category: 'Color Matte',
    handler: 'ColorMatteKit.toggleColorMapMode',
    reloadGroup: 'colorMatte',
  });

  Core.Toolbar.updateToolbars();
}
