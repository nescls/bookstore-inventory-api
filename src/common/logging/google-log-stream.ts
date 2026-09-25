import type { DestinationStream } from "pino";

const severityByLevel: Record<number, string> = {
  10: "DEBUG",
  20: "DEBUG",
  30: "INFO",
  40: "WARNING",
  50: "ERROR",
  60: "CRITICAL",
};

/**
 * Sends pino records to Google Cloud Logging. Credentials and project come from
 * the standard Google environment (GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT).
 * Rejects when credentials cannot be loaded.
 */
export async function createGoogleLogStream(
  logName: string,
): Promise<DestinationStream> {
  const { Logging } = await import("@google-cloud/logging");
  const logging = new Logging();
  // Fails fast when no credentials exist, so the caller can fall back to the local logger.
  await logging.auth.getClient();
  const log = logging.log(logName);
  return {
    write(line: string) {
      const { level, time, msg, ...payload } = JSON.parse(line);
      const entry = log.entry(
        {
          severity: severityByLevel[level] ?? "DEFAULT",
          timestamp: new Date(time),
        },
        { message: msg, ...payload },
      );
      log.write(entry).catch((error: Error) => {
        process.stderr.write(`Google Cloud Logging failed: ${error.message}\n`);
      });
    },
  };
}
