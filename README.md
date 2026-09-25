# Bookstore Inventory API

Nextep technical assessment: a REST API for book inventory and exchange-rate-based selling prices.

Status: requirements interview complete; [specification #1](https://github.com/nescls/bookstore-inventory-api/issues/1) published. Ticket breakdown and application implementation have not started.

## Agreed direction

- TypeScript and NestJS.
- TypeORM, PostgreSQL, and Zod.
- Error dictionary supporting Spanish and English based on request language.
- Roles and permissions remain a TODO until authentication/token validation is scoped.
- Docker for reproducible execution.

## Workflow

Use Matt Pocock’s `grill-with-docs → to-spec → to-tickets → implement` workflow.
Project skills are vendored in `.agents/skills/`; supporting skills are included.
See `docs/skills-source.json` for the pinned upstream revision and license.
Specs and tickets will live in GitHub Issues for `nescls/bookstore-inventory-api`.
Agent configuration lives in `AGENTS.md` and `docs/agents/`.

## Requirements

See [specification #1](https://github.com/nescls/bookstore-inventory-api/issues/1) for the implementation contract, `docs/project-brief.md` for the interview record, and `CONTEXT.md` for domain terms.
This is a setup repository, not yet a runnable API. Installation, API examples,
Docker instructions, and the public deployment URL will be documented as implemented.
