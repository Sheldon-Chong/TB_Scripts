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

include('globals.js');

const nodeLayer = G.LayerManager.getNodeLayer(
  new G.oSelection().selectedNodes[0].nodePath,
) as oPegNode;

nodeLayer.getAllAttributes().forEach((attr) => {
  MessageLog.trace('attr: ' + attr.keyword() + ' type: ' + attr.typeName() + 'value');
});

var targetNode = selection.selectedNode(0);
var targetFrame = 10;

var parentAttr: Attribute = node.getAttr(targetNode, 1, 'POSITION');

MessageLog.trace(
  'parentAttr: ' + parentAttr.keyword() + ' type: ' + parentAttr.typeName() + ' value',
);

if (parentAttr && parentAttr.hasSubAttributes()) {
  var subAttrs = parentAttr.getSubAttributes();
  MessageLog.trace(
    'Found ' + subAttrs.length + ' subattributes for POSITION on node ' + targetNode,
  );

  for (var i = 0; i < subAttrs.length; i++) {
    var subAttr: Attribute = subAttrs[i];
    MessageLog.trace(
      `Subattribute ${i}: keyword=${subAttr.keyword()}, fullKeyword=${subAttr.fullKeyword()}, type=${subAttr.typeName()}`,
    );

    if (subAttr.keyword() === '3DPATH') {
      MessageLog.trace(
        `Found 3DPATH subattribute on node '${targetNode}' at index ${i}. Type: ${subAttr.typeName()}` +
          `\nFull Keyword: ${subAttr.fullKeyword()}` +
          `\nSubAttributes: ${subAttr
            .getSubAttributes()
            .map((sa) => sa.keyword())
            .join(', ')}`,
      );
      const value = subAttr.textValueAt(0);
      subAttr.setValueAt('0,0,0', 1);
      MessageLog.trace(subAttr.name());
      MessageLog.trace(
        `Value of 3DPATH at frame ${targetFrame}: ${JSON.stringify(value, null, 2)}`,
      );
    }
  }
}

// selection.setSelectionFrameRange(1, 100);
// Action.perform('onActionMainGotoNextFrame()');

// Action.perform('onActionInvalidateCanvas', 'TimelineView');
// MessageLog.trace('selection range: ' + selection.startFrame());

// --- Test wrapper get/set ---
// var before = nodeLayer.position.get(97);
// MessageLog.trace('Before: ' + before);

// nodeLayer.position.set({ x: 100, y: 200, z: 300 }, 97);
// // --- Test SCALE attribute (same pattern as POSITION) ---
// nodeLayer.getAllAttributes().forEach((attr) => {
//   if (attr.keyword() === 'SCALE') {
//     // Test A: pos3dValue + modify + setValueAt
//     var pt = attr.pos3dValueAt(97);
//     MessageLog.trace('SCALE before: x=' + pt.x + ' y=' + pt.y + ' z=' + pt.z);
//     pt.x = 2;
//     pt.y = 2;
//     pt.z = 1;
//     attr.setValueAt(pt, 97);
//     var afterA = attr.pos3dValueAt(97);
//     MessageLog.trace(
//       'SCALE TestA (setValueAt Point3d): x=' + afterA.x + ' y=' + afterA.y + ' z=' + afterA.z,
//     );

//     // Test B: wrapper set()
//     nodeLayer.scale.set({ x: 3, y: 3, z: 1 }, 97);
//     var afterB = attr.pos3dValueAt(97);
//     MessageLog.trace(
//       'SCALE TestB (wrapper set): x=' + afterB.x + ' y=' + afterB.y + ' z=' + afterB.z,
//     );

//     // Test C: sub-attr types
//     var subs = attr.getSubAttributes();
//     for (var i = 0; i < subs.length; i++) {
//       MessageLog.trace(
//         '  SCALE sub[' + i + '] keyword=' + subs[i].keyword() + ' type=' + subs[i].typeName(),
//       );
//     }
//   }
// });

// MessageLog.trace('node: ' + JSON.stringify(nodeLayer, null, 2));

// MessageLog.trace('node: ' + JSON.stringify(nodeLayer, null, 2));

// Raw API reference — the ONLY working set approach for POSITION_3D:
//   var pt = attr.pos3dValueAt(97);
//   pt.x = 0; pt.y = 0; pt.z = 0;
//   attr.setValueAt(pt, 97);

// ArtistTools.toggleExpressionMode();

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
