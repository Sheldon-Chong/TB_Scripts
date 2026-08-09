/// <reference path="MetadataKit.ts" />

include(specialFolders.userScripts + '/core/MetadataKit.js');

namespace SceneKit {
  /** Scene metadata utilities — see `MetadataKit` for full documentation. */
  export import metadata = MetadataKit;

  /**
   * Session-only tool registry keyed by tool name.
   * Uses `__proto__.registeredTools` (initialised in `globals.ts`) instead of
   * scene metadata because metadata persists across project reopens, which
   * would incorrectly treat a tool as "already registered" on next launch.
   */
  function getRegisteredTools(): Record<string, number> {
    return (this as any).__proto__.registeredTools || {};
  }

  export function registerTool(tool: HarmonyToolDefinition): { id: number; isNew: boolean } {
    const reg = getRegisteredTools();
    if (reg[tool.name] !== undefined) {
      MessageLog.trace(
        `[SceneKit] Tool "${tool.name}" is already registered. Returning existing ID.`,
      );
      return { id: reg[tool.name], isNew: false };
    }
    const id = Tools.registerTool(tool);
    reg[tool.name] = id;
    MessageLog.trace('[SceneKit] Registered tool "' + tool.name + '" with ID: ' + id);
    return { id: id, isNew: true };
  }
  export function switchTool(toolName: string): boolean {
    MessageLog.trace(`[SceneKit] Attempting to switch to tool "${toolName}"...`);
    const toolId = getRegisteredTools()[toolName];
    if (toolId !== undefined) {
      Tools.setCurrentTool({ id: toolId });
      MessageLog.trace(`[SceneKit] Switched to tool "${toolName}" (ID: ${toolId})`);
      return true;
    } else {
      MessageLog.trace(`[SceneKit] Tool "${toolName}" is not registered. Cannot switch.`);
      return false;
    }
  }
}
