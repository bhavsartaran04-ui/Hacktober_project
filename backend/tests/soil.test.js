import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupStateSoil } from "../src/services/soil.js";

const originalFetch = globalThis.fetch;

function response(clay, sand) {
  return new Response(JSON.stringify({ properties: { layers: [
    { name: "clay", depths: [{ label: "0-5cm", values: { mean: clay } }] },
    { name: "sand", depths: [{ label: "0-5cm", values: { mean: sand } }] },
  ] } }), { status: 200 });
}

describe("lookupStateSoil", () => {
  it("searches nearby mapped pixels when the state reference point has no data", async () => {
    globalThis.fetch = async (url) => {
      const query = new URL(url);
      const isReferencePoint = query.searchParams.get("lat") === "16.5062" && query.searchParams.get("lon") === "80.648";
      return isReferencePoint ? response(null, null) : response(322, 330);
    };
    try {
      const result = await lookupStateSoil("Andhra Pradesh");
      assert.equal(result.ok, true);
      assert.equal(result.texture, "Clay loam / silty clay loam");
      assert.match(result.estimate, /Nearest mapped SoilGrids sample about/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects unknown state names instead of returning fabricated soil data", async () => {
    const result = await lookupStateSoil("Not an Indian state");
    assert.equal(result.ok, false);
  });
});
