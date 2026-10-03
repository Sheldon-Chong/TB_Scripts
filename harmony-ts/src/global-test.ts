// globals-test.ts

include(specialFolders.userScripts + '/core/Shapes.js');
include(specialFolders.userScripts + '/core/Maths.js');
include(specialFolders.userScripts + '/core/Vectors.js');
include(specialFolders.userScripts + '/core/SceneKit.js');
include(specialFolders.userScripts + '/core/TimelineKit.js');

/*
 * Get this entry point's global object and Harmony's shared prototype.
 */
var __tbGlobal = Function('return this;')();
var __tbShared = __tbGlobal.__proto__;

/*
 * Publish ONE namespace onto the shared Harmony object.
 */
if (!__tbShared.__TBTest) {
  __tbShared.__TBTest = {};
}

var __TB = __tbShared.__TBTest;

/*
 * References originating from other included files.
 */
__TB.Shapes = Shapes;
__TB.Maths = Maths;

__TB.Vectors = vectors;
__TB.Vec2 = vectors.Vec2;
__TB.Vec3 = vectors.Vec3;

__TB.SceneKit = SceneKit;

__TB.TimelineKit = TimelineKit;

/*
 * Function created in globals-test.ts.
 */
__TB.testGlobals = function () {
  MessageLog.trace('[TBTest.testGlobals] called');

  MessageLog.trace('[TBTest.testGlobals] scene: ' + typeof scene);

  MessageLog.trace('[TBTest.testGlobals] Drawing: ' + typeof Drawing);

  MessageLog.trace('[TBTest.testGlobals] node: ' + typeof node);

  MessageLog.trace('[TBTest.testGlobals] Shapes: ' + typeof Shapes);

  MessageLog.trace('[TBTest.testGlobals] Maths: ' + typeof Maths);
};

/*
 * This is particularly useful:
 *
 * The function is created here, where the included files are visible,
 * and is later invoked from the toolbar action.
 */
__TB.testExternalReferences = function () {
  MessageLog.trace('[TBTest.testExternalReferences] Shapes: ' + typeof Shapes);

  MessageLog.trace('[TBTest.testExternalReferences] Maths: ' + typeof Maths);

  MessageLog.trace('[TBTest.testExternalReferences] vectors: ' + typeof vectors);
};

MessageLog.trace('[globals-test] executed');

MessageLog.trace('[globals-test] __TBTest: ' + typeof __tbShared.__TBTest);

MessageLog.trace('[globals-test] Shapes: ' + typeof __TB.Shapes);

MessageLog.trace('[globals-test] Maths: ' + typeof __TB.Maths);
