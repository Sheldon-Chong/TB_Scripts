interface RegisterActionOptions {
  name: string;
  icon: string;

  callback?: (action?: any) => void;
  handler?: string;
  reloadGroup?: string;
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
    callCoreHandler: (Core: any, path: string, action: any): any => {
      var parts = path.split('.');
      var context = Core;

      for (var i = 0; i < parts.length - 1; i++) {
        context = context[parts[i]];

        if (!context) {
          throw new Error('[Toolbar] Could not resolve handler: ' + path);
        }
      }

      var functionName = parts[parts.length - 1];
      var handler = context[functionName];

      if (typeof handler !== 'function') {
        throw new Error('[Toolbar] Handler is not a function: ' + path);
      }

      return handler.call(context, action);
    },
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
          Core.MessageLog.trace('[Toolbar] CLICKED: ' + action.id);

          try {
            var LiveCore = Core;

            if (Core.DEV) {
              var Runtime: any = Core;

              var reloadGroup = options.reloadGroup;

              var reloaders = Runtime.developmentReloaders;

              if (reloadGroup && reloaders && typeof reloaders[reloadGroup] === 'function') {
                LiveCore = reloaders[reloadGroup]();
              } else if (!reloadGroup && typeof Core.reloadDevelopmentCore === 'function') {
                /*
                 * Temporary compatibility for buttons
                 * still using the original reloader.
                 */
                LiveCore = Core.reloadDevelopmentCore();
              }
            }

            /*
             * Use your existing locally captured
             * callCoreHandler implementation.
             */
            if (options.handler) {
              ToolbarKit.callCoreHandler(LiveCore, options.handler, action);
            } else if (options.callback) {
              Core.MessageLog.trace('[Toolbar] Invoking callback for: ' + action.id);
              options.callback.call(LiveCore, action);
            } else {
              Core.MessageLog.trace(
                '[Toolbar] Action has no handler or callback: ' + action.id,
              );
            }
          } catch (error) {
            Core.MessageLog.trace('[Toolbar] ERROR: ' + error);

            if (error && error.stack) {
              Core.MessageLog.trace('[Toolbar] STACK: ' + error.stack);
            }

            if (error && error.fileName) {
              Core.MessageLog.trace(
                '[Toolbar] FILE: ' + error.fileName + ' LINE: ' + error.lineNumber,
              );
            }
          }
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
