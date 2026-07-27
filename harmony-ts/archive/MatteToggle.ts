include("globals.js");

const SELECTED_MATTE_INDEX = 12;


LayerManager.getNodeLayers().forEach(layer => {
  if (layer.name === SELECTED_MATTE_INDEX.toString()
  || layer.name === `Pass_${SELECTED_MATTE_INDEX}`
  || layer.name === `Transparency_${SELECTED_MATTE_INDEX}`
  || layer.isGroup()
  || layer.name === "Backdrop") {
    layer.setEnabled(true);
  }
  else {
    layer.setEnabled(false);
  }
});



// for (let frame = START_FRAME; frame <= END_FRAME; frame++) {
//   G.Renderer.renderTask({
//     range: new G.oSelection(frame),
//     outputFormat: "png",
//     outputPath: "C:\\Users\\emers\\Downloads\\New folder (39)",  // optional
//     resolution: { width: 1920, height: 1080 }, // optional, defaults to 256x256
//     onFinished: (filepath, task) => {
//       if (filepath) {
//         MessageLog.trace("Frame rendered: " + filepath);
//       } else {
//         MessageLog.trace("Frame failed to render");
//       }
//     }
//   });
// }

const transparencyCol = G.LayerManager.getNodeLayer(`Top/Passes/Transparency_${SELECTED_MATTE_INDEX}`).getColumn("transparency");

MessageLog.trace("transparency col: " + transparencyCol);

interface TransparencyChunk {
  start: number;
  end: number;
}

function getOpaqueChunks(startFrame: number, endFrame: number): TransparencyChunk[] {
  const values = transparencyCol.getKeyframeRange(startFrame, endFrame);
  const chunks: TransparencyChunk[] = [];
  let chunkStart: number | null = null;

  for (let i = 0; i < values.length; i++) {
    const frame = startFrame + i;
    const isOpaque = values[i] === "0.0000";
    // MessageLog.trace(values[i]);

    if (isOpaque && chunkStart === null) {
      chunkStart = frame;
    } else if (!isOpaque && chunkStart !== null) {
      chunks.push({ start: chunkStart, end: frame - 1 });
      chunkStart = null;
    }
  }

  // Close any open chunk that reaches the end frame
  if (chunkStart !== null) {
    chunks.push({ start: chunkStart, end: endFrame });
  }

  return chunks;
}







const START_FRAME = 1;
const END_FRAME = 5000;


const opaqueChunks = getOpaqueChunks(START_FRAME, END_FRAME);
MessageLog.trace(JSON.stringify(opaqueChunks, null, 2));

render.setWriteEnabled(false);
render.setRenderDisplay("Top/Display");
render.setWhiteBackground(false);

// const dir = new Dir(`D:\\toonboom\\individual\\mask ${ SELECTED_MATTE_INDEX }`);
// dir.mkdir();


const writeNode = new NodeLayer(-1, -1, "Top/Write", "Write");
MessageLog.trace(JSON.stringify(writeNode.getAttributeKeywords()))
MessageLog.trace(JSON.stringify(writeNode.getAttributeNames()))
writeNode.setAttribute("MOVIE_PATH", `D:/toonboom/individual/mask_${ SELECTED_MATTE_INDEX }`);



// for (const chunk of opaqueChunks) {
//   G.Renderer.renderTask({
//     range: new G.oSelection(chunk.start, chunk.end),
//     outputFormat: "png",
//     outputPath: "C:\\Users\\emers\\Downloads\\mask 14",  // optional
//     resolution: { width: 1920, height: 1080 }, // optional, defaults to 256x256
//     onFinished: (filepath, task) => {
//       try {

//         const now = new Date();
//         const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
//         const timestamp = `${pad(now.getHours())}/${pad(now.getMinutes())}/${pad(now.getSeconds())}`;
//         if (filepath) {
//           MessageLog.trace(`[${timestamp}] Chunk ${chunk.start}-${chunk.end} rendered: ${filepath}`);
//         } else {
//           MessageLog.trace(`[${timestamp}] Chunk ${chunk.start}-${chunk.end} failed to render`);
//         }
//       }
//       catch (e) {
//         MessageLog.trace("error: " + e);
//       }
//     }
//   });
// }


// G.Renderer.renderTask({
//   range: new G.oSelection(START_FRAME, END_FRAME),
//   outputFormat: "png",
//   outputPath: "C:\\Users\\emers\\Downloads\\New folder (39)",  // optional
//   resolution: { width: 1920, height: 1080 }, // optional, defaults to 256x256
//   nodes: ["Top/Passes/Pass_1"], // optional, if not provided will render entire scene
//   onFinished: (filepath, task) => {
//     if (filepath) {
//       MessageLog.trace("Frame rendered: " + filepath);
//     } else {
//       MessageLog.trace("Frame failed to render");
//     }
//   }
// });


