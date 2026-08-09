include('globals.js');
function debug() {
  MessageLog.trace('[Debug.ts] ' + JSON.stringify(G.Scene.metadata.keys(), null, 2));
  G.Scene.metadata.removeAll();

  const populateMetadas = [
    {
      name: 'guideList',
      type: 'guideList',
      creator: 'Harmony Advanced',
      version: '1.0',
    },
    {
      name: 'symmetryGuideList',
      type: 'symmetryGuideList',
      creator: 'Harmony Advanced',
      version: '1.0',
    },
    {
      name: 'alignmentGuideList',
      type: 'alignmentGuideList',
      creator: 'Harmony Advanced',
      version: '1.0',
    },
  ];

  for (const metadata of populateMetadas) {
    scene.setMetadata(metadata);
  }
}
