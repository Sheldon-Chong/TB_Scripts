include('global-test.js');

function reopenProjectFromPath() {
  const $ = getCore();

  $.scene.closeSceneAndOpenOffline(
    'D:/YT projects/Coding/Frame extender/2026-extender/tests/Tests/Tests.xstage',
  );
}
