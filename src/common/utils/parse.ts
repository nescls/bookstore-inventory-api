import { z } from "zod";
import { ApiError } from "../errors/api-error";

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = typeof issue.path[0] === "string" ? issue.path[0] : undefined;
  throw new ApiError(
    field === "cost_usd"
      ? "invalidCost"
      : field
        ? "invalidField"
        : "invalidInput",
    400,
    result.error.issues.map((issue) => ({
      path: issue.path,
      code: issue.code,
    })),
    field,
  );
}
