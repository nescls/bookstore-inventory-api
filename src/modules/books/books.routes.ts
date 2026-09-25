export const booksRoutes = {
  root: "books",
  list: "",
  search: "search",
  lowStock: "low-stock",
  byId: ":id",
  calculatePrice: ":id/calculate-price",
} as const;
