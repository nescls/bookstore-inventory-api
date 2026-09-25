# Ticket #9: Deploy the API and verify production evaluation

GitHub issue: https://github.com/nescls/bookstore-inventory-api/issues/9 · Status: open

## Parent

https://github.com/nescls/bookstore-inventory-api/issues/1

## What to build

Provide a public API with managed PostgreSQL and a Postman collection configured for production evaluation.

## Acceptance criteria

- [ ] At this final stage, choose the free API host and managed PostgreSQL service with the user; disclose material free-tier limitations and do not enable paid resources.
- [ ] Deploy the API, apply migrations, and insert missing demonstration data without overwriting existing records.
- [ ] Configure production error-detail suppression and structured host logging; decide retention/durable storage and record remaining logging TODOs without assuming Grafana.
- [ ] Set exported Postman variables or environment to the real public URL; run the collection against the deployed API and verify persistence and VES calculations.
- [ ] Publish the public URL, deployment instructions, and verified evaluation steps in the README.
- [ ] Keep the morning cron, authentication, permissions, and functional soft deletion deferred; final delivery requires a working deployment, not just a provider selection.

## Blocked by

- #8
