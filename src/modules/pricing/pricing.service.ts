import { Inject, Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { calculatePrice } from "./utils/calculate-price";

@Injectable()
export class PricingService {
  constructor(
    @Inject(ExchangeRatesService)
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async calculate(cost: string, manager: EntityManager) {
    const rate = await this.exchangeRatesService.resolveRate(manager);
    return {
      ...calculatePrice(cost, rate),
      exchange_rate: Number(rate),
      cost_usd: Number(cost),
      margin_percentage: 40,
      currency: "EUR",
      calculation_timestamp: new Date().toISOString(),
    };
  }
}
