import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { readLabelImage } from "../services/ocr.js";
import { parseLabelText } from "../services/parser.js";
import { calculateDose } from "../services/calculator.js";
import { explainLabel } from "../services/llm.js";
import { lookupStateSoil } from "../services/soil.js";

const MAX_BYTES = 5 * 1024 * 1024;
const FIELD_NAMES = [
  "productName", "activeIngredient", "targetCrop", "targetPest", "phi", "reEntry",
  "precautions", "mixing", "tankInstructions", "firstAid", "warnings",
];

function safeText(value, maxLength = 500) {
  return typeof value === "string" ? value.slice(0, maxLength).trim() : "";
}

function normalizeFields(input = {}) {
  const fields = {};
  for (const name of FIELD_NAMES) {
    const field = input[name] && typeof input[name] === "object" ? input[name] : {};
    const status = ["found", "edited", "uncertain"].includes(field.status) ? field.status : "not found";
    fields[name] = {
      status,
      value: ["found", "edited"].includes(status) ? safeText(field.value) : "",
      snippet: safeText(field.snippet),
    };
  }
  const rate = input.rate && typeof input.rate === "object" ? input.rate : {};
  const rateStatus = ["found", "edited", "uncertain"].includes(rate.status) ? rate.status : "not found";
  const numericOrString = (value) =>
    (typeof value === "number" || typeof value === "string") && String(value).length <= 40
      ? value
      : null;
  fields.rate = {
    status: rateStatus,
    amount: ["found", "edited"].includes(rateStatus) ? numericOrString(rate.amount) : null,
    unit: ["found", "edited"].includes(rateStatus) ? safeText(rate.unit, 24) : "",
    perAmount: ["found", "edited"].includes(rateStatus) ? numericOrString(rate.perAmount) : null,
    perUnit: ["found", "edited"].includes(rateStatus) ? safeText(rate.perUnit, 32) : "",
    value: ["found", "edited"].includes(rateStatus) ? safeText(rate.value, 160) : "",
    snippet: safeText(rate.snippet, 240),
  };
  return fields;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = String(file.originalname || "").toLowerCase();
    const mimeOk =
      mime === "image/jpeg" || mime === "image/png" || mime === "image/jpg" || mime === "image/webp";
    const extOk =
      name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
    const looseMime = !mime || mime === "application/octet-stream";
    if (!mimeOk && !(looseMime && extOk)) {
      const err = new Error("Only JPG, PNG, and WebP images are allowed (max 5 MB).");
      err.code = "INVALID_TYPE";
      cb(err);
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.get("/soil", async (req, res) => {
  const soil = await lookupStateSoil(String(req.query.state || ""));
  return res.json(soil);
});

router.post("/extract", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      const badType = err.code === "INVALID_TYPE";
      return res.status(400).json({
        ok: false,
        error: tooBig
          ? "File is larger than 5 MB."
          : badType
            ? err.message
            : "Could not read the uploaded file.",
        step: "ocr",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "No image was uploaded.",
        step: "ocr",
      });
    }

    try {
      let metadata;
      try {
        metadata = await sharp(req.file.buffer, {
          failOn: "error",
          limitInputPixels: 40_000_000,
        }).metadata();
      } catch {
        return res.status(400).json({
          ok: false,
          error: "The uploaded file is not a readable JPG, PNG, or WebP image.",
          step: "ocr",
        });
      }
      if (!(["jpeg", "png", "webp"].includes(metadata.format)) || !metadata.width || !metadata.height) {
        return res.status(400).json({
          ok: false,
          error: "Only real JPG, PNG, and WebP images are supported.",
          step: "ocr",
        });
      }

      const ocr = await readLabelImage(req.file.buffer);
      if (!ocr.text) {
        return res.status(422).json({
          ok: false,
          error:
            "OCR found no readable text. Try a clearer, well-lit photo of the label.",
          step: "ocr",
          ocr,
        });
      }

      const fields = parseLabelText(ocr.text);
      const isDemo = /demo label/i.test(ocr.text);

      return res.json({
        ok: true,
        isDemo,
        ocr,
        fields,
      });
    } catch (error) {
      console.error("OCR failed", error);
      return res.status(500).json({
        ok: false,
        error: "OCR failed. You can retry with a clearer photo.",
        step: "ocr",
      });
    }
  });
});

router.post("/result", async (req, res) => {
  const body = req.body || {};
  if (body.confirmed !== true) {
    return res.status(400).json({ ok: false, error: "Review and confirm the extracted label fields first." });
  }
  if (!body.fields || typeof body.fields !== "object" || Array.isArray(body.fields)) {
    return res.status(400).json({ ok: false, error: "Confirmed label fields are required." });
  }
  const fields = normalizeFields(body.fields);
  const language = body.language === "hi" ? "hi" : "en";
  const confirmed = body.confirmed === true;

  const rate = fields.rate || {};
  const calc = calculateDose({
    rateAmount: rate.amount,
    rateUnit: rate.unit,
    perAmount: rate.perAmount,
    perUnit: rate.perUnit,
    tankLitres: body.tankLitres,
    confirmed,
  });

  const sourceText = [
    fields.productName?.value,
    fields.activeIngredient?.value,
    fields.targetCrop?.value,
    fields.targetPest?.value,
    rate.value,
    fields.phi?.value,
    fields.reEntry?.value,
    fields.precautions?.value,
    fields.tankInstructions?.value,
    fields.mixing?.value,
    fields.firstAid?.value,
    fields.warnings?.value,
  ]
    .filter(Boolean)
    .join("\n");

  const state = safeText(body.state, 80);
  if (!state) {
    return res.status(400).json({ ok: false, error: "Choose an Indian state before generating the report." });
  }
  const cropOptions = new Set(["kharif", "rabi", "zaid", "perennial", "other"]);
  const crop = cropOptions.has(body.crop) ? body.crop : "";
  const soil = state ? await lookupStateSoil(state) : null;
  if (soil?.error === "Choose a valid Indian state.") {
    return res.status(400).json({ ok: false, error: soil.error });
  }
  const llm = await explainLabel({ sourceText, language });

  return res.json({
    ok: true,
    state: state || null,
    crop: crop || null,
    soil: soil?.ok ? soil : null,
    calculation: calc,
    llm,
    mixing:
      ["found", "edited", "uncertain"].includes(fields.mixing?.status)
        ? fields.mixing
        : {
            status: "not found",
            value: "Could not verify",
            snippet: "",
          },
  });
});

export default router;
