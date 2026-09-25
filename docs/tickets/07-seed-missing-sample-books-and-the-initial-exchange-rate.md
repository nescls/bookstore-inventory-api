# Ticket #7: Seed missing sample books and the initial exchange rate

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/7 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Prepare a usable demonstration inventory and initial fallback rate without overwriting existing data.

## Acceptance criteria

- [x] An explicit seed command inserts missing sample books with valid canonical ISBNs only.
- [x] For USD-to-VES, insert an initial rate only if none exists; use provider data with an explicitly supplied offline seed rate as fallback.
- [x] Fail clearly if a required initial rate cannot be obtained; do not fabricate a current rate.
- [x] Repeated runs preserve existing records and do not add a seed rate that supersedes live data.
- [x] Tests run seeding repeatedly, preserve edited books and existing rates, insert missing examples, and verify explicit initialization failure.
- [x] Document seed execution for Docker and local environments, including offline input.

## Blocked by

- #5

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
