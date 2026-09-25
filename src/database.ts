import "reflect-metadata";
import {
  ExchangeRateEntity,
  ExchangeRates1790294400001,
} from "./exchange-rate-model";
import {
  DataSource,
  EntitySchema,
  MigrationInterface,
  QueryRunner,
} from "typeorm";
export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  cost_usd: string;
  selling_price_local: string | null;
  stock_quantity: number;
  category: string;
  supplier_country: string;
  created_at: Date;
  updated_at: Date;
  isActive: boolean;
  deletedBy: string | null;
}
export const BookEntity = new EntitySchema<Book>({
  name: "Book",
  tableName: "books",
  columns: {
    id: { type: Number, primary: true, generated: true },
    title: { type: String, length: 300 },
    author: { type: String, length: 200 },
    isbn: { type: String, length: 13, unique: true },
    cost_usd: { type: "numeric", precision: 14, scale: 2 },
    selling_price_local: {
      type: "numeric",
      precision: 24,
      scale: 2,
      nullable: true,
    },
    stock_quantity: { type: "integer" },
    category: { type: String, length: 100 },
    supplier_country: { type: String, length: 2 },
    created_at: { type: "timestamptz", createDate: true },
    updated_at: { type: "timestamptz", updateDate: true },
    isActive: { type: Boolean, default: true },
    deletedBy: { type: String, nullable: true },
  },
});
class InitialBooks1790294400000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE books (
 id SERIAL PRIMARY KEY, title varchar(300) NOT NULL, author varchar(200) NOT NULL,
 isbn varchar(13) NOT NULL UNIQUE, cost_usd numeric(14,2) NOT NULL CHECK(cost_usd > 0),
 selling_price_local numeric(24,2) CHECK(selling_price_local >= 0),
 stock_quantity integer NOT NULL CHECK(stock_quantity >= 0), category varchar(100) NOT NULL,
 supplier_country varchar(2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), "isActive" boolean NOT NULL DEFAULT true, "deletedBy" varchar
 )`);
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE books");
  }
}
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
export function publicBook(b: Book) {
  return {
    ...b,
    cost_usd: Number(b.cost_usd),
    selling_price_local:
      b.selling_price_local === null ? null : Number(b.selling_price_local),
  };
}
