import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explainLabel } from "../src/services/llm.js";

const originalFetch = globalThis.fetch;
const originalKey = process.env.LLM_API_KEY;
const originalModel = process.env.LLM_MODEL;

function restore() {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = originalModel;
}

describe("explainLabel", () => {
  it("returns clear setup guidance when the server key is missing", async () => {
    delete process.env.LLM_API_KEY;
    let requested = false;
    globalThis.fetch = async () => { requested = true; };
    try {
      const result = await explainLabel({ sourceText: "Wait 7 days", language: "en" });
      assert.equal(result.ok, false);
      assert.match(result.error, /LLM_API_KEY/);
      assert.equal(requested, false);
    } finally { restore(); }
  });

  it("uses the configured Groq-compatible model and accepts a safe mocked response", async () => {
    process.env.LLM_API_KEY = "test-key";
    delete process.env.LLM_MODEL;
    let requestBody;
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ explanation: "Wait 7 days before harvest.", language: "Hindi" }) } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    try {
      const result = await explainLabel({ sourceText: "PHI: 7 days", language: "en" });
      assert.equal(requestBody.model, "openai/gpt-oss-20b");
      assert.equal(requestBody.messages[0].role, "system");
      assert.equal(result.ok, true);
      assert.equal(result.language, "English");
    } finally { restore(); }
  });

  it("rejects numbers that were not present in the confirmed source text", async () => {
    process.env.LLM_API_KEY = "test-key";
    globalThis.fetch = async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ explanation: "Wait 8 days.", language: "English" }) } }],
    }), { status: 200 });
    try {
      const result = await explainLabel({ sourceText: "Wait 7 days.", language: "en" });
      assert.equal(result.ok, false);
      assert.match(result.error, /numbers not found/);
    } finally { restore(); }
  });

  it("returns a useful error for an invalid provider key", async () => {
    process.env.LLM_API_KEY = "test-key";
    globalThis.fetch = async () => new Response("", { status: 401 });
    try {
      const result = await explainLabel({ sourceText: "Label text", language: "hi" });
      assert.equal(result.ok, false);
      assert.match(result.error, /key was rejected/);
    } finally { restore(); }
  });

  it("handles rate limits and malformed provider output without throwing", async () => {
    process.env.LLM_API_KEY = "test-key";
    globalThis.fetch = async () => new Response("", { status: 429 });
    try {
      const limited = await explainLabel({ sourceText: "Label text", language: "en" });
      assert.match(limited.error, /rate limited/i);
      globalThis.fetch = async () => new Response("not json", { status: 200 });
      const malformed = await explainLabel({ sourceText: "Label text", language: "en" });
      assert.match(malformed.error, /not valid JSON/i);
    } finally { restore(); }
  });

  it("handles provider timeouts without exposing provider internals", async () => {
    process.env.LLM_API_KEY = "test-key";
    globalThis.fetch = async () => { throw Object.assign(new Error("private transport detail"), { name: "TimeoutError" }); };
    try {
      const result = await explainLabel({ sourceText: "Label text", language: "en" });
      assert.equal(result.ok, false);
      assert.match(result.error, /timed out/i);
      assert.doesNotMatch(result.error, /private transport detail/);
    } finally { restore(); }
  });
});
