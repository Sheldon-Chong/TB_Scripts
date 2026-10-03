function createPalettesSingleton<T extends new (...args: any[]) => any>(
  GlobalPaletteManagerClass: T,
): InstanceType<T> {
  return new GlobalPaletteManagerClass();
}
