import { MigrationInterface, QueryRunner } from "typeorm";
export class InitialBooks1790294400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE books (
 id SERIAL PRIMARY KEY, title varchar(300) NOT NULL, author varchar(200) NOT NULL,
 isbn varchar(13) NOT NULL UNIQUE, cost_usd numeric(14,2) NOT NULL CHECK(cost_usd > 0),
 selling_price_local numeric(24,2) CHECK(selling_price_local >= 0),
 stock_quantity integer NOT NULL CHECK(stock_quantity >= 0), category varchar(100) NOT NULL,
 supplier_country varchar(2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), "isActive" boolean NOT NULL DEFAULT true, "deletedBy" varchar
 )`);
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE books");
  }
}
