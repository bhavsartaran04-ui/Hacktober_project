import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin, normalizeAllowedOrigins } from "../src/services/origins.js";

describe("CORS origin validation", () => {
  it("normalizes configured origins and ignores paths and trailing slashes", () => {
    const allowed = normalizeAllowedOrigins(" https://farm.example/path/, https://other.example/ ");
    assert.deepEqual(allowed, ["https://farm.example", "https://other.example"]);
  });

  it("allows local Vite fallback ports without opening remote origins", () => {
    const allowed = normalizeAllowedOrigins("https://farm.example");
    assert.equal(isAllowedOrigin("http://localhost:5174", allowed), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:4173", allowed), true);
    assert.equal(isAllowedOrigin("https://farm.example", allowed), true);
    assert.equal(isAllowedOrigin("https://unknown.example", allowed), false);
  });
});
