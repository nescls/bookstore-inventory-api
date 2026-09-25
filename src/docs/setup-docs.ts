import type { INestApplication } from "@nestjs/common";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./build-openapi-document";

/** Serves Swagger UI at /docs and the raw OpenAPI document at /docs-json. */
export function setupDocs(app: INestApplication) {
  const document = buildOpenApiDocument();
  app.use(
    "/docs-json",
    (_request: unknown, response: { json: (body: unknown) => void }) =>
      response.json(document),
  );
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(document as swaggerUi.JsonObject, {
      customSiteTitle: "Bookstore Inventory API",
    }),
  );
}
