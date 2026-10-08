function createLogger(Core: CoreRuntime) {
  function valueToString(value: any): string {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    try {
      if (value !== null && typeof value.toString === 'function') {
        return value.toString();
      }
    } catch (e) {}

    return Core.String(value);
  }

  function log(...args: any[]): void {
    var parts: string[] = [];

    for (var i = 0; i < args.length; i++) {
      parts.push(valueToString(args[i]));
    }

    Core.MessageLog.trace(parts.join(' '));
  }

  return log;
}
