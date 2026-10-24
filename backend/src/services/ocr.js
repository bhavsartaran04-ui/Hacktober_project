import { createWorker } from "tesseract.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng+hin", 1, {
      langPath: backendRoot,
      cachePath: backendRoot,
      gzip: false,
      logger: () => {},
    })
      .then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });
        return worker;
      })
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

export async function preprocessLabelImage(imageBuffer) {
  return sharp(imageBuffer, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({ width: 2600, height: 2600, fit: "inside", withoutEnlargement: true })
    .greyscale()
    .normalize()
    .png()
    .toBuffer();
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ text: string, confidence: number, lowConfidence: boolean }>}
 */
export async function readLabelImage(imageBuffer) {
  const preparedImage = await preprocessLabelImage(imageBuffer);
  const worker = await getWorker();
  const result = await worker.recognize(preparedImage);
  const text = (result.data?.text || "").trim();
  const confidence = Number(result.data?.confidence);
  const score = Number.isFinite(confidence) ? confidence : 0;

  return {
    text,
    confidence: Math.round(score * 10) / 10,
    lowConfidence: score < 70 || text.length < 8,
  };
}
