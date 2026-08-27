# Bug Tracker

**Lanes:** `Open` = PM/agents can act now · `Awaiting Owner` = fixed, needs the Owner's commit / deploy / verify · `Closed`.

> Bugs use the same file-per-item shape as the backlog (`bugs/NNNN-slug.md`). Derive the next ID from the folder (`ls bugs/ | grep -E '^[0-9]{4}' | sort | tail -1`), not from this file.

## Open — needs work

| ID | Title | Priority | Status | Agents |
|----|-------|----------|--------|--------|
| [0001](0001-ledger-filter-drops-keystrokes.md) | Ledger filter box drops keystrokes at typing speed | High | Open — **diagnosed 2026-08-27**. Two defects, one root cause (filter text lives in the URL): a rate-dependent race below ~15ms/char, and a **deterministic space loss** from the `.trim()` in `searchParamsFromFilters` — so a multi-word search cannot be typed at all. Ready to fix | app |

## Awaiting Owner — commit / deploy / verify

| ID | Title | Waiting on | Detail |
|----|-------|-----------|--------|
| — | — | — | — |

## Closed

*(none yet)*
