# Backlog 0001: API foundation — schema, migrations, and service skeleton

**Status:** Open  ·  **Priority:** High  ·  **Surfaces:** api  ·  **Opened:** 2026-08-22
**Epic:** Foundation — first usable expense tracker

## Context / problem

There is no backend yet. Before any feature can be ticketed, the ledger needs a schema that gets money right and a service skeleton that proves the stack runs. Getting the amount representation wrong here is expensive later — every row and every response inherits it.

**Auto-persisted:** No — Owner approved as part of workspace setup (2026-08-22). Fails the rubric on change type (addition), so it would otherwise need a go.

## Goal & non-goals

- **Goal:** a running Express + TypeScript service against Postgres, with versioned migrations creating `accounts`, `categories`, and `transactions`, and one health endpoint proving the whole path works.
- **Non-goal:** any CRUD endpoint for transactions — that's the next phase, and its response shape is a contract to pin first.
- **Non-goal:** auth of any kind. The service is localhost-only and single-user (ADR 0001).
- **Non-goal:** seed/demo data.

## Plan (by phase)

1. **Phase 1 — `api`:** project skeleton — TypeScript, Express, the `routes → controllers → services → repositories` layering from `documents/architecture/01-overview.md`, `.env.example`, and a test runner wired up.
2. **Phase 2 — `api`:** migration `0001` creating:
   - `accounts` — `id`, `name`, `type`, `opening_balance_minor` (`bigint`), `created_at`
   - `categories` — `id`, `name`, `created_at` (flat; hierarchy is undecided, see CANDIDATES)
   - `transactions` — `id`, `account_id`, `category_id` (nullable), `amount_minor` (`bigint`, signed), `occurred_on` (`date`), `description`, `created_at`
3. **Phase 3 — `api`:** `GET /health` returning service + database reachability. Verified with a real request against the running server.

## Contract

Pinned before any client work starts:

- **Amounts** are signed integers in minor units, column type `bigint`, JSON field `amount_minor` as a **number**. No floats anywhere in the path.
- **Currency is VND with exponent 0** ([ADR 0003](../decisions/0003-currency-vnd-single-exponent-zero.md)) — one integer unit is **one đồng**, so `1234` is ₫1.234. **No divide-by-100 anywhere.** The column stores đồng; do not invent a subunit VND does not have. No currency column, no per-row currency field.
- **Sign:** outflow negative, inflow positive.
- **Dates:** `occurred_on` is a calendar `date` (`YYYY-MM-DD`), not a timestamp.
- **No balance column.** An account's balance is derived from its opening balance plus its transactions. A cached balance column is an explicit non-goal — flag rather than add.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- Phase 1: `<files, evidence>`
- Phase 2: `<files, evidence>`
- Phase 3: `<files, evidence>`
- Harness delta: `<what this taught the system, or "None">`
