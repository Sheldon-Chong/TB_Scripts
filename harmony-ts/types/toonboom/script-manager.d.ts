declare interface ToolbarDef {
  id: string;
  text: string;
  customizable?: boolean;
}

declare interface ButtonDef {
  text?: string;
  icon?: string;
  checkable?: boolean;
  action?: string;
  slot?: string;
  itemParameter?: string;
  shortcut?: string;
}

declare class ScriptToolbarDef {
  constructor(toolbarDef: ToolbarDef);
  id: string;
  text: string;
  customizable?: boolean;
  addButton(button: ButtonDef): void;
}

declare interface ActionDef {
  id: string;
  text: string;
  icon?: string;
  checkable?: boolean;
  isEnabled?: boolean | (() => boolean);
  isChecked?: boolean | (() => boolean);
  onTrigger?: () => void;
  onSelectionChanged?: () => void;
  onCurrentFrameChanged?: () => void;
  onNetworkChanged?: () => void;
  onPreferenceChanged?: () => void;
}

declare var ScriptManager: {
  addAction(action: ActionDef): void;
  addShortcut(shortcut: any): void;
  addToolbar(toolbar: ScriptToolbarDef): void;
};
