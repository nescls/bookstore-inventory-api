# Bookstore Inventory API

[Español](README.md) · **English**

REST API for bookstore inventory management that calculates a suggested selling price from live
exchange rates. Built with TypeScript, NestJS, TypeORM, PostgreSQL and Zod for the Nextep technical assessment.

- **Deployed API:** https://bookstore-inventory-api-154220862638.us-east1.run.app
- **Interactive docs (Swagger):** https://bookstore-inventory-api-154220862638.us-east1.run.app/docs
- **Postman:** [`postman/`](postman/) (collection + local and production environments)
- [Specification](docs/spec/specification.md) · [Tickets](docs/README.md)

## What the assessment asked for, and what was added

### Required (done)

| Requirement from the assessment                                                                        | Status | Where                                               |
| ------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------- |
| `Book` model (`id`, `title`, `author`, `isbn`, `cost_usd`, `selling_price_local`, `stock_quantity`, …) | ✅     | `entities/book.entity.ts`                           |
| CRUD: `POST/GET /books`, `GET/PUT/DELETE /books/{id}`                                                  | ✅     | `books.controller.ts`                               |
| List with optional pagination                                                                          | ✅     | `page`, `limit`                                     |
| Optional: `GET /books/search?category=` and `GET /books/low-stock?threshold=10`                        | ✅     | `books.controller.ts`                               |
| `POST /books/{id}/calculate-price` using the exchange-rate API                                         | ✅     | `pricing.service.ts`                                |
| 40% margin, saves `selling_price_local`, returns the detailed calculation                              | ✅     | `utils/calculate-price.ts`                          |
| `cost_usd > 0`, `stock_quantity >= 0`, valid ISBN (10 or 13), no duplicate ISBN                        | ✅     | `dto/books.schemas.ts`, unique constraint in the DB |
| If the exchange API fails, use a default rate                                                          | ✅     | latest stored rate (`exchange_rates`)               |
| Proper errors (400, 404, 500, 503)                                                                     | ✅     | `common/filters/error.filter.ts`                    |
| README, Postman collection, Docker                                                                     | ✅     | this file, `postman/`, `Dockerfile`, `compose.yaml` |
| Cloud deployment with a managed database                                                               | ✅     | Cloud Run + Cloud SQL (PostgreSQL 16)               |
| Postman pointing at the public URL                                                                     | ✅     | `postman/production.postman_environment.json`       |

### Extras added

| Extra                          | Detail                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zod validation**             | Every input is validated with strict schemas that reject unknown fields, writes to server-controlled fields, and invalid queries.                            |
| **Swagger / OpenAPI 3.1**      | Public UI at `/docs` and document at `/docs-json`, generated from the same Zod schemas; a test checks that real responses match.                             |
| **pino logger**                | One JSON record per request, plus warnings/errors with the error code. Local destination (`logs/app.log` + stdout) or Google Cloud Logging via one variable. |
| **Spanish and English errors** | Messages localized through `Accept-Language` (Spanish by default) with stable error codes (`bookNotFound`, `duplicateIsbn`, …).                              |
| **Robust ISBN handling**       | Validates the check digit, accepts separators, and treats ISBN-10 and ISBN-13 as equivalent when detecting duplicates. Stored and returned as submitted.     |
| **Monetary precision**         | `decimal.js` with half-up rounding; amounts that cannot round-trip exactly through a JSON number are rejected (`amountOutOfRange`).                          |
| **Automatic repricing**        | Changing `cost_usd` in a `PUT` recalculates and saves the price in a single update.                                                                          |
| **Concurrency safety**         | Transactions and row locking for simultaneous edits and calculations.                                                                                        |
| **Stored exchange rates**      | Every valid rate is persisted and used as the fallback when the provider fails or times out (no age cutoff).                                                 |
| **Idempotent seed**            | `npm run db:seed` (or `SEED_ON_START=true`) inserts sample books and an initial rate without overwriting data.                                               |
| **Migrations**                 | Versioned schema through TypeORM migrations applied when the container starts.                                                                               |
| **Quality and CI**             | Biome + Prettier, 23 integration tests against real PostgreSQL, GitHub Actions (build, docker, lint) and `cloudbuild.yaml` to deploy to Cloud Run.           |
| **Modular architecture**       | NestJS feature modules with `dto/`, `entities/` and `utils/` (pure functions).                                                                               |

> Deliberate difference from the assessment example: the local currency is **EUR** (USD→EUR rate), matching the
> sample response, and the ISBN is kept exactly as submitted.

## Prerequisites

- Docker with Compose (recommended way to run)
- Node.js 24.x and npm (only to run outside Docker)
- Free ports: 3000 (API), 55432 (database) and 55433 (test database)

## Install and run

### With Docker

The credentials below are local development defaults only.

```sh
docker compose up --build -d --wait
docker compose exec api node dist/scripts/seed.js   # sample data + initial rate
curl http://localhost:3000/books
```

When offline, pass an explicit rate: `docker compose exec -e SEED_EXCHANGE_RATE=0.85 api node dist/scripts/seed.js`.
Migrations run on startup. The seed only inserts what is missing and never overwrites.

```sh
docker compose logs api
docker compose down
```

### On the host (without the API container)

Copy `.env.example` to `.env` (never commit credentials).

```sh
npm ci
docker compose up -d --wait db
node --env-file=.env --import tsx scripts/migrate.ts
node --env-file=.env --import tsx scripts/seed.ts
node --env-file=.env --import tsx src/main.ts
```

You can also export the variables and use `npm run db:migrate`, `npm run db:seed` and `npm run dev`.
Build with `npm run build` and run with `npm start`.

### Environment variables

| Variable                   | Purpose                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`             | Required PostgreSQL URL; use TLS if the provider requires it                  |
| `PORT`                     | HTTP port, default 3000                                                       |
| `NODE_ENV`                 | `production` hides diagnostic details in responses                            |
| `EXCHANGE_RATE_URL`        | Default `https://api.exchangerate-api.com/v4/latest/USD`                      |
| `EXCHANGE_RATE_TIMEOUT_MS` | Integer 1–30000, default 5000                                                 |
| `SEED_EXCHANGE_RATE`       | Optional positive rate, only to initialize the seed offline                   |
| `SEED_ON_START`            | `true` runs the seed after migrations when the container starts (default off) |
| `LOG_LEVEL`                | `trace`…`fatal` or `silent`; default `info`                                   |
| `LOG_DIR`                  | Local logger folder (default `logs`)                                          |
| `GOOGLE_CLOUD_LOG_NAME`    | When set, logs go to Google Cloud Logging instead of the local file           |
| `TEST_DATABASE_URL`        | Disposable database for tests; its name must end in `_test`                   |

## Using the API

No authentication in this version. Routes match the assessment (no `/api/v1` prefix) and JSON uses `snake_case`.

| Method | Route                               | Behavior                                      |
| ------ | ----------------------------------- | --------------------------------------------- |
| POST   | `/books`                            | Create a book; 201                            |
| GET    | `/books`                            | Paginated list                                |
| GET    | `/books/search?category=Literatura` | Case-insensitive exact category match         |
| GET    | `/books/low-stock?threshold=10`     | Stock strictly below the threshold            |
| GET    | `/books/{id}`                       | Get by ID; 404 if missing                     |
| PUT    | `/books/{id}`                       | **Partial update**; omitted fields are kept   |
| DELETE | `/books/{id}`                       | Permanent deletion; 204, then 404 if repeated |
| POST   | `/books/{id}/calculate-price`       | Calculate, save and return the details; 200   |

All three list endpoints accept `page` (default 1) and `limit` (default 20, maximum 100), ordered by ascending ID,
and return `data`, `page`, `limit`, `total` and `totalPages`. Unknown query parameters are rejected.

```sh
curl -X POST http://localhost:3000/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"El Quijote","author":"Miguel de Cervantes","isbn":"978-84-376-0494-7","cost_usd":15.99,"stock_quantity":25,"category":"Literatura Clásica","supplier_country":"ES"}'
curl 'http://localhost:3000/books/search?category=literatura%20clásica&page=1&limit=10'
curl 'http://localhost:3000/books/low-stock?threshold=10'
curl -X POST http://localhost:3000/books/1/calculate-price
curl -X PUT http://localhost:3000/books/1 -H 'Content-Type: application/json' -d '{"cost_usd":20}'
curl -X DELETE http://localhost:3000/books/1
```

`calculate-price` response:

```json
{
  "book_id": 1,
  "cost_usd": 15.99,
  "exchange_rate": 0.85,
  "cost_local": 13.59,
  "margin_percentage": 40,
  "selling_price_local": 19.03,
  "currency": "EUR",
  "calculation_timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Validation.** ISBN-10/13 with a valid check digit; stored and returned exactly as submitted (trimmed), with an
internal canonical ISBN-13 key guaranteeing uniqueness. Title 1–300 characters, author 1–200, category 1–100,
ISO alpha-2 country, integer stock 0–2147483647, positive cost (at most 999999999999.99, two decimals). Empty edits,
unknown fields, or server-controlled fields (`id`, dates, `selling_price_local`, `isActive`, `deletedBy`) return 400.
A new book has a null `selling_price_local`.

## Pricing

Local cost = `cost_usd` × USD→EUR rate, rounded half-up to two decimals; a 40% **markup on cost** is added and the
result is rounded again. The assessment example (15.99 × 0.85) yields 13.59 and 19.03.

Each calculation queries the provider and stores valid rates. If the provider fails, times out or returns invalid
data, the latest stored rate is used (no age cutoff); if none exists, the API returns 503 `exchangeRateUnavailable`.
An actual change of `cost_usd` in a `PUT` recalculates the price before a single update; if the calculation fails,
the book is left unchanged.

## Errors and logging

Use `Accept-Language: es`, `es-VE`, `en` or `en-US`; Spanish is the fallback. Example error:

```json
{
  "error": {
    "code": "exchangeRateUnavailable",
    "path": "/books/1/calculate-price"
  },
  "message": "No hay una tasa de cambio disponible."
}
```

`error.details` is omitted in production. Request bodies, headers and credentials are never logged.

**Logger (pino).** One JSON record per request (method, URL, status, duration), a `Request rejected` warning (4xx)
or `Request failed` error (5xx) with the error code, and a warning when the stored rate is used.

- **Local (default):** stdout and `logs/app.log` (`LOG_DIR` changes the folder).
- **Detached:** with `GOOGLE_CLOUD_LOG_NAME`, records go only to Google Cloud Logging using the standard Google
  credentials. If they cannot be loaded at startup, a warning is printed on stderr and the local logger is used.

## API documentation

Swagger UI is public at `/docs` and the OpenAPI 3.1 document at `/docs-json`. Request and response schemas are
generated from the same Zod schemas that validate requests (`dto/books.schemas.ts`, `dto/books.responses.ts`); a test
checks that real responses match. `@nestjs/swagger` is not used because it does not support TypeScript 7.

## Tests and Postman

```sh
npm ci
docker compose --profile test up -d --wait test-db
npm run typecheck
npm run lint        # Prettier format check (used by CI)
npm run lint:code   # Biome lint
npm test
npm run build
```

Tests use a separate database on port 55433 and a local server that simulates the rate provider, so no live
exchange API is required. Never point `TEST_DATABASE_URL` at real data.

Import `postman/bookstore.postman_collection.json` and choose the `Bookstore local` or `Bookstore production`
environment (`baseUrl` is a variable). Run the collection in order: it creates and deletes its own example.

## Deployment

API on Google Cloud: **https://bookstore-inventory-api-154220862638.us-east1.run.app**

| Piece    | Service                                               |
| -------- | ----------------------------------------------------- |
| API      | Cloud Run (`us-east1`), built from the `Dockerfile`   |
| Database | Cloud SQL for PostgreSQL 16 (`db-f1-micro`), managed  |
| Secret   | `DATABASE_URL` in Secret Manager, injected at runtime |

The container applies migrations on start; with `SEED_ON_START=true` it also runs the seed, so the sample books and
the initial USD→EUR rate exist without manual commands. Cloud SQL is reached through a Unix socket
(`postgresql://USER:PASSWORD@/DB?host=/cloudsql/PROJECT:REGION:INSTANCE`). Cloud Run scales to zero, so the first
request after idle time can take a few seconds.

```sh
gcloud run deploy bookstore-inventory-api --source . --region us-east1 \
  --allow-unauthenticated --max-instances 1 \
  --add-cloudsql-instances PROJECT:us-east1:INSTANCE \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production,SEED_ON_START=true,EXCHANGE_RATE_TIMEOUT_MS=5000
```

`cloudbuild.yaml` builds the image and deploys it to Cloud Run on pushes to `main` (through a Cloud Build trigger).
`--max-instances 1` avoids concurrent startup migrations.

## Pending and future work

Pending: token validation, roles and permissions, soft deletion with a real actor, and a morning exchange-rate cron
with an agreed time and timezone. There is no frontend, branch inventory, bulk repricing, or exchange-rate admin API.

## Architecture

```text
src/
  main.ts, app.ts, app.module.ts, router.ts
  modules/
    books/           controller, service, module, routes
      dto/           books.schemas.ts (requests), books.responses.ts (responses)
      entities/      book.entity.ts
      utils/         isbn.ts, serialize-book.ts
    exchange-rates/  service, module, entities/, utils/is-valid-rate.ts, utils/provider-rate.ts
    pricing/         service, module, utils/calculate-price.ts
  common/
    errors/          ApiError and localized messages
    filters/         error.filter.ts (global exception filter)
    logging/         pino: local file or Google Cloud Logging
    utils/           parse.ts, resolve-language.ts
  docs/              OpenAPI and Swagger UI
  database/          data-source, module, migrations/
scripts/             migrate.ts, seed.ts
```

Controllers handle HTTP; services own persistence and logic. `BooksService` uses `PricingService`, which uses
`ExchangeRatesService`; the update transaction is passed down to the rate storage so the single-update and rollback
guarantees hold. Pure functions live in `utils/`. Domain terms are in [`CONTEXT.md`](CONTEXT.md); the specification and
tickets are in [`docs/`](docs/README.md).
