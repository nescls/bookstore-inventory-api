import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
export const dictionary = {
  bookNotFound: { es: "Libro no encontrado.", en: "Book not found." },
  duplicateIsbn: {
    es: "Ya existe un libro con este ISBN.",
    en: "A book with this ISBN already exists.",
  },
  invalidInput: { es: "Datos de entrada no válidos.", en: "Invalid input." },
  invalidField: {
    es: "El campo {field} no es válido.",
    en: "The field {field} is invalid.",
  },
  invalidCost: {
    es: "El costo debe ser mayor que cero y tener como máximo dos decimales.",
    en: "Cost must be positive and have at most two decimal places.",
  },
  exchangeRateUnavailable: {
    es: "No hay una tasa de cambio disponible.",
    en: "No exchange rate is available.",
  },
  internalError: {
    es: "Ocurrió un error interno.",
    en: "An internal error occurred.",
  },
  routeNotFound: { es: "Ruta no encontrada.", en: "Route not found." },
} as const;
export type ErrorCode = keyof typeof dictionary;
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    public details?: unknown,
    public field?: string,
  ) {
    super(code);
  }
}
export function language(header?: string): "es" | "en" {
  const preferences = (header ?? "")
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const raw = params.find((p) => p.trim().startsWith("q="));
      const q = raw ? Number(raw.trim().slice(2)) : 1;
      return { tag: tag.split("-")[0], q, i };
    })
    .filter((x) => Number.isFinite(x.q) && x.q > 0 && x.q <= 1)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return (
    (preferences.find((x) => x.tag === "es" || x.tag === "en")?.tag as
      "es" | "en") || "es"
  );
}
export function logEvent(event: Record<string, unknown>) {
  console.error(
    JSON.stringify({ timestamp: new Date().toISOString(), ...event }),
  );
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();
    const dbCode = (error as { driverError?: { code?: string } })?.driverError
      ?.code;
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const e =
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
    const locale = language(req.headers["accept-language"]);
    const message = dictionary[e.code][locale].replace(
      "{field}",
      e.field ?? "",
    );
    const details = e.details ?? { reason: e.code };
    logEvent({
      level: "error",
      code: e.code,
      status: e.status,
      path: req.path,
      details,
    });
    res.status(e.status).json({
      error: {
        code: e.code,
        path: req.path,
        ...(process.env.NODE_ENV === "production" ? {} : { details }),
      },
      message,
    });
  }
}
