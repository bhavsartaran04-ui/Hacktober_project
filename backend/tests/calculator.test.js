import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDose } from "../src/services/calculator.js";

const confirmed = {
  confirmed: true,
  tankLitres: 16,
  rateAmount: 2,
  rateUnit: "ml",
  perAmount: 1,
  perUnit: "litre",
};

describe("calculateDose", () => {
  it("calculates a per-litre rate", () => {
    const result = calculateDose(confirmed);
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 32);
    assert.equal(result.unit, "ml");
  });

  it("calculates a per-10-litre rate", () => {
    const result = calculateDose({
      ...confirmed,
      rateAmount: 10,
      rateUnit: "g",
      perAmount: 10,
      perUnit: "litres",
    });
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 16);
    assert.equal(result.unit, "g");
  });

  it("calculates a custom tank capacity", () => {
    const result = calculateDose({ ...confirmed, tankLitres: 17.5 });
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 35);
  });

  it("converts millilitres of water in the denominator", () => {
    const result = calculateDose({
      ...confirmed,
      rateAmount: 2,
      perAmount: 500,
      perUnit: "ml",
      tankLitres: 10,
    });
    assert.equal(result.ok, true);
    assert.equal(result.quantity, 40);
  });

  it("does not invent a number when the rate is missing", () => {
    const result = calculateDose({
      confirmed: true,
      tankLitres: 16,
      rateAmount: null,
      rateUnit: "",
      perAmount: null,
      perUnit: "",
    });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
    assert.match(result.message, /Could not verify/);
  });

  it("rejects a zero tank", () => {
    const result = calculateDose({ ...confirmed, tankLitres: 0 });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
    assert.match(result.message, /0/);
  });

  it("rejects a negative tank", () => {
    const result = calculateDose({ ...confirmed, tankLitres: -5 });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
    assert.match(result.message, /negative/);
  });

  it("rejects a unit mismatch (rate not per water volume)", () => {
    const result = calculateDose({
      ...confirmed,
      perUnit: "hectare",
    });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
    assert.match(result.message, /do not match/);
  });

  it("does not convert a per-hectare dose into a tank dose", () => {
    const result = calculateDose({ ...confirmed, perUnit: "hectare" });
    assert.equal(result.ok, false);
    assert.equal(result.quantity, null);
  });

  it("rejects nonnumeric or nonpositive rate values", () => {
    for (const amount of ["not a number", 0, -1, Infinity]) {
      const result = calculateDose({ ...confirmed, rateAmount: amount });
      assert.equal(result.ok, false);
      assert.equal(result.quantity, null);
    }
  });
});
