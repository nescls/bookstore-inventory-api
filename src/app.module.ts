import { DynamicModule, Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DatabaseModule } from "./database/database.module";
import { BooksModule } from "./books/books.module";
import { router } from "./router";
@Module({ imports: [BooksModule, router] })
export class AppModule {
  static register(db: DataSource): DynamicModule {
    return { module: AppModule, imports: [DatabaseModule.register(db)] };
  }
}
