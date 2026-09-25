import "reflect-metadata";
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
let providerCalls = 0;
let providerStatus = 200;
let providerDelay = 0;
let providerBody: unknown = { base: "USD", rates: { VES: 0.85 } };
const provider = createServer((_req, res) => {
  providerCalls++;
  res.writeHead(providerStatus, { "Content-Type": "application/json" });
  setTimeout(() => res.end(JSON.stringify(providerBody)), providerDelay);
});
import { seed } from "../scripts/seed";
import { createApp } from "../src/app";
import { createDatabase } from "../src/database/data-source";
const db = createDatabase(
  process.env.TEST_DATABASE_URL ??
    "postgres://bookstore:bookstore@localhost:55433/bookstore_test",
);
if (
  !new URL(
    db.options.type === "postgres" ? db.options.url! : "",
  ).pathname.endsWith("_test")
)
  throw new Error("Test database name must end in _test");
let app: Awaited<ReturnType<typeof createApp>>;
const sample = {
  title: "Don Quijote",
  author: "Miguel de Cervantes",
  isbn: "978-0-306-40615-7",
  cost_usd: 15.99,
  stock_quantity: 25,
  category: "Literatura",
  supplier_country: "ES",
};
before(async () => {
  await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
  process.env.EXCHANGE_RATE_URL = `http://127.0.0.1:${(provider.address() as AddressInfo).port}`;
  await db.initialize();
  await db.runMigrations();
  app = await createApp(db);
  await app.init();
});
beforeEach(async () => {
  await db.query("TRUNCATE books, exchange_rates RESTART IDENTITY CASCADE");
  providerCalls = 0;
  providerStatus = 200;
  providerDelay = 0;
  process.env.EXCHANGE_RATE_TIMEOUT_MS = "5000";
  providerBody = { base: "USD", rates: { VES: 0.85 } };
});
after(async () => {
  await new Promise<void>((r, j) => provider.close((e) => (e ? j(e) : r())));
  await app?.close();
  if (db.isInitialized) await db.destroy();
});
test("create a book and retrieve its saved canonical record", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  assert.equal(created.body.isbn, "9780306406157");
  assert.equal(created.body.selling_price_local, null);
  const found = await request(app.getHttpServer())
    .get(`/books/${created.body.id}`)
    .expect(200);
  assert.equal(found.body.title, sample.title);
  assert.equal(found.body.cost_usd, 15.99);
});

test("rejects equivalent duplicate ISBN and invalid inputs with localized dictionary errors", async () => {
  await request(app.getHttpServer()).post("/books").send(sample).expect(201);
  const duplicate = await request(app.getHttpServer())
    .post("/books")
    .set("Accept-Language", "en-US")
    .send({ ...sample, isbn: "0-306-40615-2" })
    .expect(400);
  assert.equal(duplicate.body.error.code, "duplicateIsbn");
  assert.equal(duplicate.body.message, "A book with this ISBN already exists.");
  for (const patch of [
    { cost_usd: 0 },
    { cost_usd: 1.001 },
    { stock_quantity: -1 },
    { isbn: "9780306406158" },
    { supplier_country: "ZZ" },
    { isActive: false },
    { title: " " },
  ]) {
    await request(app.getHttpServer())
      .post("/books")
      .send({ ...sample, ...patch })
      .expect(400);
  }
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const missing = await request(app.getHttpServer())
      .get("/books/999")
      .set("Accept-Language", "fr, en;q=0.8, es;q=0.5")
      .expect(404);
    assert.deepEqual(missing.body, {
      error: { code: "bookNotFound", path: "/books/999" },
      message: "Book not found.",
    });
  } finally {
    process.env.NODE_ENV = original;
  }
});
test("lists books with shared pagination, case-insensitive category, and strict low-stock threshold", async () => {
  await request(app.getHttpServer()).post("/books").send(sample).expect(201);
  await request(app.getHttpServer())
    .post("/books")
    .send({
      ...sample,
      isbn: "9780140449136",
      category: "Ciencia",
      stock_quantity: 9,
    })
    .expect(201);
  const page = await request(app.getHttpServer())
    .get("/books?page=2&limit=1")
    .expect(200);
  assert.equal(page.body.total, 2);
  assert.equal(page.body.data[0].isbn, "9780140449136");
  const category = await request(app.getHttpServer())
    .get("/books/search?category=LITERATURA&limit=1")
    .expect(200);
  assert.equal(category.body.total, 1);
  assert.equal(category.body.data[0].category, "Literatura");
  assert.equal(
    (
      await request(app.getHttpServer())
        .get("/books/low-stock?threshold=9")
        .expect(200)
    ).body.total,
    0,
  );
  assert.equal(
    (await request(app.getHttpServer()).get("/books/low-stock").expect(200))
      .body.total,
    1,
  );
  for (const path of [
    "/books?limit=101",
    "/books?where=x",
    "/books?page=0",
    "/books/search",
    "/books/low-stock?threshold=-1",
  ])
    await request(app.getHttpServer()).get(path).expect(400);
});
test("permanent deletion removes the book and repeated deletion is a localized 404", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  await request(app.getHttpServer())
    .delete(`/books/${created.body.id}`)
    .expect(204);
  await request(app.getHttpServer())
    .get(`/books/${created.body.id}`)
    .expect(404);
  const repeated = await request(app.getHttpServer())
    .delete(`/books/${created.body.id}`)
    .expect(404);
  assert.equal(repeated.body.error.code, "bookNotFound");
});

test("calculates and persists the suggested price in VES", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  const calculated = await request(app.getHttpServer())
    .post(`/books/${created.body.id}/calculate-price`)
    .expect(200);
  assert.equal(calculated.body.cost_local, 13.59);
  assert.equal(calculated.body.selling_price_local, 19.03);
  assert.equal(calculated.body.exchange_rate, 0.85);
  assert.equal(calculated.body.currency, "VES");
  assert.equal(calculated.body.margin_percentage, 40);
  assert.equal(
    (await request(app.getHttpServer()).get(`/books/${created.body.id}`)).body
      .selling_price_local,
    19.03,
  );
  assert.equal(providerCalls, 1);
});
test("uses the latest stored rate on provider failure without exposing provenance", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  const path = `/books/${created.body.id}/calculate-price`;
  await request(app.getHttpServer()).post(path).expect(200);
  providerBody = { base: "USD", rates: { VES: 2 } };
  await request(app.getHttpServer()).post(path).expect(200);
  providerStatus = 503;
  const fallback = await request(app.getHttpServer()).post(path).expect(200);
  assert.equal(fallback.body.exchange_rate, 2);
  assert.equal(fallback.body.selling_price_local, 44.77);
  assert.deepEqual(
    Object.keys(fallback.body).sort(),
    [
      "book_id",
      "calculation_timestamp",
      "cost_local",
      "cost_usd",
      "currency",
      "exchange_rate",
      "margin_percentage",
      "selling_price_local",
    ].sort(),
  );
});
test("missing usable live or stored rate returns a clear dictionary 503 and preserves the book", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  for (const invalid of [
    { base: "USD", rates: {} },
    { base: "EUR", rates: { VES: 1 } },
    { base: "USD", rates: { VES: 0 } },
  ]) {
    providerBody = invalid;
    const failed = await request(app.getHttpServer())
      .post(`/books/${created.body.id}/calculate-price`)
      .set("Accept-Language", "en")
      .expect(503);
    assert.equal(failed.body.error.code, "exchangeRateUnavailable");
    assert.equal(failed.body.message, "No exchange rate is available.");
  }
  const found = await request(app.getHttpServer())
    .get(`/books/${created.body.id}`)
    .expect(200);
  assert.equal(found.body.selling_price_local, null);
});
test("partial edits recalculate only a changed cost and save all fields together", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  const path = `/books/${created.body.id}`;
  await request(app.getHttpServer())
    .put(path)
    .send({ title: "Updated" })
    .expect(200);
  await request(app.getHttpServer())
    .put(path)
    .send({ cost_usd: 15.99 })
    .expect(200);
  assert.equal(providerCalls, 0);
  const edited = await request(app.getHttpServer())
    .put(path)
    .send({ cost_usd: 20, stock_quantity: 3 })
    .expect(200);
  assert.equal(edited.body.selling_price_local, 23.8);
  assert.equal(edited.body.title, "Updated");
  assert.equal(providerCalls, 1);
  const found = await request(app.getHttpServer()).get(path).expect(200);
  assert.equal(found.body.cost_usd, 20);
  assert.equal(found.body.stock_quantity, 3);
  await request(app.getHttpServer()).put(path).send({}).expect(400);
  await request(app.getHttpServer())
    .put(path)
    .send({ selling_price_local: 1 })
    .expect(400);
});

test("failed cost recalculation leaves all book fields unchanged", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  providerStatus = 503;
  const failed = await request(app.getHttpServer())
    .put(`/books/${created.body.id}`)
    .send({ title: "Must not persist", cost_usd: 20 })
    .expect(503);
  assert.equal(failed.body.message, "No hay una tasa de cambio disponible.");
  const found = await request(app.getHttpServer())
    .get(`/books/${created.body.id}`)
    .expect(200);
  assert.deepEqual(found.body, created.body);
});
test("seeding only inserts missing records and preserves edited books and existing rates", async () => {
  await seed(db, "2");
  const first = await request(app.getHttpServer()).get("/books").expect(200);
  assert.ok(first.body.total >= 2);
  await request(app.getHttpServer())
    .put(`/books/${first.body.data[0].id}`)
    .send({ title: "Preserved" })
    .expect(200);
  await seed(db, "99");
  const second = await request(app.getHttpServer()).get("/books").expect(200);
  assert.equal(second.body.total, first.body.total);
  assert.equal(second.body.data[0].title, "Preserved");
  providerStatus = 503;
  const price = await request(app.getHttpServer())
    .post(`/books/${first.body.data[0].id}/calculate-price`)
    .expect(200);
  assert.equal(price.body.exchange_rate, 0.85);
});
test("a changed-cost edit issues one book UPDATE", async () => {
  const created = await request(app.getHttpServer())
    .post("/books")
    .send(sample)
    .expect(201);
  // Use a persistent test-only audit table because the HTTP request uses another connection.
  await db.query("CREATE TABLE IF NOT EXISTS test_book_updates (id serial)");
  await db.query("TRUNCATE test_book_updates");
  await db.query(
    `CREATE OR REPLACE FUNCTION test_count_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO test_book_updates DEFAULT VALUES; RETURN NEW; END $$`,
  );
  await db.query(
    "CREATE TRIGGER test_count_update AFTER UPDATE ON books FOR EACH ROW EXECUTE FUNCTION test_count_update()",
  );
  try {
    await request(app.getHttpServer())
      .put(`/books/${created.body.id}`)
      .send({ cost_usd: 20, title: "Changed" })
      .expect(200);
    const [{ count }] = await db.query(
      "SELECT count(*) FROM test_book_updates",
    );
    assert.equal(count, "1");
  } finally {
    await db.query("DROP TRIGGER test_count_update ON books");
    await db.query("DROP FUNCTION test_count_update()");
    await db.query("DROP TABLE test_book_updates");
  }
});
test("category wildcard characters are treated literally and duplicate updates preserve the original", async () => {
  const a = await request(app.getHttpServer())
    .post("/books")
    .send({ ...sample, category: "100%_Books" })
    .expect(201);
  const b = await request(app.getHttpServer())
    .post("/books")
    .send({ ...sample, isbn: "9780140449136", category: "100XXBooks" })
    .expect(201);
  const found = await request(app.getHttpServer())
    .get("/books/search")
    .query({ category: "100%_books" })
    .expect(200);
  assert.equal(found.body.total, 1);
  await request(app.getHttpServer())
    .put(`/books/${b.body.id}`)
    .send({ isbn: a.body.isbn, cost_usd: 20 })
    .expect(400);
  assert.deepEqual(
    (await request(app.getHttpServer()).get(`/books/${b.body.id}`)).body,
    b.body,
  );
});
test("offline seed supplies the first rate, repeated seeds preserve it, and missing initialization fails", async () => {
  providerStatus = 503;
  await assert.rejects(seed(db, ""), /No initial exchange rate/);
  assert.equal(
    (await request(app.getHttpServer()).get("/books")).body.total,
    0,
  );
  await seed(db, "2");
  await seed(db, "99");
  const books = await request(app.getHttpServer()).get("/books").expect(200);
  const price = await request(app.getHttpServer())
    .post(`/books/${books.body.data[0].id}/calculate-price`)
    .expect(200);
  assert.equal(price.body.exchange_rate, 2);
  await request(app.getHttpServer())
    .delete(`/books/${books.body.data[1].id}`)
    .expect(204);
  await seed(db, "99");
  assert.equal(
    (await request(app.getHttpServer()).get("/books")).body.total,
    2,
  );
});

test("provider timeout falls back to an old stored rate", async () => {
  await seed(db);
  await db.query(
    "UPDATE exchange_rates SET created_at = '2000-01-01T00:00:00Z'",
  );
  providerDelay = 100;
  providerBody = { base: "USD", rates: { VES: 2 } };
  process.env.EXCHANGE_RATE_TIMEOUT_MS = "10";
  // Configuration is read when a module is constructed; use a separate app/pool.
  const timeoutDb = createDatabase(
    db.options.type === "postgres" ? db.options.url : undefined,
  );
  await timeoutDb.initialize();
  const timeoutApp = await createApp(timeoutDb);
  await timeoutApp.init();
  try {
    const books = await request(timeoutApp.getHttpServer()).get("/books");
    const calculated = await request(timeoutApp.getHttpServer())
      .post(`/books/${books.body.data[0].id}/calculate-price`)
      .expect(200);
    assert.equal(calculated.body.exchange_rate, 0.85);
  } finally {
    await timeoutApp.close();
  }
});
test("simultaneous edits preserve unrelated fields and leave a consistent price", async () => {
  const book = (await request(app.getHttpServer()).post("/books").send(sample))
    .body;
  await Promise.all([
    request(app.getHttpServer())
      .put(`/books/${book.id}`)
      .send({ title: "Concurrent title" })
      .expect(200),
    request(app.getHttpServer())
      .put(`/books/${book.id}`)
      .send({ cost_usd: 20 })
      .expect(200),
  ]);
  const saved = (await request(app.getHttpServer()).get(`/books/${book.id}`))
    .body;
  assert.equal(saved.title, "Concurrent title");
  assert.equal(saved.cost_usd, 20);
  assert.equal(saved.selling_price_local, 23.8);
});
test("oversized calculated amounts fail without changing the cost or price", async () => {
  const book = (
    await request(app.getHttpServer()).post("/books").send(sample).expect(201)
  ).body;
  providerBody = { base: "USD", rates: { VES: 12345678.123456789 } };
  const failed = await request(app.getHttpServer())
    .put(`/books/${book.id}`)
    .send({ cost_usd: 999999999999.99 })
    .expect(400);
  assert.equal(failed.body.error.code, "amountOutOfRange");
  assert.deepEqual(
    (await request(app.getHttpServer()).get(`/books/${book.id}`)).body,
    book,
  );
});
test("malformed JSON uses the localized error envelope", async () => {
  const failed = await request(app.getHttpServer())
    .post("/books")
    .set("Content-Type", "application/json")
    .set("Accept-Language", "en")
    .send("{broken")
    .expect(400);
  assert.equal(failed.body.error.code, "invalidInput");
  assert.equal(failed.body.message, "Invalid input.");
});
