import { createDatabase } from "../src/database/data-source";

async function main() {
  const dataSource = createDatabase();
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main().catch(() => {
  console.error("Migration failed. Check database configuration.");
  process.exitCode = 1;
});
