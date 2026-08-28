# Backlog Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = built/decided, needs the Owner's commit / deploy / review / decision (NOT open work) · `Epics` = multi-ticket initiatives, check before opening a sibling · `Closed`.

> Before opening a new ticket: scan **Open + Awaiting Owner + Epics** for the same surface/feature. If a related one exists, extend it or add a phase — don't open a sibling. (pm-playbook → "Scoping discipline".)
>
> Derive the next ID from the folder (`ls backlog/ | grep -E '^[0-9]{4}' | sort | tail -1` — the grep skips this file), not from this file — it is hand-maintained and lags.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| [0001](0001-api-ledger-foundation.md) | API foundation — schema, migrations, and service skeleton | High | Open — not started. **Re-scoped 2026-08-25** by [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md): schema is now tenant-scoped (`users` table, `user_id` on every table, cross-user FKs blocked). Auth mechanics still out of scope | api |

## Awaiting Owner — commit / deploy / review / decision

*Built or decided; not PM/agent-actionable.*

| ID | Title | Waiting on | Detail |
|----|-------|-----------|--------|
| [0006](0006-app-login-screen-staging.md) | Login screen — gạch bông ground, receipt panel, wordmark | Owner — commit gate **+ one doc call** | Done 2026-08-28. Build green, Playwright 45/45 (41 baseline + 4 new), four screenshots. `LoginView`/`SignupView` and all of `src/auth/`'s logic byte-identical, so ep2's rewrite is untouched. **The doc call:** `app/documents/coding-conventions.md` §Tests scopes the no-unit-test exception to 0002/0003/0004 and says it expires with them — 0006 invoked it anyway. Name 0006, or restate it as a standing prototype-track rule |

## Epics

Multi-ticket initiatives. **Before opening a new related ticket, attach it here as a phase instead of spawning a loose sibling.**

### Foundation — first usable expense tracker

Goal: enter a transaction, see it in a ledger, and have the number be right. Everything else (import, budgets, reports) waits.

| Phase | Ticket | Surface | Lane |
|---|---|---|---|
| 1 | [0001](0001-api-ledger-foundation.md) — schema, migrations, service skeleton | api | Open — re-scoped multi-user 2026-08-25 (ADR 0004) |
| 1 | [0002](0002-app-shell-and-money-formatting.md) — app shell + money formatting module | app | **Closed 2026-08-23** — committed in `ff4e027` |
| 1.5 | [0003](0003-app-ui-prototype-mock-data.md) — prototype core loop: auth, ledger, entry, triage | app | **Closed 2026-08-27** — all six phases. Core loop walked end to end |
| 1.6 | [0004](0004-app-prototype-accounts-transfers-insight.md) — accounts, transfers, categories, month insight, dashboard | app | **Closed 2026-08-27** — all five phases. **The transfer ADR is now owed with evidence** ([CANDIDATES](../decisions/CANDIDATES.md)) before 0001 phase 2's migration |
| 1.7 | [0005](0005-app-design-system-shadcn-theme-c.md) — shadcn/ui + theme C token layer + re-skin | app | **Closed 2026-08-27** — committed in `0625c31`. [ADR 0005](../decisions/0005-design-system-shadcn-theme-c.md). Runs ahead of `api` by the Owner's explicit override; 0004's month band lands in theme C when 0004 runs |
| 2 | *(not yet ticketed)* transactions + accounts CRUD endpoints | api | Blocked on 0001; **response shape is a contract — pin it in the ticket before phase 3 starts.** 0003 + 0004's mock handlers produce the *draft*; promoting it needs the Owner's go. **There is no longer a draft to promote.** The Owner ended the mock-network layer on 2026-08-25 (see [0003](0003-app-ui-prototype-mock-data.md)), so 0003 and 0004 no longer produce candidate request/response shapes — this ticket must **define** them, with the Owner's go, rather than extract them. What survives as input is the client's type definitions and the money contract, not routes or status codes |
| 3 | *(not yet ticketed)* transaction entry + ledger view against the API | app | Blocked on phase 2's contract |

Open product questions that gate work beyond this Epic — import mechanism, budgets, categories hierarchy, multi-currency — are in [decisions/CANDIDATES.md](../decisions/CANDIDATES.md). Resolve to an ADR before ticketing them.

## Closed

| ID | Title | Closed | Detail |
|----|-------|--------|--------|
| [0003](0003-app-ui-prototype-mock-data.md) | Coffer web client — prototype core loop | 2026-08-27 | All six phases. Auth, ledger + filters, quick entry at 11 keystrokes, edit/delete with undo, the triage inbox at 2 keystrokes a batch, and the core loop walked end to end. Its phase-6 walkthrough is what broke [bug 0001](../bugs/0001-ledger-filter-drops-keystrokes.md) open. |
| [0004](0004-app-prototype-accounts-transfers-insight.md) | Accounts, transfers, categories, month insight, dashboard | 2026-08-27 | All five phases. Balances derived not stored; transfers proved excluded from every spending figure; categories delete-reassigns; **theme C's month band**; dashboard as the landing route. **Owes the transfer ADR** before `api` migrates. |
| [0005](0005-app-design-system-shadcn-theme-c.md) | Design system — shadcn/ui on theme C ("Ấm") | 2026-08-27 | All four phases; Playwright 4/4, build green, 11 keystrokes held, 105 amounts checked for a stray `+`. Owner's commit gate cleared same day — committed as `0625c31`. **Two reversible calls stand as committed** unless the Owner says otherwise: `money.ts` exports `CURRENCY_SYMBOL` for one `aria-hidden` ₫ (4 lines to revert, one consumer), and `playwright.config.ts` + `e2e/` live in the surface. The harness hole this ticket exposed is fixed in `88e55a7`. |
| [0002](0002-app-shell-and-money-formatting.md) | Web client foundation — app shell and the money formatting module | 2026-08-23 | Done 2026-08-22 (build green, behavior observed and PM-reverified). Owner's commit gate cleared 2026-08-23 — committed as `ff4e027` and pushed to [bangnguyenanh/coffer](https://github.com/bangnguyenanh/coffer). |
