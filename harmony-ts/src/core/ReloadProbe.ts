var shared = Function('return this;')().__proto__;

shared.__TBHotReloadProbe = function (Core) {
  return {
    run: function () {
      Core.MessageLog.trace('[DevProbe] VERSION 1');
    },
  };
};
