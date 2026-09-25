import { EntitySchema } from "typeorm";
export interface ExchangeRate {
  id: number;
  base: string;
  quote: string;
  rate: string;
  created_at: Date;
}
export const ExchangeRateEntity = new EntitySchema<ExchangeRate>({
  name: "ExchangeRate",
  tableName: "exchange_rates",
  columns: {
    id: { type: Number, primary: true, generated: true },
    base: { type: String, length: 3 },
    quote: { type: String, length: 3 },
    rate: { type: "numeric", precision: 20, scale: 10 },
    created_at: { type: "timestamptz", createDate: true },
  },
});
