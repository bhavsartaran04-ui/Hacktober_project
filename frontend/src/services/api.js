const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || `Request failed (${res.status})`,
        step: data.step || "parse",
        data,
      };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "TimeoutError"
        ? "The request took too long. Check your connection and try again."
        : "Could not reach the server. Is the backend running on port 3001?",
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
    {},
    undefined,
    "Looking for regional soil data…",
    25000,
  );
}

export { API_URL };
