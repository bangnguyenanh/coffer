# Backlog 0002: Web client foundation — app shell and the money formatting module

**Status:** Open
**Priority:** High
**Surfaces:** app
**Opened:** 2026-08-22
**Reported by:** Owner

## Context

The web client doesn't exist yet. Its foundation is independent of the API's — the shell and the amount formatting/parsing module need no endpoints — so this runs in parallel with 0001 rather than waiting on it.

The formatting module is the client's half of the money contract, and it is the piece most likely to be quietly duplicated in a component later. Building it first, with tests, makes the shared version the obvious one to reach for.

**Auto-persisted:** No — Owner approved as part of workspace setup (2026-08-22). Fails the rubric on change type (addition).

**Epic:** Foundation — first usable expense tracker

## Plan

- `app`: scaffold Vite + React + TypeScript + Tailwind, with routing and an empty ledger view as the landing route.
- `app`: build the single shared money module — minor units → display string, and user input → minor units — per `documents/architecture/01-overview.md`. Strict parsing: reject malformed input with a reason rather than coercing.
- `app`: tests for that module covering zero, negatives, large amounts, and malformed input.
- Out of scope: calling the API (no endpoints exist yet — 0001), transaction entry UI, and any real ledger data.

## Outcome

<!-- Filled post-execution by the PM from the sub-agent's evidence. -->

- Files changed: `<path:line>`
- Verified via: `<build / tests with counts / dev-server smoke>`
- Evidence: `<what proved it works>`
- Harness delta: `<what this taught the system, or "None">`
