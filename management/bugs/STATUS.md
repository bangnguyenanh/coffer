# Bug Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = fixed, needs the Owner's commit / deploy / verify · `Closed`.

> Bugs use the same file-per-item shape as the backlog (`bugs/NNNN-slug.md`). Derive the next ID from the folder (`ls bugs/ | grep -E '^[0-9]{4}' | sort | tail -1`), not from this file.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| — | — | — | — | — |

## Awaiting Owner — commit / deploy / verify

| ID | Title | Waiting on | Detail |
|----|-------|-----------|--------|
| — | — | — | — |

## Closed

| ID | Title | Closed | Detail |
|----|-------|--------|--------|
| [0001](0001-ledger-filter-drops-keystrokes.md) | Ledger filter box drops keystrokes at typing speed | 2026-08-27 | **Two defects, one root cause** — filter text lived in the URL. A rate-dependent race (total loss at 0 ms/char, gone above 15) and a deterministic space loss from the trim at storage, which made a multi-word search untypeable. Fixed by moving authority to React state and sending a patch instead of the whole filter object — which also fixed the four other controls, where `q` was being clobbered entirely. Six tests red on the pre-fix bundle, green after; 41/41 suite. |
