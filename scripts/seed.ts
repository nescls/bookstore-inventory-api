import { DataSource } from "typeorm";
import { BookEntity } from "../src/modules/books/entities/book.entity";
import { createDatabase } from "../src/database/data-source";
import { ExchangeRateEntity } from "../src/modules/exchange-rates/entities/exchange-rate.entity";
import { ExchangeRatesService } from "../src/modules/exchange-rates/exchange-rates.service";
import { isValidRate } from "../src/modules/exchange-rates/utils/is-valid-rate";
import { createBookSchema } from "../src/modules/books/dto/books.schemas";
import { requireCanonicalIsbn } from "../src/modules/books/utils/isbn";
import { parse } from "../src/common/utils/parse";
const sampleBooks = [
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    isbn: "9780553380163",
    cost_usd: 15.99,
    stock_quantity: 25,
    category: "Ciencia",
    supplier_country: "GB",
  },
  {
    title: "Don Quijote",
    author: "Miguel de Cervantes",
    isbn: "9780140449136",
    cost_usd: 12,
    stock_quantity: 5,
    category: "Literatura",
    supplier_country: "ES",
  },
];
export async function seed(
  dataSource: DataSource,
  offlineRate = process.env.SEED_EXCHANGE_RATE,
) {
  await dataSource.transaction(async (manager) => {
    // Seed initialization must not race a successful provider-rate insert.
    await manager.query(
      "LOCK TABLE exchange_rates IN SHARE ROW EXCLUSIVE MODE",
    );
    const exchangeRateRepository = manager.getRepository(ExchangeRateEntity);
    if (
      !(await exchangeRateRepository.findOneBy({ base: "USD", quote: "EUR" }))
    ) {
      let rate: number;
      try {
        rate = await new ExchangeRatesService(dataSource).fetchLiveRate();
      } catch {
        rate = Number(offlineRate);
        if (!isValidRate(rate))
          throw new Error(
            "No initial exchange rate available. Supply a valid SEED_EXCHANGE_RATE for offline seeding.",
          );
      }
      await exchangeRateRepository.insert({
        base: "USD",
        quote: "EUR",
        rate: String(rate),
        created_at: new Date(),
      });
    }
    const bookRepository = manager.getRepository(BookEntity);
    for (const sampleBook of sampleBooks) {
      const input = parse(createBookSchema, sampleBook);
      await bookRepository
        .createQueryBuilder()
        .insert()
        .values({
          ...input,
          isbn_canonical: requireCanonicalIsbn(input.isbn),
          cost_usd: String(input.cost_usd),
          selling_price_local: null,
        })
        .orIgnore()
        .execute();
    }
  });
}
async function main() {
  const dataSource = createDatabase();
  try {
    await dataSource.initialize();
    await seed(dataSource);
    console.log("Missing sample data inserted.");
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  });
