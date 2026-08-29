# ADRs — Architecture Decision Records

One file per decision, numbered `NNNN-kebab-case-title.md`. These record *why* the workspace and its operating model are the way they are — the durable "why not the other way" that would otherwise be lost in chat.

Owner-governed. Anything cross-cutting — operating model, agent/workflow conventions, permissions, tooling policy — belongs here. Tactical work items go to `../backlog/`; this folder is for decisions.

**Numbering:** `0000` is the retroactive baseline capturing pre-existing principles. Forward decisions increment from `0001`. When a decision is reversed, mark the old ADR `Superseded by NNNN` rather than deleting it.

**Pending / unmade decisions** live in [CANDIDATES.md](CANDIDATES.md).

## Template

```markdown
# ADR NNNN: <title>

**Status:** Proposed | Accepted | Superseded by <ADR-NNNN>
**Date:** YYYY-MM-DD
**Owner:** <the Owner>

## Context
What situation forced this decision. What's non-obvious. What constraints matter.

## Decision
What we're doing. One or two sentences, no hedging.

## Alternatives considered
- **<alt>:** why not

## Consequences
What becomes easier. What becomes harder. What we'll need to watch.
```

## Index

| ADR | Decision | Date |
|---|---|---|
| [0000](0000-baseline-operating-principles.md) | Baseline — PM never codes, file board, kebab/ALL_CAPS naming | 2026-01-01 |
| [0001](0001-surfaces-and-stack.md) | Two surfaces (api + app), Node/Postgres + React, money as integer minor units | 2026-08-22 |
| [0002](0002-product-name-coffer.md) | The product is called Coffer | 2026-08-22 |
| [0003](0003-currency-vnd-single-exponent-zero.md) | Single-currency VND; exponent 0, so `1234` is ₫1.234 | 2026-08-22 |
| [0004](0004-multi-user-tenant-scoped-from-day-one.md) | Multi-user product; `user_id` on every table and every query, from the first migration | 2026-08-25 |
| [0005](0005-design-system-shadcn-theme-c.md) | Design system — shadcn/ui on theme C ("Ấm") | 2026-08-27 |
| [0006](0006-transfers-linked-pair-invariant-in-db.md) | Transfers are a linked pair; the invariant lives in the database | 2026-08-29 |
| [0007](0007-real-auth-open-signup-hosted-later.md) | Real bcrypt auth with open signup and server-side sessions; hosting stays a separate `ops` gate | 2026-08-29 |
