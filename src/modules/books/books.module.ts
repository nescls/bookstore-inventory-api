import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { BooksController } from "./books.controller";
import { BooksService } from "./books.service";
@Module({
  imports: [PricingModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
