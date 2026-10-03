/// <reference path="MetadataKit.ts" />

include(specialFolders.userScripts + '/core/MetadataKit.js');

function createSceneKit(Core: HarmonyCore) {
  /*
   * Session-only registry.
   *
   * Because this SceneKit instance itself is stored on
   * the persistent Core, this object survives for the
   * lifetime of that Core instance.
   */
  var registeredTools: {
    [toolName: string]: number;
  } = {};

  /*
   * Temporary bridge if MetadataKit has not yet been
   * converted to the factory/Core approach.
   *
   * This captures it while the current script context
   * still has access to it.
   */
  var Metadata = MetadataKit;

  var SceneKit = {
    /*
     * Preserve the old:
     *
     * SceneKit.metadata
     */
    metadata: Metadata,

    registerTool(tool: HarmonyToolDefinition): {
      id: number;
      isNew: boolean;
    } {
      if (registeredTools[tool.name] !== undefined) {
        Core.MessageLog.trace(
          '[SceneKit] Tool "' + tool.name + '" is already registered. Returning existing ID.',
        );

        return {
          id: registeredTools[tool.name],

          isNew: false,
        };
      }

      /*
       * Core.Tools is Toon Boom's native Tools API.
       */
      var id = Core.Tools.registerTool(tool);

      registeredTools[tool.name] = id;

      Core.MessageLog.trace('[SceneKit] Registered tool "' + tool.name + '" with ID: ' + id);

      return {
        id: id,

        isNew: true,
      };
    },

    switchTool(toolName: string): boolean {
      Core.MessageLog.trace('[SceneKit] Attempting to switch to tool "' + toolName + '"...');

      var toolId = registeredTools[toolName];

      if (toolId !== undefined) {
        Core.Tools.setCurrentTool({
          id: toolId,
        });

        Core.MessageLog.trace(
          '[SceneKit] Switched to tool "' + toolName + '" (ID: ' + toolId + ')',
        );

        return true;
      }

      Core.MessageLog.trace('[SceneKit] Tool "' + toolName + '" is not registered. Cannot switch.');

      return false;
    },

    /*
     * Optional utility.
     */
    isToolRegistered(toolName: string): boolean {
      return registeredTools[toolName] !== undefined;
    },
  };

  return SceneKit;
}

type SceneKitType = ReturnType<typeof createSceneKit>;
