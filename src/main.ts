import { createApp } from "./app";
import { createDatabase } from "./database/data-source";
async function main() {
  const dataSource = createDatabase();
  await dataSource.initialize();
  const app = await createApp(dataSource);
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
main().catch(() => {
  console.error("Application startup failed. Check database configuration.");
  process.exitCode = 1;
});
