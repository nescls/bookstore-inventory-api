import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import { DataSource } from "typeorm";
@Global()
@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  static register(db: DataSource): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DataSource, useValue: db }],
      exports: [DataSource],
    };
  }
  async onApplicationShutdown() {
    if (this.db.isInitialized) await this.db.destroy();
  }
}
