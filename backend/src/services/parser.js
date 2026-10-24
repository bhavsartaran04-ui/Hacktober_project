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
    activeIngredient: parseLabelledLine(text, /(?:active\s+ingredient|a\.i\.)/i),
    targetCrop: parseLabelledLine(text, /(?:target\s+)?crop/i),
    targetPest: parseLabelledLine(text, /(?:target\s+)?pest/i),
    rate: parseRate(text),
    tankInstructions: parseTankInstructions(lines),
    phi: parsePhi(text),
    reEntry: parseReEntry(text),
    precautions: parsePrecautions(lines),
    mixing: parseMixing(text),
    firstAid: parseSafetyLines(lines, /first\s*aid|poison(?:ing)?\s+(?:treatment|symptoms)|\u092a\u094d\u0930\u093e\u0925\u092e\u093f\u0915\s+\u0909\u092a\u091a\u093e\u0930/i),
    warnings: parseSafetyLines(lines, /warning|caution|hazard|danger|toxic|keep\s+away|\u0916\u0924\u0930\u093e|\u0938\u093e\u0935\u0927\u093e\u0928/i),
  };
}

function parseLabelledLine(text, labelPattern) {
  const line = text.split("\n").find((candidate) => labelPattern.test(candidate));
  if (!line) return emptyField();
  const value = line.replace(new RegExp(`^.*?${labelPattern.source}\\s*[:\\-]?\\s*`, "i"), "").trim();
  return value ? found(line, value) : emptyField();
}

function parseProductName(text, lines) {
  const labelled =
    text.match(
      /(?:product(?:\s+\w+)?|trade\s*name|brand)\s*[:\-]\s*([^\n]+)/i,
    );
  if (labelled) {
    return found(labelled[0], labelled[1]);
  }

  const skip = /^(demo label|dose|phi|fhi|pre[-\s]?harvest|re-?entry|restricted entry|precaution|wear\b|wash\b|keep\b|do not|wait\b|harvest\b|spray\b|application\b|water\b|active ingredient|target crop|target pest|first aid|warning|caution|mix(?:ing)?\b)/i;
  const candidate = lines.find((line) => line.length > 2 && line.length <= 80 && !skip.test(line));
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
    /(\d+(?:\.\d+)?)\s*(ml|millilitres?|milliliters?|g|gm|grams?|kg|l|litres?|liters?)\b[^\n]{0,48}?(?:per|\/|\u092a\u094d\u0930\u0924\u093f)\s*(?:(\d+(?:\.\d+)?)\s*)?(ml|l|litres?|liters?|millilitres?|milliliters?|hectares?|ha|acres?|plants?|\u0932\u0940\u091f\u0930)(?=\s|$|[.,;])/gi;

  const matches = [...text.matchAll(pattern)];
  if (!matches.length) {
    return {
      ...emptyField(),
      amount: null,
      unit: "",
      perAmount: null,
      perUnit: "",
    };
  }

  const signatures = new Set(matches.map((match) => `${match[1]} ${match[2].toLowerCase()} per ${match[3] || 1} ${match[4].toLowerCase()}`));
  if (signatures.size > 1) {
    return {
      status: "uncertain", snippet: matches.map((match) => match[0].trim()).join(" | "), value: "",
      amount: null, unit: "", perAmount: null, perUnit: "",
    };
  }

  const match = matches[0];
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
    /(?:pre[-\s]?harvest(?:\s+interval)?|PHI|FHI|waiting\s+period\s+before\s+harvest|last\s+application\s+to\s+harvest(?:\s+interval)?)[^\n]{0,28}?[:\-]?\s*(\d{1,3})\s*(days?|din|\u0926\u093f\u0928)/i,
    /do not harvest(?:\s+within)?[^\n]{0,35}?(\d{1,3})\s*(days?)/i,
    /wait\s*(\d{1,3})\s*(days?)[^\n]{0,35}?harvest/i,
    /(?:\u0915\u091f\u093e\u0908|\u092b\u0938\u0932 \u0915\u093e\u091f\u0928\u0947)[^\n]{0,35}?(\d{1,3})\s*(\u0926\u093f\u0928)/i,
  ];

  const hits = [];
  for (const pattern of patterns) {
    hits.push(...text.matchAll(new RegExp(pattern.source, "gi")));
  }
  const unique = [...new Map(hits.map((match) => [`${match[1]} ${match[2].toLowerCase()}`, match])).values()];
  if (unique.length === 1) return found(unique[0][0], `${unique[0][1]} ${unique[0][2]}`);
  if (unique.length > 1) return { status: "uncertain", snippet: unique.map((match) => match[0]).join(" | "), value: "" };
  return emptyField();
}

function parseReEntry(text) {
  const patterns = [
    /(?:re[-\s]?ent\w*(?:\s+\w+)?|restricted entry(?:\s+interval)?|REI)\s*[:\-]?\s*(\d{1,3})\s*(hours?|hrs?|days?|\u0918\u0902\u091f\u0947|\u0926\u093f\u0928)/i,
    /do not (?:enter|re-?enter)[^\n]{0,40}?(\d{1,3})\s*(hours?|hrs?|days?)/i,
    /(?:field\s+entry|entry\s+interval)[^\n]{0,25}?[:\-]?\s*(\d{1,3})\s*(hours?|hrs?|days?)/i,
  ];

  const hits = [];
  for (const pattern of patterns) {
    hits.push(...text.matchAll(new RegExp(pattern.source, "gi")));
  }
  const unique = [...new Map(hits.map((match) => [`${match[1]} ${match[2].toLowerCase()}`, match])).values()];
  if (unique.length === 1) return found(unique[0][0], `${unique[0][1]} ${unique[0][2]}`);
  if (unique.length > 1) return { status: "uncertain", snippet: unique.map((match) => match[0]).join(" | "), value: "" };
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

function parseSafetyLines(lines, pattern) {
  const hits = lines.filter((line) => pattern.test(line));
  if (!hits.length) return emptyField();
  return { status: "found", snippet: hits.join(" | "), value: hits.join("\n"), lines: hits };
}

function parseMixing(text) {
  const prohibition = text.match(/[^\n]*(?:do\s*not|never)\s+(?:tank[-\s]?)?mix[^\n]*|[^\n]*not\s+compatible\s+with[^\n]*/i);
  const permission = text.match(/[^\n]*(?:may be mixed|(?<!not )compatible with|can be tank-?mixed)[^\n]*/i);
  if (prohibition && permission) {
    return { status: "uncertain", snippet: `${prohibition[0]} | ${permission[0]}`, value: "" };
  }
  if (prohibition) return found(prohibition[0], prohibition[0]);
  if (permission) return found(permission[0], permission[0]);
  return {
    status: "not found",
    snippet: "",
    value: "Could not verify",
  };
}
