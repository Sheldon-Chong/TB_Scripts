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
    const remainder = frame % BOUNDARY_DISTANCE;
    if (remainder === 0) {
      return frame; // Already at a boundary
    }
    const lowerBoundary = frame - remainder;
    const upperBoundary = lowerBoundary + BOUNDARY_DISTANCE;
    return frame - lowerBoundary < upperBoundary - frame ? lowerBoundary : upperBoundary;
  }

  export function gotoPreviousBoundaryMarker() {
    const currentFrame = G.TimelineKit.getSelection().startFrame;
    if (currentFrame % BOUNDARY_DISTANCE === 0) {
      // If already at a boundary, move to the previous one
      G.TimelineKit.setCurrentFrame(currentFrame - BOUNDARY_DISTANCE);
      return;
    }
    const previousBoundaryFrame = Math.floor(currentFrame / BOUNDARY_DISTANCE) * BOUNDARY_DISTANCE;
    G.TimelineKit.setCurrentFrame(previousBoundaryFrame);
  }

  export function gotoNextBoundaryMarker() {
    const currentFrame = G.TimelineKit.getSelection().startFrame;

    if (currentFrame % BOUNDARY_DISTANCE === 0) {
      // If already at a boundary, move to the next one
      G.TimelineKit.setCurrentFrame(currentFrame + BOUNDARY_DISTANCE);
      return;
    }
    const nextBoundaryFrame = Math.ceil(currentFrame / BOUNDARY_DISTANCE) * BOUNDARY_DISTANCE;
    G.TimelineKit.setCurrentFrame(nextBoundaryFrame);
  }

  export function populateFrameSnappingMarkers(startFrame: number, endFrame: number) {
    scene.beginUndoRedoAccum('Populate Frame Snapping Markers');
    MessageLog.trace(`Populating frame snapping markers from ${startFrame} to ${endFrame}`);
    while (startFrame <= endFrame) {
      if (startFrame % BOUNDARY_DISTANCE === 0) {
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

function test9() {
  FrameSnapping.populateFrameSnappingMarkersAll();
  const nearestBoundaryMarker = FrameSnapping.getNearestBoundaryFrame(
    G.TimelineKit.getSelection().startFrame,
  );
  MessageLog.trace('Nearest boundary marker to current frame: ' + nearestBoundaryMarker);
}

interface HarmonyGlobals {
  FrameSnapping: typeof FrameSnapping;
}

G.FrameSnapping = FrameSnapping;
_.FrameSnapping = FrameSnapping;
