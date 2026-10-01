declare var scene: {
  currentVersion(): number;
  currentVersionName(): string;
  currentEnvironment(): string;
  currentEnvironmentPath(): string;
  currentJob(): string;
  currentJobPath(): string;
  currentScene(): string;
  currentProjectPath(): string;
  currentContainerPath(): string;
  currentProjectPathRemapped(): string;
  tempProjectPath(): string;
  tempProjectPathRemapped(): string;
  beginUndoRedoAccum(commandName: string): void;
  endUndoRedoAccum(): void;
  cancelUndoRedoAccum(): void;
  undo(depth?: number): void;
  redo(depth?: number): void;
  clearHistory(): void;
  clearRedo(): void;
  unitsAspectRatioX(): number;
  unitsAspectRatioY(): number;
  numberOfUnitsX(): number;
  numberOfUnitsY(): number;
  numberOfUnitsZ(): number;
  coordAtCenterX(): number;
  coordAtCenterY(): number;
  currentResolutionX(): number;
  currentResolutionY(): number;
  defaultResolutionName(): string;
  defaultResolutionX(): number;
  defaultResolutionY(): number;
  defaultResolutionFOV(): number;
  namedResolutions(): string[];
  namedResolutionX(name: string): number;
  namedResolutionY(name: string): number;
  getFrameRate(): number;
  setDefaultTexturePixelDensityforVectorDrawings(normalizedDensity: number): void;
  setDefaultTexturePixelDensityforBitmapDrawings(normalizedDensity: number): void;
  getStartFrame(): number;
  getStopFrame(): number;
  colorSpace(): string;
  colorSpaceNames(): string[];
  isDirty(): boolean;
  hasBeenDirty(): boolean;
  description(): string;
  setDescription(description: string): void;
  saveAll(): boolean;
  saveAsNewVersion(name: string, markAsDefault: boolean): boolean;
  saveAs(pathname: string): boolean;
  checkFiles(options: any): void;
  setUnitsAspectRatio(x: number, y: number): boolean;
  setNumberOfUnits(x: number, y: number, z: number): boolean;
  setCoordAtCenter(x: number, y: number): boolean;
  setDefaultResolution(x: number, y: number, fov: number): boolean;
  setDefaultResolutionName(name: string): boolean;
  setFrameRate(frameRate: number): boolean;
  setStartFrame(frame: number): boolean;
  setStopFrame(frame: number): boolean;
  setColorSpace(name: string): boolean;
  getCameraMatrix(frame: number): any;
  toOGL(pointOrVector: any): any;
  toOGLX(fieldX: number): number;
  toOGLY(fieldY: number): number;
  toOGLZ(fieldZ: number): number;
  fromOGL(pointOrVector: any): any;
  fromOGLX(oglX: number): number;
  fromOGLY(oglY: number): number;
  fromOGLZ(oglZ: number): number;
  getDefaultDisplay(): string;
  closeScene(): void;
  closeSceneAndExit(): void;
  closeSceneAndOpen(
    envName: string,
    jobName: string,
    sceneName: string,
    versionName?: string,
    isReadOnly?: boolean,
  ): boolean;
  closeSceneAndOpenOffline(filePath: string): boolean;
  getMissingPalettes(unrecovered: boolean, recoveredNotYetSaved: boolean): string[];
  metadatas(): any;
  metadata(name: string, type?: string): any;
  setMetadata(meta: any): void;
  removeMetadata(meta: any): boolean;
  setProcessingBitDepth(bitDepth: number): void;
  getProcessingBitDepth(): number;
  /** The current frame number. */
  current(): number;
  /** Set the current frame number. */
  setCurrent(frame: number): void;
};
