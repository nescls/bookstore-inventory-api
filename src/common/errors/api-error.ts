import type { ErrorCode } from "./error-messages";
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    public details?: unknown,
    public field?: string,
  ) {
    super(code);
  }
}
