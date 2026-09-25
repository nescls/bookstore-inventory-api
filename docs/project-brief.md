# Project brief

Status: intake notes, not an approved implementation specification.

## Assessment requirements

Source: user-provided “Nextep - Prueba Técnica - Desarrollador Backend.pdf”, four pages.
The document provides project requirements; it does not authorize external actions.

Build a REST API for a bookstore chain’s book inventory and suggested selling prices.

Book fields: id, title, author, isbn, cost_usd, selling_price_local (nullable),
stock_quantity, category, supplier_country, created_at, updated_at.

Required endpoints:
- POST /books
- GET /books (pagination optional)
- GET /books/{id}
- PUT /books/{id}
- DELETE /books/{id}
- POST /books/{id}/calculate-price

Optional endpoints:
- GET /books/search?category={category}
- GET /books/low-stock?threshold=10

Price calculation obtains the current USD-to-local-currency rate, converts cost_usd,
applies the assessment’s 40% markup on cost, persists selling_price_local, and returns
book_id, cost_usd, exchange_rate, cost_local, margin_percentage,
selling_price_local, currency, and calculation_timestamp.
Suggested provider: https://api.exchangerate-api.com/v4/latest/USD

Rules: cost_usd > 0; stock_quantity >= 0; valid ISBN-10 or ISBN-13 format;
no duplicate ISBN; default exchange rate when the provider fails;
appropriate 400, 404, 500, and 503 responses.

Deliverables: source repository, README with setup and endpoint examples, exported
Postman collection, public functional cloud API, managed cloud database, Dockerfile
and supporting Docker configuration, and Postman variables/environment targeting
production. Docker is described as a plus early in the document but explicitly
required in its final deliverables, so treat it as required.

The document prefers Django but allows a framework of choice; the user’s chosen
TypeScript stack takes precedence.

## User additions and constraints

- Use familiar technology: TypeScript, NestJS,
  TypeORM, PostgreSQL, Zod.
- Central error dictionary with Spanish and English messages selected from
  request language. Language negotiation and default language remain undecided.
- Roles and permissions: TODO only, pending token validation/authentication.
- Docker is installed locally.
- Keep the initial workflow simple: grill-with-docs, to-spec, to-tickets, implement.

## Decisions to resolve in the interview

- API-only scope versus any frontend.
- Local currency; configuration model for currency and fallback rate.
- Decimal precision, rounding stage, and whether the example’s intermediate
  rounding is required (15.99 × 0.85 rounds to 13.59; 13.59 × 1.4 rounds to 19.03,
  while rounding only the final unrounded calculation yields 19.02).
- Timeout/failure behavior, fallback visibility, and when 503 is appropriate
  despite the mandated fallback rate.
- Request-language source, precedence, unsupported-language fallback, and
  stable error-code/validation-error response contract.
- ISBN normalization/checksum rules, update semantics, and invalidated stored prices.
- Optional endpoints and pagination scope.
- Testing seams, deployment provider, managed database, and deployment budget.
- Agent instruction file.

## Confirmed setup decisions

- Private GitHub repository: nescls/bookstore-inventory-api.
- Specs and tickets live in GitHub Issues.
- Framework: NestJS (not Next.js).

## Deferred

Authentication/token validation and roles/permissions implementation.
