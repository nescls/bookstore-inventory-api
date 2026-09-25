import { z } from "zod";
import Decimal from "decimal.js";
import validator from "validator";
import { canonicalIsbn } from "../utils/isbn";
import { parse } from "../../../common/utils/parse";
const requiredText = (max: number) => z.string().trim().min(1).max(max);
export const createBookSchema = z.strictObject({
  title: requiredText(300),
  author: requiredText(200),
  category: requiredText(100),
  isbn: z
    .string()
    .max(32)
    .transform((value, ctx) => {
      const isbn = canonicalIsbn(value);
      if (!isbn) {
        ctx.addIssue({ code: "custom", message: "invalidIsbn" });
        return z.NEVER;
      }
      return value.trim();
    }),
  cost_usd: z
    .number()
    .positive()
    .max(999999999999.99)
    .refine((cost) => new Decimal(cost).decimalPlaces() <= 2),
  stock_quantity: z.number().int().min(0).max(2147483647),
  supplier_country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((country) => validator.isISO31661Alpha2(country)),
});
export const parseBookId = (id: string) =>
  parse(z.coerce.number().int().positive().max(2147483647), id);
const queryInteger = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(2147483647));
const pagination = {
  page: queryInteger.pipe(z.number().positive()).default(1),
  limit: queryInteger.pipe(z.number().min(1).max(100)).default(20),
};
export const listSchema = z.strictObject(pagination);
export const searchSchema = z.strictObject({
  ...pagination,
  category: requiredText(100),
});
export const lowStockSchema = z.strictObject({
  ...pagination,
  threshold: queryInteger.default(10),
});
export const updateBookSchema = createBookSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateBookInput = z.output<typeof createBookSchema>;
export type UpdateBookInput = z.output<typeof updateBookSchema>;
