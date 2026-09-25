import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { destination, multistream } from "pino";
import type { DestinationStream } from "pino";
import { createGoogleLogStream } from "./google-log-stream";

/**
 * Detached logger: GOOGLE_CLOUD_LOG_NAME sends every record to Google Cloud Logging.
 * Local logger: without it (or if Google credentials cannot be loaded), records go to stdout and to <LOG_DIR>/app.log (default ./logs).
 */
export async function createLogStream(): Promise<DestinationStream> {
  const googleLogName = process.env.GOOGLE_CLOUD_LOG_NAME;
  if (googleLogName) {
    try {
      return await createGoogleLogStream(googleLogName);
    } catch (error) {
      process.stderr.write(
        `Google Cloud Logging unavailable (${(error as Error).message}); using the local logger.\n`,
      );
    }
  }
  if (process.env.LOG_LEVEL === "silent") return process.stdout;
  const logDirectory = resolve(process.env.LOG_DIR ?? "logs");
  mkdirSync(logDirectory, { recursive: true });
  return multistream([
    { level: "trace", stream: process.stdout },
    {
      level: "trace",
      stream: destination({ dest: join(logDirectory, "app.log"), sync: false }),
    },
  ]);
}
