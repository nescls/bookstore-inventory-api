import Decimal from "decimal.js";

export function isValidRate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 100000000 &&
    new Decimal(value).decimalPlaces() <= 10
  );
}
