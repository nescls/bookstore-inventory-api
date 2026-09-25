import { z } from "zod";
import Decimal from "decimal.js";
import validator from "validator";
import { parse } from "../../common/validation";
export function canonicalIsbn(input: string) {
  const s = input.replace(/[\s-]/g, "").toUpperCase();
  if (!validator.isISBN(s)) return null;
  if (s.length === 13)
    return /^(978|979)/.test(s) && !s.startsWith("9790") ? s : null;
  const base = "978" + s.slice(0, 9);
  const sum = [...base].reduce((n, d, i) => n + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (sum % 10)) % 10);
}
const text = (max: number) => z.string().trim().min(1).max(max);
export const createBookSchema = z.strictObject({
  title: text(300),
  author: text(200),
  category: text(100),
  isbn: z
    .string()
    .max(32)
    .transform((s, ctx) => {
      const isbn = canonicalIsbn(s);
      if (!isbn) {
        ctx.addIssue({ code: "custom", message: "invalidIsbn" });
        return z.NEVER;
      }
      return isbn;
    }),
  cost_usd: z
    .number()
    .positive()
    .max(999999999999.99)
    .refine((n) => new Decimal(n).decimalPlaces() <= 2),
  stock_quantity: z.number().int().min(0).max(2147483647),
  supplier_country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => validator.isISO31661Alpha2(s)),
});
export const bookId = (id: string) =>
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
  category: text(100),
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
