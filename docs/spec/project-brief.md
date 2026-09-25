# Project brief

Status: interview record. The published GitHub specification is authoritative for implementation; see [specification #1](https://github.com/nescls/bookstore-inventory-api/issues/1).

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
  request language. Use Accept-Language with Spanish/English regional variants and Spanish as the default.
- Roles and permissions: TODO only, pending token validation/authentication.
- Docker is installed locally.
- Keep the initial workflow simple: grill-with-docs, to-spec, to-tickets, implement.

## Confirmed product decisions

- API only; include category search, low-stock lookup, and pagination.
- One inventory record per ISBN with one stock quantity; no bookstore branches.
- Local currency is EUR.
- Use decimal arithmetic: round converted cost to two decimals, apply 40% markup
  on that rounded cost, and round selling price to two decimals.
- Persist exchange rates in their own model. Do not expose fallback provenance
  to API clients. Try the external provider for each calculation and persist successful rates.
  On provider failure use the most recently created stored USD-to-EUR rate.
  Return the numerical exchange_rate, but no indication of whether it was live or stored.
  Use the latest stored rate regardless of age. Add a seed function with example
  books and an initial USD-to-EUR exchange rate. Seed inserts missing records only: existing books and rates remain unchanged.
  Obtain the initial rate from the provider, with an explicitly supplied seed value
  for offline use; fail clearly when neither is available. If no usable live or stored
  rate exists at runtime, use the agreed exchangeRateUnavailable error.
- When live rate retrieval fails, validate availability while looking up the latest
  stored USD-to-EUR rate. If no rate exists, raise a dictionary-backed error that
  clearly states no exchange rate is available. Reject a dependent book edit before
  persistence, leaving all of its stored fields unchanged. Apply the same lookup
  validation to explicit price calculation. Confirmed contract: HTTP 503, code
  exchangeRateUnavailable, Spanish "No hay una tasa de cambio disponible.",
  English "No exchange rate is available."
- TODO: morning cron job establishing the day's exchange rate; scheduling is deferred.
- Accept-Language selects Spanish or English, including regional variants;
  unsupported/missing language defaults to Spanish. Codes and field names stay stable.
- Validate ISBN checksums, accept separator characters, store and return the ISBN as
  submitted (trimmed), and enforce uniqueness on an internal canonical ISBN-13 value.
  References: https://www.isbn-international.org/content/isbn-calculator and
  https://www.isbn-international.org/index.php/node/10
- Permanent deletion is enabled. Add isActive (default true) and nullable deletedBy
  as preparation for soft deletion. Defer the soft-delete operation until authentication
  exists; do not fabricate a user identity or expose a nonfunctional success endpoint.
- PUT updates only supplied editable fields, preserving omitted fields, as explicitly
  requested by the user. Document this partial-update contract. Compare a supplied
  cost_usd with the persisted cost using numeric decimal equality. Only an actual
  cost change triggers the shared price calculation before persistence; save the
  submitted changes and calculated selling_price_local in one book update.
  Omitted or numerically unchanged cost does not trigger recalculation. The shared
  calculation function returns values without writing the book, so the explicit
  calculate-price endpoint and edit flow can each persist once.
  No extra PATCH endpoint is required for v1.
- Query whitelist: page/limit for listing, category for search, threshold for low
  stock. Defaults: page 1, limit 20 (max 100), threshold 10. Reject unknown parameters.
  Low stock means stock_quantity strictly less than threshold. Category matching
  ignores case. All three listing endpoints support pagination. Share their query
  implementation with controller-specific filters; document that one unified listing
  endpoint could also provide the same functionality.
- Error envelope: {"error":{"code":"bookNotFound","path":"/books/42"},
  "message":"Libro no encontrado"}. Codes use camelCase as in the user's example.
  Public validation messages come from the dictionary. Details serve internal audit
  and logging, and are omitted from production responses; their non-production
  response availability follows the earlier envelope decision. The quote-related example
  illustrates the envelope, not a new quote feature or an agreed route prefix.
- Test behavior through HTTP integration tests with a separate PostgreSQL test
  database and controlled exchange-rate provider; focused pricing and language tests.
- Parse and whitelist query parameters using Zod before composing TypeORM find
  options. Spread validated filters only; map pagination/operators to ORM options.
- Hosting must be free for now. Select the provider at the end, per user direction;
  no host or tolerance for cold starts is approved yet.

## Specification handoff

The product interview is complete. Routine technical defaults are explicitly marked
in the specification, including timeout, empty edits, serialization, and status codes.
Exact storage limits remain implementation details to document and test. Free hosting
and logging service selection are deliberately deferred until deployment.

## Confirmed setup decisions

- Private GitHub repository: nescls/bookstore-inventory-api.
- Specs and tickets live in GitHub Issues.
- Framework: NestJS (not Next.js).

## Deferred

- Authentication/token validation and roles/permissions implementation.
- Morning exchange-rate refresh cron job (time and timezone to be decided before activation).
- Soft-delete operation with authenticated deleting-user attribution; fields are included in v1.
- Deployment checklist reminder: decide structured error logging, retention, and host
  log integration. Consider Grafana or the selected host's logging tools at that point;
  no logging product or paid service chosen yet.

## Pricing clarification from the assessment

Page 2 explicitly states that POST /books/{id}/calculate-price updates
selling_price_local in the database after applying the 40% markup. The field begins
as null in the example Book. It is the saved suggested selling price in local
currency, not the exchange rate. The PDF does not require automatically repricing
books when exchange-rate records change, nor specify what happens when cost_usd
is edited. The user chose to automatically recalculate only when the submitted cost actually
changes, then persist the book once with the new cost and calculated price.
Updating exchange-rate records alone does not bulk-recalculate saved book prices.
