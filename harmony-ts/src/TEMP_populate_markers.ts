include('global-test.js');

function populateMarkers() {
  const Core = getCore();
  reloadDevelopmentCore();

  Core.log('test');
  Core.scene.beginUndoRedoAccum('populate markers');
  for (var i = 0; i < 490; i++) {
    const frameNum = i * 32;
    const marker = {
      frame: frameNum + 1,
      color: '#FFFF66',
      name: `Profile ${i + 1}`,
      notes: `Dialogue line ${i + 1}`,
    };

    Core.TimelineKit.createMarker(marker.frame, marker.name, marker.color, marker.notes);
    // Do something with the created marker, e.g., add it to the timeline
  }

  Core.log('test2');

  Core.scene.endUndoRedoAccum();
}
