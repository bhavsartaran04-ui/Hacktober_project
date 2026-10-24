/**
 * One LLM call: translate / simplify extracted text only.
 * Never invent numbers, products, or precautions.
 */

function collectNumbers(text) {
  return new Set(
    [...String(text || "").matchAll(/\d+(?:\.\d+)?/g)].map((m) =>
      String(Number(m[0])),
    ),
  );
}

function extraNumbers(sourceText, outputText) {
  const allowed = collectNumbers(sourceText);
  const used = collectNumbers(outputText);
  const extras = [];
  for (const n of used) {
    if (!allowed.has(n)) extras.push(n);
  }
  return extras;
}

function jsonError(message) {
  return { ok: false, error: message, step: "llm", explanation: null };
}

export async function explainLabel({ sourceText, language }) {
  const key = process.env.LLM_API_KEY;
  if (!key || !String(key).trim()) {
    return jsonError(
      "Translation is not configured (missing LLM_API_KEY). Showing extracted text only.",
    );
  }

  const lang = language === "hi" ? "Hindi" : "English";
  const endpoint =
    process.env.LLM_API_URL ||
    "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.LLM_MODEL || "llama-3.1-8b-instant";

  const prompt = [
    "You simplify pesticide LABEL TEXT for farmers.",
    "Rules:",
    "- Use only facts present in the input text.",
    "- Do not add any number that is not already in the input.",
    "- Do not add products, doses, waiting periods, or precautions.",
    "- If something is missing, say it is not on the label.",
    `Write in ${lang}.`,
    'Return ONLY JSON: {"explanation": string, "language": string}',
    "",
    "LABEL TEXT:",
    sourceText,
  ].join("\n");

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return jsonError(
      timedOut
        ? "Translation timed out. Showing extracted text only."
        : "Translation request failed. Showing extracted text only.",
    );
  }

  if (!response.ok) {
    return jsonError("Translation service returned an error. Showing extracted text only.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return jsonError("Translation response was not valid JSON. Showing extracted text only.");
  }

  const content = payload?.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    const trimmed = content.trim().replace(/^```json\s*|\s*```$/g, "");
    parsed = JSON.parse(trimmed);
  } catch {
    return jsonError("Translation output was not valid JSON. Showing extracted text only.");
  }

  const explanation = String(parsed.explanation || "").trim();
  if (!explanation) {
    return jsonError("Translation returned an empty explanation.");
  }

  const extras = extraNumbers(sourceText, explanation);
  if (extras.length) {
    return jsonError(
      "Translation was rejected because it contained numbers not found on the label.",
    );
  }

  return {
    ok: true,
    explanation,
    language: parsed.language || lang,
    source: "AI explanation",
  };
}
