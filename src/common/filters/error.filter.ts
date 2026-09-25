import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError } from "../errors/api-error";
import { errorMessages } from "../errors/error-messages";
import { logEvent } from "../utils/log-event";
import { resolveLanguage } from "../utils/resolve-language";
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const dbCode = (error as { driverError?: { code?: string } })?.driverError
      ?.code;
    // Framework exceptions can cross ESM/CJS boundaries; use their public status contract.
    const httpError = error as { getStatus?: () => number } | null;
    const reportedStatus =
      typeof httpError?.getStatus === "function" ? httpError.getStatus() : 500;
    const status =
      Number.isInteger(reportedStatus) &&
      reportedStatus >= 400 &&
      reportedStatus <= 599
        ? reportedStatus
        : 500;
    const apiError =
      error instanceof ApiError
        ? error
        : dbCode === "23505"
          ? new ApiError("duplicateIsbn", 400)
          : new ApiError(
              status === 404
                ? "routeNotFound"
                : status < 500
                  ? "invalidInput"
                  : "internalError",
              status < 500 ? status : 500,
            );
    const locale = resolveLanguage(request.headers["accept-language"]);
    const message = errorMessages[apiError.code][locale].replace(
      "{field}",
      apiError.field ?? "",
    );
    const details = apiError.details ?? { reason: apiError.code };
    logEvent({
      level: "error",
      code: apiError.code,
      status: apiError.status,
      path: request.path,
      details,
      ...(error instanceof Error && !(error instanceof ApiError)
        ? {
            exception: error.name,
            databaseCode: dbCode,
            frames: error.stack
              ?.split("\n")
              .filter((line) => /^\s+at /.test(line))
              .slice(0, 8),
          }
        : {}),
    });
    response.status(apiError.status).json({
      error: {
        code: apiError.code,
        path: request.path,
        ...(process.env.NODE_ENV === "production" ? {} : { details }),
      },
      message,
    });
  }
}
