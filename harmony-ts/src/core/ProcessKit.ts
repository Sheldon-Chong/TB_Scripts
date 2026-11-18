function createProcessKit(Core: Pick<CoreBase, 'QProcess'>) {
  return {
    start(program: string, args: string[] = [], parent?: QWidget): QProcess {
      const process = parent ? new Core.QProcess(parent) : new Core.QProcess();
      process.start(program, args);
      return process;
    },
  };
}
