include('global-test.js');
interface RegisterActionOptions {
  name: string;
  icon?: string;
  callback: () => void;
}

function registerAction(options: RegisterActionOptions) {
  var action: any = {
    id: 'com.toonboom.' + options.name.replace(/\s+/g, '').toLowerCase(),

    text: options.name,
    isEnabled: true,
    icon: options.icon,
    onTrigger: function () {
      options.callback();
    },
  };

  ScriptManager.addAction(action);
}

function registerBareAction() {
  var globalObject = Function('return this;')();

  /*
   * LOCAL VARIABLE.
   *
   * This is what makes it survive.
   */
  var Core = getCore();
  registerAction({
    name: 'My Tool',

    callback: function () {
      MessageLog.trace('');
      MessageLog.trace('===== DELAYED CALLBACK =====');

      MessageLog.trace('Core: ' + typeof Core);

      MessageLog.trace('Core.Shapes: ' + typeof Core.Shapes);

      MessageLog.trace('Core.Maths: ' + typeof Core.Maths);

      MessageLog.trace('Core.SceneKit: ' + typeof Core.SceneKit);

      MessageLog.trace('scene: ' + typeof scene);

      scene.beginUndoRedoAccum('My Tool');

      try {
        const sel = Core.TimelineKit.getSelection();
        MessageLog.trace('TimelineKit.getSelection(): ' + JSON.stringify(sel));
        MessageLog.trace('TimelineKit.getSelection(): ' + sel.startFrame);
      } catch (error) {
        MessageLog.trace('TimelineKit.getSelection() ERROR: ' + error);
      }
      Core;
      /*
       * Your actual tool code.
       */

      Core.Shapes;
      Core.Maths;
      Core.SceneKit;
      Core.TimelineKit.getSelection();
      const markers = Core.TimelineKit.getAllMarkers();
      MessageLog.trace(`[test-toolbar.ts] ${markers}`);

      scene.endUndoRedoAccum();

      MessageLog.trace('===== END CALLBACK =====');
    },
  });

  var toolbar = new ScriptToolbarDef({
    id: 'com.toonboom.test.bareglobalstoolbar',

    text: 'Bare Globals Test',

    customizable: false,
  });

  toolbar.addButton({
    text: 'Bare Globals Test',
    icon: 'icon.png',
    action: 'com.toonboom.mytool',
  });

  ScriptManager.addToolbar(toolbar);
}
