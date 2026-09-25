# Ticket #2: Create and retrieve validated books in Docker

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/2 · Status: closed

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Run the NestJS API and PostgreSQL locally, create a valid book, and retrieve it by ID with localized failures.

## Acceptance criteria

- [x] Docker execution starts the API and PostgreSQL; migrations establish the Book model and constraints.
- [x] POST /books returns 201 and GET /books/{id} returns 200; a missing book returns 404.
- [x] Validate and canonicalize ISBN-10/13, enforce canonical uniqueness in PostgreSQL, and reject invalid costs, stock, country codes, bibliographic fields, unknown fields, and server-managed writes.
- [x] New books have null selling_price_local, isActive true, and deletedBy null; field limits and decimal storage precision are documented.
- [x] Dictionary-backed Spanish/English errors follow the agreed envelope, language negotiation, safe production messages, and non-production diagnostics policy; structured internal error logging is available.
- [x] HTTP integration tests use separate real PostgreSQL and verify creation, retrieval, duplicate equivalents, invalid input, language selection, and production detail suppression; local execution and test commands are documented.

## Blocked by

None (can start immediately).

## Verification

Implemented in commits f898eda and 05f1d78. Type checking, compilation, 20 automated tests, Docker execution, and 12 local Postman requests / 20 assertions passed. Project dependency audit: zero vulnerabilities. Review and its independent-agent limitation: https://github.com/nescls/bookstore-inventory-api/blob/main/docs/reviews/implementation.md
