import { Router } from "express";
import multer from "multer";
import { readLabelImage } from "../services/ocr.js";
import { parseLabelText } from "../services/parser.js";
import { calculateDose } from "../services/calculator.js";
import { explainLabel } from "../services/llm.js";

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      const err = new Error("Only JPG and PNG images are allowed (max 5 MB).");
      err.code = "INVALID_TYPE";
      cb(err);
      return;
    }
    cb(null, true);
  },
});

const router = Router();

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
  const fields = body.fields || {};
  const language = body.language === "hi" ? "hi" : "en";
  const confirmed = Boolean(body.confirmed);

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
    rate.value,
    fields.phi?.value,
    fields.reEntry?.value,
    fields.precautions?.value,
    fields.tankInstructions?.value,
    fields.mixing?.value,
  ]
    .filter(Boolean)
    .join("\n");

  const llm = await explainLabel({ sourceText, language });

  return res.json({
    ok: true,
    calculation: calc,
    llm,
    mixing:
      fields.mixing?.status === "found"
        ? fields.mixing
        : {
            status: "not found",
            value: "Could not verify",
            snippet: "",
          },
  });
});

export default router;
