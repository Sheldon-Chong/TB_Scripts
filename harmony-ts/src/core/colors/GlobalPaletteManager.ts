type PaletteInstance = InstanceType<ReturnType<typeof createPaletteClass>>;
type PaletteColorInstance = InstanceType<ReturnType<typeof createPaletteColorClass>>;

interface PaletteColorMatch {
  color: PaletteColorInstance;
  palette: PaletteInstance;
}

type PaletteConstructor = new (nativePalette: any) => PaletteInstance;

function createGlobalPaletteManagerClass(Core: CoreRuntime, PaletteClass: PaletteConstructor) {
  class GlobalPaletteManager {
    private _scenePaletteList(): any {
      return Core.PaletteObjectManager.getScenePaletteList();
    }

    count(scenePaletteList?: boolean): number {
      return scenePaletteList !== undefined
        ? Core.PaletteManager.getNumPalettes(scenePaletteList)
        : Core.PaletteManager.getNumPalettes();
    }

    get(key: string | number, scenePaletteList?: boolean): PaletteInstance | null {
      return typeof key === 'number'
        ? this._paletteFromIndex(key, scenePaletteList)
        : this._paletteFromName(key, scenePaletteList);
    }

    getAll(scenePaletteList?: boolean): PaletteInstance[] {
      var result: PaletteInstance[] = [];
      var count = this.count(scenePaletteList);
      for (var i = 0; i < count; i++) {
        var palette = this._paletteFromIndex(i, scenePaletteList);
        if (palette) {
          result.push(palette);
        }
      }
      return result;
    }

    getColorById(id: string, scenePaletteList?: boolean): PaletteColorMatch | null {
      var palettes = this.getAll(scenePaletteList);

      for (var i = 0; i < palettes.length; i++) {
        var color = palettes[i].getColorById(id);

        if (color) {
          return {
            color: color,
            palette: palettes[i],
          };
        }
      }

      return null;
    }

    get currentPalette(): { id: string; name: string; path: string } {
      return {
        id: Core.PaletteManager.getCurrentPaletteId(),
        name: Core.PaletteManager.getCurrentPaletteName(),
        path: Core.PaletteManager.getCurrentPalettePath(),
      };
    }

    get currentColor(): { id: string; name: string } {
      return {
        id: Core.PaletteManager.getCurrentColorId(),
        name: Core.PaletteManager.getCurrentColorName(),
      };
    }

    get currentPaletteSize(): number {
      return Core.PaletteManager.getCurrentPaletteSize();
    }

    selectPalette(key: string | number, scenePaletteList?: boolean): boolean {
      var id = '';
      if (typeof key === 'number') {
        id =
          scenePaletteList !== undefined
            ? Core.PaletteManager.getPaletteId(key, scenePaletteList)
            : Core.PaletteManager.getPaletteId(key);
      } else {
        var count = this.count(scenePaletteList);
        for (var i = 0; i < count; i++) {
          var name =
            scenePaletteList !== undefined
              ? Core.PaletteManager.getPaletteName(i, scenePaletteList)
              : Core.PaletteManager.getPaletteName(i);
          if (name === key) {
            id =
              scenePaletteList !== undefined
                ? Core.PaletteManager.getPaletteId(i, scenePaletteList)
                : Core.PaletteManager.getPaletteId(i);
            break;
          }
        }
      }

      if (!id) {
        Core.MessageLog.trace('[Palettes] Palette not found: ' + key);
        return false;
      }

      Core.PaletteManager.setCurrentPaletteById(id);
      return true;
    }

    selectColor(id: string): void {
      Core.PaletteManager.setCurrentColorById(id);
    }

    selectPaletteAndColor(paletteId: string, colorId: string): void {
      Core.PaletteManager.setCurrentPaletteAndColorById(paletteId, colorId);
    }

    setPencilTexture(textureId: string): void {
      Core.PaletteManager.setCurrentPencilTextureById(textureId);
    }

    applyColor(): void {
      Core.PaletteManager.applyColorSelection();
    }

    removeUnused(deleteFiles: boolean = false): void {
      Core.PaletteManager.removeUnusedFiles(deleteFiles);
    }

    private _paletteFromIndex(index: number, scenePaletteList?: boolean): PaletteInstance | null {
      var id =
        scenePaletteList !== undefined
          ? Core.PaletteManager.getPaletteId(index, scenePaletteList)
          : Core.PaletteManager.getPaletteId(index);
      return id ? this._resolvePaletteById(id) : null;
    }

    private _paletteFromName(name: string, scenePaletteList?: boolean): PaletteInstance | null {
      var count = this.count(scenePaletteList);
      for (var i = 0; i < count; i++) {
        var paletteName =
          scenePaletteList !== undefined
            ? Core.PaletteManager.getPaletteName(i, scenePaletteList)
            : Core.PaletteManager.getPaletteName(i);
        if (paletteName === name) {
          return this._paletteFromIndex(i, scenePaletteList);
        }
      }
      return null;
    }

    private _resolvePaletteById(id: string): PaletteInstance | null {
      var nativeList = this._scenePaletteList();
      if (!nativeList) {
        return null;
      }

      var palette = nativeList.getPaletteById(id);
      if (palette && palette.isValid()) {
        return new PaletteClass(palette);
      }

      palette = nativeList.getPaletteById(id, true);
      return palette && palette.isValid() ? new PaletteClass(palette) : null;
    }
  }

  return GlobalPaletteManager;
}
