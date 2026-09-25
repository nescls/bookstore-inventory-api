# Spec: Bookstore inventory API with EUR pricing and localized errors

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/1 · Status: open

> **Update (PRs #10–#12):** the ISBN is now stored and returned **as submitted** (trimmed); uniqueness is enforced on an internal canonical ISBN-13, so equivalent ISBNs are still duplicates. Local currency is **EUR** (USD→EUR rate).

## Problem Statement

A bookstore needs a REST API to manage book inventory and calculate suggested selling prices in euros from acquisition costs in USD. It must remain usable when the exchange-rate provider fails, validate inputs consistently, and return understandable Spanish or English errors. Evaluators need reproducible local execution and a publicly deployed API backed by managed PostgreSQL.

## Solution

Build an API-only application using TypeScript, NestJS, TypeORM, PostgreSQL, and Zod. Provide inventory CRUD, paginated listing/category search/low-stock queries, explicit price calculation, and automatic price recalculation when a book's USD cost actually changes. Persist successful exchange rates separately and use the latest stored rate as fallback without exposing rate provenance. Provide insert-only sample seeding, Docker execution, documentation, and a production-ready Postman collection.

## User Stories

1. As an inventory operator, I want to create a book with its bibliographic and inventory data, so that I can track it.
2. As an inventory operator, I want invalid book data rejected, so that inventory remains consistent.
3. As an inventory operator, I want ISBN-10 and ISBN-13 input validated and normalized, so that equivalent identifiers cannot create duplicate books.
4. As an inventory operator, I want to retrieve a book by ID, so that I can inspect its current data.
5. As an inventory operator, I want paginated inventory results, so that I can browse a growing collection.
6. As an inventory operator, I want case-insensitive category search, so that capitalization does not prevent matches.
7. As an inventory operator, I want paginated low-stock results below a chosen threshold, so that I can identify replenishment needs.
8. As an API consumer, I want query parameters validated and whitelisted, so that mistakes produce predictable errors.
9. As an inventory operator, I want to update only supplied book fields, so that unrelated data is preserved.
10. As an inventory operator, I want a changed USD cost to refresh the suggested selling price, so that the saved price reflects the new cost.
11. As an inventory operator, I want an unchanged USD cost to avoid recalculation, so that unrelated edits do not unexpectedly reprice a book.
12. As an inventory operator, I want the new cost and price saved together, so that no intermediate inconsistent book is persisted.
13. As an inventory operator, I want to permanently delete a book, so that it can be removed from inventory.
14. As an inventory operator, I want to explicitly calculate and save a suggested selling price in EUR, so that I can price imported books.
15. As an API consumer, I want the detailed calculation returned, so that I can inspect the cost, numerical rate, markup, and final amount.
16. As an inventory operator, I want the latest stored exchange rate used when the provider fails, so that calculations can continue.
17. As an API consumer, I want a consistent calculation response without live-versus-fallback indicators, so that provider selection remains internal.
18. As an API consumer, I want a clear error when no usable exchange rate exists, so that I understand why the operation failed.
19. As an inventory operator, I want a failed recalculation to leave the book unchanged, so that cost and price remain consistent.
20. As a Spanish-speaking API consumer, I want dictionary-backed Spanish error messages, so that I can understand failures.
21. As an English-speaking API consumer, I want English errors selected by my request language, so that I can understand failures.
22. As a frontend developer, I want stable error codes and a consistent error envelope, so that I can handle failures independently of translated wording.
23. As an operator, I want internal diagnostic details available for audit and logging without appearing in production responses, so that failures can be investigated.
24. As a developer, I want repeatable sample seeding that inserts missing data only, so that I can prepare an environment without overwriting existing records.
25. As an evaluator, I want an initial seeded exchange rate, so that provider downtime does not prevent the first calculation after setup.
26. As a developer, I want behavior tested against PostgreSQL with controlled external rates, so that tests are reproducible.
27. As an evaluator, I want Docker instructions and endpoint examples, so that I can run the API locally.
28. As an evaluator, I want a Postman collection targeting the public API, so that I can evaluate it without local setup.
29. As the project owner, I want free hosting and managed PostgreSQL chosen at deployment time, so that the assessment fits the current budget.

## Implementation Decisions

### Scope and data ownership

- One inventory record per book edition/ISBN and one stock quantity; no branch inventory or frontend.
- Modules cover books, exchange-rate retrieval/storage, shared price calculation, input validation, localized errors, and seeding. Keep interfaces small and avoid speculative abstractions.
- Book fields match the assessment: id, title, author, isbn, cost_usd, nullable selling_price_local, stock_quantity, category, supplier_country, created_at, updated_at. Add isActive defaulting to true and nullable deletedBy as preparation for future soft deletion. These audit fields are server-managed; no client-controlled actor identity.
- Persist USD-to-EUR rates independently, with an identifier, currency pair, positive numerical rate, and creation timestamp sufficient to select the latest record deterministically. Keep source diagnostics internal.
- Use PostgreSQL migrations and database constraints, including canonical ISBN uniqueness, alongside Zod input validation.

### Inventory contracts

- Preserve assessment routes: POST /books; GET /books; GET /books/{id}; PUT /books/{id}; DELETE /books/{id}; GET /books/search; GET /books/low-stock; POST /books/{id}/calculate-price.
- PUT intentionally applies partial updates: omitted fields remain unchanged. This is a user-selected deviation from replacement semantics. An extra PATCH endpoint is not required.
- Validate positive USD cost, nonnegative integer stock, bibliographic strings, and valid ISBN checksums. Accept separators and legacy ISBN-10 (including its valid X check digit); convert to canonical ISBN-13 before storage and uniqueness checks. Checksum validation does not claim that an identifier has been officially assigned to a real publication.
- ID, timestamps, calculated price, and future deletion metadata are server-controlled. New books start with no calculated selling price.
- Permanent deletion is functional. The soft-delete operation remains deferred until authentication is introduced; no endpoint may claim a mock deletion succeeded.

### Listing and query validation

- All three collection routes are paginated: page defaults to 1; limit defaults to 20 and is capped at 100. Reject invalid or unknown query parameters.
- The basic list accepts page/limit. Category search additionally accepts category. Low-stock lookup additionally accepts threshold, default 10; stock_quantity must be strictly below it.
- Category search ignores case. Exact matching after trimming is the implementation default; substring matching was not requested.
- Use one shared query implementation. Controllers select their route-specific validated filters; they do not duplicate database query logic. A single listing endpoint could expose the same capabilities, but the assessment's three routes are retained.
- Spread only Zod-parsed whitelisted filters into suitable TypeORM options. Map pagination, case-insensitive matching, and comparison operators explicitly rather than spreading raw request objects into ORM options.
- Use stable ordering for pagination.

### Exchange-rate resolution and seeding

- For each required calculation, try the external USD exchange-rate provider first and select the EUR rate. Validate the provider response before treating it as usable; persist valid successful rates.
- If the provider times out, fails, or returns no valid USD-to-EUR rate, retrieve the most recently created stored USD-to-EUR rate. No age cutoff applies in v1.
- Validate absence in the stored-rate lookup itself. If there is no usable live or stored rate, raise exchangeRateUnavailable with HTTP 503 and the dictionary message: Spanish, “No hay una tasa de cambio disponible.”; English, “No exchange rate is available.”
- Return the numerical rate used in the assessment's calculation response. Omit rate-source labels, fallback flags, source-specific public headers, and equivalent provenance indicators. Detailed provenance may be logged internally.
- Seed sample books with valid ISBNs and an initial rate. Insert missing sample books only; never overwrite existing records. Insert the initial rate only when the pair has no stored rate. Repeated seed execution does not duplicate data or add a new seed rate that supersedes a live one.
- Obtain an initial rate from the provider, with an explicitly supplied seed rate for offline use. Clearly fail seed initialization if neither is available; do not fabricate a current EUR rate.

### Price calculation and edits

- Use decimal arithmetic: USD cost multiplied by the USD-to-EUR rate gives local cost; round local cost to two decimals, apply a 40% markup on that rounded value, and round the final suggested selling price to two decimals.
- This is markup on cost, not a 40% margin on revenue. The assessment's sample produces 13.59 local cost and 19.03 selling price from cost 15.99 and rate 0.85; retain this as an arithmetic example, not a EUR-rate claim.
- The shared calculation function computes and returns values without persisting the book. The explicit calculate-price endpoint saves selling_price_local and returns book_id, cost_usd, exchange_rate, cost_local, margin_percentage, selling_price_local, currency (EUR), and calculation_timestamp.
- During an edit, compare a supplied cost_usd with the stored cost by numerical decimal equality. If omitted or numerically equal, skip recalculation. If different, call the shared calculation function first, then persist all edited fields and the calculated selling price in one book update.
- If rate resolution or calculation fails, leave every book field unchanged. Do not persist the new cost and then perform a second book update for the price.
- Updating exchange-rate records alone does not recalculate all books. Saved prices are refreshed by explicit calculation or an actual cost change.

### Error dictionary and diagnostics

- Use one dictionary to map stable camelCase error codes to Spanish and English messages, including validation errors.
- The response has a top-level message and an error object containing code and request path. Optional error.details is for diagnostics, may be exposed outside production, and must be absent in production. It is not a second source of public translated messages.
- Select language through Accept-Language with regional variants and language preferences; default to Spanish when no supported language is requested. Keep field names and error codes language-independent.
- A production validation message identifies the first invalid field with safe dictionary wording. Capture additional diagnostics internally for audit/logging without exposing secrets or stack traces to clients.
- Expected classes include invalid input (400), missing book (404), unexpected internal failure (500), and unavailable rate/service (503). Duplicate ISBN uses a dictionary-backed client error.
- Include structured error logging capability; durable log storage, host integration, retention, and any Grafana deployment are decisions for the final deployment phase, not selected services.

### Routine defaults supplied during specification synthesis

These fill technical gaps without changing the agreed product behavior; they were not separately selected by the user in the interview:

- Keep the assessment's unprefixed routes; no additional /api/v1 prefix.
- Reject an empty edit body, unknown body properties, and writes to server-managed fields with 400.
- Return 201 for creation, 200 for reads/updates/calculation, and 204 for successful permanent deletion. Return 404 for operations on a missing book; duplicate ISBN is 400.
- Return paginated collections with data, page, limit, total, and totalPages; use ascending ID order. Apply positive-integer validation to page/limit and nonnegative-integer validation to threshold.
- Return money and rate fields as JSON numbers to match the assessment while using decimal-safe calculations/storage internally. Use half-up rounding for the agreed two-decimal rounding stages.
- Bound provider requests with a configurable timeout, initially five seconds. Do not introduce a retry policy or scheduler in v1.
- Require nonblank trimmed bibliographic fields and a valid two-letter supplier country code. Concrete maximum lengths and numeric storage precision should be documented with the implementation and tested at their boundaries; do not silently truncate or clamp input.

## Testing Decisions

The user already approved the primary test boundary: HTTP integration tests against a separate PostgreSQL test database with the exchange-rate provider controlled in tests, plus focused tests for pricing and language selection. There is no existing application or test suite to copy in this repository.

- Assert observable behavior and persisted state rather than private method names or implementation structure. Use real PostgreSQL constraints and migrations, not SQLite or mocked repositories for integration coverage.
- Cover creation, canonical ISBN duplicates (including ISBN-10/13 equivalence), invalid inputs, retrieval, partial updates, deletion, stable pagination, case-insensitive category matching, threshold boundaries, and query whitelisting.
- Cover live success/persistence, provider failure, malformed or missing EUR rate, latest stored-rate selection, old stored-rate acceptance, and missing-rate 503 with both languages. Provider tests must not depend on a public network service.
- Cover two-stage decimal rounding and the assessment arithmetic example; verify calculation responses and persisted prices agree.
- Verify changed cost recalculates before a single book persistence operation, while omitted/equivalent cost does not recalculate. Assert rollback/no book mutation on calculation failure. Use narrow database write instrumentation only where needed to verify the explicit single-update requirement.
- Verify Spanish default, regional language variants, language preferences, stable codes, dictionary-backed validation messages, request paths, and absence of details in production responses.
- Run the seed twice and verify existing books/rates are preserved and missing samples are inserted. Verify initial-rate failure is explicit.
- Verify Docker startup, migrations, and documented commands. Export and exercise Postman requests locally, then against the real public deployment before delivery.
- Run type checking and focused tests during implementation; run the full suite and review at completion. No application tests can be run during this specification-only step.

## Out of Scope

- Frontend, bookstore branches, multi-currency requests, and inventory allocation per branch.
- Authentication/token validation, roles, and permissions implementation.
- Functional soft deletion or fabricated deleting-user identities; only preparatory fields are included.
- Morning exchange-rate cron execution. Keep it as an explicit TODO and choose schedule/timezone and execution infrastructure before future activation.
- Automatic bulk repricing whenever an exchange rate changes.
- Additional PATCH routes, an exchange-rate administration API, or replacing the required listing routes with a new combined endpoint.
- Selecting a paid service or authorizing paid upgrades. No hosting provider is chosen in this spec.

## Further Notes

- This synthesizes the user-provided Nextep assessment and the completed requirements discussion. User choices take precedence over the assessment's framework preference: NestJS is the chosen framework.
- “Default rate” in the assessment is implemented as the latest stored USD-to-EUR rate, initially established through the seed workflow.
- Required delivery remains source repository, local execution documentation and endpoint examples, Docker configuration, public functioning deployment with managed PostgreSQL, and an exported Postman collection configured through variables/environment to target production.
- Hosting must be free for now. Select the API host, managed database, and logging integration at the end; research suggestions from the interview are not approved provider decisions. Public deployment remains required for final assessment completion.
- Use the approved workflow next: break this spec into reviewable vertical tickets with real blocking dependencies, then implement the approved tickets. Publishing this spec does not itself start implementation.
