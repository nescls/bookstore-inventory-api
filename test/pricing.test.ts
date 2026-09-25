import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice } from "../src/modules/pricing/utils/calculate-price";
import { resolveLanguage } from "../src/common/utils/resolve-language";
test("two-stage half-up rounding matches the assessment example", () => {
  assert.deepEqual(calculatePrice("15.99", "0.85"), {
    cost_local: 13.59,
    selling_price_local: "19.03",
  });
  assert.deepEqual(calculatePrice("1", "1.005"), {
    cost_local: 1.01,
    selling_price_local: "1.41",
  });
});
test("language preferences support regions, weights, exclusions, and Spanish fallback", () => {
  assert.equal(resolveLanguage("en-US"), "en");
  assert.equal(resolveLanguage("es-VE"), "es");
  assert.equal(resolveLanguage("fr, en;q=0.9, es;q=0.5"), "en");
  assert.equal(resolveLanguage("en;q=0, es;q=0.5"), "es");
  assert.equal(resolveLanguage("de"), "es");
  assert.equal(resolveLanguage(undefined), "es");
});
test("rejects calculated amounts that cannot round-trip through the JSON number contract", () => {
  assert.throws(() => calculatePrice("999999999999.99", "12345678.123456789"), {
    code: "amountOutOfRange",
  });
});
