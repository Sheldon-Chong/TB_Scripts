declare var element: {
  numberOf(): number;
  id(elementIndex: number): number;
  getNameById(elementId: number): string;
  scanType(elementId: number): string;
  fieldChart(elementId: number): number;
  vectorType(elementId: number): number;
  pixmapFormat(elementId: number): string;
  folder(elementId: number): string;
  completeFolder(elementId: number): string;
  physicalName(elementId: number): string;
  modify(
    elementId: number,
    scanType: string,
    fieldChart: number,
    pixmapFormat: string,
    vectorType: number,
  ): boolean;
  add(
    name: string,
    scanType: string,
    fieldChart: number,
    fileFormat: string,
    vectorFormat: string,
  ): number;
  remove(elementId: number, deleteDiskFile: boolean): boolean;
  renameById(elementId: number, name: string): boolean;
};
