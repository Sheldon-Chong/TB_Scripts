var __includeProbe: any = {
  beforeInclude: true,
  helperFileExecuted: false,
  helperSawBridge: false,
  sameGlobalObject: false,
  buildMarker: null,
};

var __mainGlobalBeforeInclude = Function('return this;')();

__includeProbe.mainGlobal = __mainGlobalBeforeInclude;

__mainGlobalBeforeInclude.__includeProbe = __includeProbe;

var includeResult = include('ScopeHelpers.js');

__includeProbe.includeResultType = typeof includeResult;

__includeProbe.bareHelperAfterInclude = typeof includedFileHelper;

__includeProbe.exportedHelperAfterInclude = typeof __mainGlobalBeforeInclude.__includedFileHelper;
MessageLog.trace('[MAIN] include result type: ' + typeof includeResult);

var mainGlobalAfterInclude = Function('return this;')();

MessageLog.trace('[MAIN] bare includedFileHelper: ' + typeof includedFileHelper);

MessageLog.trace(
  '[MAIN] exported __includedFileHelper: ' + typeof mainGlobalAfterInclude.__includedFileHelper,
);

interface RegisterActionOptions {
  name: string;
  icon: string;
  callback: (_?: any, action?: any) => void;
  shortcut?: string;
  category?: string;
  checkable?: boolean;
  isChecked?: boolean;
}

include('globals.js');

/**
 * Only prints values that were evaluated by the caller.
 *
 * Do not move expressions such as `typeof scene` into this function,
 * because then we would be testing this function's lexical scope instead.
 */
function traceScope(label: string, values: any) {
  MessageLog.trace('');
  MessageLog.trace('========== SCOPE: ' + label + ' ==========');

  for (var key in values) {
    MessageLog.trace(key + ': ' + values[key]);
  }

  MessageLog.trace('==========================================');
  MessageLog.trace('');
}

/**
 * Tests whether a name can be resolved by a newly constructed Function.
 *
 * This is intentionally different from directly evaluating:
 *
 *     typeof scene
 *
 * A Function constructor does not close over the surrounding function's
 * lexical environment, so this gives us another view of Harmony's global
 * script environment.
 */
function dynamicType(name: string) {
  try {
    return Function('return typeof ' + name + ';')();
  } catch (error) {
    return 'ERROR: ' + error;
  }
}

/**
 * Primitive action registration function for investigating Harmony scope.
 *
 * Intentionally:
 * - no registration guards
 * - no toolbar registry
 * - no deferred updateToolbars()
 * - one toolbar per action
 *
 * Restart Harmony before repeatedly testing the same action IDs.
 */
function registerDebugAction(options: RegisterActionOptions) {
  var globals = _;

  var cleanName = options.name.replace(/\s+/g, '').toLowerCase();

  var actionId = 'com.toonboom.debug.' + cleanName;

  var category = options.category || 'debug';

  var toolbarId =
    'com.toonboom.debugtoolbar.' + category.replace(/\s+/g, '').toLowerCase() + '.' + cleanName;

  /*
   * This value exists only in this invocation of registerDebugAction.
   *
   * If onTrigger can still see it later, we know Harmony preserved
   * the JavaScript closure attached to the callback.
   */
  var closureMarker = 'closure-' + new Date().getTime();

  /*
   * Evaluate these expressions HERE.
   *
   * This tells us what registerDebugAction itself can resolve.
   */
  var registrationGlobalObject = (function () {
    return this;
  })();

  var g = Function('return this;')();
  var p = g.__proto__;

  traceScope('prototype anatomy: registration', {
    globalType: typeof g,
    prototypeType: typeof p,

    sceneDirect: typeof scene,
    sceneViaGlobal: typeof g.scene,
    sceneViaProto: typeof p.scene,

    sceneOwnGlobal: Object.prototype.hasOwnProperty.call(g, 'scene'),

    sceneOwnProto: Object.prototype.hasOwnProperty.call(p, 'scene'),

    DrawingOwnProto: Object.prototype.hasOwnProperty.call(p, 'Drawing'),

    nodeOwnProto: Object.prototype.hasOwnProperty.call(p, 'node'),

    selectionOwnProto: Object.prototype.hasOwnProperty.call(p, 'selection'),

    GOwnGlobal: Object.prototype.hasOwnProperty.call(g, 'G'),

    GOwnProto: Object.prototype.hasOwnProperty.call(p, 'G'),

    sameSceneGlobalProto: g.scene === p.scene,

    sameDrawingGlobalProto: g.Drawing === p.Drawing,

    prototypeOfPrototypeType: p.__proto__ ? typeof p.__proto__ : 'NO PROTOTYPE',
  });
  registrationGlobalObject.__scopeDebugMarker = closureMarker;
  var action: any = {
    id: actionId,
    text: options.name,
    icon: options.icon,

    isEnabled: true,
    checkable: options.checkable === true,
    isChecked: options.isChecked === true,
    /*
     * Expose the logger so the actual user callback can evaluate its own
     * scope and hand the results back to us.
     */
    traceScope: traceScope,

    onTrigger: function () {
      var self = this;

      var triggerGlobalObject = (function () {
        return this;
      })();

      /*
       * Evaluate the same names directly inside Harmony's onTrigger.
       */
      traceScope('ownership: onTrigger', {
        sceneType: typeof scene,
        sceneOwn: Object.prototype.hasOwnProperty.call(triggerGlobalObject, 'scene'),

        DrawingType: typeof Drawing,
        DrawingOwn: Object.prototype.hasOwnProperty.call(triggerGlobalObject, 'Drawing'),
        DrawingProto: typeof triggerGlobalObject.__proto__.Drawing,

        selectionType: typeof selection,
        selectionOwn: Object.prototype.hasOwnProperty.call(triggerGlobalObject, 'selection'),
        selectionProto: typeof triggerGlobalObject.__proto__.selection,

        nodeType: typeof node,
        nodeOwn: Object.prototype.hasOwnProperty.call(triggerGlobalObject, 'node'),
        nodeProto: typeof triggerGlobalObject.__proto__.node,
      });

      /*
       * Use Harmony's supplied `this` rather than the closed-over
       * `action` object for normal action state.
       */
      if (self.checkable) {
        self.isChecked = !self.isChecked;
      }

      MessageLog.trace('[DEBUG ACTION] Calling callback for: ' + options.name);

      try {
        options.callback(globals, self);
      } catch (error) {
        MessageLog.trace('[DEBUG ACTION] CALLBACK ERROR: ' + error);

        if (error && error.stack) {
          MessageLog.trace('[DEBUG ACTION] STACK: ' + error.stack);
        }

        throw error;
      }

      MessageLog.trace('[DEBUG ACTION] Callback finished: ' + options.name);
    },
  };

  MessageLog.trace('[DEBUG ACTION] Registering action: ' + action.id);

  ScriptManager.addAction(action);

  MessageLog.trace('[DEBUG ACTION] Triggering action through ScriptManagerResponder');

  Action.perform('onTriggerScriptAction(QString)', 'ScriptManagerResponder', action.id);

  MessageLog.trace('[DEBUG ACTION] Test complete');
}

function sameFileHelper() {
  var globalObject = (function () {
    return this;
  })();

  traceScope('sameFileHelper', {
    scene: typeof scene,
    Drawing: typeof Drawing,
    node: typeof node,

    globalObjectScene: globalObject ? typeof globalObject.scene : 'NO GLOBAL OBJECT',

    functionScene: dynamicType('scene'),
  });
}

function sameFileHelper2() {
  sameFileHelper();
}

function testScope() {
  // MessageLog.clearLog();
  registerDebugAction({
    name: 'Scope Test',
    icon: 'myIcon',

    callback: function (globals, action) {
      var g = Function('return this;')();

      traceScope('ownership: actual callback', {
        sceneType: typeof scene,
        sceneOwn: Object.prototype.hasOwnProperty.call(g, 'scene'),

        DrawingType: typeof Drawing,
        DrawingOwn: Object.prototype.hasOwnProperty.call(g, 'Drawing'),
        DrawingProto: typeof g.__proto__.Drawing,

        selectionType: typeof selection,
        selectionOwn: Object.prototype.hasOwnProperty.call(g, 'selection'),
        selectionProto: typeof g.__proto__.selection,

        nodeType: typeof node,
        nodeOwn: Object.prototype.hasOwnProperty.call(g, 'node'),
        nodeProto: typeof g.__proto__.node,
      });
    },
  });
}

function clearLog() {
  MessageLog.clearLog();
}

function writeContextProbe() {
  var g = Function('return this;')();

  g.__ownContextMarker = 'OWN-' + new Date().getTime();

  g.__proto__.__protoContextMarker = 'PROTO-' + new Date().getTime();

  MessageLog.trace('write global = ' + g);

  MessageLog.trace('own = ' + g.__ownContextMarker);

  MessageLog.trace('proto = ' + g.__proto__.__protoContextMarker);
}

function readContextProbe() {
  var g = Function('return this;')();

  MessageLog.trace('own marker: ' + g.__ownContextMarker);

  MessageLog.trace('proto marker: ' + g.__proto__.__protoContextMarker);
}
