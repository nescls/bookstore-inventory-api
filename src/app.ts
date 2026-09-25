import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/errors";
export async function createApp(db: DataSource) {
  const app = await NestFactory.create(AppModule.register(db), {
    logger: false,
  });
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  return app;
}
