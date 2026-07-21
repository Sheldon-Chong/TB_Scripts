function exampleGlobalPaletteManager() {
    var manager = GlobalPalettes;
    MessageLog.trace("Current palette: ".concat(manager.getCurrentPaletteName()));
    MessageLog.trace("Current color: ".concat(manager.getCurrentColorName()));
    var colors = manager.getAllColorsInCurrentPalette();
    colors.forEach(function (color, index) {
        MessageLog.trace("Color ".concat(index, ": ").concat(color.name, " (ID: ").concat(color.id, ")"));
    });
    var palettes = manager.getAllPalettes(true);
    palettes.forEach(function (palette, index) {
        MessageLog.trace("Palette ".concat(index, ": ").concat(palette.name, " at ").concat(palette.path));
    });
    manager.setCurrentPaletteById("some-palette-id");
    manager.setCurrentColorById("some-color-id");
    manager.applyColorSelection();
}
function examplePaletteOperations(nativePaletteList) {
    var paletteList = new PaletteList(nativePaletteList);
    var palette = paletteList.getPaletteByIndex(0);
    if (!palette) {
        MessageLog.trace("Palette not found!");
        return;
    }
    MessageLog.trace("Working with palette: ".concat(palette.getName()));
    MessageLog.trace("Number of colors: ".concat(palette.nColors));
    var colors = palette.getAllColors();
    colors.forEach(function (color, index) {
        MessageLog.trace("  ".concat(index, ": ").concat(color.getName(), " (ID: ").concat(color.getId(), ")"));
    });
    palette.withLock(function () {
        var newColor = palette.createNewSolidColor("MyNewColor", {
            r: 255,
            g: 0,
            b: 0,
            a: 255
        });
        if (newColor) {
            MessageLog.trace("Created new color: ".concat(newColor.getName()));
        }
    });
}
function examplePaletteListOperations(nativePaletteList) {
    var paletteList = new PaletteList(nativePaletteList);
    var newPalette = paletteList.withLock(function () {
        return paletteList.createPalette("MyNewPalette");
    });
    if (!newPalette) {
        MessageLog.trace("Failed to create palette!");
        return;
    }
    MessageLog.trace("Created palette: ".concat(newPalette.getName()));
    newPalette.withLock(function () {
        var redColor = newPalette.createNewSolidColor("Red", {
            r: 255, g: 0, b: 0, a: 255
        });
        var blueColor = newPalette.createNewSolidColor("Blue", {
            r: 0, g: 0, b: 255, a: 255
        });
        var gradient = newPalette.createNewLinearGradientColor("RedToBlue", {
            start: { r: 255, g: 0, b: 0, a: 255 },
            end: { r: 0, g: 0, b: 255, a: 255 }
        });
    });
    MessageLog.trace("Palette now has ".concat(newPalette.nColors, " colors"));
}
function exampleCopyColorsBetweenPalettes(sourcePalette, targetPalette) {
    var colors = sourcePalette.getAllColors();
    targetPalette.withLock(function () {
        colors.forEach(function (color) {
            var duplicated = targetPalette.duplicateColor(color);
            if (duplicated) {
                MessageLog.trace("Duplicated: ".concat(duplicated.getName()));
            }
        });
    });
}
function exampleFindAndModifyColor(palette, colorName) {
    var colors = palette.getAllColors();
    var targetColor = colors.find(function (c) { return c.getName() === colorName; });
    if (!targetColor) {
        MessageLog.trace("Color '".concat(colorName, "' not found!"));
        return;
    }
    palette.withLock(function () {
        targetColor.setName("".concat(colorName, "_Modified"));
        if (!targetColor.isTexture() && targetColor instanceof Color) {
            var color = targetColor;
            MessageLog.trace("Color type: ".concat(color.getType()));
        }
    });
}
function exampleTextureColor(palette, texturePath) {
    palette.withLock(function () {
        var texture = palette.createNewTexture("MyTexture", texturePath, true);
        if (texture) {
            MessageLog.trace("Created texture: ".concat(texture.getName()));
            MessageLog.trace("Is tiled: ".concat(texture.isTiled()));
            MessageLog.trace("Filename: ".concat(texture.getFilename()));
            texture.setTiled(false);
        }
    });
}
function exampleSafePaletteOperations(nativePaletteList) {
    var paletteList = new PaletteList(nativePaletteList);
    if (!paletteList.isValid()) {
        MessageLog.trace("Invalid palette list!");
        return;
    }
    var result = paletteList.withLock(function () {
        var palette = paletteList.createPalette("SafePalette");
        if (!palette || !palette.isValid()) {
            return false;
        }
        var color = palette.withLock(function () {
            return palette.createNewSolidColor("SafeColor");
        });
        return color !== null;
    });
    if (result) {
        MessageLog.trace("Successfully created palette and color!");
    }
    else {
        MessageLog.trace("Failed to create palette or color");
    }
}
function exampleCleanup() {
    var manager = GlobalPalettes;
    manager.removeUnusedFiles(false);
}
