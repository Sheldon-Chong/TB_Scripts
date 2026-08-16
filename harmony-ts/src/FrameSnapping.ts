include('globals.js');

namespace FrameSnapping {
  export const BOUNDARY_MARKER_COLOR = '#ffe476';
  export const BOUNDARY_DISTANCE = 32;

  export function populateFrameSnappingMarkersAll() {
    const startFrame = G.TimelineKit.startFrame();
    const endFrame = G.TimelineKit.endFrame();
    populateFrameSnappingMarkers(startFrame, endFrame);
  }

  export function getNearestBoundaryFrame(frame: number): number {
    const markers = TimelineMarker.getAllMarkers();
    if (markers.length === 0) return frame;

    let closestMarker = markers[0];
    let closestDistance = Math.abs(frame - closestMarker.frame);

    for (let i = 1; i < markers.length; i++) {
      const distance = Math.abs(frame - markers[i].frame);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMarker = markers[i];
      }
    }

    return closestMarker.frame;
  }

  export function gotoPreviousBoundaryMarker() {
    const currentFrame = G.TimelineKit.getSelection().startFrame;
    const markers = TimelineMarker.getAllMarkers();

    // Find markers before the current frame, pick the closest one
    const previousMarkers = markers
      .filter((m) => m.frame < currentFrame)
      .sort((a, b) => b.frame - a.frame);

    if (previousMarkers.length > 0) {
      G.TimelineKit.setCurrentFrame(previousMarkers[0].frame);
    }
  }

  export function gotoNextBoundaryMarker() {
    const currentFrame = G.TimelineKit.getSelection().startFrame;
    const markers = TimelineMarker.getAllMarkers();

    // Find markers after the current frame, pick the closest one
    const nextMarkers = markers
      .filter((m) => m.frame > currentFrame)
      .sort((a, b) => a.frame - b.frame);

    if (nextMarkers.length > 0) {
      G.TimelineKit.setCurrentFrame(nextMarkers[0].frame);
    }
  }

  export function populateFrameSnappingMarkers(startFrame: number, endFrame: number) {
    scene.beginUndoRedoAccum('Populate Frame Snapping Markers');
    MessageLog.trace(`Populating frame snapping markers from ${startFrame} to ${endFrame}`);
    while (startFrame <= endFrame) {
      if ((startFrame - 1) % BOUNDARY_DISTANCE === 0) {
        createBoundaryMarker(startFrame);
      }
      startFrame++;
    }

    scene.endUndoRedoAccum();
  }

  export function createBoundaryMarker(frame: number) {
    G.TimelineKit.createMarker(
      frame,
      'Boundary',
      BOUNDARY_MARKER_COLOR,
      `Boundary Marker ${frame}`,
      1,
    );
  }
}

function testGoingToNextBoundaryMarker() {
  FrameSnapping.gotoNextBoundaryMarker();
}

function testGoingToPreviousBoundaryMarker() {
  FrameSnapping.gotoPreviousBoundaryMarker();
}

function populateFrameSnappingMarkers() {
  FrameSnapping.populateFrameSnappingMarkersAll();
  // const nearestBoundaryMarker = FrameSnapping.getNearestBoundaryFrame(
  //   G.TimelineKit.getSelection().startFrame,
  // );
  // MessageLog.trace('Nearest boundary marker to current frame: ' + nearestBoundaryMarker);
}

interface HarmonyGlobals {
  FrameSnapping: typeof FrameSnapping;
}

G.FrameSnapping = FrameSnapping;
_.FrameSnapping = FrameSnapping;
