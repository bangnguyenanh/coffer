# Coding conventions

Law for the `app` surface. On any conflict between a ticket and this file, **stop and flag it**.

## Components

- One component per file, `PascalCase`; keep them small and focused.
- Views live under the route they serve; shared pieces are promoted only once a second consumer actually exists.

## State

- Lift only when shared; avoid a global store for local concerns.
- Never mirror server data into component state where it can go stale against the API-client cache.

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

The API's response shapes are the `api` agent's contract. Consume them; don't reshape them, don't patch around them client-side. Flag what you need to the PM.
