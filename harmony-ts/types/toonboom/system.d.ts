declare var MessageLog: {
  trace(msg: string): void;
};

declare var specialFolders: {
  userScripts: string;
  userConfig: string;
};

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
