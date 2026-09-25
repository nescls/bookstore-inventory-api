export const errorMessages = {
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
  amountOutOfRange: {
    es: "El monto calculado excede la precisión admitida.",
    en: "The calculated amount exceeds supported precision.",
  },
  internalError: {
    es: "Ocurrió un error interno.",
    en: "An internal error occurred.",
  },
  routeNotFound: { es: "Ruta no encontrada.", en: "Route not found." },
} as const;

export type ErrorCode = keyof typeof errorMessages;
