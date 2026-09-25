import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { DataSource } from "typeorm";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/filters/error.filter";
export async function createApp(dataSource: DataSource) {
  const app = await NestFactory.create(AppModule.register(dataSource), {
    bufferLogs: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalFilters(new ErrorFilter(logger));
  app.enableShutdownHooks();
  return app;
}
