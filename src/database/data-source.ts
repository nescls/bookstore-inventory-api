import "reflect-metadata";
import { DataSource } from "typeorm";
import { BookEntity } from "../modules/books/entities/book.entity";
import { ExchangeRateEntity } from "../modules/exchange-rates/entities/exchange-rate.entity";
import { InitialBooks1790294400000 } from "./migrations/1790294400000-initial-books";
import { ExchangeRates1790294400001 } from "./migrations/1790294400001-exchange-rates";
import { IsbnAsEntered1790294400002 } from "./migrations/1790294400002-isbn-as-entered";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities: [BookEntity, ExchangeRateEntity],
    migrations: [
      InitialBooks1790294400000,
      ExchangeRates1790294400001,
      IsbnAsEntered1790294400002,
    ],
    synchronize: false,
    extra: { max: 5 },
  });
}
