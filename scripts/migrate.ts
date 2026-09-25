import { createDatabase } from "../src/database/data-source";
async function main() {
  const db = createDatabase();
  try {
    await db.initialize();
    await db.runMigrations();
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
main().catch(() => {
  console.error("Migration failed. Check database configuration.");
  process.exitCode = 1;
});
