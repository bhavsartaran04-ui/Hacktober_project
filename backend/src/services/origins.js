export function normalizeAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function isAllowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return isLoopback && url.protocol === "http:";
  } catch {
    return false;
  }
}
