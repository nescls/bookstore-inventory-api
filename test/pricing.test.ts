import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice } from "../src/pricing";
import { language } from "../src/errors";
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
  assert.equal(language("en-US"), "en");
  assert.equal(language("es-VE"), "es");
  assert.equal(language("fr, en;q=0.9, es;q=0.5"), "en");
  assert.equal(language("en;q=0, es;q=0.5"), "es");
  assert.equal(language("de"), "es");
  assert.equal(language(undefined), "es");
});
