# Domain docs

This project has a single domain context.
Before exploring or changing domain behavior, read root `CONTEXT.md` and relevant
ADRs under `docs/adr/` when present. Missing files do not block work.

Use `domain-modeling` during `grill-with-docs` to record settled business terms
in `CONTEXT.md`; keep it a glossary, separate from implementation decisions.
Create ADRs lazily for decisions with meaningful reversal cost, real trade-offs,
and context future readers need. Surface conflicts with existing ADRs.

Use the glossary’s canonical terms in specs, tickets, tests, and code.
