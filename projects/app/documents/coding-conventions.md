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
- **Standing exception — the prototype track.** Owner decision, 2026-08-22, **restated 2026-08-29**: while this client runs on seeded in-memory state, it ships without unit tests. It originally named hub tickets 0002/0003/0004 and said it expired with them; [0005](../../../management/backlog/0005-app-design-system-shadcn-theme-c.md), [0006](../../../management/backlog/0006-app-login-screen-staging.md) and [0007](../../../management/backlog/0007-app-gach-bong-ground-app-shell.md) invoked it after that, so it is restated as a rule with a condition rather than kept as a list of ticket numbers that only ever grows.

  **Waiving unit tests raises the evidence bar; it does not lower it.** What the track actually settled into, and what is now required to close an `app` ticket under this exception:

  - **Playwright, with counts, including the baseline** — "47/47 (45 + 2 new)", not "tests pass". A suite that only ever grows green hides the regression it should have caught.
  - **Screenshots** of the behaviour claimed, per `CLAUDE.md`'s episode-1 evidence loop (`55:19`).
  - **Behaviour demonstrated, never asserted.** [Bug 0001](../../../management/bugs/0001-ledger-filter-drops-keystrokes.md) was found by walking the loop, not by a suite; [0007](../../../management/backlog/0007-app-gach-bong-ground-app-shell.md) caught a scroll-anchor regression by A/B across three builds. Both are what this bar is for.
  - **Amount parsing and formatting keep their tests regardless.** The rule above is not inside this exception — the money contract does not get a prototype discount.

  **It expires when the client stops running on seeded mock state** — that is, when `app` first renders data from the real `api` ([backlog 0008](../../../management/backlog/0008-api-auth-signup-login-sessions.md) and the epic's phase 3). At that point the data layer becomes real, its failures become silent, and unit tests stop being redundant with a walkthrough. **Do not extend this exception past that line without the Owner.**

  **It has never covered `api`.** `api/documents/coding-conventions.md` carries no exception, so [0001](../../../management/backlog/0001-api-ledger-foundation.md) and [0008](../../../management/backlog/0008-api-auth-signup-login-sessions.md) are tested normally.

## Contracts

**(No API is wired to this surface today — hub ticket 0003, Owner directive 2026-08-25. This rule is the standing contract for when one lands, not a description of the current build; see the boundary section in `architecture/01-overview.md`.)**

The API's response shapes are the `api` agent's contract. Consume them; don't reshape them, don't patch around them client-side. Flag what you need to the PM.

*Last updated: 2026-08-29 (PM, Owner's call: §Tests' prototype exception restated as a standing rule with an expiry condition — it named three tickets and said it expired with them, while 0005/0006/0007 went on invoking it, and the bar the track actually holds itself to (Playwright with baseline counts, screenshots, behaviour demonstrated) was written down nowhere. Earlier: 2026-08-25 — stamp added; content reviewed against hub ADR 0004, the multi-account auth model is settled law, see the boundary section in `architecture/01-overview.md`) — keep this stamp current in the same edit that changes content.*
