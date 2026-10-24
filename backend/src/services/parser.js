/**
 * Regex field extraction. No AI. If a field is not clearly in the text,
 * status is "not found" — we never fill gaps.
 */

function emptyField() {
  return { status: "not found", snippet: "", value: "" };
}

function found(snippet, value) {
  return {
    status: "found",
    snippet: String(snippet).trim(),
    value: String(value).trim(),
  };
}

function normalize(text) {
  return String(text || "").replace(/\r/g, "");
}

export function parseLabelText(rawText) {
  const text = normalize(rawText);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    productName: parseProductName(text, lines),
    rate: parseRate(text),
    tankInstructions: parseTankInstructions(lines),
    phi: parsePhi(text),
    reEntry: parseReEntry(text),
    precautions: parsePrecautions(lines),
    mixing: parseMixing(text),
  };
}

function parseProductName(text, lines) {
  const labelled =
    text.match(
      /(?:product(?:\s+\w+)?|trade\s*name|brand)\s*[:\-]\s*([^\n]+)/i,
    );
  if (labelled) {
    return found(labelled[0], labelled[1]);
  }

  const skip = /^(demo label|dose|phi|pre-harvest|re-?entry|precaution|wear|wash|keep|do not)/i;
  const candidate = lines.find((line) => line.length > 2 && !skip.test(line));
  if (candidate) {
    return found(candidate, candidate);
  }
  return emptyField();
}

/**
 * Examples that count as found:
 *  - 2 ml per litre
 *  - 2 ml/L
 *  - 10 g per 10 litres
 *  - 5 ml per 500 ml
 */
function parseRate(text) {
  const pattern =
    /(\d+(?:\.\d+)?)\s*(ml|millilitres?|milliliters?|g|gm|grams?|kg|l|litres?|liters?)\b[^\n]{0,48}?(?:per|\/)\s*(?:(\d+(?:\.\d+)?)\s*)?(ml|l|litres?|liters?|millilitres?|milliliters?)\b/i;

  const match = text.match(pattern);
  if (!match) {
    return {
      ...emptyField(),
      amount: null,
      unit: "",
      perAmount: null,
      perUnit: "",
    };
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const perAmount = match[3] ? Number(match[3]) : 1;
  const perUnit = match[4];

  return {
    status: "found",
    snippet: match[0].trim(),
    value: `${amount} ${unit} per ${perAmount} ${perUnit}`,
    amount,
    unit,
    perAmount,
    perUnit,
  };
}

function parseTankInstructions(lines) {
  const hits = lines.filter((line) =>
    /tank|spray mix|dilut|per litre|per liter|per l\b|water/i.test(line),
  );
  if (!hits.length) return emptyField();
  return found(hits.join(" | "), hits.join(" "));
}

function parsePhi(text) {
  const patterns = [
    /(?:pre[-\s]?harvest[^\n]{0,24}|PHI|FHI)\s*[:\-]?\s*(\d+)\s*(days?|din)/i,
    /(?:do not harvest|wait(?:ing)? period before harvest)[^\n]{0,40}?(\d+)\s*(days?)/i,
    /wait\s*(\d+)\s*(days?)[^\n]{0,40}?harvest/i,
    /harvest[^\n]{0,30}?(\d+)\s*(days?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return found(match[0], `${match[1]} ${match[2]}`);
    }
  }
  return emptyField();
}

function parseReEntry(text) {
  const patterns = [
    /(?:re[-\s]?ent\w*(?:\s+\w+)?|restricted entry(?:\s+interval)?|REI)\s*[:\-]?\s*(\d+)\s*(hours?|hrs?|days?)/i,
    /do not (?:enter|re-?enter)[^\n]{0,40}?(\d+)\s*(hours?|hrs?|days?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return found(match[0], `${match[1]} ${match[2]}`);
    }
  }
  return emptyField();
}

function parsePrecautions(lines) {
  const hits = lines.filter((line) =>
    /wear|glove|mask|goggle|wash|keep away|toxic|avoid|protect|children|do not|caution|warning|hazard|ppe/i.test(
      line,
    ),
  );
  if (!hits.length) {
    return { status: "not found", snippet: "", value: "", lines: [] };
  }
  return {
    status: "found",
    snippet: hits.join(" | "),
    value: hits.join("\n"),
    lines: hits,
  };
}

function parseMixing(text) {
  if (/(?:may be mixed|compatible with|can be tank-?mixed)/i.test(text)) {
    const match = text.match(
      /[^\n]*(?:may be mixed|compatible with|can be tank-?mixed)[^\n]*/i,
    );
    return found(match?.[0] || "mixing allowed on label", match?.[0] || "");
  }
  if (/do\s*not\s*mix/i.test(text)) {
    const match = text.match(/[^\n]*do\s*not\s*mix[^\n]*/i);
    return found(match?.[0] || "do not mix", match?.[0] || "");
  }
  return {
    status: "not found",
    snippet: "",
    value: "Could not verify",
  };
}
