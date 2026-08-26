# Backlog Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = built/decided, needs the Owner's commit / deploy / review / decision (NOT open work) · `Epics` = multi-ticket initiatives, check before opening a sibling · `Closed`.

> Before opening a new ticket: scan **Open + Awaiting Owner + Epics** for the same surface/feature. If a related one exists, extend it or add a phase — don't open a sibling. (pm-playbook → "Scoping discipline".)
>
> Derive the next ID from the folder (`ls backlog/ | grep -E '^[0-9]{4}' | sort | tail -1` — the grep skips this file), not from this file — it is hand-maintained and lags.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| [0001](0001-api-ledger-foundation.md) | API foundation — schema, migrations, and service skeleton | High | Open — not started. **Re-scoped 2026-08-25** by [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md): schema is now tenant-scoped (`users` table, `user_id` on every table, cross-user FKs blocked). Auth mechanics still out of scope | api |
| [0003](0003-app-ui-prototype-mock-data.md) | Coffer web client — prototype core loop on mock data | High | **In progress** — click-through prototype works: **signup ↔ login** (conventional, multi-account), ledger + filters, on JSON + React state, no network or persistence. `app/documents/` realigned to [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md). **Next: phase 4 (quick entry)** — `addTransaction` is in `src/state/`, unwired | app |
| [0004](0004-app-prototype-accounts-transfers-insight.md) | Coffer web client — accounts, transfers, and month insight | High | Open — blocked on 0003 | app |

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
| 1.6 | [0004](0004-app-prototype-accounts-transfers-insight.md) — accounts, transfers, categories, month insight, dashboard | app | Open — blocked on 0003; **transfer model informs an ADR owed before phase 2's migration** |
| 2 | *(not yet ticketed)* transactions + accounts CRUD endpoints | api | Blocked on 0001; **response shape is a contract — pin it in the ticket before phase 3 starts.** 0003 + 0004's mock handlers produce the *draft*; promoting it needs the Owner's go. **There is no longer a draft to promote.** The Owner ended the mock-network layer on 2026-08-25 (see [0003](0003-app-ui-prototype-mock-data.md)), so 0003 and 0004 no longer produce candidate request/response shapes — this ticket must **define** them, with the Owner's go, rather than extract them. What survives as input is the client's type definitions and the money contract, not routes or status codes |
| 3 | *(not yet ticketed)* transaction entry + ledger view against the API | app | Blocked on phase 2's contract |

Open product questions that gate work beyond this Epic — import mechanism, budgets, categories hierarchy, multi-currency — are in [decisions/CANDIDATES.md](../decisions/CANDIDATES.md). Resolve to an ADR before ticketing them.

## Closed

| ID | Title | Closed | Detail |
|----|-------|--------|--------|
| [0002](0002-app-shell-and-money-formatting.md) | Web client foundation — app shell and the money formatting module | 2026-08-23 | Done 2026-08-22 (build green, behavior observed and PM-reverified). Owner's commit gate cleared 2026-08-23 — committed as `ff4e027` and pushed to [bangnguyenanh/coffer](https://github.com/bangnguyenanh/coffer). |
