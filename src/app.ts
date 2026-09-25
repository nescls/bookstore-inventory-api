import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { BooksController } from "./books";
import { ErrorFilter } from "./errors";
export async function createApp(db: DataSource) {
  @Module({
    controllers: [BooksController],
    providers: [{ provide: DataSource, useValue: db }],
  })
  class AppModule {
    async onApplicationShutdown() {
      if (db.isInitialized) await db.destroy();
    }
  }
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  return app;
}
