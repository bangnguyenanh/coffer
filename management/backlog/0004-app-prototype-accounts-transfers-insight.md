# Backlog 0004: Coffer web client — accounts, transfers, and month insight

**Status:** In progress — phases 1–2 done 2026-08-27  ·  **Priority:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-22
**Epic:** Foundation — first usable expense tracker

## Context / problem

[0003](0003-app-ui-prototype-mock-data.md) proves the core loop: log in, enter a transaction, see it, fix it, categorize it. It deliberately stops there so something closeable lands early.

This ticket carries the other eight Owner-selected functions — the ones that answer *"how much do I have"* and *"where did the month go"* rather than *"record this"*. It is split from 0003 rather than bundled into it because a nine-phase ticket closes nothing until all of it is done.

It also carries the highest-stakes modeling question on the board. **Transfers are not income or expense.** Moving ₫500.000 from a bank account to Momo is the same money in a different place, and if the product does not model that, every spending total is inflated by every transfer the Owner makes. Given how money actually moves here — cash, bank, and e-wallet all in daily use — this is not an edge case.

**Auto-persisted:** No — Owner approved the split on 2026-08-22. Fails the rubric on change type (addition) and product decision (transfer modeling).

**Rewritten 2026-08-27, and the rewrite matters.** This ticket was written on 2026-08-22 against a mock network layer that no longer exists: the Owner ended MSW on 2026-08-25 (*"khi nói về mock data, dường như bạn đã làm quá lên… chúng ta đâu cần mock server?"*), so every instruction here to "extend the MSW handlers" or build "against mocked network responses" was dead text that would have sent an agent to rebuild the thing the Owner deleted. There is **no network layer, no handlers, and no API contract drafting in this ticket** — data is JSON in `src/data/` plus React state, and a reload re-seeds. The Epic's phase 2 defines its own request/response shapes with the Owner's go; nothing here drafts them.

**And it wears theme C.** The design system landed 2026-08-27 ([ADR 0005](../decisions/0005-design-system-shadcn-theme-c.md)); `../projects/app/documents/design-system.md` is this surface's law and every screen below is built in it, on the existing shadcn primitives. **Phase 4 is where theme C's month band finally gets built** — it was drawn in the design canvas and deliberately left out of 0005 as feature work belonging here.

## Goal & non-goals

- **Goal:** the Owner can see what every account holds, move money between accounts without it counting as spending, manage categories, and read where the month went — on JSON fixtures and React state, no backend and no network layer.
- **Goal:** every screen built in **theme C**, on the primitives 0005 vendored — this ticket adds screens, not a second visual vocabulary.
- **Non-goal:** any work in `../projects/api`. This ticket does not touch the backend surface.
- **Non-goal: any network layer.** No MSW, no fetch, no mock server, no typed API client standing in for one. If a phase feels like it needs one, that is a signal to stop and raise it, not to build it.
- **Non-goal:** resolving the transfer schema question. This ticket **informs** that ADR by building one model and using it — it does not decide it.
- **Non-goal:** import, budgets, recurring transactions, and nested categories — unresolved in CANDIDATES. Categories here are **flat**.
- **Non-goal — declined by the Owner, 2026-08-22:** spending-over-time trend, CSV/JSON export, and a settings screen.
- **Non-goal: automated tests.** Owner decision, 2026-08-22. Closing evidence is a green build plus observed dev-server behavior, not test counts.

## Dependencies

- **0003 must land first** — this builds on its shell, its auth surface, its ledger, and its JSON fixtures in `src/data/`.
- **0002 is the money contract's client half.** Every amount rendered here goes through that module. No component formats or divides on its own.
- **The transfer model used here is provisional, and the real decision is open** (see [CANDIDATES](../decisions/CANDIDATES.md)). This ticket builds the **linked pair**: two transactions sharing a `transfer_id`, one negative in the source account and one positive in the destination, with **every transaction carrying a `transfer_id` excluded from all spending totals and category breakdowns.** The alternative is a single row with a counter-account column.
  It is a **schema** question, so it must be resolved to an ADR **before 0001 phase 2 writes the migration**. Building it here is how we learn which shape is right.

## Plan (by phase)

Eight Owner-selected functions, grouped so each phase is independently demonstrable.

1. **Phase 1 — `app`:** **accounts** — list with balances **derived** from opening balance + transactions (never a stored balance field; 0001 makes a cached balance column an explicit non-goal), account detail with its own ledger, and create / edit / **archive**. Archive rather than delete: an account with transactions cannot be deleted without orphaning history.
2. **Phase 2 — `app`:** **transfers between accounts**, per the provisional linked-pair model above. Entry picks a source and a destination; the ledger renders a transfer as *movement*, not as income or expense; **and transfers are excluded from every spending total.** Verifying that exclusion is the point of this phase, not a detail of it.
3. **Phase 3 — `app`:** **categories (flat) CRUD** — create, rename, delete. Deleting a category that is in use **reassigns its transactions to uncategorized**; it never cascade-deletes them. Losing ledger history to a category cleanup would be unrecoverable.
4. **Phase 4 — `app`:** **month summary** (in / out / net, **transfers excluded**) and **spending by category** for the month. These are the payoff that makes categorizing worth the effort during entry.
   **This is theme C's month band**, drawn in the design canvas and held back from 0005 as feature work: the month's spend as the largest number on the page, earned and net beside it, and a single-hue allocation bar whose first and widest segment is *uncategorised* — dashed, not a ramp colour. The canvas note is the acceptance test in one line: *"Hơn một nửa chi tiêu tháng này chưa biết đi đâu"* — the band exists to turn the triage inbox from a badge into a reason. Reference: [`decisions/assets/0005-theme-c-ledger.html`](../decisions/assets/0005-theme-c-ledger.html).
   **The `+` stays off.** The canvas drew `+10.977.000 ₫` on the net figure; `formatAmount` does not emit `+` and does not learn to here. Rendering that sign is a money-contract change and is Owner-gated.
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

**This ticket produces no API contract.** It once claimed to; the mock layer that would have carried it was deleted on 2026-08-25. What survives as input to the Epic's phase 2 is the **type definitions** in `src/data/types.ts` and the money contract — not routes, not status codes, not response envelopes. The field names above still bind, because they are the money contract's and 0001's, not this ticket's.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- **Phase 1 — DONE 2026-08-27.** Accounts with derived balances.

  **Files:** new `src/lib/account-balance.ts`, `src/routes/accounts/{AccountsView,AccountDetailView,AccountForm}.tsx` + `account-form.ts`, `e2e/phase1-accounts.spec.ts`; changed `src/data/{types.ts,seed.ts,accounts.json,README.md}`, `src/state/AppData*`, `src/App.tsx`, `src/AppShell.tsx`, `src/copy/strings.ts`, `LedgerView.tsx`.

  **Balances derive, and the detail page agrees with the list because neither stores:**

  | account | opening | rows | derived |
  |---|---|---|---|
  | `acc_cash` | 3.500.000 | −2.350.000 | **1.150.000** |
  | `acc_vcb` | 1.320.000.000 | −1.197.779.000 | **122.221.000** |
  | `acc_momo` | 2.000.000 | −1.230.000 | **770.000** |
  | `acc_tpb_savings` | 60.000.000 | — | **60.000.000** |

  Create: `12.500.000` typed as real keystrokes → stored `12500000`; `12,5` refused with a reason — the dot is thousands, same module, same rules as entry. Archive: `acc_momo` kept its 15 rows and its balance, left the entry picker, stayed named on its ledger rows; un-archive restored it exactly. **There is no delete on an account anywhere** — archive is the only destructive edge and it is reversible by construction.

- **Phase 2 — DONE 2026-08-27.** Transfers, and the exclusion proved as numbers.

  **Files:** new `src/routes/accounts/{TransferEntry.tsx,transfer-entry.ts}`, `src/lib/transfers.ts`, `e2e/phase2-transfers.spec.ts`; changed `src/data/types.ts` (`transfer_id`), `AppDataProvider` (`addTransfer`), `TransactionRow`, `TransactionList`, `TriageView`, `AppShell`, `quick-entry.ts`.

  **The proof, one page load, real keystrokes — ₫500.000 Vietcombank → Ví Momo:**

  ```
  BEFORE {vcb:122221000, momo:770000, total:184141000, spending:-1278059000, rows:50, uncategorized:4}
  AFTER  {vcb:121721000, momo:1270000, total:184141000, spending:-1278059000, rows:50, uncategorized:4}
  ```

  Source down, destination up, **total identical, spending identical, spending row count identical, uncategorised count identical.** Undo removed both legs and restored both balances. One screenshot carries both balances and the spending line.

  **Rendered as movement without bending the colour rule:** a `Chuyển khoản` chip, a two-way arrow where the category dot sits, both ends named — but **the amount keeps its sign and its sign colour**, because the money really did leave that account and recolouring by context is what the design system forbids. Side effect worth seeing: a transfer's day subtotal reads `0 ₫` neutral, because the legs cancel.

  **Keystrokes:** quick entry **still 11**, re-measured twice. Transfer **13** from a cold screen, of which two are a Vietnamese first-letter collision (`Ví Momo` / `Vietcombank`); an unambiguous account costs one key, so the floor is 11.

  **Build `✓ 179ms`, Playwright 22/22 (8 new, 14 pre-existing, no regressions), Node money 25/25.** PM re-ran the build and the fixture counts.

### Decisions the ticket did not specify

1. **Transfer entry lives on `/accounts`, not on the ledger row.** A source/destination mode on quick entry would add a tab stop to the measured 11-keystroke path — a regression that needs the Owner. On the accounts screen it also sits beside the two balances it moves, which is why the proof fits in one frame.
2. **`archived: boolean`, not `archived_at`** — the UI needs only *whether*; a timestamp nothing renders is speculative modelling.
3. **Fixture opening balances were raised** (`acc_vcb` 18.5m → 1.32bn, `acc_cash` 2m → 3.5m, `acc_momo` 850k → 2m). Nothing had ever read `opening_balance_minor` before this phase, and the moment balances derived, **three of four accounts came out negative** — `txn_033` alone is a ₫1.25bn apartment deposit. **No row was added, edited or removed: the 56 / 4 / 0 / 9 counts are intact** (PM-verified). `acc_vcb`'s ten-digit balance now stress-tests the balance column the way `txn_033` stress-tests the amount column. One line to revert.
4. **A spending total is rendered on `/accounts`** — over all transactions, no period, no in/out/net, no allocation bar, so phase 4 still owns the month band entirely. Without it the exclusion claim has no visible number.
5. **No fixture transfer rows** — seeding two would change the counts closed phases quote, and a demonstration must create its own transfer to have a *before*.

### For `api` — two fields ticket 0001's schema does not have

`accounts.archived` and `transactions.transfer_id`. Both optional in JSON, required in memory, documented in `src/data/types.ts`. Carried into [0001](0001-api-ledger-foundation.md) in the same change — see the transfer ADR note there.

### Harness delta

- **`vite preview` served a stale bundle after a fixture edit.** `reuseExistingServer: true` plus a fixture written by a shell heredoc — which fires no `Write|Edit` hook — meant the first phase-1 run tested yesterday's bundle and looked like an app bug. **Run `npm run build` before Playwright whenever a file was written by anything other than Edit/Write.** (The turn-end hook added in `88e55a7` now typechecks such edits, but it does not rebuild the preview server's bundle.)
- **Native `<select>` first-letter matching is diacritic-insensitive in Chromium:** `v` then `i` selects `Ví Momo`, not `Vietcombank`; repeating the letter cycles. A live constraint on the "native select, not Radix" decision — it costs a keystroke on any two accounts sharing a first letter.

- Phase 1: `<files, evidence>`
- Phase 2: `<files, evidence>`
- Phase 3: `<files, evidence>`
- Phase 4: `<files, evidence>`
- Phase 5: `<files, evidence>`
- Harness delta: `<what this taught the system, or "None">`
