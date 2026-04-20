/// <reference path="./utils/GlobalPalettes.ts" />

/**
 * Example usage of the Palette Manager OOP System
 */

// Example 1: Working with the global palette manager
function exampleGlobalPaletteManager() {
  const manager = GlobalPalettes;
  
  // Get current selections
  MessageLog.trace(`Current palette: ${manager.getCurrentPaletteName()}`);
  MessageLog.trace(`Current color: ${manager.getCurrentColorName()}`);
  
  // List all colors in current palette
  const colors = manager.getAllColorsInCurrentPalette();
  colors.forEach((color, index) => {
    MessageLog.trace(`Color ${index}: ${color.name} (ID: ${color.id})`);
  });
  
  // List all palettes in scene
  const palettes = manager.getAllPalettes(true);
  palettes.forEach((palette, index) => {
    MessageLog.trace(`Palette ${index}: ${palette.name} at ${palette.path}`);
  });
  
  // Set current palette and color
  manager.setCurrentPaletteById("some-palette-id");
  manager.setCurrentColorById("some-color-id");
  
  // Apply current color to selection
  manager.applyColorSelection();
}

// Example 2: Working with a specific palette
function examplePaletteOperations(nativePaletteList: any) {
  const paletteList = new PaletteList(nativePaletteList);
  
  // Get a palette
  const palette = paletteList.getPaletteByIndex(0);
  if (!palette) {
    MessageLog.trace("Palette not found!");
    return;
  }
  
  MessageLog.trace(`Working with palette: ${palette.getName()}`);
  MessageLog.trace(`Number of colors: ${palette.nColors}`);
  
  // Iterate through all colors
  const colors = palette.getAllColors();
  colors.forEach((color, index) => {
    MessageLog.trace(`  ${index}: ${color.getName()} (ID: ${color.getId()})`);
  });
  
  // Add a new solid color with lock management
  palette.withLock(() => {
    const newColor = palette.createNewSolidColor("MyNewColor", {
      r: 255,
      g: 0,
      b: 0,
      a: 255
    });
    
    if (newColor) {
      MessageLog.trace(`Created new color: ${newColor.getName()}`);
    }
  });
}

// Example 3: Creating and managing palettes
function examplePaletteListOperations(nativePaletteList: any) {
  const paletteList = new PaletteList(nativePaletteList);
  
  // Create a new palette with lock
  const newPalette = paletteList.withLock(() => {
    return paletteList.createPalette("MyNewPalette");
  });
  
  if (!newPalette) {
    MessageLog.trace("Failed to create palette!");
    return;
  }
  
  MessageLog.trace(`Created palette: ${newPalette.getName()}`);
  
  // Add some colors to the new palette
  newPalette.withLock(() => {
    // Create a solid color
    const redColor = newPalette.createNewSolidColor("Red", {
      r: 255, g: 0, b: 0, a: 255
    });
    
    // Create a blue color
    const blueColor = newPalette.createNewSolidColor("Blue", {
      r: 0, g: 0, b: 255, a: 255
    });
    
    // Create a gradient
    const gradient = newPalette.createNewLinearGradientColor("RedToBlue", {
      start: { r: 255, g: 0, b: 0, a: 255 },
      end: { r: 0, g: 0, b: 255, a: 255 }
    });
  });
  
  MessageLog.trace(`Palette now has ${newPalette.nColors} colors`);
}

// Example 4: Copying colors between palettes
function exampleCopyColorsBetweenPalettes(sourcePalette: Palette, targetPalette: Palette) {
  const colors = sourcePalette.getAllColors();
  
  targetPalette.withLock(() => {
    colors.forEach((color) => {
      // Duplicate creates a new unique ID
      const duplicated = targetPalette.duplicateColor(color);
      if (duplicated) {
        MessageLog.trace(`Duplicated: ${duplicated.getName()}`);
      }
      
      // Clone preserves the original ID
      // const cloned = targetPalette.cloneColor(color, true); // Replace on conflict
    });
  });
}

// Example 5: Finding and manipulating specific colors
function exampleFindAndModifyColor(palette: Palette, colorName: string) {
  const colors = palette.getAllColors();
  const targetColor = colors.find(c => c.getName() === colorName);
  
  if (!targetColor) {
    MessageLog.trace(`Color '${colorName}' not found!`);
    return;
  }
  
  palette.withLock(() => {
    // Rename the color
    targetColor.setName(`${colorName}_Modified`);
    
    // If it's a regular color (not texture), modify its data
    if (!targetColor.isTexture() && targetColor instanceof Color) {
      const color = targetColor as Color;
      MessageLog.trace(`Color type: ${color.getType()}`);
    }
  });
}

// Example 6: Working with texture colors
function exampleTextureColor(palette: Palette, texturePath: string) {
  palette.withLock(() => {
    const texture = palette.createNewTexture("MyTexture", texturePath, true);
    
    if (texture) {
      MessageLog.trace(`Created texture: ${texture.getName()}`);
      MessageLog.trace(`Is tiled: ${texture.isTiled()}`);
      MessageLog.trace(`Filename: ${texture.getFilename()}`);
      
      // Change tiling
      texture.setTiled(false);
    }
  });
}

// Example 7: Safe palette operations with error handling
function exampleSafePaletteOperations(nativePaletteList: any) {
  const paletteList = new PaletteList(nativePaletteList);
  
  if (!paletteList.isValid()) {
    MessageLog.trace("Invalid palette list!");
    return;
  }
  
  const result = paletteList.withLock(() => {
    const palette = paletteList.createPalette("SafePalette");
    
    if (!palette || !palette.isValid()) {
      return false;
    }
    
    const color = palette.withLock(() => {
      return palette.createNewSolidColor("SafeColor");
    });
    
    return color !== null;
  });
  
  if (result) {
    MessageLog.trace("Successfully created palette and color!");
  } else {
    MessageLog.trace("Failed to create palette or color");
  }
}

// Example 8: Removing unused palettes
function exampleCleanup() {
  const manager = GlobalPalettes;
  
  // Remove unused palette files (don't delete from disk)
  manager.removeUnusedFiles(false);
  
  // Or delete them permanently
  // manager.removeUnusedFiles(true);
}
