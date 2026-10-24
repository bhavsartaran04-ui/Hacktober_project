import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import labelRouter from "../src/routes/label.js";

const app = express();
app.use(express.json());
app.use("/api/label", labelRouter);
let server;
let baseUrl;
const originalApiKey = process.env.LLM_API_KEY;
const httpFetch = globalThis.fetch.bind(globalThis);

function soilResponse() {
  return new Response(JSON.stringify({ properties: { layers: [
    { name: "clay", depths: [{ label: "0-5cm", values: { mean: 250 } }] },
    { name: "sand", depths: [{ label: "0-5cm", values: { mean: 350 } }] },
  ] } }), { status: 200 });
}

before(async () => {
  delete process.env.LLM_API_KEY;
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (originalApiKey !== undefined) process.env.LLM_API_KEY = originalApiKey;
});

describe("label API validation", () => {
  it("blocks result calculation until label fields were explicitly confirmed", async () => {
    const response = await fetch(`${baseUrl}/api/label/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: false, fields: {} }),
    });
    assert.equal(response.status, 400);
  });

  it("calculates confirmed tank rates and tolerates missing optional AI credentials", async () => {
    globalThis.fetch = async () => soilResponse();
    try {
      const response = await httpFetch(`${baseUrl}/api/label/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          state: "Andhra Pradesh",
          crop: "rabi",
          tankLitres: 16,
          language: "en",
          fields: { rate: { status: "found", amount: 2, unit: "ml", perAmount: 1, perUnit: "litre", value: "2 ml per 1 litre" } },
        }),
      });
      const result = await response.json();
      assert.equal(result.calculation.ok, true);
      assert.equal(result.calculation.quantity, 32);
      assert.equal(result.soil.ok, true);
      assert.equal(result.crop, "rabi");
      assert.equal(result.llm.ok, false);
    } finally {
      globalThis.fetch = httpFetch;
    }
  });

  it("does not treat a filename and declared MIME type as proof of an image", async () => {
    const form = new FormData();
    form.append("image", new Blob(["not a real image"], { type: "image/jpeg" }), "label.jpg");
    const response = await httpFetch(`${baseUrl}/api/label/extract`, { method: "POST", body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /not a readable JPG, PNG, or WebP/);
  });
});
