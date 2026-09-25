import { Inject, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { ApiError } from "../../common/errors/api-error";
import { Logger } from "nestjs-pino";
import { ExchangeRateEntity } from "./entities/exchange-rate.entity";
import { isValidRate } from "./utils/is-valid-rate";
import { fetchProviderRate, readProviderConfig } from "./utils/provider-rate";

@Injectable()
export class ExchangeRatesService {
  private readonly providerUrl: string;

  private readonly timeoutMs: number;

  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(Logger) private readonly logger: Logger,
  ) {
    const { url, timeoutMs } = readProviderConfig();
    this.providerUrl = url;
    this.timeoutMs = timeoutMs;
  }

  async resolveRate(
    manager: EntityManager = this.dataSource.manager,
  ): Promise<string> {
    let liveRate: number;
    try {
      liveRate = await fetchProviderRate(this.providerUrl, this.timeoutMs);
    } catch {
      this.logger.warn({
        code: "exchangeProviderUnavailable",
        action: "storedRateLookup",
        msg: "Exchange provider unavailable; using the stored rate",
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
