# Backlog Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = built/decided, needs the Owner's commit / deploy / review / decision (NOT open work) · `Epics` = multi-ticket initiatives, check before opening a sibling · `Closed`.

> Before opening a new ticket: scan **Open + Awaiting Owner + Epics** for the same surface/feature. If a related one exists, extend it or add a phase — don't open a sibling. (pm-playbook → "Scoping discipline".)
>
> Derive the next ID from the folder (`ls backlog/ | grep -E '^[0-9]{4}' | sort | tail -1` — the grep skips this file), not from this file — it is hand-maintained and lags.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| [0001](0001-api-ledger-foundation.md) | API foundation — schema, migrations, and service skeleton | High | Open — not started | api |
| [0003](0003-app-ui-prototype-mock-data.md) | Coffer web client — prototype core loop on mock data | High | **Open — ready to start** (0002 done) | app |
| [0004](0004-app-prototype-accounts-transfers-insight.md) | Coffer web client — accounts, transfers, and month insight | High | Open — blocked on 0003 | app |

## Awaiting Owner — commit / deploy / review / decision

*Built or decided; not PM/agent-actionable.*

| ID | Title | Waiting on | Detail |
|----|-------|-----------|--------|
| [0002](0002-app-shell-and-money-formatting.md) | Web client foundation — app shell and the money formatting module | Owner's commit | **Done 2026-08-22.** Build green, behavior observed and PM-reverified. Nothing is committed — the PM does not run git. |

## Epics

Multi-ticket initiatives. **Before opening a new related ticket, attach it here as a phase instead of spawning a loose sibling.**

### Foundation — first usable expense tracker

Goal: enter a transaction, see it in a ledger, and have the number be right. Everything else (import, budgets, reports) waits.

| Phase | Ticket | Surface | Lane |
|---|---|---|---|
| 1 | [0001](0001-api-ledger-foundation.md) — schema, migrations, service skeleton | api | Open |
| 1 | [0002](0002-app-shell-and-money-formatting.md) — app shell + money formatting module | app | **Done 2026-08-22** — Awaiting Owner (commit) |
| 1.5 | [0003](0003-app-ui-prototype-mock-data.md) — prototype core loop: auth, ledger, entry, triage | app | **Open — ready to start** |
| 1.6 | [0004](0004-app-prototype-accounts-transfers-insight.md) — accounts, transfers, categories, month insight, dashboard | app | Open — blocked on 0003; **transfer model informs an ADR owed before phase 2's migration** |
| 2 | *(not yet ticketed)* transactions + accounts CRUD endpoints | api | Blocked on 0001; **response shape is a contract — pin it in the ticket before phase 3 starts.** 0003 + 0004's mock handlers produce the *draft*; promoting it needs the Owner's go |
| 3 | *(not yet ticketed)* transaction entry + ledger view against the API | app | Blocked on phase 2's contract |

Open product questions that gate work beyond this Epic — import mechanism, budgets, categories hierarchy, multi-currency — are in [decisions/CANDIDATES.md](../decisions/CANDIDATES.md). Resolve to an ADR before ticketing them.

## Closed

*(none yet)*
