var __HELPER_BUILD_MARKER = 'SCOPE_HELPERS_TEST_001';

var __helperGlobal = Function('return this;')();

if (__helperGlobal.__includeProbe) {
  __helperGlobal.__includeProbe.helperFileExecuted = true;

  __helperGlobal.__includeProbe.helperSawBridge = true;

  __helperGlobal.__includeProbe.sameGlobalObject =
    __helperGlobal === __helperGlobal.__includeProbe.mainGlobal;

  __helperGlobal.__includeProbe.buildMarker = __HELPER_BUILD_MARKER;
}

function includedFileHelper() {
  MessageLog.trace('[includedFileHelper] EXECUTED');

  MessageLog.trace('[includedFileHelper] scene: ' + typeof scene);

  MessageLog.trace('[includedFileHelper] Drawing: ' + typeof Drawing);
}

__helperGlobal.__includedFileHelper = includedFileHelper;
