import { EntitySchema, MigrationInterface, QueryRunner } from "typeorm";
export interface ExchangeRate {
  id: number;
  base: string;
  quote: string;
  rate: string;
  created_at: Date;
}
export const ExchangeRateEntity = new EntitySchema<ExchangeRate>({
  name: "ExchangeRate",
  tableName: "exchange_rates",
  columns: {
    id: { type: Number, primary: true, generated: true },
    base: { type: String, length: 3 },
    quote: { type: String, length: 3 },
    rate: { type: "numeric", precision: 20, scale: 10 },
    created_at: { type: "timestamptz", createDate: true },
  },
});
export class ExchangeRates1790294400001 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE exchange_rates (id SERIAL PRIMARY KEY, base varchar(3) NOT NULL, quote varchar(3) NOT NULL, rate numeric(20,10) NOT NULL CHECK(rate > 0), created_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX rate_lookup ON exchange_rates(base,quote,created_at DESC,id DESC)`,
    );
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE exchange_rates");
  }
}
