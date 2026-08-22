# Architecture — overview

How the finance web client is built. The owning agent reads this before any structural call.

## Shape

`routed views → feature components → a typed API client → the api service`.

- **Views** are routes; they compose features and own layout, not logic.
- **Features** (transaction entry, ledger, reports) own their local state and their formatting.
- **The API client** is the single place `fetch` appears. Response types mirror the `api` contract and are never redefined ad hoc in a component.

## State

- Local component state by default. A shared store only where state is genuinely cross-cutting — reach for it when two unrelated views need the same live data, not before.
- Server data is cached in the API-client layer, not duplicated into component state where it can drift.

## Money display — the client's half of the contract

The API sends `amount_minor` as a signed integer. This surface is responsible for turning that into something a human reads, and for turning what a human types back into an integer.

**The currency is VND and its exponent is 0** (ADR 0003 in the hub). One integer unit is **one đồng** — `1234` is ₫1.234. **There is no `/ 100` in this product, in any module.** Importing the "cents" reflex from other currencies is a 100× bug.

- **Formatting is centralized.** One module converts minor units to a display string; no component formats on its own. Output follows `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` — `1.234 ₫`, dot grouping thousands, ₫ suffixed, **never** decimal digits.
- **Never do arithmetic on formatted strings**, and never round for display in a way that changes a stored value.
- **Sign is shown, not assumed.** An outflow reads as an outflow (colour and sign), and the same amount never renders positive in one view and negative in another.
- **Input parsing is strict — and `.` is the *thousands* separator here.** `30.000` is thirty thousand đồng, and `12.345` is twelve thousand three hundred forty-five — both **valid**. What gets rejected, with a visible reason, is a decimal separator used as a decimal, a fractional amount, or malformed input. Never coerce, round, or truncate.

## Entry speed

Transaction entry is the screen that decides whether this tool survives. Keyboard-first, no modal that costs a click to open, sane defaults (today's date, last-used account). Treat a regression in entry speed as a bug, not a polish item.

## Styling

Tailwind utilities; shared design tokens over ad-hoc values. No inline magic numbers where a token exists.

*Last updated: 2026-08-22 (VND exponent-0 rules added per hub ADR 0003) — keep this stamp current in the same edit that changes content.*
