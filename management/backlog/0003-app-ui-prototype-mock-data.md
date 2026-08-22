# Backlog 0003: Coffer web client — prototype core loop on mock data

**Status:** Open  ·  **Priority:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-22
**Epic:** Foundation — first usable expense tracker

## Context / problem

Every screen in this product is still hypothetical. The Epic's phase 2 note says the API response shape "is a contract — pin it in the ticket before phase 3 starts", and today there is nothing to pin it against: we would be designing a JSON shape with no idea what the ledger view or the entry form actually needs from it.

A clickable prototype on mock data inverts that. The client is built first against a mock network layer, and the mock handlers become the **draft** of the phase-2 API contract — written by the consumer that has to live with it, rather than guessed at by the producer.

The prototype also carries auth screens. That does **not** mean the product has auth: the Owner confirmed on 2026-08-22 that this stays localhost-only, so the CANDIDATES question "Does this ever leave localhost?" remains open and no ADR is made here. Login is prototyped as a UI surface so the shell has a real unauthenticated/authenticated split; the day hosting is wanted, auth + TLS + an `ops` gate get ticketed together and this prototype is what they render.

**Auto-persisted:** No — Owner approved 2026-08-22. Fails the rubric on three signals: change type (addition), product decision (auth shape, product name), contract (the mock handlers draft the API response shape).

## Goal & non-goals

- **Goal:** a runnable web client where the Owner can log in, see a ledger, enter a transaction, watch it appear with a correct amount, correct a mistake, and triage what is uncategorized — all against mocked network responses, no backend running. **This is the core loop: the smallest thing that is genuinely usable and can be judged.**
- **Scope was chosen by the Owner on 2026-08-22** from a candidate function list of sixteen; thirteen were selected. This ticket carries five of them and [0004](0004-app-prototype-accounts-transfers-insight.md) carries the other eight. The three declined are named as non-goals below so they are not quietly reintroduced.
- **Goal:** MSW request handlers that are readable as a proposed API contract, so phase 2 of the Epic can be ticketed from evidence instead of speculation.
- **Non-goal: real authentication.** No password hashing, no server-side session store, no credential leaving the browser, no password reset, and no second account — first-run setup provisions exactly one. The screens are real; what sits behind them is mocked.
- **Non-goal:** any work in `../projects/api`. This ticket does not touch the backend surface.
- **Non-goal:** locking the API contract. The handlers are a *draft*; promoting them to the pinned contract is a separate Owner-gated step.
- **Non-goal:** import, budgets, recurring transactions, and nested categories — all four are unresolved in CANDIDATES. Categories here are **flat**.
- **Non-goal — declined by the Owner, 2026-08-22:** spending-over-time trend (needs months of real data to say anything), CSV/JSON export (would export fixtures and prove little now), and a settings screen (currency and date format are fixed by ADR 0003, leaving little to put in it). Each is a reasonable later ticket, not a gap in this one.
- **Non-goal — deferred to [0004](0004-app-prototype-accounts-transfers-insight.md), not dropped:** accounts management, transfers between accounts, category CRUD, the month summary, spending by category, and the dashboard. **There is no dashboard yet** — until 0004 lands, a successful login lands on **the ledger**; 0004 introduces the dashboard and moves the landing route there.
- **Non-goal:** visual polish as a deliverable. This is a prototype for shaping the contract and the entry flow, not a design sign-off.
- **Non-goal: automated tests.** Owner decision, 2026-08-22. Closing evidence is a green build plus observed dev-server behavior, not test counts.

## Dependencies

- **0002 must land first.** The money formatting/parsing module is the client's half of the money contract; screens built before it exists will duplicate amount formatting inline, which is the exact failure 0002 was opened to prevent. Every amount rendered in this ticket goes through that module — no local formatting.
- **Product name is resolved:** the product is **Coffer** ([ADR 0002](../decisions/0002-product-name-coffer.md)). The shell, the browser title, and the login screen carry that name — no placeholder.

## Plan (by phase)

Five Owner-selected functions, grouped so each phase is independently demonstrable.

1. **Phase 1 — `app`:** wire MSW into the Vite dev server as a browser worker, with handlers backed by a small in-memory fixture store (accounts, categories, transactions) so writes are visible on subsequent reads. Fixtures reflect how money actually moves here — a cash account, a bank account, and an e-wallet — and cover the awkward cases, not just the happy path: negative and positive amounts, zero, a large amount (~10⁹ đồng), an uncategorized transaction, and an account with no transactions.
2. **Phase 2 — `app`:** **auth surface — first-run setup, then login.** Owner decision, 2026-08-22, replacing this ticket's earlier "no registration screen" position. The two are reconciled by *when* the screen appears rather than whether it exists:
   - **First-run setup** — shown only while **no account exists**. Email + password + confirm, creating the product's one account. This is the real problem self-hosting has: provisioning the single credential. It is not a signup form in the multi-tenant sense, and there is never a "second account".
   - **Login** — shown once an account exists. The setup route redirects to login from then on, and login redirects to setup while no account exists. Neither is reachable in the wrong state.
   - **Authenticated shell, route protection, and logout.** Every app route sits behind the session; logout returns to login, not to setup.
   - Mock `POST /session` for login; wrong credentials return a realistic failure the form actually renders (not a silent no-op). Mock account creation for setup.
   - **Prototype-only, and this is load-bearing:** no password hashing, no real session store, no credential ever leaving the browser. The real thing arrives with the hosting decision (see CANDIDATES) and brings TLS and an `ops` gate with it.
   - **Persist the created account and the session** (browser storage is fine) so a page reload does not wipe the account and drop you back into first-run. Without this, the login screen is unreachable in practice and half of what this phase builds cannot be looked at. The fixture store otherwise starts with **no account**, so the first-run path is what the Owner sees on a fresh load.
3. **Phase 3 — `app`:** **the ledger**, as the landing route for now — transactions in date order, amounts via the 0002 module, sign rendered as direction. Plus **filter & search**: date range, account, category, and description text. Filters belong in the request, not in client-side array filtering — they are part of the contract this prototype is drafting, and client-side filtering drafts nothing.
4. **Phase 4 — `app`:** **quick entry** and **edit / delete**. **Entry speed is the stated product feature, so this is the phase that matters most** — keyboard-first, no modal round-trips, amount parsing through the 0002 module with malformed input rejected with a reason rather than coerced. The category field is skippable, which is what makes phase 5 necessary.
5. **Phase 5 — `app`:** **uncategorized triage inbox** — everything with no category, cleared in a batch. This is the other half of fast entry: skip the category while typing, sort it out later.
6. **Phase 6 — `app`:** a dev-server walkthrough of the core loop — log in, enter a transaction without a category, see it in the ledger correctly formatted, correct its amount, find it by filter, then categorize it from the triage inbox — reported as observed behavior.

## Contract

The prototype honors the money contract from CLAUDE.md and the field names pinned in 0001, so the mock and the eventual API do not diverge:

- Amounts are signed integers in minor units, JSON field `amount_minor` as a **number**. No floats, no decimal strings, no client-side arithmetic that leaves integer space.
- **Currency is VND, exponent 0** ([ADR 0003](../decisions/0003-currency-vnd-single-exponent-zero.md)). Fixtures are stated in đồng — a 30.000 ₫ coffee is `amount_minor: 30000`, **not** `3000000`. Every rendered amount goes through the 0002 module; no component formats or divides on its own.
- Sign is direction: outflow negative, inflow positive. Neither category nor account may imply it.
- `occurred_on` is a calendar date `YYYY-MM-DD`, never a timestamp.
- No per-row currency field, no currency column, no conversion.
- No `balance` field on an account — it is derived.

**What this ticket produces is a draft, not the pinned contract.** When the prototype lands, the PM extracts the handler shapes into the Epic's phase-2 ticket for the Owner's go. `api` does not build against these handlers until that happens.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- **Phase 1 — DONE 2026-08-22.** MSW browser worker + in-memory fixture store. Files: `src/mocks/{fixtures,store,handlers,browser,start}.ts`, `src/api/{client,types}.ts`, `dev-server/mockServiceWorker.js`, `vite.config.ts` (`apply:'serve'` plugin), `package.json` (`msw@2.15.0`, devDependency). 56 transactions · 4 accounts · 8 categories, realistic VND magnitudes.
  **PM-verified independently:** `npm run build` → `tsc -b && vite build` green, `✓ built in 132ms`. **MSW absent from the production bundle** — `grep -ric msw|mockServiceWorker|setupWorker dist/assets/*.js` → **0 hits**; fixture strings (`acc_momo`, `Vietcombank`) → **0 hits**; `dist/` is exactly 3 files. Writes visible on reads confirmed by the agent (POST → 201 `txn_057`, refetch shows it); `POST` with `amount_minor: -40.5` → `400 invalid_amount`.
- Phase 2: `<not built — auth surface, rescoped to first-run setup + login on 2026-08-22>`
- **Phase 3 — DONE 2026-08-22.** Ledger with filters. Files: `src/routes/ledger/{LedgerView,TransactionTable,LedgerFilters,AmountCell}.tsx`, `useLedger.ts`, `src/lib/calendar-date.ts`, `src/copy/strings.ts`, `src/main.tsx`.
  **PM-verified independently via CDP** (headless Chrome, polled for `[data-status="ready"]`): unfiltered `/` → 56 rows, `reqUrl=/api/transactions`. **Filters proven to be in the request, not client-side:** `/?q=ca phe` → `?q=ca+phe`, **9 rows** (diacritic-insensitive — matched `Cà phê`); `/?category_id=none` → **4 rows**; `/?account_id=acc_tpb_savings` → **0 rows** + no-match empty state.
  **Money contract holds at every magnitude** — observed rendered strings: `-30.000 ₫`, `-45.000 ₫`, `25.000.000 ₫`, and the ~10⁹ case `-1.250.000.000 ₫` at full magnitude with no truncation or layout break. `0 ₫` renders **neutral**, not red — zero has no direction. Outflow red / inflow green, uncategorized as a `Chưa phân loại` chip.
- Phase 4: `<files, evidence>`
- Phase 5: `<files, evidence>`
- Phase 6: `<files, evidence>`
- **Harness delta (phases 1+3):**
  1. **`--dump-dom` is not a render check for any app that awaits something before mounting.** It snapshots at the load event, before the MSW worker registers, and returns an empty `#root` — reading as a failure that isn't one. `--virtual-time-budget` does not fix it and hangs against a service worker. **This supersedes the recipe folded into `.claude/agents/app.md` at 0002's close, which was right for a synchronous shell and wrong the moment the app became async.** The reliable form is CDP: launch with `--remote-debugging-port`, poll for a readiness attribute, then read `outerHTML`. → **Folded into `.claude/agents/app.md`.**
  2. **Render assertion attributes onto the DOM.** `data-request-url`, `data-result-count`, `data-direction` turned "filters are in the request" and "sign is direction" from claims into greppable evidence, and are what let the PM re-verify in seconds rather than re-reading the source. Cheap; worth doing by default on any view whose correctness is about what it fetched. → **Folded into `.claude/agents/app.md`.**
