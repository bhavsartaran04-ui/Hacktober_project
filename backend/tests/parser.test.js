import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLabelText } from "../src/services/parser.js";
import {
  DEMO_FULL_TEXT,
  DEMO_MISSING_RATE_TEXT,
} from "../src/services/demoLabels.js";

describe("parseLabelText", () => {
  it("reads the full DEMO label", () => {
    const fields = parseLabelText(DEMO_FULL_TEXT);
    assert.equal(fields.productName.value, "Demo-Kill 20 EC");
    assert.equal(fields.rate.amount, 2);
    assert.match(fields.rate.unit, /ml/i);
    assert.equal(fields.rate.perAmount, 1);
    assert.match(fields.rate.perUnit, /litre/i);
    assert.equal(fields.phi.value, "7 days");
    assert.equal(fields.reEntry.value, "24 hours");
    assert.equal(fields.mixing.status, "found");
    assert.match(fields.mixing.value, /do not mix/i);
  });

  it("does not invent a rate on the missing-rate DEMO label", () => {
    const fields = parseLabelText(DEMO_MISSING_RATE_TEXT);
    assert.equal(fields.productName.value, "Demo-Clear WP");
    assert.equal(fields.rate.status, "not found");
    assert.equal(fields.rate.amount, null);
    assert.equal(fields.phi.value, "5 days");
    assert.equal(fields.reEntry.value, "12 hours");
  });
});
