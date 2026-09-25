import Decimal from "decimal.js";
import { ApiError } from "../common/errors";
const MoneyDecimal = Decimal.clone({ precision: 50 });
export function calculatePrice(cost: string, rate: string) {
  const local = new MoneyDecimal(cost)
    .mul(rate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const selling = local.mul("1.4").toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // The public contract uses JSON numbers: never silently drop monetary precision.
  if (
    [local, selling].some(
      (amount) =>
        !new MoneyDecimal(amount.toNumber()).eq(amount) ||
        amount.mul(100).gt(Number.MAX_SAFE_INTEGER),
    )
  ) {
    throw new ApiError("amountOutOfRange", 400);
  }
  return {
    cost_local: local.toNumber(),
    selling_price_local: selling.toFixed(2),
  };
}
