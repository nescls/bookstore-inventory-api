# Ticket #5: Calculate and save EUR prices with stored-rate fallback

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/5 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Explicitly calculate a book price using a live USD-to-EUR rate or the latest stored rate and save the result.

## Acceptance criteria

- [x] Migrations persist positive USD-to-EUR rates with deterministic creation ordering.
- [x] POST /books/{id}/calculate-price tries the provider with a configurable five-second default timeout, validates and saves successful rates, and falls back on failure/timeout/invalid response to the latest stored rate regardless of age.
- [x] The shared calculation function uses decimal arithmetic, rounds local cost half-up to two decimals, adds 40% markup, rounds the final price, and returns values without saving the book.
- [x] The endpoint persists the calculated price once and returns every assessment calculation field with currency EUR and numeric monetary/rate fields.
- [x] When neither a live nor stored rate exists, the lookup raises exchangeRateUnavailable with localized HTTP 503 and leaves the book unchanged.
- [x] Clients receive the numerical rate but no provenance indicators; internal diagnostics may record provider/fallback details.
- [x] Controlled-provider HTTP tests cover persistence, fallback selection, stale rates, invalid or missing EUR, timeouts, missing books, and no-rate failure; focused tests cover two-stage rounding including the assessment example.
- [x] Document the deferred morning refresh cron and the absence of automatic bulk repricing.

## Blocked by

- #2

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
