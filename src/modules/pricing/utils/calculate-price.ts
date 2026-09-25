import Decimal from "decimal.js";
import { ApiError } from "../../../common/errors/api-error";

const MoneyDecimal = Decimal.clone({ precision: 50 });

export function calculatePrice(cost: string, rate: string) {
  const costLocal = new MoneyDecimal(cost)
    .mul(rate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const sellingPrice = costLocal
    .mul("1.4")
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // The public contract uses JSON numbers: never silently drop monetary precision.
  if (
    [costLocal, sellingPrice].some(
      (amount) =>
        !new MoneyDecimal(amount.toNumber()).eq(amount) ||
        amount.mul(100).gt(Number.MAX_SAFE_INTEGER),
    )
  ) {
    throw new ApiError("amountOutOfRange", 400);
  }
  return {
    cost_local: costLocal.toNumber(),
    selling_price_local: sellingPrice.toFixed(2),
  };
}
