import { Book } from "./model/book.entity";
export function publicBook(b: Book) {
  return {
    ...b,
    cost_usd: Number(b.cost_usd),
    selling_price_local:
      b.selling_price_local === null ? null : Number(b.selling_price_local),
  };
}
