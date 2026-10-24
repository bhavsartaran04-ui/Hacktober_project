import { createWorker } from "tesseract.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_INPUT_PIXELS = 40_000_000;
const TARGET_LONG_SIDE = 2000;
const MAX_LONG_SIDE = 2400;

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

function sharpImage(imageBuffer) {
  return sharp(imageBuffer, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
  });
}

/**
 * Common OCR confusions on pesticide labels. Whole-word only.
 */
export function cleanOcrText(rawText) {
  const replacements = [
    [/\bFHI\b/gi, "PHI"],
    [/\bFER\b/gi, "PER"],
    [/\bLITEE\b/gi, "LITRE"],
    [/\bLITEES\b/gi, "LITRES"],
    [/\bLITREES\b/gi, "LITRES"],
    [/\bHATER\b/gi, "WATER"],
    [/\bWATEE\b/gi, "WATER"],
    [/\bGLOYES\b/gi, "GLOVES"],
    [/\bLAEEL\b/gi, "LABEL"],
    [/\bFEODUCT\b/gi, "PRODUCT"],
    [/\bFRODUCT\b/gi, "PRODUCT"],
    [/\bMAME\b/gi, "NAME"],
    [/\bIMTEEWAL\b/gi, "INTERVAL"],
    [/\bIMTERVAL\b/gi, "INTERVAL"],
    [/\bIMTEREWAL\b/gi, "INTERVAL"],
    [/\bINTEEYAL\b/gi, "INTERVAL"],
    [/\bCHILDEEN\b/gi, "CHILDREN"],
    [/\bCHILDEEHN\b/gi, "CHILDREN"],
    [/\bCHILOREN\b/gi, "CHILDREN"],
  ];

  let text = String(rawText || "").replace(/\r/g, "");
  for (const [pattern, value] of replacements) {
    text = text.replace(pattern, value);
  }
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

export async function preprocessLabelImage(imageBuffer, { threshold = false } = {}) {
  const rotated = sharpImage(imageBuffer).rotate();
  const meta = await rotated.metadata();
  const longSide = Math.max(meta.width || 0, meta.height || 0);
  const shouldEnlarge = longSide > 0 && longSide < 1600;
  const target = shouldEnlarge
    ? TARGET_LONG_SIDE
    : Math.min(longSide || TARGET_LONG_SIDE, MAX_LONG_SIDE);

  let pipeline = rotated.resize({
    width: target,
    height: target,
    fit: "inside",
    withoutEnlargement: !shouldEnlarge,
  }).extend({
    top: 28,
    bottom: 28,
    left: 28,
    right: 28,
    background: "#ffffff",
  }).greyscale();

  if (threshold) {
    pipeline = pipeline.normalize().threshold(155);
  } else {
    pipeline = pipeline.normalize({ lower: 4, upper: 96 }).sharpen({ sigma: 1 });
  }

  return pipeline.png().toBuffer();
}

function scoreResult(result) {
  const text = (result?.data?.text || "").trim();
  const confidence = Number(result?.data?.confidence);
  const score = Number.isFinite(confidence) ? confidence : 0;
  return { text, score };
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ text: string, confidence: number, lowConfidence: boolean }>}
 */
export async function readLabelImage(imageBuffer) {
  const worker = await getWorker();
  const primaryImage = await preprocessLabelImage(imageBuffer);
  let best = scoreResult(await worker.recognize(primaryImage));

  if (best.score < 75 || best.text.length < 12) {
    const altImage = await preprocessLabelImage(imageBuffer, { threshold: true });
    const retry = scoreResult(await worker.recognize(altImage));
    const retryBetter =
      retry.score > best.score + 1 ||
      (retry.score >= best.score - 1 && retry.text.length > best.text.length + 8);
    if (retryBetter) best = retry;
  }

  const text = cleanOcrText(best.text);
  return {
    text,
    confidence: Math.round(best.score * 10) / 10,
    lowConfidence: best.score < 70 || text.length < 8,
  };
}
