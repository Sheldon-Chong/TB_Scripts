interface Timer {
  startTimeMs: number;
  callback: () => void;
}

function createTimerKit(Core: CoreRuntime) {
  return {
    createTimer: (input: Timer) => {
      var timer = new Core.QTimer();
      timer.singleShot = true;
      timer.setInterval(input.startTimeMs);
      timer.timeout.connect(input.callback);
      return timer;
    },
  };
}
