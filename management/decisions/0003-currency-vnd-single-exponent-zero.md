# ADR 0003: Coffer is single-currency VND, and VND's exponent is zero

**Status:** Accepted
**Date:** 2026-08-22
**Owner:** Kevin

## Context

CANDIDATES carried the question *"Multi-currency, or one currency forever?"*, flagged as needing an answer **before the ledger holds real data**, because adding a currency dimension later is both a schema change and an API contract change. The Owner resolved it on 2026-08-22: Vietnamese đồng is the only currency this product needs.

That answer would have been unremarkable except for a property of VND that collides with the money contract as previously written. **ISO 4217 assigns VND an exponent of 0.** Its historical subunits — hào (1/10) and xu (1/100) — have been obsolete for decades, killed by inflation. For VND there is no minor unit distinct from the major unit: ₫1 is the smallest representable amount.

The money contract in CLAUDE.md stated the rule with a USD worked example: *"Amounts are integers in minor units (cents)… `1234` is $12.34."* Read literally under VND, `1234` is **₫1.234**, not ₫12.34. Any implementation that inherited the divide-by-100 implicit in "cents" would have been wrong by a factor of 100 on **every amount in the system** — in the DB, over the API, and on screen.

This was caught before any code existed. [Backlog 0001](../backlog/0001-api-ledger-foundation.md) (schema) and [0002](../backlog/0002-app-shell-and-money-formatting.md) (the money formatting module) were both `Open — not started`, so there is no schema to migrate, no stored data to rescale, and no released contract to break. The correction is free here and would not have been later; that timing is the whole reason this ADR is worth its length.

## Decision

**Coffer is single-currency. The currency is VND, and its exponent is 0** — one integer unit in the system is one đồng. There is no per-row currency field, no currency column, and no conversion anywhere in the product.

Three consequences are pinned as contract, not left to implementations:

1. **The field name stays `amount_minor`.** When the exponent is 0 the minor unit *is* the major unit, so the name remains ISO-correct — and it keeps signalling the discipline that matters (an integer in the currency's smallest unit, never a decimal). Renaming it to `amount_dong` would bake the currency into every field name across DB, API and client; renaming it to `amount` would drop the signal that guards against floats.
2. **Display follows Vietnamese convention:** `1.234 ₫` — dot as the *thousands* separator, ₫ suffixed, **never** a decimal separator or decimal digits. This matches `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
3. **Input parsing is strict and rejects, never coerces.** Because `.` means *thousands* here, `30.000` is thirty thousand đồng. A typed decimal separator, a fractional amount, or any malformed input is rejected with a reason — it is never rounded, truncated, or silently reinterpreted.

Shorthand entry (`30k` → 30,000) was considered and **declined**: the parser guarding the money contract is the one place drift is most dangerous, and it stays as small as possible. It can be revisited once the base entry flow is proven.

## Alternatives considered

- **Keep multi-currency open / add a per-row currency field:** rejected. The Owner has no second currency in play, and speculative generality here costs a currency dimension in every query, every response, and every formatting call — permanently, to serve a case that may never arrive.
- **Store VND in hundredths anyway** (treat ₫1 as `100`) so the "cents" mental model survives untouched: rejected. It invents a subunit the currency does not have, makes every stored number 100× larger than the thing it represents, and guarantees that someone eventually reads the raw column and misinterprets it. The database should hold đồng.
- **A configurable currency exponent** read from config by the formatter: rejected as speculative generality. The decision just made is "one currency forever". The exponent is pinned as a single named constant — one place to change if that is ever revisited, without a config surface pretending the product is multi-currency.
- **English number convention (`₫1,234`):** rejected. It fights local reading habit on every entry, and entry speed is a stated product feature.

## Consequences

- **Easier:** no currency column, no conversion, no rate source, no per-row currency in any response. Every amount in the system means the same thing.
- **Easier:** amounts are *smaller* than the cents model would make them. VND personal-finance magnitudes reach ~10⁹, far inside JavaScript's ~9×10¹⁵ safe-integer ceiling, so `bigint` in Postgres → JSON `number` stays safe with wide headroom. No string-encoded amounts needed.
- **Harder / to watch:** the dot-as-thousands rule is the sharpest edge in the product. `30.000` meaning thirty thousand is correct here and would be a 1000× error under English convention. **Every parser test must cover it**, and any future contributor reading `amount_minor` as "cents" is the failure mode this ADR exists to prevent — which is why the exponent is stated in the money contract itself, not only here.
- **Harder / to watch:** reversing this to multi-currency later is exactly the schema + contract change CANDIDATES warned about. It gets more expensive with every row of real data. If a second currency ever comes into play, it supersedes this ADR — it does not get patched around.
- **Supersedes nothing.** [ADR 0001](0001-surfaces-and-stack.md) established money as integer minor units; that still holds. This ADR resolves *which* currency and pins its exponent, correcting the USD example the rule was illustrated with.
