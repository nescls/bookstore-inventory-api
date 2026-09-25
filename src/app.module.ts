import { DynamicModule, Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { LoggingModule } from "./common/logging/logging.module";
import { DatabaseModule } from "./database/database.module";
import { BooksModule } from "./modules/books/books.module";
import { router } from "./router";
@Module({ imports: [LoggingModule, BooksModule, router] })
export class AppModule {
  static register(dataSource: DataSource): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.register(dataSource)],
    };
  }
}
