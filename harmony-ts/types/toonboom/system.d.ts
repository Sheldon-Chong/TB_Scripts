declare var MessageLog: {
  trace(msg: string): void;
  clearLog(): void;
};

declare var specialFolders: {
  userScripts: string;
  userConfig: string;
};

declare var FileDialog: {
  getSaveFileName(filter: string, title: string, parent?: QWidget): string;
  getExistingDirectory(directory: string, title: string, parent?: QWidget): string;
  getOpenFileNames(directory: string, filter: string, title: string, parent?: QWidget): string[];
};

declare var Input: {
  getText(label: string, text: string, title: string, parent?: QWidget): unknown;
};

declare class TemporaryFile {
  constructor(extension: string);
  path(): string;
  remove(): boolean;
}

declare var System: {
  println(text: String): void;
  getenv(environmentVariable: String): String;
  processOneEvent(): void;
};

declare interface ObjectConstructor {
  _: HarmonyGlobals;
  assign(target: any, ...sources: any[]): any;
  (...args: any[]): any;
  [key: string]: any;
}
