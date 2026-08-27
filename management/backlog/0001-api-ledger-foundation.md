# Backlog 0001: API foundation — schema, migrations, and service skeleton

**Status:** Open  ·  **Priority:** High  ·  **Surfaces:** api  ·  **Opened:** 2026-08-22
**Epic:** Foundation — first usable expense tracker

## Context / problem

There is no backend yet. Before any feature can be ticketed, the ledger needs a schema that gets money right and a service skeleton that proves the stack runs. Getting the amount representation wrong here is expensive later — every row and every response inherits it.

**Amended 2026-08-25, before any work started.** [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md) made Coffer multi-user, and this ticket is where that becomes real or becomes expensive. The same sentence above applies to ownership: a `user_id` on an empty table costs nothing, while the same column backfilled onto live financial rows has no correct default — every existing row must be attributed to someone, and guessing wrong mixes one person's money into another's ledger indistinguishably. **Nothing is being unwound; this ticket had not started.**

**Auto-persisted:** No — Owner approved as part of workspace setup (2026-08-22). Fails the rubric on change type (addition), so it would otherwise need a go.

## Goal & non-goals

- **Goal:** a running Express + TypeScript service against Postgres, with versioned migrations creating `accounts`, `categories`, and `transactions`, and one health endpoint proving the whole path works.
- **Non-goal:** any CRUD endpoint for transactions — that's the next phase, and its response shape is a contract to pin first.
- **Non-goal:** auth of any kind — no password hashing, no sessions, no login endpoint. The service stays localhost-only for now ([ADR 0001](../decisions/0001-surfaces-and-stack.md)). **This is now a narrower non-goal than it reads:** [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md) made the product multi-user on 2026-08-25, so the *schema* is tenant-scoped from this ticket onward even though the *auth mechanics* are still out of scope. Build the ownership model; do not build the login.
- **Non-goal:** organizations, teams, roles, sharing, invitations, billing, or an admin surface. ADR 0004 is explicit that it does not license any of these — the owning unit is a person. Flag rather than add.
- **Non-goal:** seed/demo data.

## Plan (by phase)

1. **Phase 1 — `api`:** project skeleton — TypeScript, Express, the `routes → controllers → services → repositories` layering from `documents/architecture/01-overview.md`, `.env.example`, and a test runner wired up.
2. **Phase 2 — `api`:** migration `0001` creating — **every user-data table carries `user_id`, not nullable, per [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md):**
   - `users` — `id`, `email` (unique), `created_at`. **No password column yet** — auth mechanics are still a non-goal, and a half-built credential column invites something to write to it. The row exists so ownership has something to point at.
   - `accounts` — `id`, **`user_id`**, `name`, `type`, `opening_balance_minor` (`bigint`), `created_at`
   - `categories` — `id`, **`user_id`**, `name`, `created_at` (flat; hierarchy is undecided, see CANDIDATES). Categories are per-user, not a shared global list — a shared list is a sharing feature, which ADR 0004 excludes.
   - `transactions` — `id`, **`user_id`**, `account_id`, `category_id` (nullable), `amount_minor` (`bigint`, signed), `occurred_on` (`date`), `description`, `created_at`
   - **Foreign keys must not cross users.** `transactions.account_id` may only reference an account belonging to the same `user_id`. A plain FK does not express this — enforce it (composite FK on `(user_id, account_id)`, or a constraint trigger) and say in the outcome which you used and why.
   - **Index the scope, not just the key.** Every lookup will filter on `user_id` first; a `user_id`-leading index on `transactions` is part of this migration, not a later optimisation.
3. **Phase 3 — `api`:** `GET /health` returning service + database reachability. Verified with a real request against the running server.

## Contract

Pinned before any client work starts:

- **Amounts** are signed integers in minor units, column type `bigint`, JSON field `amount_minor` as a **number**. No floats anywhere in the path.
- **Currency is VND with exponent 0** ([ADR 0003](../decisions/0003-currency-vnd-single-exponent-zero.md)) — one integer unit is **one đồng**, so `1234` is ₫1.234. **No divide-by-100 anywhere.** The column stores đồng; do not invent a subunit VND does not have. No currency column, no per-row currency field.
- **Sign:** outflow negative, inflow positive.
- **Dates:** `occurred_on` is a calendar `date` (`YYYY-MM-DD`), not a timestamp.
- **Scoping is a repository-layer guarantee, not developer discipline.** Every read and write constrains on `user_id`. ADR 0004's consequence section is blunt about why: a partially-applied scope reads as working until a second user exists, and then it leaks one person's finances into another's ledger. Make it structurally hard to write an unscoped query — a repository that takes the user as a required argument, not an optional filter — and demonstrate in the outcome that a query missing the predicate fails rather than silently returning everyone's rows.
- **No balance column.** An account's balance is derived from its opening balance plus its transactions. A cached balance column is an explicit non-goal — flag rather than add.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- Phase 1: `<files, evidence>`
- Phase 2: `<files, evidence>`
- Phase 3: `<files, evidence>`
- Harness delta: `<what this taught the system, or "None">`


## Two columns the client now needs — added 2026-08-27, from `app`

[Ticket 0004](0004-app-prototype-accounts-transfers-insight.md) phases 1–2 built accounts and transfers on the client, and produced two fields this schema does not have:

- **`accounts.archived`** — boolean. An account with transactions can never be deleted without orphaning history, so archive is the only destructive edge the client offers, and it is reversible. The client chose `archived: boolean` over `archived_at` deliberately: the UI needs only *whether*, and a timestamp nothing renders is speculative modelling. Widening it later is cheap.
- **`transactions.transfer_id`** — or whatever the transfer ADR settles on. **Do not write this column until that ADR exists** ([CANDIDATES](../decisions/CANDIDATES.md) carries the evidence 0004 produced). The client's linked-pair model is provisional and its report argues the invariant belongs in the database as a deferred constraint — two legs summing to zero, sharing `occurred_on` — rather than in application code, which is where this prototype had to keep it and where it leaked into four consumers.

Both are documented on the client in `src/data/types.ts`.
