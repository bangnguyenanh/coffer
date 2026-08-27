# Backlog Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = built/decided, needs the Owner's commit / deploy / review / decision (NOT open work) · `Epics` = multi-ticket initiatives, check before opening a sibling · `Closed`.

> Before opening a new ticket: scan **Open + Awaiting Owner + Epics** for the same surface/feature. If a related one exists, extend it or add a phase — don't open a sibling. (pm-playbook → "Scoping discipline".)
>
> Derive the next ID from the folder (`ls backlog/ | grep -E '^[0-9]{4}' | sort | tail -1` — the grep skips this file), not from this file — it is hand-maintained and lags.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| [0001](0001-api-ledger-foundation.md) | API foundation — schema, migrations, and service skeleton | High | Open — not started. **Re-scoped 2026-08-25** by [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md): schema is now tenant-scoped (`users` table, `user_id` on every table, cross-user FKs blocked). Auth mechanics still out of scope | api |
| [0003](0003-app-ui-prototype-mock-data.md) | Coffer web client — prototype core loop on mock data | High | **In progress** — click-through prototype works: **signup ↔ login** (conventional, multi-account), ledger + filters, on JSON + React state, no network or persistence. `app/documents/` realigned to [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md). **Phase 4 quick-entry done 2026-08-26** (11 keystrokes, no mouse); edit/delete deferred. **Phase 2c DONE 2026-08-27** — seeded account, login prefilled. **Phases 4 (edit/delete, undo not confirm) and 5 (triage inbox — 2 keystrokes to clear a batch) DONE 2026-08-27**, Playwright 14/14. Only **phase 6** (the walkthrough that closes this ticket) is left | app |
| [0004](0004-app-prototype-accounts-transfers-insight.md) | Coffer web client — accounts, transfers, and month insight | High | Open — blocked on 0003. **Rewritten 2026-08-27** off its dead MSW premise (the Owner deleted the mock layer on 08-25; the ticket still told agents to extend handlers) and onto theme C. **Its month band is the centrepiece of theme C** and stays here: [0005](0005-app-design-system-shadcn-theme-c.md) builds the tokens it will use, not the band | app |

## Awaiting Owner — commit / deploy / review / decision

*Built or decided; not PM/agent-actionable.*

| ID | Title | Waiting on | Detail |
|----|-------|-----------|--------|
| — | — | — | — |

## Epics

Multi-ticket initiatives. **Before opening a new related ticket, attach it here as a phase instead of spawning a loose sibling.**

### Foundation — first usable expense tracker

Goal: enter a transaction, see it in a ledger, and have the number be right. Everything else (import, budgets, reports) waits.

| Phase | Ticket | Surface | Lane |
|---|---|---|---|
| 1 | [0001](0001-api-ledger-foundation.md) — schema, migrations, service skeleton | api | Open — re-scoped multi-user 2026-08-25 (ADR 0004) |
| 1 | [0002](0002-app-shell-and-money-formatting.md) — app shell + money formatting module | app | **Closed 2026-08-23** — committed in `ff4e027` |
| 1.5 | [0003](0003-app-ui-prototype-mock-data.md) — prototype core loop: auth, ledger, entry, triage | app | **In progress** — setup/login/ledger screens built; mock network layer being removed per Owner, 2026-08-25; 4, 5, 6 open |
| 1.6 | [0004](0004-app-prototype-accounts-transfers-insight.md) — accounts, transfers, categories, month insight, dashboard | app | Open — **rewritten 2026-08-27** (no MSW, theme C, phase 4 builds the month band); **transfer model informs an ADR owed before phase 2's migration** |
| 1.7 | [0005](0005-app-design-system-shadcn-theme-c.md) — shadcn/ui + theme C token layer + re-skin | app | **Closed 2026-08-27** — committed in `0625c31`. [ADR 0005](../decisions/0005-design-system-shadcn-theme-c.md). Runs ahead of `api` by the Owner's explicit override; 0004's month band lands in theme C when 0004 runs |
| 2 | *(not yet ticketed)* transactions + accounts CRUD endpoints | api | Blocked on 0001; **response shape is a contract — pin it in the ticket before phase 3 starts.** 0003 + 0004's mock handlers produce the *draft*; promoting it needs the Owner's go. **There is no longer a draft to promote.** The Owner ended the mock-network layer on 2026-08-25 (see [0003](0003-app-ui-prototype-mock-data.md)), so 0003 and 0004 no longer produce candidate request/response shapes — this ticket must **define** them, with the Owner's go, rather than extract them. What survives as input is the client's type definitions and the money contract, not routes or status codes |
| 3 | *(not yet ticketed)* transaction entry + ledger view against the API | app | Blocked on phase 2's contract |

Open product questions that gate work beyond this Epic — import mechanism, budgets, categories hierarchy, multi-currency — are in [decisions/CANDIDATES.md](../decisions/CANDIDATES.md). Resolve to an ADR before ticketing them.

## Closed

| ID | Title | Closed | Detail |
|----|-------|--------|--------|
| [0005](0005-app-design-system-shadcn-theme-c.md) | Design system — shadcn/ui on theme C ("Ấm") | 2026-08-27 | All four phases; Playwright 4/4, build green, 11 keystrokes held, 105 amounts checked for a stray `+`. Owner's commit gate cleared same day — committed as `0625c31`. **Two reversible calls stand as committed** unless the Owner says otherwise: `money.ts` exports `CURRENCY_SYMBOL` for one `aria-hidden` ₫ (4 lines to revert, one consumer), and `playwright.config.ts` + `e2e/` live in the surface. The harness hole this ticket exposed is fixed in `88e55a7`. |
| [0002](0002-app-shell-and-money-formatting.md) | Web client foundation — app shell and the money formatting module | 2026-08-23 | Done 2026-08-22 (build green, behavior observed and PM-reverified). Owner's commit gate cleared 2026-08-23 — committed as `ff4e027` and pushed to [bangnguyenanh/coffer](https://github.com/bangnguyenanh/coffer). |
