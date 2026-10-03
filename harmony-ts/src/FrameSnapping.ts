include('global-test.js');

function createFrameSnappingKit(Core: HarmonyCore) {
  var BOUNDARY_MARKER_COLOR = '#ffe476';

  var BOUNDARY_DISTANCE = 32;

  var FrameSnapping = {
    BOUNDARY_MARKER_COLOR: BOUNDARY_MARKER_COLOR,

    BOUNDARY_DISTANCE: BOUNDARY_DISTANCE,

    populateFrameSnappingMarkersAll(): void {
      var startFrame = Core.TimelineKit.startFrame();

      var endFrame = Core.TimelineKit.endFrame();

      FrameSnapping.populateFrameSnappingMarkers(startFrame, endFrame);
    },

    getNearestBoundaryFrame(frameNumber: number): number {
      var markers = Core.TimelineKit.getAllMarkers();

      if (markers.length === 0) {
        return frameNumber;
      }

      var closestMarker = markers[0];

      var closestDistance = Core.Math.abs(frameNumber - closestMarker.frame);

      for (var i = 1; i < markers.length; i++) {
        var distance = Core.Math.abs(frameNumber - markers[i].frame);

        if (distance < closestDistance) {
          closestDistance = distance;

          closestMarker = markers[i];
        }
      }

      return closestMarker.frame;
    },

    gotoPreviousBoundaryMarker(): void {
      var currentFrame = Core.TimelineKit.getSelection().startFrame;

      var markers = Core.TimelineKit.getAllMarkers();

      var previousMarkers = markers
        .filter(function (marker: any) {
          return marker.frame < currentFrame;
        })
        .sort(function (a: any, b: any) {
          return b.frame - a.frame;
        });

      if (previousMarkers.length > 0) {
        Core.TimelineKit.setCurrentFrame(previousMarkers[0].frame);
      }
    },

    gotoNextBoundaryMarker(): void {
      var currentFrame = Core.TimelineKit.getSelection().startFrame;

      var markers = Core.TimelineKit.getAllMarkers();

      var nextMarkers = markers
        .filter(function (marker: any) {
          return marker.frame > currentFrame;
        })
        .sort(function (a: any, b: any) {
          return a.frame - b.frame;
        });

      if (nextMarkers.length > 0) {
        Core.TimelineKit.setCurrentFrame(nextMarkers[0].frame);
      }
    },

    populateFrameSnappingMarkers(startFrame: number, endFrame: number): void {
      Core.scene.beginUndoRedoAccum('Populate Frame Snapping Markers');

      try {
        Core.MessageLog.trace(
          'Populating frame snapping markers from ' + startFrame + ' to ' + endFrame,
        );

        while (startFrame <= endFrame) {
          if ((startFrame - 1) % BOUNDARY_DISTANCE === 0) {
            FrameSnapping.createBoundaryMarker(startFrame);
          }

          startFrame++;
        }
      } finally {
        Core.scene.endUndoRedoAccum();
      }
    },

    createBoundaryMarker(frameNumber: number): void {
      Core.TimelineKit.createMarker(
        frameNumber,
        'Boundary',
        BOUNDARY_MARKER_COLOR,
        'Boundary Marker ' + frameNumber,
        1,
      );
    },
  };

  return FrameSnapping;
}

type FrameSnappingKit = ReturnType<typeof createFrameSnappingKit>;

/*
 * Returns the one persistent FrameSnapping
 * instance attached to Core.
 */
function getFrameSnappingKit(Core: HarmonyCore): FrameSnappingKit {
  var Runtime: any = Core;

  if (!Runtime.FrameSnapping) {
    Runtime.FrameSnapping = createFrameSnappingKit(Core);
  }

  return Runtime.FrameSnapping as FrameSnappingKit;
}

/*
 * Toon Boom test entry points.
 */

function testGoingToNextBoundaryMarker(): void {
  var Core = getCore();

  var FrameSnapping = getFrameSnappingKit(Core);

  FrameSnapping.gotoNextBoundaryMarker();
}

function testGoingToPreviousBoundaryMarker(): void {
  var Core = getCore();

  var FrameSnapping = getFrameSnappingKit(Core);

  FrameSnapping.gotoPreviousBoundaryMarker();
}

function populateFrameSnappingMarkers(): void {
  var Core = getCore();

  var FrameSnapping = getFrameSnappingKit(Core);

  FrameSnapping.populateFrameSnappingMarkersAll();
}
