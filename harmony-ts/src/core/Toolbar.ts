interface RegisterActionOptions {
  name: string;
  icon: string;

  /*
   * Core no longer needs to be injected here.
   *
   * The function that registers the tool should already
   * have captured its local Core.
   */
  callback: (action?: any) => void;

  shortcut?: string;
  category?: string;
  checkable?: boolean;
  isChecked?: boolean;
}

function createToolbarKit(Core: any) {
  /*
   * These live for as long as ToolbarKit lives.
   *
   * Since ToolbarKit is part of the persistent Core,
   * these also persist across script entry points.
   */
  var toolbarRegistry: {
    [toolbarId: string]: any;
  } = {};

  var registeredActions: {
    [actionId: string]: boolean;
  } = {};

  var registeredToolbars: {
    [toolbarId: string]: boolean;
  } = {};

  var toolbarButtons: {
    [toolbarId: string]: {
      [actionId: string]: boolean;
    };
  } = {};

  var ToolbarKit = {
    registerAction(options: RegisterActionOptions): any {
      var actionId = 'com.toonboom.' + options.name.replace(/\s+/g, '').toLowerCase();

      var actionKey = 'action:' + actionId;

      /*
       * Session-level duplicate guard.
       */
      if (registeredActions[actionKey]) {
        Core.MessageLog.trace('[Toolbar.ts] Action already registered: ' + actionKey);
        return null;
      }

      var action: any = {
        id: actionId,
        text: options.name,
        icon: options.icon,
        isEnabled: true,
        checkable: options.checkable === true,
        isChecked: options.isChecked === true,
        onTrigger: function () {
          if (action.checkable) {
            action.isChecked = !action.isChecked;
          }

          /*
           * The callback itself should already
           * have captured a local Core.
           */
          options.callback(action);
        },
      };

      Core.ScriptManager.addAction(action);

      /*
       * Only mark it registered once
       * addAction succeeded.
       */
      registeredActions[actionKey] = true;

      /*
       * Shortcut
       */
      if (options.shortcut) {
        var shortcut = {
          id: action.id + '.shortcut',
          responder: 'ScriptManagerResponder',
          slot: 'onTriggerScriptAction(QString)',
          itemParameter: action.id,
          text: options.name,
          value: options.shortcut,
        };

        Core.ScriptManager.addShortcut(shortcut);
      }

      /*
       * Toolbar category
       */
      var category = options.category || 'main';

      var toolbarId = 'com.toonboom.toolbar.' + category.replace(/\s+/g, '').toLowerCase();

      /*
       * Create toolbar if necessary.
       */
      if (!toolbarRegistry[toolbarId]) {
        Core.MessageLog.trace('[Toolbar.ts] Creating toolbar: ' + toolbarId);

        var toolbar = new Core.ScriptToolbarDef({
          id: toolbarId,
          text: category.charAt(0).toUpperCase() + category.slice(1) + ' Toolbar',
          customizable: false,
        });

        toolbarRegistry[toolbarId] = toolbar;

        toolbarButtons[toolbarId] = {};
      }

      /*
       * Add button only once.
       */
      if (toolbarButtons[toolbarId][action.id]) {
        Core.MessageLog.trace(
          '[Toolbar.ts] Button already exists: ' + action.id + ' -> ' + toolbarId,
        );
      } else {
        toolbarButtons[toolbarId][action.id] = true;

        toolbarRegistry[toolbarId].addButton({
          text: options.name,

          icon: options.icon,

          action: action.id,

          checkable: action.checkable,
        });

        Core.MessageLog.trace('[Toolbar.ts] Added button: ' + options.name + ' -> ' + toolbarId);
      }

      return action;
    },

    updateToolbars(): void {
      for (var toolbarId in toolbarRegistry) {
        if (!Core.Object.prototype.hasOwnProperty.call(toolbarRegistry, toolbarId)) {
          continue;
        }

        /*
         * Harmony can be unhappy if the same
         * toolbar is registered repeatedly.
         */
        if (registeredToolbars[toolbarId]) {
          Core.MessageLog.trace('[Toolbar.ts] Toolbar already registered: ' + toolbarId);

          continue;
        }

        var toolbarDef = toolbarRegistry[toolbarId];

        Core.MessageLog.trace('[Toolbar.ts] Registering toolbar: ' + toolbarId);

        Core.ScriptManager.addToolbar(toolbarDef);

        registeredToolbars[toolbarId] = true;

        Core.MessageLog.trace('[Toolbar.ts] Toolbar registered: ' + toolbarId);
      }
    },
  };

  return ToolbarKit;
}
