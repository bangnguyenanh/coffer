/**
 * The money module — the client's half of the money contract.
 *
 * Hub CLAUDE.md + ADR 0003: the currency is VND and its ISO 4217 exponent is 0.
 * One integer unit of `amount_minor` is ONE ĐỒNG. `1234` is ₫1.234, not ₫12.34.
 *
 * Consequences that this module exists to enforce:
 *   - There is NO subunit, so there is no `/ 100` and no `toFixed(2)` here or
 *     anywhere downstream. A divide-by-100 is a 100x bug, not a conversion.
 *   - `.` is the THOUSANDS separator in Vietnamese convention: `30.000` is
 *     thirty thousand đồng. Reading it as a decimal is a 1000x bug.
 *   - Parsing rejects with a machine-readable reason; it never coerces, rounds,
 *     or truncates a value the user typed.
 *
 * This is the only place a currency symbol or digit grouping is allowed to
 * appear. No component formats or parses on its own.
 */

/** ISO 4217 exponent for VND. Zero: the minor unit IS the major unit. */
export const CURRENCY_EXPONENT = 0;

/** ISO 4217 code. Single-currency product — ADR 0003. */
export const CURRENCY_CODE = 'VND';

/** Locale that owns the display convention: dot groups thousands, symbol suffixed. */
export const CURRENCY_LOCALE = 'vi-VN';

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  // Pinned off the exponent, not off a literal. Exponent 0 => never any
  // decimal digits, in either direction.
  minimumFractionDigits: CURRENCY_EXPONENT,
  maximumFractionDigits: CURRENCY_EXPONENT,
});

/**
 * The same number, grouped but bare: no symbol, no sign, no fraction digits.
 * Used only by `formatAmountDigits` below.
 */
const digitsFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'decimal',
  minimumFractionDigits: CURRENCY_EXPONENT,
  maximumFractionDigits: CURRENCY_EXPONENT,
  useGrouping: true,
});

/**
 * The currency symbol, taken from the formatter rather than typed in, so there
 * is exactly one source for it in the codebase.
 *
 * **Exported** since ticket 0005: theme C's quick-entry row sets the symbol
 * beside the amount box as a static adornment. That is the ONLY reason to reach
 * for it — a component that needs an amount RENDERED still calls `formatAmount`,
 * which supplies grouping, sign and symbol together. Typing `₫` into a component
 * remains a bug (documents/coding-conventions.md → Strings).
 */
export const CURRENCY_SYMBOL: string =
  currencyFormatter.formatToParts(0).find((part) => part.type === 'currency')?.value ?? CURRENCY_CODE;

/** The grouping separator the formatter emits (`.` for vi-VN). */
const GROUP_SEPARATOR: string =
  currencyFormatter.formatToParts(1000).find((part) => part.type === 'group')?.value ?? '.';

/**
 * The separator that means "a fraction follows" in this locale (`,` for vi-VN).
 * Exponent 0 means a fraction is never representable, so seeing this is a reject.
 */
const DECIMAL_SEPARATOR: string = new Intl.NumberFormat(CURRENCY_LOCALE)
  .formatToParts(1.1)
  .find((part) => part.type === 'decimal')?.value ?? ',';

/**
 * Turn a signed integer amount in minor units into a display string.
 *
 * `30000` -> `30.000 ₫`. Sign is rendered, never dropped: an outflow reads as
 * an outflow. Throws on a non-integer — a fractional amount reaching here is a
 * programming error upstream, not something to round away.
 */
export function formatAmount(amountMinor: number): string {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(
      `formatAmount expects an integer in minor units (${CURRENCY_CODE} exponent ${CURRENCY_EXPONENT}); received ${amountMinor}`,
    );
  }
  return currencyFormatter.format(amountMinor);
}

/**
 * The GROUPED DIGITS of an amount, unsigned and without the currency symbol —
 * `-1250000000` -> `1.250.000.000`.
 *
 * This exists for exactly one job: seeding the amount box of the inline row
 * editor (hub ticket 0003 phase 4, edit half) so an existing row opens showing
 * the number the way the ledger showed it, rather than as ten ungrouped digits.
 *
 * It lives HERE rather than in the editor because grouping is this module's job
 * and nowhere else's (documents/design-system.md §3.2). Two properties it is
 * required to have, and both are checked:
 *   - it round-trips: `parseAmount(formatAmountDigits(n)).amountMinor === |n|`,
 *     so opening an editor and saving it unchanged cannot alter a stored value;
 *   - it is unsigned, because DIRECTION is a separate field in the draft and a
 *     sign in the box is a control on that field, never a multiplier.
 *
 * Exponent 0: no scaling, no rounding, and never a fractional digit.
 */
export function formatAmountDigits(amountMinor: number): string {
  if (!Number.isInteger(amountMinor)) {
    throw new TypeError(
      `formatAmountDigits expects an integer in minor units; received ${amountMinor}`,
    );
  }
  return digitsFormatter.format(Math.abs(amountMinor));
}

/** Machine-readable rejection reasons. Copy for these lives in src/copy/strings.ts. */
export type ParseAmountFailure =
  | 'EMPTY'
  | 'DECIMAL_NOT_ALLOWED'
  | 'MALFORMED_GROUPING'
  | 'INVALID_CHARACTERS'
  | 'OUT_OF_RANGE';

export type ParseAmountResult =
  | { readonly ok: true; readonly amountMinor: number }
  | { readonly ok: false; readonly reason: ParseAmountFailure };

/** Digits only: `30000`. */
const PLAIN_DIGITS = /^\d+$/;
/** Correctly grouped: `30.000`, `12.345`, `1.000.000.000`. */
const GROUPED_DIGITS = /^\d{1,3}(?:\.\d{3})*$/;
/** Looks like a fractional amount: `12.34`, `.5` — the imported "cents" reflex. */
const FRACTION_SHAPED = /^\d*\.\d{1,2}$/;
/** Only digits and separators, but the grouping does not hold: `1.2345`. */
const DIGITS_AND_GROUPS = /^[\d.]+$/;

/**
 * Turn what a human typed into a signed integer in minor units.
 *
 * Accepts: `30000`, `30.000` (= 30000), `12.345` (= 12345), a leading `-` or
 * `+`, the formatter's own output (`30.000 ₫`), and surrounding whitespace.
 *
 * Rejects — with a reason, never a coerced value: a decimal separator used as a
 * decimal, a fractional amount, broken grouping, shorthand such as `30k`
 * (declined in ADR 0003), and anything outside the safe-integer range.
 */
export function parseAmount(input: string): ParseAmountResult {
  // Strip the module's own output so format -> parse round-trips: the currency
  // symbol and every flavour of space, including the U+00A0 Intl emits.
  let candidate = input.replaceAll(CURRENCY_SYMBOL, '').replace(/\s/gu, '');

  if (candidate.length === 0) {
    return { ok: false, reason: 'EMPTY' };
  }

  // In this locale the decimal separator is `,`. Exponent 0 means there is no
  // fraction to express, so its presence is a reject rather than a rounding.
  if (candidate.includes(DECIMAL_SEPARATOR)) {
    return { ok: false, reason: 'DECIMAL_NOT_ALLOWED' };
  }

  let sign = 1;
  const first = candidate[0];
  if (first === '-' || first === '+') {
    sign = first === '-' ? -1 : 1;
    candidate = candidate.slice(1);
  }

  let digits: string;
  if (PLAIN_DIGITS.test(candidate)) {
    digits = candidate;
  } else if (GROUPED_DIGITS.test(candidate)) {
    digits = candidate.replaceAll(GROUP_SEPARATOR, '');
  } else if (FRACTION_SHAPED.test(candidate)) {
    // `12.34` — a thousands separator used as a decimal point.
    return { ok: false, reason: 'DECIMAL_NOT_ALLOWED' };
  } else if (DIGITS_AND_GROUPS.test(candidate)) {
    return { ok: false, reason: 'MALFORMED_GROUPING' };
  } else {
    return { ok: false, reason: 'INVALID_CHARACTERS' };
  }

  const magnitude = Number(digits);
  if (!Number.isSafeInteger(magnitude)) {
    return { ok: false, reason: 'OUT_OF_RANGE' };
  }

  // `magnitude` is already the đồng value: exponent 0, so there is nothing to
  // scale. `|| 0` collapses -0 to 0.
  return { ok: true, amountMinor: sign * magnitude || 0 };
}
