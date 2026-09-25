# Ticket #6: Edit books and recalculate only changed costs

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/6 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Partially edit a book through PUT and save a changed cost with its newly calculated price in one update.

## Acceptance criteria

- [x] PUT /books/{id} preserves omitted fields; reject empty bodies, unknown fields, server-managed writes, invalid data, and canonical ISBN duplicates.
- [x] Compare supplied cost_usd with stored cost by decimal numerical equality; omitted or equal cost skips recalculation.
- [x] For an actual cost change, call shared calculation before persistence and save submitted changes plus selling_price_local in one book update.
- [x] If rate lookup or calculation fails, every stored book field remains unchanged and the agreed localized error is returned.
- [x] Tests cover partial edits, equivalent numeric costs, no unnecessary provider calls, duplicate ISBN, changed-cost persistence, and failure atomicity; narrowly verify the explicit one-update requirement.
- [x] Document intentional partial PUT semantics; no additional PATCH endpoint is introduced.

## Blocked by

- #5

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
