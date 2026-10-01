declare var Timeline: {
  selIsColumn(selectionIndex: number): boolean;
  selToColumn(selectionIndex: number): string;
  selToNode(selectionIndex: number): string;
  selIsNode(selectionIndex: number): boolean;
  layerIsColumn(layerIndex: number): boolean;
  layerToColumn(layerIndex: number): string;
  layerIsNode(layerIndex: number): boolean;
  layerToNode(layerIndex: number): string;
  selToLayer(selectionIndex: number): number;
  parentNodeIndex(layerIndex: number): number;
  isAncestorOf(parentLayerIndex: number, layerIndex: number): boolean;
  setDisplayToUnconnected(): boolean;
  getFrameMarker(layerIndex: number, frameNumber: number): any; // QScriptValue
  getAllFrameMarkers(layerIndex: number): any; // QScriptValue
  filterFrameMarkers(layerIndex: number, markerType: string): any; // QScriptValue
  createFrameMarker(layerIndex: number, markerType: string, frameNumber: number): number;
  deleteFrameMarker(layerIndex: number, markerId: number): boolean;
  moveFrameMarker(layerIndex: number, markerId: number, newFrame: number): boolean;
  changeFrameMarkerType(layerIndex: number, markerId: number, markerType: string): boolean;
  frameMarkerTypes(): string[]; // StringList
  centerOnFrame(frameNum: number): void;
  numLayerSel(): number;
  firstFrameSel(): number;
  numFrameSel(): number;
  numLayers: number;
};

interface oTimelineMarker {
  frame: number;
  length: number;
  color: number | string;
  name: string;
  notes: string;
}

declare var TimelineMarker: {
  createMarker(marker: oTimelineMarker): oTimelineMarker;
  setMarker(marker: any): any;
  deleteMarker(marker: oTimelineMarker): boolean;
  getAllMarkers(): oTimelineMarker[];
  getMarkersAtFrame(atFrame: number): oTimelineMarker[];
  getFirstMarkerAt(atFrame: number): oTimelineMarker;
};
