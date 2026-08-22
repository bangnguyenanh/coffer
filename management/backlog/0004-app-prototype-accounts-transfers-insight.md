# Backlog 0004: Coffer web client — accounts, transfers, and month insight on mock data

**Status:** Open  ·  **Priority:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-22
**Epic:** Foundation — first usable expense tracker

## Context / problem

[0003](0003-app-ui-prototype-mock-data.md) proves the core loop: log in, enter a transaction, see it, fix it, categorize it. It deliberately stops there so something closeable lands early.

This ticket carries the other eight Owner-selected functions — the ones that answer *"how much do I have"* and *"where did the month go"* rather than *"record this"*. It is split from 0003 rather than bundled into it because a nine-phase ticket closes nothing until all of it is done.

It also carries the highest-stakes modeling question on the board. **Transfers are not income or expense.** Moving ₫500.000 from a bank account to Momo is the same money in a different place, and if the product does not model that, every spending total is inflated by every transfer the Owner makes. Given how money actually moves here — cash, bank, and e-wallet all in daily use — this is not an edge case.

**Auto-persisted:** No — Owner approved the split on 2026-08-22. Fails the rubric on change type (addition), product decision (transfer modeling), and contract (the mock handlers draft the API response shape).

## Goal & non-goals

- **Goal:** the Owner can see what every account holds, move money between accounts without it counting as spending, manage categories, and read where the month went — against mocked network responses, no backend running.
- **Goal:** extend the MSW handlers from 0003 into a fuller **draft** of the phase-2 API contract, including the transfer shape and the filter/aggregate params the summary views need.
- **Non-goal:** any work in `../projects/api`. This ticket does not touch the backend surface.
- **Non-goal:** locking the API contract. The handlers are a *draft*; promoting them is a separate Owner-gated step.
- **Non-goal:** resolving the transfer schema question. This ticket **informs** that ADR by building one model and using it — it does not decide it.
- **Non-goal:** import, budgets, recurring transactions, and nested categories — unresolved in CANDIDATES. Categories here are **flat**.
- **Non-goal — declined by the Owner, 2026-08-22:** spending-over-time trend, CSV/JSON export, and a settings screen.
- **Non-goal: automated tests.** Owner decision, 2026-08-22. Closing evidence is a green build plus observed dev-server behavior, not test counts.

## Dependencies

- **0003 must land first** — this builds on its shell, its auth surface, its ledger, and its MSW fixture store.
- **0002 is the money contract's client half.** Every amount rendered here goes through that module. No component formats or divides on its own.
- **The transfer model used here is provisional, and the real decision is open** (see [CANDIDATES](../decisions/CANDIDATES.md)). This ticket builds the **linked pair**: two transactions sharing a `transfer_id`, one negative in the source account and one positive in the destination, with **every transaction carrying a `transfer_id` excluded from all spending totals and category breakdowns.** The alternative is a single row with a counter-account column.
  It is a **schema** question, so it must be resolved to an ADR **before 0001 phase 2 writes the migration**. Building it here is how we learn which shape is right.

## Plan (by phase)

Eight Owner-selected functions, grouped so each phase is independently demonstrable.

1. **Phase 1 — `app`:** **accounts** — list with balances **derived** from opening balance + transactions (never a stored balance field; 0001 makes a cached balance column an explicit non-goal), account detail with its own ledger, and create / edit / **archive**. Archive rather than delete: an account with transactions cannot be deleted without orphaning history.
2. **Phase 2 — `app`:** **transfers between accounts**, per the provisional linked-pair model above. Entry picks a source and a destination; the ledger renders a transfer as *movement*, not as income or expense; **and transfers are excluded from every spending total.** Verifying that exclusion is the point of this phase, not a detail of it.
3. **Phase 3 — `app`:** **categories (flat) CRUD** — create, rename, delete. Deleting a category that is in use **reassigns its transactions to uncategorized**; it never cascade-deletes them. Losing ledger history to a category cleanup would be unrecoverable.
4. **Phase 4 — `app`:** **month summary** (in / out / net, **transfers excluded**) and **spending by category** for the month. These are the payoff that makes categorizing worth the effort during entry.
5. **Phase 5 — `app`:** **dashboard as the landing route** — account balances plus the month summary — with the ledger moved to its own route. Close with a dev-server walkthrough: log in, land on the dashboard, transfer money between two accounts, **confirm both balances moved and that spending did not change**, then open spending-by-category and confirm the transfer is absent. Reported as observed behavior.

## Contract

Inherits the money contract from CLAUDE.md and the field names pinned in 0001:

- Amounts are signed integers in minor units, JSON field `amount_minor` as a **number**. No floats, no decimal strings.
- **Currency is VND, exponent 0** ([ADR 0003](../decisions/0003-currency-vnd-single-exponent-zero.md)). Fixtures are stated in đồng — a 500.000 ₫ transfer is `amount_minor: 500000`.
- Sign is direction: outflow negative, inflow positive.
- `occurred_on` is a calendar date `YYYY-MM-DD`, never a timestamp.
- No per-row currency field, no currency column, no conversion.
- **No `balance` field on an account** — it is derived, here and in the eventual API.
- **A transfer is identifiable in the response**, so any consumer can exclude it from spending without re-deriving the rule.

**What this ticket produces is a draft, not the pinned contract.** When it lands, the PM extracts the handler shapes into the Epic's phase-2 ticket for the Owner's go. `api` does not build against these handlers until that happens.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- Phase 1: `<files, evidence>`
- Phase 2: `<files, evidence>`
- Phase 3: `<files, evidence>`
- Phase 4: `<files, evidence>`
- Phase 5: `<files, evidence>`
- Harness delta: `<what this taught the system, or "None">`
