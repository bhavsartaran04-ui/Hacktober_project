import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("API client configuration and errors", () => {
  it("normalizes a backend URL that already ends in /api", async () => {
    vi.stubEnv("VITE_API_URL", " https://api.example.test/api/ ");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true, texture: "Loam" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchSoil, API_URL } = await import("./api.js");

    expect(API_URL).toBe("https://api.example.test");
    await fetchSoil("Tamil Nadu");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/api/label/soil?state=Tamil%20Nadu");
  });

  it("explains when the configured URL returns frontend HTML instead of API JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      json: async () => ({}),
    }));
    const { fetchSoil } = await import("./api.js");

    const result = await fetchSoil("Maharashtra");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/VITE_API_URL points to the backend/);
  });

  it("returns a setup hint when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { fetchSoil } = await import("./api.js");

    const result = await fetchSoil("Maharashtra");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/backend is running and VITE_API_URL/);
  });
});
