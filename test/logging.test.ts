import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgres://bookstore:bookstore@localhost:55433/bookstore_test";
const port = 3900 + (process.pid % 90);

// nestjs-pino keeps one root logger per process, so the real entrypoint runs in a child.
test("without a Google log name, the API logs to stdout and the logs folder", async () => {
  const environment = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PORT: String(port),
    LOG_LEVEL: "info",
    LOG_DIR: mkdtempSync(join(tmpdir(), "bookstore-logs-")),
    GOOGLE_CLOUD_LOG_NAME: "",
  };
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env: environment });
  const server = spawn("npx", ["tsx", "src/main.ts"], {
    env: environment,
    stdio: "ignore",
  });
  const logFile = join(environment.LOG_DIR, "app.log");
  const readRecords = () =>
    existsSync(logFile)
      ? readFileSync(logFile, "utf8")
          .split("\n")
          .filter((line) => line.trim().endsWith("}"))
          .map((line) => JSON.parse(line))
      : [];
  const waitFor = async (condition: () => boolean, message: string) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(message);
  };
  try {
    await waitFor(
      () => readRecords().some((record) => record.msg?.includes("started")),
      "API did not start",
    );
    const response = await fetch(`http://127.0.0.1:${port}/books/999999`);
    assert.equal(response.status, 404);
    await waitFor(
      () => readRecords().some((record) => record.res?.statusCode === 404),
      "request was not logged",
    );
    const records = readRecords();
    const rejected = records.find((record) => record.code === "bookNotFound");
    assert.equal(rejected.level, 40);
    assert.equal(rejected.msg, "Request rejected");
    assert.equal(rejected.status, 404);
    const completed = records.find((record) => record.res?.statusCode === 404);
    assert.equal(completed.req.url, "/books/999999");
    assert.equal(typeof completed.responseTime, "number");
  } finally {
    server.kill();
  }
});
