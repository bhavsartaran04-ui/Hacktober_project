const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const SLOW_MS = 8000;

async function request(path, options, onSlow) {
  const timer = setTimeout(() => {
    onSlow?.("Starting the server, this can take up to a minute");
  }, SLOW_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, options);
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
  } catch {
    return {
      ok: false,
      error:
        "Could not reach the server. Is the backend running on port 3001?",
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
  );
}

export function fetchSoil(state) {
  return request(`/api/label/soil?state=${encodeURIComponent(state)}`);
}

export { API_URL };
