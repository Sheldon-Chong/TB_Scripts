include('globals.js');

column = column;

namespace KeyframeGeneratorKit {
  /**
   * Generate a decaying camera shake on a path column.
   *
   * @param column       The 3D-path column to keyframe.
   * @param startFrame   First frame of the shake.
   * @param endFrame     Last frame of the shake.
   * @param shakeAmount  Initial shake magnitude.
   *                     A number applies equally to both axes;
   *                     a Vec2 / {x,y} / [x,y] sets per-axis values.
   * @param decayExponent  How fast the shake fades (higher = faster decay).
   */
  export function generateShake(
    col: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    shakeAmount: vectors.Vector2Input,
    decayExponent: number,
  ) {
    var amount = vectors.resolveVec2(shakeAmount);

    // MessageLog.trace(
    //   'generateShake: ' +
    //     column.toString() +
    //     ', frames ' +
    //     startFrame +
    //     '-' +
    //     endFrame +
    //     ', shake ' +
    //     JSON.stringify(amount) +
    //     ', decay ' +
    //     decayExponent,
    // );

    var totalFrames = endFrame - startFrame;
    var minStepRatio = 0.7;
    var prev = new Vec2(0, 0);

    for (var i = startFrame; i <= endFrame; i++) {
      var progress = totalFrames > 0 ? (i - startFrame) / totalFrames : 1;
      var remainingRatio = 1 - progress;

      var currentX = amount.x * Math.pow(remainingRatio, decayExponent);
      var currentY = amount.y * Math.pow(remainingRatio, decayExponent);

      var current: Vec2;

      if (currentX > 0.001 || currentY > 0.001) {
        var maxAmount = currentX > currentY ? currentX : currentY;
        var minDistSq = Math.pow(maxAmount * minStepRatio, 2);
        var attempts = 0;

        do {
          current = new Vec2(
            (Math.random() - 0.5) * 2 * currentX,
            (Math.random() - 0.5) * 2 * currentY,
          );
          attempts++;
        } while (attempts < 15 && current.distanceToSquared(prev) < minDistSq);
      } else {
        current = new Vec2(0, 0);
      }

      prev = current;

      // Apply shake as an OFFSET from the camera's existing position,
      // so pre-existing animation is preserved and the camera doesn't drift.
      // var baseX = column.getXVal(i);
      // var baseY = column.getYVal(i);
      col.setPosition(i, new Vec3(current.x, current.y, 0), 0, 0, 0);
    }
  }

  /** Hardcoded Z curve for zoom — 8 key values distributed across the frame range. */

  /**
   * Generate a camera zoom on a path column using a hardcoded Z curve.
   *
   * @param column       The 3D-path column to keyframe (camera peg).
   * @param startFrame   First frame of the zoom.
   * @param endFrame     Last frame of the zoom.
   * @param xy           Optional target XY position for non-centered zooms.
   *                     If provided, X and Y are interpolated from their
   *                     values at startFrame toward this target.
   */
  export function generateZoom(
    column: oPathColumn3D,
    startFrame: number,
    endFrame: number,
    xy?: vectors.Vector2Input,
    zoomOut: boolean = false,
  ) {
    var FIRST_HALF_VALUES = zoomOut ? [0.0, 0.2, 1.247, 4.935] : [-0.0, -0.2, -1.247, -4.935];
    var SECOND_HALF_VALUES = zoomOut ? [-3.354, -0.946, -0.189, -0.0] : [3.354, 0.946, 0.189, 0.0];

    //todo: Adjust the values for smoothness

    var ZOOM_Z_VALUES = FIRST_HALF_VALUES.concat(SECOND_HALF_VALUES);

    MessageLog.trace(
      '[generateZoom] has xy: ' + (xy ? 'yes' : 'no') + ' (type: ' + typeof xy + ')',
    );

    var targetXY = xy ? vectors.resolveVec2(xy) : null;

    if (targetXY) {
      MessageLog.trace('[generateZoom] targetXY.x=' + targetXY.x + ' targetXY.y=' + targetXY.y);
    } else {
      MessageLog.trace('[generateZoom] targetXY is null/falsy');
    }

    MessageLog.trace(
      'generateZoom: ' +
        column.toString() +
        ', frames ' +
        startFrame +
        '-' +
        endFrame +
        (targetXY ? ', xy ' + JSON.stringify(targetXY) : ''),
    );

    var zCount = ZOOM_Z_VALUES.length;
    MessageLog.trace('[generateZoom] zCount: ' + zCount);

    for (var i = 0; i < zCount; i++) {
      var frame = startFrame + i;
      var z = ZOOM_Z_VALUES[i];

      // Interpolate XY toward target only during the first half,
      // or keep existing values.
      // Target XY is treated as an OFFSET from the camera's current
      // position (not an absolute destination), so the camera moves by
      // targetXY during zoom-in and returns to its original spot after.
      var x: number;
      var y: number;
      if (targetXY) {
        var firstHalfCount = FIRST_HALF_VALUES.length;
        var baseX = column.getXVal(startFrame);
        var baseY = column.getYVal(startFrame);
        if (i < firstHalfCount) {
          var progress = i / (firstHalfCount - 1);
          x = baseX + targetXY.x * progress;
          y = baseY + targetXY.y * progress;
        } else {
          x = baseX;
          y = baseY;
        }
      } else {
        x = column.getXVal(frame);
        y = column.getYVal(frame);
      }

      MessageLog.trace(
        `[generateZoom] frame ${frame} | z=${z} | x=${x}, y=${y}${targetXY ? ` | progress=${progress.toFixed(3)}` : ' (no xy)'}`,
      );

      column.setPosition(frame, new Vec3(x, y, z), 0, 0, 0);
    }

    MessageLog.trace('[generateZoom] done');
  }
}

function testGenerateZoom() {
  var camPeg = G.LayerManager.getNodeLayer('Top/Camera-P') as oPegNode;
  if (!camPeg) {
    MessageLog.trace('testGenerateZoom: Camera peg not found.');
    return;
  }

  var pos = camPeg.position as oPathColumn3D;
  var sel = new G.oSelection();

  MessageLog.trace('[KeyframeGenerator.ts] ' + 'start');
  scene.beginUndoRedoAccum('Apply Zoom');
  KeyframeGeneratorKit.generateZoom(pos, sel.startFrame, sel.startFrame + 7, new Vec2(0, 0));
  scene.endUndoRedoAccum();
  MessageLog.trace('[KeyframeGenerator.ts] ' + 'end');
}
