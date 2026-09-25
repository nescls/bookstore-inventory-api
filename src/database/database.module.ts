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
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}
  static register(dataSource: DataSource): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DataSource, useValue: dataSource }],
      exports: [DataSource],
    };
  }
  async onApplicationShutdown() {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }
}
