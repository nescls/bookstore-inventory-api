# Bookstore Inventory API

NestJS + TypeORM + PostgreSQL REST API for book inventory and suggested selling prices
in EUR (USD cost × USD→EUR rate + 40% markup on cost). TypeScript 7, Zod for validation.
Domain terms: `CONTEXT.md`. Spec and tickets: `docs/README.md`. Setup and API details: `README.md`.

## Commands

```sh
npm run dev           # watch mode (needs DATABASE_URL)
npm run typecheck && npm run lint && npm test && npm run build
npm run db:migrate    # also runs automatically when the Docker image starts
npm run db:seed       # insert-only sample books + initial USD→EUR rate
docker compose --profile test up -d --wait test-db   # tests need this (port 55433, bookstore_test)
docker compose -p bookstore-inventory-api up -d --build api   # rebuild the app container
```

- Run Compose with `-p bookstore-inventory-api` from a worktree; otherwise Compose derives a new
  project name from the folder and collides on ports 55432/3000.
- Tests are HTTP integration tests against real PostgreSQL with a controlled exchange-rate provider
  (`test/api.test.ts`), plus pure tests (`test/pricing.test.ts`) and a child-process logging test.

## Structure

`src/modules/<feature>/{dto,entities,utils}` with controller, service and module beside them.
Pure functions go in `utils/` (price calculation, ISBN, serialization, rate validation).
Shared code is in `src/common/{errors,filters,logging,utils}`; migrations in `src/database/migrations`;
OpenAPI builder and Swagger UI setup in `src/docs`.

## Conventions

- Controllers and services use plain CRUD names: `create`, `find`, `findAll`, `paginate`, `update`,
  `delete` (plus `calculatePrice`, `search`, `lowStock` where the route says so). Variables are
  descriptive (`book`, `bookRepository`, `dataSource`), not abbreviated. Do not add extra layers.
- Public contract stays fixed: routes and field names come from the assessment PDF
  (`cost_usd`, `selling_price_local`, `stock_quantity`, `supplier_country`, `created_at`, ...).
  `calculate-price` returns `book_id, cost_usd, exchange_rate, cost_local, margin_percentage,
selling_price_local, currency, calculation_timestamp`.
- The ISBN is stored and returned exactly as submitted; uniqueness is enforced on the internal
  `isbn_canonical` column (never returned). Money is handled with decimal.js, not floats.
- Validation uses Zod (`dto/books.schemas.ts`). Response schemas (`dto/books.responses.ts`) feed the
  OpenAPI document and a test that checks real responses, so update both when a response changes.
- Errors go through `ApiError` + `errorMessages` (Spanish default, English via `Accept-Language`).
- Schema changes need a new migration; never edit an applied one.
- Logging is pino (`nestjs-pino`): local `logs/app.log` + stdout, or Google Cloud Logging when
  `GOOGLE_CLOUD_LOG_NAME` is set. Use the injected `Logger`, not `console`, in `src/`.

## Gotchas

- `typescript-eslint` and `@nestjs/swagger` do not support TypeScript 7 (npm peer conflict), so
  linting is Biome (`npm run lint`, Prettier still formats) and the OpenAPI document is built from Zod.
- `nestjs-pino` keeps one root logger per process; test logging in a child process.
- Format with Prettier (`npx prettier --write src scripts test`).
