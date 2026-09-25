import { DataSource } from "typeorm";
import { BookEntity } from "../src/books/book.entity";
import { createDatabase } from "../src/database/data-source";
import { ExchangeRateEntity } from "../src/exchange-rates/exchange-rate.entity";
import { ExchangeRatesService } from "../src/exchange-rates/exchange-rates.service";
import { validRate } from "../src/exchange-rates/exchange-rate.validation";
import { createBookSchema } from "../src/books/books.schemas";
import { parse } from "../src/common/validation";
const examples = [
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
  db: DataSource,
  offlineRate = process.env.SEED_EXCHANGE_RATE,
) {
  await db.transaction(async (manager) => {
    // Seed initialization must not race a successful provider-rate insert.
    await manager.query(
      "LOCK TABLE exchange_rates IN SHARE ROW EXCLUSIVE MODE",
    );
    const rates = manager.getRepository(ExchangeRateEntity);
    if (!(await rates.findOneBy({ base: "USD", quote: "VES" }))) {
      let rate: number;
      try {
        rate = await new ExchangeRatesService(db).liveRate();
      } catch {
        rate = Number(offlineRate);
        if (!validRate(rate))
          throw new Error(
            "No initial exchange rate available. Supply a valid SEED_EXCHANGE_RATE for offline seeding.",
          );
      }
      await rates.insert({
        base: "USD",
        quote: "VES",
        rate: String(rate),
        created_at: new Date(),
      });
    }
    const books = manager.getRepository(BookEntity);
    for (const example of examples) {
      const input = parse(createBookSchema, example);
      await books
        .createQueryBuilder()
        .insert()
        .values({
          ...input,
          cost_usd: String(input.cost_usd),
          selling_price_local: null,
        })
        .orIgnore()
        .execute();
    }
  });
}
async function main() {
  const db = createDatabase();
  try {
    await db.initialize();
    await seed(db);
    console.log("Missing sample data inserted.");
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : "Seed failed");
    process.exitCode = 1;
  });
