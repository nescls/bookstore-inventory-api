import type { IncomingMessage, ServerResponse } from "node:http";
import { LoggerModule } from "nestjs-pino";
import { createLogStream } from "./create-log-stream";

export const LoggingModule = LoggerModule.forRootAsync({
  useFactory: async () => ({
    pinoHttp: [
      {
        level: process.env.LOG_LEVEL ?? "info",
        serializers: {
          req: (request: IncomingMessage & { id?: unknown }) => ({
            id: request.id,
            method: request.method,
            url: request.url,
          }),
          res: (response: ServerResponse) => ({
            statusCode: response.statusCode,
          }),
        },
        customLogLevel: (
          _request: IncomingMessage,
          response: ServerResponse,
          error?: Error,
        ) =>
          error || response.statusCode >= 500
            ? "error"
            : response.statusCode >= 400
              ? "warn"
              : "info",
      },
      await createLogStream(),
    ],
  }),
});
