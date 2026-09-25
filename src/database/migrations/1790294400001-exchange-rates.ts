import { MigrationInterface, QueryRunner } from "typeorm";

export class ExchangeRates1790294400001 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(
      `CREATE TABLE exchange_rates (id SERIAL PRIMARY KEY, base varchar(3) NOT NULL, quote varchar(3) NOT NULL, rate numeric(20,10) NOT NULL CHECK(rate > 0), created_at timestamptz NOT NULL DEFAULT now()); CREATE INDEX rate_lookup ON exchange_rates(base,quote,created_at DESC,id DESC)`,
    );
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE exchange_rates");
  }
}
