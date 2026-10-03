function createPaletteClass(Core: CoreRuntime, PaletteColorClass: any) {
  class Palette {
    private _native: any;
    private _lockHeld: boolean;

    constructor(nativePalette: any) {
      this._native = nativePalette;
      this._lockHeld = false;
    }

    get id(): string {
      return this._native.id;
    }

    get name(): string {
      return this._native.getName();
    }

    set name(value: string) {
      this._native.setName(value);
    }

    get path(): string {
      return this._native.getPath();
    }

    get nColors(): number {
      return this._native.nColors;
    }

    get location(): PaletteLocation {
      return this._native.location;
    }

    get elementId(): number {
      return this._native.elementId;
    }

    get isValid(): boolean {
      return this._native.isValid();
    }

    get isLoaded(): boolean {
      return this._native.isLoaded();
    }

    get isNotFound(): boolean {
      return this._native.isNotFound();
    }

    get isColorPalette(): boolean {
      return this._native.isColorPalette();
    }

    get isTexturePalette(): boolean {
      return this._native.isTexturePalette();
    }

    setToColorPalette(): void {
      this._native.setToColorPalette();
    }

    setToTexturePalette(): void {
      this._native.setToTexturePalette();
    }

    getLock(): boolean {
      this._lockHeld = this._native.getLock();
      return this._lockHeld;
    }

    releaseLock(): boolean {
      var ok = this._native.releaseLock();
      if (ok) {
        this._lockHeld = false;
      }
      return ok;
    }

    get lockHeld(): boolean {
      return this._lockHeld;
    }

    withLock<T>(fn: () => T): T | null {
      if (!this.getLock()) {
        Core.MessageLog.trace('[Palette] Failed to acquire lock for "' + this.name + '"');
        return null;
      }

      try {
        return fn();
      } finally {
        this.releaseLock();
      }
    }

    getColor(key: string | number): any | null {
      if (typeof key === 'number') {
        return this._colorFromIndex(key);
      }
      return this._colorByName(key);
    }

    getColorById(id: string): any | null {
      var color = this._native.getColorById(id);
      return color ? new PaletteColorClass(color, this) : null;
    }

    getColors(): any[] {
      var result: any[] = [];
      for (var i = 0; i < this.nColors; i++) {
        var color = this._colorFromIndex(i);
        if (color) {
          result.push(color);
        }
      }
      return result;
    }

    createColor(type: HarmonyColorType, name: string, data?: any): any | null {
      var color = this._native.createNewColor(type, name, data);
      return color ? new PaletteColorClass(color, this) : null;
    }

    createSolidColor(name: string, data?: any): any | null {
      var color = this._native.createNewSolidColor(name, data);
      return color ? new PaletteColorClass(color, this) : null;
    }

    createLinearGradient(name: string, data?: any): any | null {
      var color = this._native.createNewLinearGradientColor(name, data);
      return color ? new PaletteColorClass(color, this) : null;
    }

    createRadialGradient(name: string, data?: any): any | null {
      var color = this._native.createNewRadialGradientColor(name, data);
      return color ? new PaletteColorClass(color, this) : null;
    }

    createTexture(name: string, filename: string, tiled: boolean): any | null {
      var color = this._native.createNewTexture(name, filename, tiled);
      return color ? new PaletteColorClass(color, this) : null;
    }

    duplicateColor(source: any): any | null {
      var color = this._native.duplicateColor(source.getNative());
      return color ? new PaletteColorClass(color, this) : null;
    }

    cloneColor(source: any, replaceOnConflict?: boolean): any | null {
      var color =
        replaceOnConflict !== undefined
          ? this._native.cloneColor(source.getNative(), replaceOnConflict)
          : this._native.cloneColor(source.getNative());
      return color ? new PaletteColorClass(color, this) : null;
    }

    removeColor(id: string): boolean {
      return this._native.removeColor(id);
    }

    moveColor(from: number, toBefore: number): boolean {
      return this._native.moveColor(from, toBefore);
    }

    acquire(color: any): boolean {
      return this._native.acquire(color.getNative());
    }

    containsUsedColors(colors: any): boolean {
      return this._native.containsUsedColors(colors);
    }

    getNative(): any {
      return this._native;
    }

    toString(): string {
      return 'Palette("' + this.name + '", id=' + this.id + ', colors=' + this.nColors + ')';
    }

    private _colorFromIndex(index: number): any | null {
      var color = this._native.getColorByIndex(index);
      return color ? new PaletteColorClass(color, this) : null;
    }

    private _colorByName(name: string): any | null {
      for (var i = 0; i < this.nColors; i++) {
        var color = this._native.getColorByIndex(i);
        if (color && color.name === name) {
          return new PaletteColorClass(color, this);
        }
      }
      return null;
    }
  }

  return Palette;
}
