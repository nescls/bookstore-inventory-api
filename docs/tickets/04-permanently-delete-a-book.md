# Ticket #4: Permanently delete a book

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/4 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Remove an inventory record permanently and observe its absence through the API.

## Acceptance criteria

- [x] DELETE /books/{id} removes the record and returns 204 without a response body.
- [x] Subsequent retrieval and deletion return dictionary-backed 404 errors; invalid IDs are rejected.
- [x] Integration tests verify persisted deletion and localized failures.
- [x] Soft deletion, authentication, roles, and permissions remain documented TODOs; no mock success endpoint or fabricated actor is introduced.

## Blocked by

- #2

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
