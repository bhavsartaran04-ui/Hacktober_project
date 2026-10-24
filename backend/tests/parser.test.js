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

  it("extracts harvest and field-entry intervals from differently worded label text", () => {
    const fields = parseLabelText(
      "Wait 7 days before harvest. Do not enter field for 24 hours.",
    );
    assert.equal(fields.phi.value, "7 days");
    assert.equal(fields.reEntry.value, "24 hours");
  });

  it("recognizes Hindi harvest interval text without translating it", () => {
    const fields = parseLabelText("कटाई से पहले 7 दिन प्रतीक्षा करें");
    assert.equal(fields.phi.status, "found");
    assert.equal(fields.phi.value, "7 दिन");
  });

  it("marks contradictory waiting periods uncertain instead of choosing one", () => {
    const fields = parseLabelText("PHI: 5 days\nPHI: 7 days");
    assert.equal(fields.phi.status, "uncertain");
    assert.equal(fields.phi.value, "");
  });

  it("does not mislabel an instruction as the product name", () => {
    const fields = parseLabelText("Wait 7 days before harvest. Do not enter field for 24 hours.");
    assert.equal(fields.productName.status, "not found");
  });

  it("extracts label crop and pest context when explicitly labelled", () => {
    const fields = parseLabelText("Target crop: Cotton\nTarget pest: bollworm");
    assert.equal(fields.targetCrop.value, "Cotton");
    assert.equal(fields.targetPest.value, "bollworm");
  });

  it("preserves conflicting mixing instructions as uncertain", () => {
    const fields = parseLabelText("Do not mix with product A. Compatible with product B.");
    assert.equal(fields.mixing.status, "uncertain");
    assert.equal(fields.mixing.value, "");
  });
});
