import { DataSource } from "typeorm";
import { BookEntity, createDatabase } from "./database";
import { ExchangeRateEntity } from "./exchange-rate-model";
import { Pricing, validRate } from "./pricing";
import { createBookSchema, parse } from "./validation";
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
        rate = await new Pricing(manager).liveRate();
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
