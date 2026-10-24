/**
 * Dose math only. Never guesses a rate.
 *
 * A tank quantity is calculated only when:
 * - the label rate amount and unit are known (example: 2 ml)
 * - the mix volume the rate is "per" is known (example: 1 litre)
 * - that mix volume is a water/spray volume (ml or litres), not per hectare or per kg
 * - tank capacity is a positive number of litres, at most 10,000
 *
 * Original units are kept on the answer. Conversions are extra lines.
 */

const VOLUME_TO_ML = {
  ml: 1,
  millilitre: 1,
  milliliter: 1,
  millilitres: 1,
  milliliters: 1,
  l: 1000,
  litre: 1000,
  liter: 1000,
  litres: 1000,
  liters: 1000,
};

function fail(missing) {
  return {
    ok: false,
    quantity: null,
    unit: null,
    conversionLines: [],
    message: `Could not verify: ${missing}`,
    source: "Calculated",
  };
}

function normalizeUnit(unit) {
  return String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

function toMl(amount, unit) {
  const key = normalizeUnit(unit);
  const factor = VOLUME_TO_ML[key];
  if (factor == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * factor;
}

function roundNice(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * @param {object} input
 * @param {number|string|null} input.rateAmount
 * @param {string|null} input.rateUnit
 * @param {number|string|null} input.perAmount
 * @param {string|null} input.perUnit
 * @param {number|string|null} input.tankLitres
 * @param {boolean} input.confirmed
 */
export function calculateDose(input) {
  const confirmed = Boolean(input?.confirmed);
  if (!confirmed) {
    return fail("the user has not confirmed the label values");
  }

  const rawTank = input?.tankLitres;
  if (rawTank === "" || rawTank === null || rawTank === undefined) {
    return fail("tank capacity is blank");
  }

  const tankLitres = Number(rawTank);
  if (!Number.isFinite(tankLitres)) {
    return fail("tank capacity is not a number");
  }
  if (tankLitres === 0) {
    return fail("tank capacity is 0");
  }
  if (tankLitres < 0) {
    return fail("tank capacity is negative");
  }
  if (tankLitres > 10000) {
    return fail("tank capacity is above 10,000 litres");
  }

  const rateAmount = Number(input?.rateAmount);
  const rateUnit = normalizeUnit(input?.rateUnit);
  const perAmount = Number(input?.perAmount);
  const perUnit = normalizeUnit(input?.perUnit);

  if (
    !Number.isFinite(rateAmount) ||
    rateAmount <= 0 ||
    !rateUnit ||
    !Number.isFinite(perAmount) ||
    perAmount <= 0 ||
    !perUnit
  ) {
    return fail("label rate with unit is missing or unclear");
  }

  const perMl = toMl(perAmount, perUnit);
  if (perMl == null) {
    return fail(
      "rate unit and tank unit do not match (tank is litres of spray mix; the label rate is not per litre/ml of water)",
    );
  }

  const tankMl = tankLitres * 1000;
  const quantity = roundNice(rateAmount * (tankMl / perMl));

  const conversionLines = [];
  if (normalizeUnit(perUnit).startsWith("l") || perMl === perAmount * 1000) {
    conversionLines.push("1 L = 1000 ml");
  }

  return {
    ok: true,
    quantity,
    unit: input.rateUnit.trim(),
    conversionLines,
    message: null,
    source: "Calculated",
  };
}
