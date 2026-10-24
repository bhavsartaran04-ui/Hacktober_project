function normalizeApiUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

const SLOW_MS = 8000;

async function request(path, options, onSlow, slowText = "Starting the server, this can take up to a minute", timeoutMs = 90000) {
  const timer = setTimeout(() => {
    onSlow?.(slowText);
  }, SLOW_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: options?.signal || AbortSignal.timeout(timeoutMs),
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `The API returned ${res.status}. Check the backend URL and server logs.`,
        step: data?.step || "parse",
        data,
      };
    }
    if (!data || typeof data !== "object") {
      return { ok: false, error: "The API returned an unreadable response. Check that VITE_API_URL points to the backend, not the frontend site.", step: "parse" };
    }
    return data;
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      ok: false,
      error: timedOut
        ? "The request took too long. Check your connection and try again."
        : "Could not reach the API. Check that the backend is running and VITE_API_URL points to it. For local development, use npm run dev from the project root.",
      step: "ocr",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function extractLabel(file, { onSlow } = {}) {
  const body = new FormData();
  body.append("image", file);
  return request("/api/label/extract", { method: "POST", body }, onSlow);
}

export function fetchResult(payload, { onSlow } = {}) {
  return request(
    "/api/label/result",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    onSlow,
    "Preparing the report…",
    45000,
  );
}

export function fetchSoil(state) {
  return request(
    `/api/label/soil?state=${encodeURIComponent(state)}`,
    { cache: "no-store" },
    undefined,
    "Looking for regional soil data…",
    25000,
  );
}

export { API_URL };
