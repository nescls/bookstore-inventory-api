# Ticket #3: Browse, search, and inspect low-stock inventory

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/3 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Use all three paginated listing endpoints through one shared validated query implementation.

## Acceptance criteria

- [x] GET /books, /books/search, and /books/low-stock return data/page/limit/total/totalPages with stable ascending ID ordering.
- [x] All three accept page and limit, defaulting to 1 and 20 with limit at most 100; reject invalid and unknown parameters.
- [x] Category search additionally accepts category and performs case-insensitive exact matching after trimming.
- [x] Low-stock additionally accepts a nonnegative integer threshold defaulting to 10 and returns stock_quantity strictly below it.
- [x] Controllers supply route-specific filters to one shared query implementation; spread only Zod-parsed filters and explicitly map ORM pagination and operators.
- [x] Tests cover matching, threshold equality, page boundaries, empty results, invalid queries, and static-route handling; document the alternative of one combined listing endpoint.

## Blocked by

- #2

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
