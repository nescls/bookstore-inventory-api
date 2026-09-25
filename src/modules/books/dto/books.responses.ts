import { z } from "zod";
import { errorMessages } from "../../../common/errors/error-messages";

// Response shapes. They document the API (OpenAPI) and the tests check real
// responses against them, so the docs cannot drift from the behavior.
export const bookResponseSchema = z.strictObject({
  id: z.number().int(),
  title: z.string(),
  author: z.string(),
  isbn: z.string(),
  cost_usd: z.number(),
  selling_price_local: z.number().nullable(),
  stock_quantity: z.number().int(),
  category: z.string(),
  supplier_country: z.string(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  isActive: z.boolean(),
  deletedBy: z.string().nullable(),
});

export const bookPageResponseSchema = z.strictObject({
  data: z.array(bookResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const priceCalculationResponseSchema = z.strictObject({
  book_id: z.number().int(),
  cost_usd: z.number(),
  exchange_rate: z.number(),
  cost_local: z.number(),
  margin_percentage: z.literal(40),
  selling_price_local: z.number(),
  currency: z.literal("EUR"),
  calculation_timestamp: z.iso.datetime(),
});

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(Object.keys(errorMessages) as [keyof typeof errorMessages]),
    path: z.string(),
    details: z.unknown().optional(),
  }),
  message: z.string(),
});
