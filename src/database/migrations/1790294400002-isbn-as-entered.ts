import { MigrationInterface, QueryRunner } from "typeorm";

export class IsbnAsEntered1790294400002 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE books
 ADD COLUMN isbn_canonical varchar(13),
 ALTER COLUMN isbn TYPE varchar(32)`);
    await queryRunner.query("UPDATE books SET isbn_canonical = isbn");
    await queryRunner.query(`ALTER TABLE books
 ALTER COLUMN isbn_canonical SET NOT NULL,
 DROP CONSTRAINT books_isbn_key,
 ADD CONSTRAINT books_isbn_canonical_key UNIQUE (isbn_canonical)`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE books
 DROP CONSTRAINT books_isbn_canonical_key,
 ADD CONSTRAINT books_isbn_key UNIQUE (isbn)`);
    await queryRunner.query(
      "UPDATE books SET isbn = isbn_canonical; ALTER TABLE books DROP COLUMN isbn_canonical, ALTER COLUMN isbn TYPE varchar(13)",
    );
  }
}
