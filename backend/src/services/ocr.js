import { createWorker } from "tesseract.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ text: string, confidence: number, lowConfidence: boolean }>}
 */
export async function readLabelImage(imageBuffer) {
  const worker = await getWorker();
  const result = await worker.recognize(imageBuffer);
  const text = (result.data?.text || "").trim();
  const confidence = Number(result.data?.confidence);
  const score = Number.isFinite(confidence) ? confidence : 0;

  return {
    text,
    confidence: Math.round(score * 10) / 10,
    lowConfidence: score < 60 || text.length < 8,
  };
}
