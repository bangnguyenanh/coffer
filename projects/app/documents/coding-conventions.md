# Coding conventions

Law for the `app` surface. On any conflict between a ticket and this file, **stop and flag it**.

## Components

- One component per file, `PascalCase`; keep them small and focused.
- Views live under the route they serve; shared pieces are promoted only once a second consumer actually exists.

## State

- Lift only when shared; avoid a global store for local concerns.
- **Suspended pending the `api` surface — "never mirror server data into component state where it can go stale against the API-client cache."** The rule is correct and it comes back with a real backend; it has no referent today, because this surface has **no API and no cache** (hub ticket 0003, Owner directive 2026-08-25).
- **What holds instead, today:** the app's data lives in one shared React context (`src/state/`), seeded from `src/data/*.json` at boot. **No persistence and no network, by design** — a reload re-seeds and loses the session's entries, and that is the accepted trade, not a bug. Read from the context; don't copy it into a component's own state, where it goes stale against the shared one for the same reason the original rule existed.

## Money

- **Never store or compute in decimals.** Amounts are integer minor units in memory, exactly as the API sends them.
- **Currency is VND, exponent 0** (hub ADR 0003): one integer unit is one đồng. **A `/ 100` or a `toFixed(2)` is a bug anywhere — including inside the formatting module.** There is no subunit to convert to.
- All display and parsing goes through the shared formatting/parsing module. `.` is the **thousands** separator (`30.000` = thirty thousand); a component that assumes decimal-point semantics is a bug.
- Display formatting never mutates what gets sent back to the API.

## Styling

Design tokens over literals; no inline magic numbers where a token exists.

## Strings

No hardcoded user-facing copy scattered through components — keep copy where it can be found and changed. Currency symbols come from the formatting module, never typed inline.

## Tests

- Cover view logic and data wiring; report counts. No merge on red.
- **Amount parsing and formatting get their own tests** — including negative amounts, zero, and malformed input.
- **Scoped exception — the prototype track (hub tickets 0002, 0003, 0004).** Owner decision, 2026-08-22: that track ships without automated tests. Closing evidence there is a green build plus **observed dev-server behavior**, demonstrated and reported, not asserted. The rule above stands for everything else, and this exception expires with those three tickets.

## Contracts

**(No API is wired to this surface today — hub ticket 0003, Owner directive 2026-08-25. This rule is the standing contract for when one lands, not a description of the current build; see the boundary section in `architecture/01-overview.md`.)**

The API's response shapes are the `api` agent's contract. Consume them; don't reshape them, don't patch around them client-side. Flag what you need to the PM.

*Last updated: 2026-08-25 (stamp added; content reviewed against hub ADR 0004 — the multi-account auth model is settled law, see the boundary section in `architecture/01-overview.md`) — keep this stamp current in the same edit that changes content.*
