import { z } from "zod";
import { errorMessages } from "../common/errors/error-messages";
import {
  createBookSchema,
  updateBookSchema,
} from "../modules/books/dto/books.schemas";
import {
  bookPageResponseSchema,
  bookResponseSchema,
  errorResponseSchema,
  priceCalculationResponseSchema,
} from "../modules/books/dto/books.responses";
import { booksRoutes } from "../modules/books/books.routes";

type JsonSchema = Record<string, unknown>;

function toJsonSchema(
  schema: z.ZodType,
  io: "input" | "output",
  descriptions: Record<string, string> = {},
): JsonSchema {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema, {
    io,
    unrepresentable: "any",
  }) as JsonSchema;
  const properties = (jsonSchema.properties ?? {}) as Record<
    string,
    JsonSchema
  >;
  for (const [name, description] of Object.entries(descriptions))
    if (properties[name])
      properties[name] = { ...properties[name], description };
  return jsonSchema;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (name: string, example?: unknown) => ({
  "application/json": { schema: ref(name), ...(example ? { example } : {}) },
});
const errorResponse = (description: string, code: string) => ({
  description,
  content: {
    "application/json": {
      schema: ref("ErrorResponse"),
      example: {
        error: { code, path: "/books/1" },
        message: errorMessages[code as keyof typeof errorMessages].en,
      },
    },
  },
});
const badRequest = errorResponse(
  "Invalid input (see `error.code` and `error.details`).",
  "invalidField",
);
const notFound = errorResponse("Book not found.", "bookNotFound");
const serverError = errorResponse("Unexpected server error.", "internalError");

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1, maximum: 2147483647 },
};
const pageParameters = [
  {
    name: "page",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 2147483647, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
];

const path = (route: string) =>
  `/${booksRoutes.root}${route ? `/${route}` : ""}`.replace(":id", "{id}");

const bookExample = {
  title: "El Quijote",
  author: "Miguel de Cervantes",
  isbn: "978-84-376-0494-7",
  cost_usd: 15.99,
  stock_quantity: 25,
  category: "Literatura Clásica",
  supplier_country: "ES",
};

export function buildOpenApiDocument() {
  const bookFieldDescriptions = {
    isbn: "ISBN-10 or ISBN-13 with valid check digit; separators allowed. Stored and returned as submitted. Equivalent ISBNs count as duplicates.",
    cost_usd: "Positive, at most two decimals.",
    stock_quantity: "Integer, 0 or more.",
    supplier_country: "ISO 3166-1 alpha-2 code.",
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "Bookstore Inventory API",
      version: "0.1.0",
      description:
        "Book inventory with suggested selling prices in EUR (USD cost × live USD→EUR rate, plus a 40% markup on cost). " +
        "Error messages are localized: send `Accept-Language: es` (default) or `en`.",
    },
    tags: [{ name: "Books" }],
    paths: {
      [path(booksRoutes.list)]: {
        post: {
          tags: ["Books"],
          summary: "Create a book",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("BookInput"),
                example: bookExample,
              },
            },
          },
          responses: {
            201: { description: "Book created.", content: jsonContent("Book") },
            400: badRequest,
            500: serverError,
          },
        },
        get: {
          tags: ["Books"],
          summary: "List books (paginated)",
          parameters: pageParameters,
          responses: {
            200: {
              description: "A page of books.",
              content: jsonContent("BookPage"),
            },
            400: badRequest,
            500: serverError,
          },
        },
      },
      [path(booksRoutes.search)]: {
        get: {
          tags: ["Books"],
          summary: "Search books by category",
          description: "Case-insensitive exact match on the category.",
          parameters: [
            {
              name: "category",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 1, maxLength: 100 },
            },
            ...pageParameters,
          ],
          responses: {
            200: {
              description: "A page of books.",
              content: jsonContent("BookPage"),
            },
            400: badRequest,
            500: serverError,
          },
        },
      },
      [path(booksRoutes.lowStock)]: {
        get: {
          tags: ["Books"],
          summary: "List books with low stock",
          description: "Books whose stock is strictly below the threshold.",
          parameters: [
            {
              name: "threshold",
              in: "query",
              schema: { type: "integer", minimum: 0, default: 10 },
            },
            ...pageParameters,
          ],
          responses: {
            200: {
              description: "A page of books.",
              content: jsonContent("BookPage"),
            },
            400: badRequest,
            500: serverError,
          },
        },
      },
      [path(booksRoutes.byId)]: {
        get: {
          tags: ["Books"],
          summary: "Get a book by ID",
          parameters: [idParameter],
          responses: {
            200: { description: "The book.", content: jsonContent("Book") },
            400: badRequest,
            404: notFound,
            500: serverError,
          },
        },
        put: {
          tags: ["Books"],
          summary: "Update a book",
          description:
            "Send any editable fields (at least one). Changing `cost_usd` recalculates `selling_price_local`.",
          parameters: [idParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("BookUpdate"),
                example: { stock_quantity: 30 },
              },
            },
          },
          responses: {
            200: {
              description: "The updated book.",
              content: jsonContent("Book"),
            },
            400: badRequest,
            404: notFound,
            500: serverError,
            503: errorResponse(
              "No exchange rate available (only when `cost_usd` changes).",
              "exchangeRateUnavailable",
            ),
          },
        },
        delete: {
          tags: ["Books"],
          summary: "Delete a book",
          parameters: [idParameter],
          responses: {
            204: { description: "Book deleted." },
            400: badRequest,
            404: notFound,
            500: serverError,
          },
        },
      },
      [path(booksRoutes.calculatePrice)]: {
        post: {
          tags: ["Books"],
          summary: "Calculate and save the suggested selling price",
          description:
            "Converts `cost_usd` with the current USD→EUR rate (falling back to the latest stored rate if the provider fails), " +
            "adds a 40% markup on cost, saves `selling_price_local` and returns the calculation.",
          parameters: [idParameter],
          responses: {
            200: {
              description: "The calculation.",
              content: jsonContent("PriceCalculation", {
                book_id: 1,
                cost_usd: 15.99,
                exchange_rate: 0.85,
                cost_local: 13.59,
                margin_percentage: 40,
                selling_price_local: 19.03,
                currency: "EUR",
                calculation_timestamp: "2025-01-15T10:30:00.000Z",
              }),
            },
            400: errorResponse(
              "Invalid ID, or the calculated amount exceeds supported precision.",
              "amountOutOfRange",
            ),
            404: notFound,
            500: serverError,
            503: errorResponse(
              "Neither a live nor a stored exchange rate is available.",
              "exchangeRateUnavailable",
            ),
          },
        },
      },
    },
    components: {
      parameters: {},
      schemas: {
        Book: toJsonSchema(bookResponseSchema, "output"),
        BookInput: toJsonSchema(
          createBookSchema,
          "input",
          bookFieldDescriptions,
        ),
        BookUpdate: toJsonSchema(
          updateBookSchema,
          "input",
          bookFieldDescriptions,
        ),
        BookPage: toJsonSchema(bookPageResponseSchema, "output"),
        PriceCalculation: toJsonSchema(
          priceCalculationResponseSchema,
          "output",
        ),
        ErrorResponse: toJsonSchema(errorResponseSchema, "output"),
      },
    },
  };
}
