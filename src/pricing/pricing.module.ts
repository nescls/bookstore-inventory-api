import { Module } from "@nestjs/common";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { PricingService } from "./pricing.service";
@Module({
  imports: [ExchangeRatesModule],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
