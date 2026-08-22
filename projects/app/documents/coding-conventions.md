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
- All conversion goes through the shared formatting/parsing module — a `/ 100` or a `toFixed(2)` outside it is a bug.
- Display formatting never mutates what gets sent back to the API.

## Styling

Design tokens over literals; no inline magic numbers where a token exists.

## Strings

No hardcoded user-facing copy scattered through components — keep copy where it can be found and changed. Currency symbols come from the formatting module, never typed inline.

## Tests

- Cover view logic and data wiring; report counts. No merge on red.
- **Amount parsing and formatting get their own tests** — including negative amounts, zero, and malformed input.

## Contracts

The API's response shapes are the `api` agent's contract. Consume them; don't reshape them, don't patch around them client-side. Flag what you need to the PM.
