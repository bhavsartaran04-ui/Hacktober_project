import { createWorker } from "tesseract.js";

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng+hin");
  }
  return workerPromise;
}

/**
 * @param {Buffer} imageBuffer
 * @returns {{ text: string, confidence: number, lowConfidence: boolean }}
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
