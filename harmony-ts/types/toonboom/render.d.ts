declare var render: {
  setCombine(autoCombine: boolean, secondFieldFirst: boolean): void;
  setFieldType(type: number): void;
  setBgColor(bgColor: ColorRGBA): void;
  setResolution(x: number, y: number): void;
  setResolutionName(name: string): void;
  setRenderDisplay(name: string): void;
  setWriteEnabled(enabled: boolean): void;
  setAutoThumbnailCropping(enabled: boolean): void;
  setWhiteBackground(enabled: boolean): void;
  renderScene(fromFrame: number, toFrame: number): void;
  renderSceneAll(): void;
  renderNodes(nodeNameList: any, fromFrame: number, toFrame: number): void;
  cancelRender(): void;
  disconnect(): void;
  frameReady?: (frame: number, frameCel: any) => void;
  nodeFrameReady?: (frame: number, frameCel: any, nodePath: string) => void;
  renderFinished?: () => void;
};
