import "reflect-metadata";
import { DataSource } from "typeorm";
import { BookEntity } from "../books/book.entity";
import { ExchangeRateEntity } from "../exchange-rates/exchange-rate.entity";
import { InitialBooks1790294400000 } from "./migrations/1790294400000-initial-books";
import { ExchangeRates1790294400001 } from "./migrations/1790294400001-exchange-rates";
export function createDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is required");
  return new DataSource({
    type: "postgres",
    url,
    entities: [BookEntity, ExchangeRateEntity],
    migrations: [InitialBooks1790294400000, ExchangeRates1790294400001],
    synchronize: false,
    extra: { max: 5 },
  });
}
