import { Inject, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { ApiError } from "../../common/errors/api-error";
import { logEvent } from "../../common/utils/log-event";
import { ExchangeRateEntity } from "./entities/exchange-rate.entity";
import { isValidRate } from "./utils/is-valid-rate";
@Injectable()
export class ExchangeRatesService {
  private readonly providerUrl: string;
  private readonly timeoutMs: number;
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {
    this.providerUrl =
      process.env.EXCHANGE_RATE_URL ??
      "https://api.exchangerate-api.com/v4/latest/USD";
    this.timeoutMs = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS ?? 5000);
    if (
      !Number.isInteger(this.timeoutMs) ||
      this.timeoutMs < 1 ||
      this.timeoutMs > 30000
    )
      throw new Error("Invalid EXCHANGE_RATE_TIMEOUT_MS");
  }
  async fetchLiveRate(): Promise<number> {
    const response = await fetch(this.providerUrl, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error("Provider HTTP failure");
    const payload = (await response.json()) as {
      base?: unknown;
      rates?: { EUR?: unknown };
    };
    const rate = payload?.rates?.EUR;
    if (payload?.base !== "USD" || !isValidRate(rate))
      throw new Error("Invalid provider rate");
    return rate;
  }
  async resolveRate(
    manager: EntityManager = this.dataSource.manager,
  ): Promise<string> {
    let liveRate: number;
    try {
      liveRate = await this.fetchLiveRate();
    } catch {
      logEvent({
        level: "warn",
        code: "exchangeProviderUnavailable",
        action: "storedRateLookup",
      });
      const storedRate = await manager
        .getRepository(ExchangeRateEntity)
        .findOne({
          where: { base: "USD", quote: "EUR" },
          order: { created_at: "DESC", id: "DESC" },
        });
      if (!storedRate || !isValidRate(Number(storedRate.rate)))
        throw new ApiError("exchangeRateUnavailable", 503);
      return storedRate.rate;
    }
    const savedRate = await manager.getRepository(ExchangeRateEntity).save({
      base: "USD",
      quote: "EUR",
      rate: String(liveRate),
      created_at: new Date(),
    });
    return savedRate.rate;
  }
}
