import { createApp } from "./app";
import { createDatabase } from "./database/data-source";
async function main() {
  const db = createDatabase();
  await db.initialize();
  const app = await createApp(db);
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}
main().catch(() => {
  console.error("Application startup failed. Check database configuration.");
  process.exitCode = 1;
});
