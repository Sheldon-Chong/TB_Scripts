// ─── Constants ───────────────────────────────────────────────────────────────

enum PaletteLocation {
  SCENE = 0,
  ELEMENT = 1,
  JOB = 2,
  ENVIRONMENT = 3,
}

enum HarmonyColorType {
  SOLID_COLOR = 0,
  LINEAR_GRADIENT = 1,
  RADIAL_GRADIENT = 2,
}

// ─── PaletteColor ────────────────────────────────────────────────────────────

/**
 * Wraps a native ToonBoom Color / BaseColor object.
 *
 * For a solid colour `colorData` is an `{r,g,b,a}` object.
 * For gradients it is an array of such objects.
 *
 * ```ts
 * const c = palette.getColor("Outline");
 * c.colorData = { r: 255, g: 0, b: 0, a: 255 };
 * ```
 */
class PaletteColor {
  constructor(private _native: any) {}

  // ── identity ──
  get id(): string              { return this._native.id; }
  get name(): string            { return this._native.name; }
  set name(v: string)           { this._native.setName(v); }

  // ── type ──
  get colorType(): HarmonyColorType { return this._native.colorType; }

  /** Accepts a HarmonyColorType enum value *or* a ToonBoom string constant. */
  setColorType(type: HarmonyColorType | string): void {
    this._native.setColorType(type);
  }

  get isSolid(): boolean          { return this.colorType === HarmonyColorType.SOLID_COLOR; }
  get isLinearGradient(): boolean { return this.colorType === HarmonyColorType.LINEAR_GRADIENT; }
  get isRadialGradient(): boolean { return this.colorType === HarmonyColorType.RADIAL_GRADIENT; }

  // ── data ──
  get colorData(): any          { return this._native.colorData; }
  set colorData(v: any)         { this._native.setColorData(v); }

  // ── texture ──
  get isTexture(): boolean      { return this._native.isTexture ? this._native.isTexture() : false; }

  // ── validation ──
  get isValid(): boolean        { return true; } // native object should always be valid if it exists

  /** Access the raw ToonBoom object (for passing back into native API). */
  getNative(): any { return this._native; }

  toString(): string {
    return `PaletteColor("${this.name}", id=${this.id}, type=${this.colorType})`;
  }
}

// ─── Palette ─────────────────────────────────────────────────────────────────

/**
 * Represents a single ToonBoom palette. Wraps a native Palette pointer and
 * exposes colour access, creation, and manipulation.
 *
 * ```ts
 * const palette = G.Palettes.get("Default");
 * const outline = palette.getColor("Outline");
 * outline.colorData = { r: 0, g: 0, b: 0, a: 255 };
 * ```
 */
class Palette {
  private _lockHeld = false;

  constructor(private _native: any) {}

  // ── identity / meta ──
  get id(): string                      { return this._native.id; }
  get name(): string                    { return this._native.getName(); }
  set name(v: string)                   { this._native.setName(v); }
  get path(): string                    { return this._native.getPath(); }
  get nColors(): number                 { return this._native.nColors; }
  get location(): PaletteLocation       { return this._native.location; }
  get elementId(): number               { return this._native.elementId; }

  get isValid(): boolean                { return this._native.isValid(); }
  get isLoaded(): boolean               { return this._native.isLoaded(); }
  get isNotFound(): boolean             { return this._native.isNotFound(); }
  get isColorPalette(): boolean         { return this._native.isColorPalette(); }
  get isTexturePalette(): boolean       { return this._native.isTexturePalette(); }

  setToColorPalette(): void             { this._native.setToColorPalette(); }
  setToTexturePalette(): void           { this._native.setToTexturePalette(); }

  // ── locking ──

  getLock(): boolean {
    this._lockHeld = this._native.getLock();
    return this._lockHeld;
  }

  releaseLock(): boolean {
    const ok = this._native.releaseLock();
    if (ok) this._lockHeld = false;
    return ok;
  }

  get lockHeld(): boolean { return this._lockHeld; }

  /** Acquire lock, run `fn`, then release. Returns `null` if lock fails. */
  withLock<T>(fn: () => T): T | null {
    if (!this.getLock()) {
      MessageLog.trace(`[Palette] Failed to acquire lock for "${this.name}"`);
      return null;
    }
    try { return fn(); }
    finally { this.releaseLock(); }
  }

  // ── colour access ──

  /**
   * Get a colour by **name** (string) or **0-based index** (number).
   *
   * ```ts
   * palette.getColor("Outline")   // by name
   * palette.getColor(0)           // by index
   * ```
   */
  getColor(key: string | number): PaletteColor | null {
    if (typeof key === "number") {
      return this._colorFromIndex(key);
    }
    return this._colorByName(key);
  }

  /** Get a colour by its unique ID string. */
  getColorById(id: string): PaletteColor | null {
    const c = this._native.getColorById(id);
    return new PaletteColor(c);
  }

  /** Return every colour in the palette. */
  getColors(): PaletteColor[] {
    const out: PaletteColor[] = [];
    for (let i = 0; i < this.nColors; i++) {
      const c = this._colorFromIndex(i);
      if (c) out.push(c);
    }
    return out;
  }

  // ── colour creation ──

  createColor(type: HarmonyColorType, name: string, data?: any): PaletteColor | null {
    const c = this._native.createNewColor(type, name, data);
    return c && new PaletteColor(c);
  }

  createSolidColor(name: string, data?: any): PaletteColor | null {
    const c = this._native.createNewSolidColor(name, data);
    return c && new PaletteColor(c);
  }

  createLinearGradient(name: string, data?: any): PaletteColor | null {
    const c = this._native.createNewLinearGradientColor(name, data);
    return c && new PaletteColor(c);
  }

  createRadialGradient(name: string, data?: any): PaletteColor | null {
    const c = this._native.createNewRadialGradientColor(name, data);
    return c && new PaletteColor(c);
  }

  createTexture(name: string, filename: string, tiled: boolean): PaletteColor | null {
    const c = this._native.createNewTexture(name, filename, tiled);
    return c && new PaletteColor(c);
  }

  // ── colour manipulation ──

  /** Duplicate a colour (new unique ID). */
  duplicateColor(source: PaletteColor): PaletteColor | null {
    const c = this._native.duplicateColor(source.getNative());
    return c && new PaletteColor(c);
  }

  /** Clone a colour (same ID). Optionally replace on ID conflict. */
  cloneColor(source: PaletteColor, replaceOnConflict?: boolean): PaletteColor | null {
    const c = replaceOnConflict !== undefined
      ? this._native.cloneColor(source.getNative(), replaceOnConflict)
      : this._native.cloneColor(source.getNative());
    return c && new PaletteColor(c);
  }

  removeColor(id: string): boolean              { return this._native.removeColor(id); }
  moveColor(from: number, toBefore: number): boolean { return this._native.moveColor(from, toBefore); }

  /** Move a colour from another palette into this one. */
  acquire(color: PaletteColor): boolean          { return this._native.acquire(color.getNative()); }
  containsUsedColors(colors: any): boolean       { return this._native.containsUsedColors(colors); }

  getNative(): any { return this._native; }

  toString(): string {
    return `Palette("${this.name}", id=${this.id}, colors=${this.nColors})`;
  }

  // ── private ──

  private _colorFromIndex(index: number): PaletteColor | null {
    const c = this._native.getColorByIndex(index);
    return c && new PaletteColor(c);
  }

  private _colorByName(name: string): PaletteColor | null {
    for (let i = 0; i < this.nColors; i++) {
      const c = this._native.getColorByIndex(i);
      if (c && c.name === name) {
        return new PaletteColor(c);
      }
    }
    return null;
  }
}

// ─── GlobalPaletteManager (singleton) ────────────────────────────────────────

/**
 * Single entry-point for all palette operations.
 * Uses the native `PaletteManager` for UI state and
 * `PaletteObjectManager.getScenePaletteList()` for actual Palette objects.
 *
 * ```ts
 * const p = G.Palettes.get("Default");        // by name
 * const p = G.Palettes.get(0);                // by index
 * const c = p.getColor("Outline");            // colour by name
 * c.colorData = { r: 255, g: 0, b: 0, a: 255 };
 * ```
 */
class GlobalPaletteManager {
  private static _instance: GlobalPaletteManager;
  private constructor() {}

  static getInstance(): GlobalPaletteManager {
    if (!GlobalPaletteManager._instance) {
      GlobalPaletteManager._instance = new GlobalPaletteManager();
    }
    return GlobalPaletteManager._instance;
  }

  // ── scene palette list (native) ──

  /** Returns the native scene PaletteList. */
  private _scenePaletteList(): any {
    return PaletteObjectManager.getScenePaletteList();
  }

  // ── palette count ──

  /** Number of palettes in the current (or scene) palette list. */
  count(scenePaletteList?: boolean): number {
    return scenePaletteList !== undefined
      ? PaletteManager.getNumPalettes(scenePaletteList)
      : PaletteManager.getNumPalettes();
  }

  // ── universal getter ──

  /**
   * Retrieve a palette by **name** (string) or **0-based index** (number).
   *
   * ```ts
   * G.Palettes.get("Default")   // by name
   * G.Palettes.get(0)           // by index
   * ```
   *
   * @param key               Palette name or 0-based index.
   * @param scenePaletteList  If true, search the scene palette list.
   */
  get(key: string | number, scenePaletteList?: boolean): Palette | null {
    if (typeof key === "number") {
      return this._paletteFromIndex(key, scenePaletteList);
    }
    return this._paletteFromName(key, scenePaletteList);
  }

  /** Return every palette wrapped as a `Palette` object. */
  getAll(scenePaletteList?: boolean): Palette[] {
    const out: Palette[] = [];
    const n = this.count(scenePaletteList);
    for (let i = 0; i < n; i++) {
      const p = this._paletteFromIndex(i, scenePaletteList);
      if (p) out.push(p);
    }
    return out;
  }

  // ── current selection (read) ──

  /** The palette currently highlighted in the Colour View. */
  get currentPalette(): { id: string; name: string; path: string } {
    return {
      id:   PaletteManager.getCurrentPaletteId(),
      name: PaletteManager.getCurrentPaletteName(),
      path: PaletteManager.getCurrentPalettePath(),
    };
  }

  /** The colour currently highlighted in the Colour View. */
  get currentColor(): { id: string; name: string } {
    return {
      id:   PaletteManager.getCurrentColorId(),
      name: PaletteManager.getCurrentColorName(),
    };
  }

  /** Number of colours in the currently-selected palette. */
  get currentPaletteSize(): number {
    return PaletteManager.getCurrentPaletteSize();
  }

  // ── current selection (write) ──

  selectPalette(key: string | number, scenePaletteList?: boolean): boolean {
    let id: string;
    if (typeof key === "number") {
      id = scenePaletteList !== undefined
        ? PaletteManager.getPaletteId(key, scenePaletteList)
        : PaletteManager.getPaletteId(key);
    } else {
      // Resolve name → id
      const n = this.count(scenePaletteList);
      let found = "";
      for (let i = 0; i < n; i++) {
        const name = scenePaletteList !== undefined
          ? PaletteManager.getPaletteName(i, scenePaletteList)
          : PaletteManager.getPaletteName(i);
        if (name === key) {
          found = scenePaletteList !== undefined
            ? PaletteManager.getPaletteId(i, scenePaletteList)
            : PaletteManager.getPaletteId(i);
          break;
        }
      }
      if (!found) {
        MessageLog.trace(`[Palettes] Palette "${key}" not found`);
        return false;
      }
      id = found;
    }
    PaletteManager.setCurrentPaletteById(id);
    return true;
  }

  selectColor(id: string): void {
    PaletteManager.setCurrentColorById(id);
  }

  selectPaletteAndColor(paletteId: string, colorId: string): void {
    PaletteManager.setCurrentPaletteAndColorById(paletteId, colorId);
  }

  setPencilTexture(textureId: string): void {
    PaletteManager.setCurrentPencilTextureById(textureId);
  }

  // ── actions ──

  /** Apply the currently-selected colour to the active drawing selection. */
  applyColor(): void {
    PaletteManager.applyColorSelection();
  }

  /** Remove palettes that are no longer referenced by any drawing. */
  removeUnused(deleteFiles: boolean = false): void {
    PaletteManager.removeUnusedFiles(deleteFiles);
  }

  // ── internals ──

  /**
   * Resolve a palette index into a `Palette` object.
   * First gets the ID from `PaletteManager`, then looks it up in
   * the scene PaletteList to obtain the native palette pointer.
   */
  private _paletteFromIndex(index: number, scenePaletteList?: boolean): Palette | null {
    const id = scenePaletteList !== undefined
      ? PaletteManager.getPaletteId(index, scenePaletteList)
      : PaletteManager.getPaletteId(index);

    if (!id) return null;
    return this._resolvePaletteById(id);
  }

  /**
   * Resolve a palette name into a `Palette` object.
   * Scans `PaletteManager` by name, then gets the native pointer via ID.
   */
  private _paletteFromName(name: string, scenePaletteList?: boolean): Palette | null {
    const n = this.count(scenePaletteList);
    for (let i = 0; i < n; i++) {
      const palName = scenePaletteList !== undefined
        ? PaletteManager.getPaletteName(i, scenePaletteList)
        : PaletteManager.getPaletteName(i);

      if (palName === name) {
        return this._paletteFromIndex(i, scenePaletteList);
      }
    }
    return null;
  }

  /** Look up a palette ID inside the scene's native PaletteList. */
  private _resolvePaletteById(id: string): Palette | null {
    const nativeList = this._scenePaletteList();
    if (!nativeList) return null;

    // Direct lookup
    let p = nativeList.getPaletteById(id);
    if (p && p.isValid()) return new Palette(p);

    // Try linked palettes
    p = nativeList.getPaletteById(id, true);
    if (p && p.isValid()) return new Palette(p);

    return null;
  }
}

// Singleton instance
const GlobalPalettes = GlobalPaletteManager.getInstance();