import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "./app.module";
import { ErrorFilter } from "./common/filters/error.filter";
export async function createApp(dataSource: DataSource) {
  const app = await NestFactory.create(AppModule.register(dataSource), {
    logger: false,
  });
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();
  return app;
}
