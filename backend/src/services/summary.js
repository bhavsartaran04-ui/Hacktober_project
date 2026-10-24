/**
 * Simplified farmer-facing summary: reading genuineness + amount to use.
 * Genuineness is a reading-quality / label-completeness check, not a lab test
 * of whether the chemical itself is authentic.
 */

const RATE_OK = new Set(["found", "edited"]);

function fieldFound(field) {
  return RATE_OK.has(field?.status) && String(field?.value || "").trim().length > 0;
}

function rateFound(rate) {
  const amount = Number(rate?.amount);
  const perAmount = Number(rate?.perAmount);
  return (
    RATE_OK.has(rate?.status) &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isFinite(perAmount) &&
    perAmount > 0 &&
    String(rate?.unit || "").trim() &&
    String(rate?.perUnit || "").trim()
  );
}

export function findAuthenticityMarkers(text) {
  const source = String(text || "");
  const batch = source.match(
    /\bbatch\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i,
  );
  const registration = source.match(
    /\b(?:cib(?:rc)?|reg(?:istration)?(?:\s*no\.?)?|licence|license)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{2,})/i,
  );
  const manufactured = source.match(
    /\b(?:mfg|manufactur(?:ed|ing)|packed)(?:\s*date)?\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\/\d{4})/i,
  );
  const expiry = source.match(
    /\b(?:exp(?:iry)?|use\s*by|best\s*before)(?:\s*date)?\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\/\d{4})/i,
  );

  return {
    batchNumber: batch?.[1] || "",
    registrationNumber: registration?.[1] || "",
    manufacturedOn: manufactured?.[1] || "",
    expiresOn: expiry?.[1] || "",
  };
}

export function assessGenuineness({ ocr, fields, isDemo } = {}) {
  const evidence = [];
  const missing = [];
  const confidence = Number(ocr?.confidence);
  const scoreParts = [];

  if (Number.isFinite(confidence)) {
    scoreParts.push(Math.max(0, Math.min(40, confidence * 0.4)));
    evidence.push(`OCR confidence ${Math.round(confidence)}%`);
  }

  if (fieldFound(fields?.productName) || String(fields?.productName?.value || "").trim()) {
    scoreParts.push(12);
    evidence.push("Product name read");
  } else {
    missing.push("product name");
  }

  if (rateFound(fields?.rate)) {
    scoreParts.push(28);
    evidence.push("Dose / amount read");
  } else {
    missing.push("dose");
  }

  if (fieldFound(fields?.phi)) {
    scoreParts.push(6);
    evidence.push("Harvest wait read");
  } else {
    missing.push("harvest wait");
  }

  if (fieldFound(fields?.reEntry)) {
    scoreParts.push(6);
    evidence.push("Field re-entry wait read");
  }

  if (fieldFound(fields?.precautions) || fieldFound(fields?.warnings)) {
    scoreParts.push(4);
    evidence.push("Safety text read");
  }

  const markers = findAuthenticityMarkers(ocr?.text || "");
  if (markers.registrationNumber) {
    scoreParts.push(8);
    evidence.push(`Registration ${markers.registrationNumber}`);
  }
  if (markers.batchNumber) {
    scoreParts.push(4);
    evidence.push(`Batch ${markers.batchNumber}`);
  }
  if (markers.manufacturedOn || markers.expiresOn) {
    scoreParts.push(3);
    evidence.push("Date mark read");
  }

  let score = Math.round(scoreParts.reduce((sum, part) => sum + part, 0));
  score = Math.max(0, Math.min(100, score));

  let verdict = "unreliable";
  if (isDemo) {
    verdict = "demo";
  } else if (ocr?.lowConfidence || score < 45 || missing.includes("dose")) {
    verdict = score >= 30 || rateFound(fields?.rate) ? "uncertain" : "unreliable";
  } else if (score >= 70 && rateFound(fields?.rate) && !ocr?.lowConfidence) {
    verdict = "reliable";
  } else {
    verdict = "uncertain";
  }

  return {
    verdict,
    score,
    confidence: Number.isFinite(confidence) ? Math.round(confidence) : null,
    isDemo: Boolean(isDemo),
    evidence,
    missing,
    markers,
    labTest: false,
  };
}

export function buildAmountToUse({ fields, calculation, tankLitres } = {}) {
  const rate = fields?.rate || {};
  if (!rateFound(rate)) {
    return {
      status: "not_found",
      amount: null,
      unit: "",
      perAmount: null,
      perUnit: "",
      labelRate: "",
      tankQuantity: null,
      tankUnit: "",
      tankLitres: tankLitres ?? null,
    };
  }

  const labelRate =
    String(rate.value || "").trim() ||
    `${rate.amount} ${rate.unit} per ${rate.perAmount} ${rate.perUnit}`;

  if (calculation?.ok) {
    return {
      status: "ready",
      amount: rate.amount,
      unit: rate.unit,
      perAmount: rate.perAmount,
      perUnit: rate.perUnit,
      labelRate,
      tankQuantity: calculation.quantity,
      tankUnit: calculation.unit,
      tankLitres: tankLitres ?? null,
    };
  }

  if (calculation && calculation.ok === false && /do not match/i.test(calculation.message || "")) {
    return {
      status: "not_volume",
      amount: rate.amount,
      unit: rate.unit,
      perAmount: rate.perAmount,
      perUnit: rate.perUnit,
      labelRate,
      tankQuantity: null,
      tankUnit: "",
      tankLitres: tankLitres ?? null,
    };
  }

  return {
    status: tankLitres ? "not_volume" : "needs_tank",
    amount: rate.amount,
    unit: rate.unit,
    perAmount: rate.perAmount,
    perUnit: rate.perUnit,
    labelRate,
    tankQuantity: null,
    tankUnit: "",
    tankLitres: tankLitres ?? null,
  };
}

export function buildLabelSummary({ ocr, fields, isDemo, calculation, tankLitres } = {}) {
  return {
    genuineness: assessGenuineness({ ocr, fields, isDemo }),
    amountToUse: buildAmountToUse({ fields, calculation, tankLitres }),
  };
}
