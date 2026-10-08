include('global-test.js');

include(specialFolders.userScripts + '/ColorMapGenerator/PassConfig.js');

include(specialFolders.userScripts + '/ColorMapGenerator/ColorMatte.js');

include(specialFolders.userScripts + '/ColorMapGenerator/Connections.js');

include(specialFolders.userScripts + '/ColorMapGenerator/ColorMatteGeneratorKit.js');
function configureNodes2(): void {
  var Core = getCore();
  reloadCore();
  // reloadDevelopmentCore();
  createColourMapGeneratorKit(Core).initialize();
  MessageLog.trace(`[ColorMapEntrypoint.ts] ${'nodes configured'}`);
}

function updatePassKeyframes(): void {
  var Core = getCore();

  createColourMapGeneratorKit(Core).updatePassKeyframes();
}

function toggleColorMapMode3(): void {
  var Core = getCore();

  createColourMapGeneratorKit(Core).toggleColorMapMode();
}
