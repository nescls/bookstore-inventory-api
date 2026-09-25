import Decimal from "decimal.js";
import { DataSource, EntityManager } from "typeorm";
import { ApiError, logEvent } from "./errors";
import { ExchangeRateEntity } from "./exchange-rate-model";
export function validRate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 100000000 &&
    new Decimal(value).decimalPlaces() <= 10
  );
}
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
export class Pricing {
  private readonly url: string;
  private readonly timeout: number;
  constructor(private readonly db: DataSource | EntityManager) {
    this.url =
      process.env.EXCHANGE_RATE_URL ??
      "https://api.exchangerate-api.com/v4/latest/USD";
    this.timeout = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS ?? 5000);
    if (
      !Number.isInteger(this.timeout) ||
      this.timeout < 1 ||
      this.timeout > 30000
    )
      throw new Error("Invalid EXCHANGE_RATE_TIMEOUT_MS");
  }
  async liveRate(): Promise<number> {
    const response = await fetch(this.url, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) throw new Error("Provider HTTP failure");
    const payload = (await response.json()) as {
      base?: unknown;
      rates?: { VES?: unknown };
    };
    const rate = payload?.rates?.VES;
    if (payload?.base !== "USD" || !validRate(rate))
      throw new Error("Invalid provider rate");
    return rate;
  }
  async resolveRate(): Promise<string> {
    let live: number;
    try {
      live = await this.liveRate();
    } catch {
      logEvent({
        level: "warn",
        code: "exchangeProviderUnavailable",
        action: "storedRateLookup",
      });
      const stored = await this.db.getRepository(ExchangeRateEntity).findOne({
        where: { base: "USD", quote: "VES" },
        order: { created_at: "DESC", id: "DESC" },
      });
      if (!stored || !validRate(Number(stored.rate)))
        throw new ApiError("exchangeRateUnavailable", 503);
      return stored.rate;
    }
    const rate = await this.db
      .getRepository(ExchangeRateEntity)
      .save({
        base: "USD",
        quote: "VES",
        rate: String(live),
        created_at: new Date(),
      });
    return rate.rate;
  }
  async calculate(cost: string) {
    const rate = await this.resolveRate();
    return {
      ...calculatePrice(cost, rate),
      exchange_rate: Number(rate),
      cost_usd: Number(cost),
      margin_percentage: 40,
      currency: "VES",
      calculation_timestamp: new Date().toISOString(),
    };
  }
}
