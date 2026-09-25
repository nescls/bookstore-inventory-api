# Bookstore Inventory API

Nextep assessment API built with TypeScript, NestJS, TypeORM, PostgreSQL, and Zod.
It manages one inventory per ISBN and calculates suggested selling prices in VES.
[Specification](https://github.com/nescls/bookstore-inventory-api/issues/1) · [Tickets](https://github.com/nescls/bookstore-inventory-api/issues)

## Run with Docker

Requires Docker with Compose. Ports 3000, 55432, and (for tests) 55433 must be free.
The credentials below are local development defaults only.

```sh
docker compose up --build -d --wait
# Seed fetches a real USD-to-VES rate. If offline, pass an explicit positive rate:
docker compose exec api node dist/scripts/seed.js
# docker compose exec -e SEED_EXCHANGE_RATE=<your-rate> api node dist/scripts/seed.js
curl http://localhost:3000/books
```

Startup applies migrations before serving requests. Sample data is inserted only by
an explicit seed command. Repeating the command inserts missing books and an initial
rate only when none exists; it never overwrites records. Seed failure rolls back all
its writes. The database persists in a named Docker volume.

```sh
docker compose logs api
docker compose down
```

## Run on the host

Requires Node.js 24.x, npm, and Docker for PostgreSQL. Copy `.env.example` to `.env`
and use Node's environment-file support; credentials must not be committed.

```sh
npm ci
docker compose up -d --wait db
node --env-file=.env --import tsx scripts/migrate.ts
node --env-file=.env --import tsx scripts/seed.ts
node --env-file=.env --import tsx src/main.ts
```

Alternatively export the variables and use `npm run db:migrate`, `npm run db:seed`,
and `npm run dev`. Build with `npm run build`; run the compiled API with `npm start`.

| Variable                 | Purpose                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| DATABASE_URL             | Required PostgreSQL connection URL; use provider-required TLS in deployment                 |
| PORT                     | HTTP port, default 3000                                                                     |
| NODE_ENV                 | `production` suppresses response diagnostic details                                         |
| EXCHANGE_RATE_URL        | Default `https://api.exchangerate-api.com/v4/latest/USD`; trusted operator configuration    |
| EXCHANGE_RATE_TIMEOUT_MS | Integer 1–30000, default 5000                                                               |
| SEED_EXCHANGE_RATE       | Optional positive rate for offline seed initialization only                                 |
| SEED_ON_START            | Set to `true` to run the insert-only seed after migrations on container start (default off) |
| TEST_DATABASE_URL        | Separate disposable database; name must end in `_test`                                      |

## API

No authentication is implemented in this assessment v1. Route paths match the PDF,
without an `/api/v1` prefix. Request JSON uses the assessment's snake_case fields.

| Method | Route                               | Behavior                                          |
| ------ | ----------------------------------- | ------------------------------------------------- |
| POST   | `/books`                            | Create; 201                                       |
| GET    | `/books`                            | Paginated list                                    |
| GET    | `/books/search?category=Literatura` | Case-insensitive exact category match             |
| GET    | `/books/low-stock?threshold=10`     | Stock strictly below threshold                    |
| GET    | `/books/{id}`                       | Retrieve; 404 if missing                          |
| PUT    | `/books/{id}`                       | **Partial update**, preserving omitted fields     |
| DELETE | `/books/{id}`                       | Permanent deletion; 204, then 404 if repeated     |
| POST   | `/books/{id}/calculate-price`       | Calculate, persist, and return price details; 200 |

All three collection endpoints accept `page` (default 1) and `limit` (default 20,
maximum 100), ordered by ascending ID. Responses contain `data`, `page`, `limit`,
`total`, and `totalPages`. Unknown query parameters are rejected. Controllers select
route-specific filters while sharing query logic. One combined endpoint could provide
these capabilities; separate routes retain the assessment contract.

```sh
curl -X POST http://localhost:3000/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"A Brief History of Time","author":"Stephen Hawking","isbn":"9780553380163","cost_usd":15.99,"stock_quantity":25,"category":"Ciencia","supplier_country":"GB"}'
curl 'http://localhost:3000/books/search?category=ciencia&page=1&limit=10'
curl 'http://localhost:3000/books/low-stock?threshold=10'
curl -X POST http://localhost:3000/books/1/calculate-price
curl -X PUT http://localhost:3000/books/1 -H 'Content-Type: application/json' -d '{"cost_usd":20}'
curl -X DELETE http://localhost:3000/books/1
```

ISBN-10/13 check digits are validated, separators are removed, and ISBN-10 converts
to canonical ISBN-13 before uniqueness checks. Validation does not verify publication
registry assignment. Titles are 1–300 characters, authors 1–200, categories 1–100,
and supplier country is an ISO alpha-2 code. Strings are trimmed. Stock is an integer
0–2147483647. Cost is positive, at most 999999999999.99, with at most two decimals.
PostgreSQL stores cost as numeric(14,2), calculated price as numeric(24,2), and rates
as numeric(20,10). Accepted rates are positive, at most 100000000, with at most ten
decimal places. JSON amounts are numbers; arithmetic uses decimal.js at 50-digit
precision. Calculated amounts must preserve their decimal value when serialized and
fit within the safe integer range in cents; otherwise return 400 `amountOutOfRange`
and leave the book unchanged. Values are never silently rounded to fit JSON limits.

New books have a null calculated price. The API controls IDs, timestamps,
`selling_price_local`, `isActive` (true), and `deletedBy` (null). Empty edits, unknown
body fields, invalid data, and attempts to write server-controlled fields return 400.
An equivalent ISBN also returns 400. Omitted editable fields remain unchanged.

## Pricing

Calculate local cost as USD cost × USD-to-VES rate, round half-up to two decimals,
add a 40% **markup on cost**, then round half-up again. The PDF's arithmetic example
15.99 × 0.85 yields local cost 13.59 and price 19.03. The rate 0.85 is an example,
not a claim about VES.

Each calculation tries the provider and records successful rates. Provider failure,
timeout, or invalid data selects the latest created stored USD-to-VES rate, with no
age cutoff. The public response includes the numerical rate but no source indicator.
When neither live nor stored data is usable, return 503 `exchangeRateUnavailable`.

An actual change in USD cost triggers the same calculation before one book update.
An omitted or numerically equal cost skips calculation. A failed calculation leaves
all book fields unchanged. Row locking serializes competing edits/calculations on a
book. Updating an exchange-rate record does not reprice other books.

## Errors and logging

Use `Accept-Language: es`, `es-VE`, `en`, or `en-US`; language preferences are honored,
with Spanish fallback. Every public message comes from the error dictionary.

```json
{
  "error": {
    "code": "exchangeRateUnavailable",
    "path": "/books/1/calculate-price"
  },
  "message": "No hay una tasa de cambio disponible."
}
```

`error.details` is omitted in production. Outside production it contains sanitized
validation/diagnostic data. JSON logs on stderr include timestamp, code, status, path,
and safe details; raw request bodies and credentials are not logged. Durable storage,
retention, Grafana, or host-specific logging will be chosen at deployment time.

## Tests

```sh
npm ci
docker compose --profile test up -d --wait test-db
npm run typecheck
npm test
npm run build
```

Tests use a separate PostgreSQL database on 55433 and clear its test records.
Never point TEST_DATABASE_URL at real data. HTTP tests control a local rate-provider
server, and focused tests cover pricing and language. No live exchange API is required.

Import `postman/bookstore.postman_collection.json` into Postman and select the local
or production environment (`baseUrl` is a variable). Run the collection in order: it
creates and deletes its own example. The production environment targets the public
deployment below.

## Deployment

The API is deployed on Google Cloud: **https://bookstore-inventory-api-154220862638.us-east1.run.app**

| Piece    | Service                                                        |
| -------- | -------------------------------------------------------------- |
| API      | Cloud Run (`us-east1`), built from the `Dockerfile`            |
| Database | Cloud SQL for PostgreSQL 16 (`db-f1-micro`), managed, not free |
| Secret   | `DATABASE_URL` held in Secret Manager and injected at runtime  |

The container applies migrations on start. With `SEED_ON_START=true` it also runs the
insert-only seed, so the sample books and initial USD-to-VES rate exist without a manual
command. The seed never overwrites records. Cloud SQL is reached through the Cloud Run
Cloud SQL connection (Unix socket), so `DATABASE_URL` uses
`postgresql://USER:PASSWORD@/DB?host=/cloudsql/PROJECT:REGION:INSTANCE`.

Deploy or redeploy from the repository root (requires an authenticated `gcloud`):

```sh
gcloud run deploy bookstore-inventory-api --source . --region us-east1 \
  --allow-unauthenticated --max-instances 1 \
  --add-cloudsql-instances PROJECT:us-east1:INSTANCE \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production,SEED_ON_START=true,EXCHANGE_RATE_TIMEOUT_MS=5000
```

`--max-instances 1` avoids concurrent startup migrations. Cloud Run scales to zero, so
the first request after idle time can take a few seconds.

## Delivery status and deferred work

The earlier free-hosting constraint was relaxed by the owner: Cloud SQL has no free tier.
Logging and retention remain undecided; Cloud Run's built-in Cloud Logging is available.

TODOs: token validation, roles/permissions, functional soft deletion with real actor
attribution, and a morning exchange-rate cron with an agreed time/timezone and scheduler.
There is no frontend, branch inventory, bulk repricing, or exchange-rate admin API.

## Architecture

```text
src/
  app.module.ts                  Root Nest module
  app.ts                         Application factory / global error filter
  main.ts                        Bootstrap
  router.ts                      Central feature-module router
  books/
    books.module.ts              Books module wiring
    books.controller.ts          HTTP input, validation, service calls
    books.service.ts             Queries, transactions, edits and persistence
    books.routes.ts              Route paths (mounted under /books)
    model/
      books.schemas.ts           Zod inputs and ISBN normalization
      book.entity.ts             Book persistence model
    book.presenter.ts            Public response mapping
  exchange-rates/
    exchange-rates.module.ts     Rate module wiring
    exchange-rates.service.ts    Provider retrieval and stored fallback
    exchange-rate.entity.ts      Exchange-rate persistence model
    exchange-rate.validation.ts  Numerical rate validation
  pricing/
    pricing.module.ts            Pricing module wiring
    pricing.service.ts           Rate resolution and calculation orchestration
    price-calculation.ts         Decimal price arithmetic
  database/
    database.module.ts           Shared connection and shutdown lifecycle
    data-source.ts               TypeORM configuration
    migrations/                  Versioned schema migrations
  common/
    errors.ts                    Dictionary, language selection, filter and logs
    validation.ts                Shared Zod parsing and error mapping
scripts/
  seed.ts                        Insert-only sample-data command
  migrate.ts                     Migration command
```

The central router mounts `BooksModule`; controller decorators use the feature's
route definitions. Controllers handle HTTP concerns; services own persistence and
business behavior. `BooksService` injects `PricingService`, which uses the exported
`ExchangeRatesService`. The edit transaction's manager is passed through pricing
and rate storage so the one-update and rollback guarantees stay intact.
The build emits `dist/src/` and `dist/scripts/`; Docker and npm commands use these
paths. Existing migration names and database tables are unchanged.

## Agent workflow

Use project-local Matt Pocock skills through `AGENTS.md`:
`grill-with-docs → to-spec → to-tickets → implement`. Skills are pinned in
`docs/skills-source.json`; domain terms live in `CONTEXT.md`.
