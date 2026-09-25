import { Book } from "../entities/book.entity";
export function serializeBook({ isbn_canonical, ...book }: Book) {
  return {
    ...book,
    cost_usd: Number(book.cost_usd),
    selling_price_local:
      book.selling_price_local === null
        ? null
        : Number(book.selling_price_local),
  };
}
