import { Inject, Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { calculatePrice } from "./price-calculation";
@Injectable()
export class PricingService {
  constructor(
    @Inject(ExchangeRatesService) private readonly rates: ExchangeRatesService,
  ) {}
  async calculate(cost: string, manager: EntityManager) {
    const rate = await this.rates.resolveRate(manager);
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
