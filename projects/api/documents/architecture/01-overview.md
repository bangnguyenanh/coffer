# Architecture — overview

How the finance backend is built. The owning agent reads this before any structural call.

## Shape

`routes → controllers → services → repositories → Postgres`.

- **Routes** declare the HTTP surface and nothing else — no logic, no SQL.
- **Services** hold the finance logic: balances, categorization, period rollups. This layer is pure and unit-testable; it does not know Express exists.
- **Repositories** are the only place SQL lives. No query strings anywhere else in the tree.

The layering exists so money arithmetic can be tested without a server or a database in the loop.

## Data model (current scope)

Single user, so no `users` table and no tenancy column anywhere.

- **`accounts`** — a place money sits (checking, savings, a credit card). Has a name, a type, and an opening balance in minor units.
- **`categories`** — a flat list to start (`groceries`, `rent`, …). Hierarchy is not decided — see `management/decisions/CANDIDATES.md`.
- **`transactions`** — the ledger. Belongs to one account, optionally one category. Carries `amount_minor` (integer, signed), `occurred_on` (date), `description`, and `created_at`.

**A balance is derived, never stored.** An account's balance is its opening balance plus the sum of its transactions. If you ever find yourself writing a cached balance column, stop and flag it — a stored balance that disagrees with the ledger is the single most common way a finance app lies to its user.

## Money handling

Governed by the money contract in `management/CLAUDE.md`. In this surface specifically:

- Column type is `bigint` for minor units. **Never `float`, `double precision`, or `real`.** `numeric` is acceptable only where a rate (not an amount) is stored.
- All arithmetic happens on integers. Division (splitting, averaging, percentages) must state its rounding rule explicitly and account for the remainder — cents may not vanish.
- JSON responses carry `amount_minor` as a **number**, not a formatted string. Formatting is the client's job.

## Data

- Postgres. Migrations are versioned, forward-only, and checked in.
- Every migration is reversible in practice: destructive ones (dropping a column that holds ledger data) are `ops`-gated and never run without the Owner's go.

## Auth

None yet — the service binds to localhost and assumes a single trusted user. **Do not invent an auth layer without a ticket**; when it arrives it will be an Owner-gated contract decision, not an incidental addition.

## Config

Environment variables, documented in `.env.example`. Never commit secrets, and never commit a real database URL.

*Last updated: 2026-08-22 — keep this stamp current in the same edit that changes content.*
