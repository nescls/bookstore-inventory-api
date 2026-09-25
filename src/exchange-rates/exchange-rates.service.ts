import { Inject, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { ApiError, logEvent } from "../common/errors";
import { ExchangeRateEntity } from "./exchange-rate.entity";
import { validRate } from "./exchange-rate.validation";
@Injectable()
export class ExchangeRatesService {
  private readonly url: string;
  private readonly timeout: number;
  constructor(@Inject(DataSource) private readonly db: DataSource) {
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
  async resolveRate(manager: EntityManager = this.db.manager): Promise<string> {
    let live: number;
    try {
      live = await this.liveRate();
    } catch {
      logEvent({
        level: "warn",
        code: "exchangeProviderUnavailable",
        action: "storedRateLookup",
      });
      const stored = await manager.getRepository(ExchangeRateEntity).findOne({
        where: { base: "USD", quote: "VES" },
        order: { created_at: "DESC", id: "DESC" },
      });
      if (!stored || !validRate(Number(stored.rate)))
        throw new ApiError("exchangeRateUnavailable", 503);
      return stored.rate;
    }
    const rate = await manager.getRepository(ExchangeRateEntity).save({
      base: "USD",
      quote: "VES",
      rate: String(live),
      created_at: new Date(),
    });
    return rate.rate;
  }
}
