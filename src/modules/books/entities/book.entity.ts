import { EntitySchema } from "typeorm";

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  isbn_canonical: string;
  cost_usd: string;
  selling_price_local: string | null;
  stock_quantity: number;
  category: string;
  supplier_country: string;
  created_at: Date;
  updated_at: Date;
  isActive: boolean;
  deletedBy: string | null;
}

export const BookEntity = new EntitySchema<Book>({
  name: "Book",
  tableName: "books",
  columns: {
    id: { type: Number, primary: true, generated: true },
    title: { type: String, length: 300 },
    author: { type: String, length: 200 },
    isbn: { type: String, length: 32 },
    isbn_canonical: { type: String, length: 13, unique: true },
    cost_usd: { type: "numeric", precision: 14, scale: 2 },
    selling_price_local: {
      type: "numeric",
      precision: 24,
      scale: 2,
      nullable: true,
    },
    stock_quantity: { type: "integer" },
    category: { type: String, length: 100 },
    supplier_country: { type: String, length: 2 },
    created_at: { type: "timestamptz", createDate: true },
    updated_at: { type: "timestamptz", updateDate: true },
    isActive: { type: Boolean, default: true },
    deletedBy: { type: String, nullable: true },
  },
});
