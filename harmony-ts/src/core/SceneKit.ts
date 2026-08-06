/// <reference path="MetadataKit.ts" />

include(specialFolders.userScripts + '/core/MetadataKit.js');

namespace SceneKit {
  /** Scene metadata utilities — see `MetadataKit` for full documentation. */
  export import metadata = MetadataKit;

  export function registerTool(tool: HarmonyToolDefinition): { id: number; isNew: boolean } {
    const metaKey = `registered tool: ${tool.name}`;
    if (SceneKit.metadata.has(metaKey)) {
      MessageLog.trace(
        `[SceneKit] Tool "${tool.name}" is already registered. Returning existing ID.`,
      );
      return { id: SceneKit.metadata.getValue(metaKey) as number, isNew: false };
    }
    const id = Tools.registerTool(tool);
    SceneKit.metadata.set(metaKey, id);
    MessageLog.trace('[Scenekit.ts] Registered tool "' + tool.name + '" with ID: ' + id);
    return { id: id, isNew: true };
  }
  export function switchTool(toolName: string): boolean {
    const metaKey = `registered tool: ${toolName}`;
    MessageLog.trace(`[SceneKit] Attempting to switch to tool "${toolName}"...`);
    const toolId = SceneKit.metadata.getValue(metaKey);
    if (toolId) {
      Tools.setCurrentTool({ id: toolId as number });
      MessageLog.trace(`[SceneKit] Switched to tool "${toolName}" (ID: ${toolId})`);
      return true;
    } else {
      MessageLog.trace(`[SceneKit] Tool "${toolName}" is not registered. Cannot switch.`);
      return false;
    }
  }
}
