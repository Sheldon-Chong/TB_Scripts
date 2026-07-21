var PaletteLocation;
(function (PaletteLocation) {
    PaletteLocation[PaletteLocation["SCENE"] = 0] = "SCENE";
    PaletteLocation[PaletteLocation["ELEMENT"] = 1] = "ELEMENT";
    PaletteLocation[PaletteLocation["JOB"] = 2] = "JOB";
    PaletteLocation[PaletteLocation["ENVIRONMENT"] = 3] = "ENVIRONMENT";
})(PaletteLocation || (PaletteLocation = {}));
var HarmonyColorType;
(function (HarmonyColorType) {
    HarmonyColorType[HarmonyColorType["SOLID_COLOR"] = 0] = "SOLID_COLOR";
    HarmonyColorType[HarmonyColorType["LINEAR_GRADIENT"] = 1] = "LINEAR_GRADIENT";
    HarmonyColorType[HarmonyColorType["RADIAL_GRADIENT"] = 2] = "RADIAL_GRADIENT";
})(HarmonyColorType || (HarmonyColorType = {}));
var PaletteColor = (function () {
    function PaletteColor(_native) {
        this._native = _native;
    }
    Object.defineProperty(PaletteColor.prototype, "id", {
        get: function () { return this._native.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "name", {
        get: function () { return this._native.name; },
        set: function (v) { this._native.setName(v); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "colorType", {
        get: function () { return this._native.colorType; },
        enumerable: false,
        configurable: true
    });
    PaletteColor.prototype.setColorType = function (type) {
        this._native.setColorType(type);
    };
    Object.defineProperty(PaletteColor.prototype, "isSolid", {
        get: function () { return this.colorType === HarmonyColorType.SOLID_COLOR; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "isLinearGradient", {
        get: function () { return this.colorType === HarmonyColorType.LINEAR_GRADIENT; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "isRadialGradient", {
        get: function () { return this.colorType === HarmonyColorType.RADIAL_GRADIENT; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "colorData", {
        get: function () { return this._native.colorData; },
        set: function (v) { this._native.setColorData(v); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "isTexture", {
        get: function () { return this._native.isTexture ? this._native.isTexture() : false; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PaletteColor.prototype, "isValid", {
        get: function () { return true; },
        enumerable: false,
        configurable: true
    });
    PaletteColor.prototype.getNative = function () { return this._native; };
    PaletteColor.prototype.toString = function () {
        return "PaletteColor(\"".concat(this.name, "\", id=").concat(this.id, ", type=").concat(this.colorType, ")");
    };
    return PaletteColor;
}());
var Palette = (function () {
    function Palette(_native) {
        this._native = _native;
        this._lockHeld = false;
    }
    Object.defineProperty(Palette.prototype, "id", {
        get: function () { return this._native.id; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "name", {
        get: function () { return this._native.getName(); },
        set: function (v) { this._native.setName(v); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "path", {
        get: function () { return this._native.getPath(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "nColors", {
        get: function () { return this._native.nColors; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "location", {
        get: function () { return this._native.location; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "elementId", {
        get: function () { return this._native.elementId; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "isValid", {
        get: function () { return this._native.isValid(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "isLoaded", {
        get: function () { return this._native.isLoaded(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "isNotFound", {
        get: function () { return this._native.isNotFound(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "isColorPalette", {
        get: function () { return this._native.isColorPalette(); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Palette.prototype, "isTexturePalette", {
        get: function () { return this._native.isTexturePalette(); },
        enumerable: false,
        configurable: true
    });
    Palette.prototype.setToColorPalette = function () { this._native.setToColorPalette(); };
    Palette.prototype.setToTexturePalette = function () { this._native.setToTexturePalette(); };
    Palette.prototype.getLock = function () {
        this._lockHeld = this._native.getLock();
        return this._lockHeld;
    };
    Palette.prototype.releaseLock = function () {
        var ok = this._native.releaseLock();
        if (ok)
            this._lockHeld = false;
        return ok;
    };
    Object.defineProperty(Palette.prototype, "lockHeld", {
        get: function () { return this._lockHeld; },
        enumerable: false,
        configurable: true
    });
    Palette.prototype.withLock = function (fn) {
        if (!this.getLock()) {
            MessageLog.trace("[Palette] Failed to acquire lock for \"".concat(this.name, "\""));
            return null;
        }
        try {
            return fn();
        }
        finally {
            this.releaseLock();
        }
    };
    Palette.prototype.getColor = function (key) {
        if (typeof key === "number") {
            return this._colorFromIndex(key);
        }
        return this._colorByName(key);
    };
    Palette.prototype.getColorById = function (id) {
        var c = this._native.getColorById(id);
        return new PaletteColor(c);
    };
    Palette.prototype.getColors = function () {
        var out = [];
        for (var i = 0; i < this.nColors; i++) {
            var c = this._colorFromIndex(i);
            if (c)
                out.push(c);
        }
        return out;
    };
    Palette.prototype.createColor = function (type, name, data) {
        var c = this._native.createNewColor(type, name, data);
        return c && new PaletteColor(c);
    };
    Palette.prototype.createSolidColor = function (name, data) {
        var c = this._native.createNewSolidColor(name, data);
        return c && new PaletteColor(c);
    };
    Palette.prototype.createLinearGradient = function (name, data) {
        var c = this._native.createNewLinearGradientColor(name, data);
        return c && new PaletteColor(c);
    };
    Palette.prototype.createRadialGradient = function (name, data) {
        var c = this._native.createNewRadialGradientColor(name, data);
        return c && new PaletteColor(c);
    };
    Palette.prototype.createTexture = function (name, filename, tiled) {
        var c = this._native.createNewTexture(name, filename, tiled);
        return c && new PaletteColor(c);
    };
    Palette.prototype.duplicateColor = function (source) {
        var c = this._native.duplicateColor(source.getNative());
        return c && new PaletteColor(c);
    };
    Palette.prototype.cloneColor = function (source, replaceOnConflict) {
        var c = replaceOnConflict !== undefined
            ? this._native.cloneColor(source.getNative(), replaceOnConflict)
            : this._native.cloneColor(source.getNative());
        return c && new PaletteColor(c);
    };
    Palette.prototype.removeColor = function (id) { return this._native.removeColor(id); };
    Palette.prototype.moveColor = function (from, toBefore) { return this._native.moveColor(from, toBefore); };
    Palette.prototype.acquire = function (color) { return this._native.acquire(color.getNative()); };
    Palette.prototype.containsUsedColors = function (colors) { return this._native.containsUsedColors(colors); };
    Palette.prototype.getNative = function () { return this._native; };
    Palette.prototype.toString = function () {
        return "Palette(\"".concat(this.name, "\", id=").concat(this.id, ", colors=").concat(this.nColors, ")");
    };
    Palette.prototype._colorFromIndex = function (index) {
        var c = this._native.getColorByIndex(index);
        return c && new PaletteColor(c);
    };
    Palette.prototype._colorByName = function (name) {
        for (var i = 0; i < this.nColors; i++) {
            var c = this._native.getColorByIndex(i);
            if (c && c.name === name) {
                return new PaletteColor(c);
            }
        }
        return null;
    };
    return Palette;
}());
var GlobalPaletteManager = (function () {
    function GlobalPaletteManager() {
    }
    GlobalPaletteManager.getInstance = function () {
        if (!GlobalPaletteManager._instance) {
            GlobalPaletteManager._instance = new GlobalPaletteManager();
        }
        return GlobalPaletteManager._instance;
    };
    GlobalPaletteManager.prototype._scenePaletteList = function () {
        return PaletteObjectManager.getScenePaletteList();
    };
    GlobalPaletteManager.prototype.count = function (scenePaletteList) {
        return scenePaletteList !== undefined
            ? PaletteManager.getNumPalettes(scenePaletteList)
            : PaletteManager.getNumPalettes();
    };
    GlobalPaletteManager.prototype.get = function (key, scenePaletteList) {
        if (typeof key === "number") {
            return this._paletteFromIndex(key, scenePaletteList);
        }
        return this._paletteFromName(key, scenePaletteList);
    };
    GlobalPaletteManager.prototype.getAll = function (scenePaletteList) {
        var out = [];
        var n = this.count(scenePaletteList);
        for (var i = 0; i < n; i++) {
            var p = this._paletteFromIndex(i, scenePaletteList);
            if (p)
                out.push(p);
        }
        return out;
    };
    Object.defineProperty(GlobalPaletteManager.prototype, "currentPalette", {
        get: function () {
            return {
                id: PaletteManager.getCurrentPaletteId(),
                name: PaletteManager.getCurrentPaletteName(),
                path: PaletteManager.getCurrentPalettePath(),
            };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GlobalPaletteManager.prototype, "currentColor", {
        get: function () {
            return {
                id: PaletteManager.getCurrentColorId(),
                name: PaletteManager.getCurrentColorName(),
            };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GlobalPaletteManager.prototype, "currentPaletteSize", {
        get: function () {
            return PaletteManager.getCurrentPaletteSize();
        },
        enumerable: false,
        configurable: true
    });
    GlobalPaletteManager.prototype.selectPalette = function (key, scenePaletteList) {
        var id;
        if (typeof key === "number") {
            id = scenePaletteList !== undefined
                ? PaletteManager.getPaletteId(key, scenePaletteList)
                : PaletteManager.getPaletteId(key);
        }
        else {
            var n = this.count(scenePaletteList);
            var found = "";
            for (var i = 0; i < n; i++) {
                var name_1 = scenePaletteList !== undefined
                    ? PaletteManager.getPaletteName(i, scenePaletteList)
                    : PaletteManager.getPaletteName(i);
                if (name_1 === key) {
                    found = scenePaletteList !== undefined
                        ? PaletteManager.getPaletteId(i, scenePaletteList)
                        : PaletteManager.getPaletteId(i);
                    break;
                }
            }
            if (!found) {
                MessageLog.trace("[Palettes] Palette \"".concat(key, "\" not found"));
                return false;
            }
            id = found;
        }
        PaletteManager.setCurrentPaletteById(id);
        return true;
    };
    GlobalPaletteManager.prototype.selectColor = function (id) {
        PaletteManager.setCurrentColorById(id);
    };
    GlobalPaletteManager.prototype.selectPaletteAndColor = function (paletteId, colorId) {
        PaletteManager.setCurrentPaletteAndColorById(paletteId, colorId);
    };
    GlobalPaletteManager.prototype.setPencilTexture = function (textureId) {
        PaletteManager.setCurrentPencilTextureById(textureId);
    };
    GlobalPaletteManager.prototype.applyColor = function () {
        PaletteManager.applyColorSelection();
    };
    GlobalPaletteManager.prototype.removeUnused = function (deleteFiles) {
        if (deleteFiles === void 0) { deleteFiles = false; }
        PaletteManager.removeUnusedFiles(deleteFiles);
    };
    GlobalPaletteManager.prototype._paletteFromIndex = function (index, scenePaletteList) {
        var id = scenePaletteList !== undefined
            ? PaletteManager.getPaletteId(index, scenePaletteList)
            : PaletteManager.getPaletteId(index);
        if (!id)
            return null;
        return this._resolvePaletteById(id);
    };
    GlobalPaletteManager.prototype._paletteFromName = function (name, scenePaletteList) {
        var n = this.count(scenePaletteList);
        for (var i = 0; i < n; i++) {
            var palName = scenePaletteList !== undefined
                ? PaletteManager.getPaletteName(i, scenePaletteList)
                : PaletteManager.getPaletteName(i);
            if (palName === name) {
                return this._paletteFromIndex(i, scenePaletteList);
            }
        }
        return null;
    };
    GlobalPaletteManager.prototype._resolvePaletteById = function (id) {
        var nativeList = this._scenePaletteList();
        if (!nativeList)
            return null;
        var p = nativeList.getPaletteById(id);
        if (p && p.isValid())
            return new Palette(p);
        p = nativeList.getPaletteById(id, true);
        if (p && p.isValid())
            return new Palette(p);
        return null;
    };
    return GlobalPaletteManager;
}());
var GlobalPalettes = GlobalPaletteManager.getInstance();
