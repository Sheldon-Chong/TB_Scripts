export namespace ArtTools {
  /**
   * Type definition representing layer masks or bitwise combinations.
   */
  export type ArtLayer = number;

  /**
   * Dynamically retrieves layer masks from Harmony's DrawingTools engine.
   */
  export const ArtLayers = {
    get OverlayArt(): ArtLayer {
      return DrawingTools.overlayArt;
    },
    get Lineart(): ArtLayer {
      return DrawingTools.lineArt;
    },
    get ColourArt(): ArtLayer {
      return DrawingTools.colourArt;
    },
    get UnderlayArt(): ArtLayer {
      return DrawingTools.underlayArt;
    },
  };

  /**
   * Sets the active art layer in Harmony.
   */
  export function setCurrentArt(artLayer: ArtLayer): void {
    DrawingTools.setCurrentArt(artLayer);
  }

  export function getCurrentArt(): ArtLayer {
    const map = {
      0: ArtLayers.UnderlayArt,
      1: ArtLayers.Lineart,
      2: ArtLayers.ColourArt,
      3: ArtLayers.OverlayArt,
    };

    var settings = Tools.getToolSettings();
    return map[settings.activeArt] || ArtLayers.Lineart;
  }
}

// // Exact same usage as an enum!
// ArtTools.setCurrentArt(ArtTools.ArtLayers.ColourArt);

var settings = Tools.getToolSettings();

MessageLog.trace('settings' + JSON.stringify(settings, null, 2));

MessageLog.trace(
  'settings.currentDrawing' + preferences.getBool('DRAWING_SCALE_PENCIL_THICKNESS', false),
);

export enum ActionType {
  ToggleApplyToolToAllLayers = 'onActionToggleApplyToolToAllLayers()',
  ToggleApplyToOnionSkinFrames = 'onActionToggleApplyToOnionSkinFrames()',
}

namespace SelectionProperties {
  export function getApplyToolToAllLayers(): boolean {
    var stateData = Action.validate(ActionType.ToggleApplyToolToAllLayers, 'drawingView');
    return stateData.checked;
  }

  export function setApplyToolToAllLayers(enabled: boolean): void {
    if (getApplyToolToAllLayers() !== enabled) {
      Action.perform(ActionType.ToggleApplyToolToAllLayers, 'drawingView');
    }
  }

  // export function getScalePencilThickness(): boolean {
  //   var stateData = Action.validate("OnScalePencilThicknessToggle()", "drawingView");
  //   return stateData.checked;
  // }

  // export function setScalePencilThickness(enabled: boolean): void {
  //   if (getScalePencilThickness() !== enabled) {
  //     Action.perform("OnScalePencilThicknessToggle()", "drawingView");
  //   }
  // }

  export function getApplyToOnionSkinFrames(): boolean {
    return ToolProperties.getFrameMode() === 2;
  }

  export function setApplyToOnionSkinFrames(enabled: boolean): void {
    ToolProperties.setFrameMode(enabled ? 2 : 0);
  }
}

export namespace ArtistTools {
  export function setFacialExpressionMode(enabled: boolean): void {
    if (enabled) {
      ArtTools.setCurrentArt(ArtTools.ArtLayers.OverlayArt);
      SelectionProperties.setApplyToolToAllLayers(false);
    } else {
      ArtTools.setCurrentArt(ArtTools.ArtLayers.Lineart);
      SelectionProperties.setApplyToolToAllLayers(true);
    }
  }

  export function toggleExpressionMode(): void {
    const isEnabled = ArtTools.ArtLayers.OverlayArt === ArtTools.getCurrentArt();
    MessageLog.trace('current art: ' + ArtTools.getCurrentArt() + ', isEnabled: ' + isEnabled);
    setFacialExpressionMode(!isEnabled);
  }
}

ArtistTools.toggleExpressionMode();

// function showCurrentDrawingOnTop(b: Boolean) {
//   const currentBool = preferences.getBool("DRAWING_SHOW_CURRENT_DRAWING_ON_TOP", false);
//   if (currentBool !== b) {
//     Action.perform("onActionShowCurrentDrawingOnTop()");
//   }
// }

// showCurrentDrawingOnTop(true);

// Action.perform("onActionSetCurrentDrawing()")

// MessageLog.trace(">>>" + JSON.stringify(Action.validate("test"), null, 2))
// var rawString = JSON.stringify(ToolProperties);

// SelectionProperties.setApplyToOnionSkinFrames(false)
