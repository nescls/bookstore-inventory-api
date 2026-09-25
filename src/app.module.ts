import { DynamicModule, Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DatabaseModule } from "./database/database.module";
import { BooksModule } from "./modules/books/books.module";
import { router } from "./router";
@Module({ imports: [BooksModule, router] })
export class AppModule {
  static register(dataSource: DataSource): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.register(dataSource)],
    };
  }
}
