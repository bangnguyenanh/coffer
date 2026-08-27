/**
 * Quick entry — the rules, with no React in them.
 *
 * Hub ticket 0003 phase 4. Entry speed is this product's stated feature
 * (`CLAUDE.md`: *"Slow transaction entry is what kills a finance tool in week
 * three"*), so the design target here is keystrokes and thinking, not "does the
 * form submit".
 *
 * ## Direction is typed, not toggled
 *
 * The money contract says sign IS direction — outflow negative, inflow positive,
 * and neither the account nor the category may imply it. This module holds
 * direction as its own field, and the amount box's LEADING SIGN is a control on
 * that field rather than a multiplier:
 *
 *   - the draft starts at `outflow`, because a spending log is overwhelmingly
 *     spending, so the common case costs zero keystrokes;
 *   - typing a leading `+` sets `inflow`, a leading `-` sets `outflow`, so a
 *     fast typist expresses direction without leaving the amount box;
 *   - the final amount is ALWAYS `direction sign × magnitude`. There is no path
 *     where two signs multiply into a direction nobody chose.
 *
 * Because the sign is a control and not arithmetic, the toggle can always
 * display the truth, which is what stops income being filed as an expense at
 * speed. See `directionFromAmountInput`.
 *
 * ## Money
 *
 * Every amount goes through `src/lib/money.ts`. VND is exponent 0 — `1234` is
 * ₫1.234 — so there is no `/ 100`, no `toFixed`, and no scaling anywhere in this
 * file. Parsing REJECTS with a reason; nothing here rounds, truncates, or
 * reinterprets what was typed.
 *
 * ## Shape — and the edit half, now built
 *
 * The rules live here as a pure `EntryDraft -> Omit<Transaction,'id'>` function
 * rather than inside the component, and the edit half of phase 4 cashed that in
 * exactly as predicted: the inline row editor is **the same draft seeded from an
 * existing row** (`draftFromTransaction`) running through **the same**
 * `draftToTransaction`. This module gained no mode flag, no `isEdit`, and no
 * second validation path — which is the whole reason a decimal separator cannot
 * be rejected on entry and coerced on edit. There is only one rule set.
 */

import type { Transaction } from '../../data/types';
import { isCalendarDate } from '../../lib/calendar-date';
import { formatAmountDigits, parseAmount, type ParseAmountFailure } from '../../lib/money';

/** Outflow or inflow. The word the UI shows is `Chi` / `Thu`; see copy/strings.ts. */
export type Direction = 'outflow' | 'inflow';

export const DEFAULT_DIRECTION: Direction = 'outflow';

/** `''` in `category_id` means SKIPPED, which is a first-class state here. */
export interface EntryDraft {
  /** Exactly what the user typed, sign and all. Never normalized behind their back. */
  readonly amount: string;
  readonly direction: Direction;
  readonly description: string;
  readonly account_id: string;
  /** `''` = deliberately skipped -> the row is saved uncategorized (phase 5 triages it). */
  readonly category_id: string;
  readonly occurred_on: string;
}

/** Reasons that are not about the amount. Amount reasons come from the money module. */
export type EntryFailure = 'DESCRIPTION_REQUIRED' | 'DATE_INVALID' | 'ACCOUNT_REQUIRED';

export type EntryFieldError =
  | { readonly field: 'amount'; readonly reason: ParseAmountFailure }
  | { readonly field: 'description'; readonly reason: EntryFailure }
  | { readonly field: 'occurred_on'; readonly reason: EntryFailure }
  | { readonly field: 'account_id'; readonly reason: EntryFailure };

export type EntryField = EntryFieldError['field'];

export type DraftResult =
  | { readonly ok: true; readonly transaction: Omit<Transaction, 'id'> }
  | { readonly ok: false; readonly errors: readonly EntryFieldError[] };

/** The sign that a direction contributes. Outflow is negative — the contract, verbatim. */
export function directionSign(direction: Direction): -1 | 1 {
  return direction === 'outflow' ? -1 : 1;
}

/**
 * The direction the amount box is currently asserting, or `null` if it asserts
 * none (no leading sign — the draft's own direction stands).
 *
 * Leading whitespace is ignored so a pasted value behaves like a typed one.
 */
export function directionFromAmountInput(input: string): Direction | null {
  const first = input.trimStart()[0];
  if (first === '-') return 'outflow';
  if (first === '+') return 'inflow';
  return null;
}

/**
 * The signed integer this draft would store, or the money module's rejection.
 *
 * The magnitude comes from `parseAmount` and the sign comes from `direction` —
 * never from the account, never from the category, and never from multiplying
 * two signs together.
 */
export function draftAmountMinor(draft: EntryDraft):
  | { readonly ok: true; readonly amountMinor: number }
  | { readonly ok: false; readonly reason: ParseAmountFailure } {
  const parsed = parseAmount(draft.amount);
  if (!parsed.ok) return parsed;
  // `parseAmount` already applied any sign the user typed; take the magnitude
  // and re-apply the draft's direction, which that same sign has already set.
  const magnitude = Math.abs(parsed.amountMinor);
  return { ok: true, amountMinor: directionSign(draft.direction) * magnitude || 0 };
}

/**
 * Turn a draft into the row that gets appended, or into the list of reasons it
 * cannot be. Every reason is machine-readable; the Vietnamese lives in
 * `src/copy/strings.ts`.
 *
 * Order matters only for which field gets focused on a failed submit — the
 * caller focuses the first error, and amount is first because it is the field
 * the user is already in.
 */
export function draftToTransaction(draft: EntryDraft): DraftResult {
  const errors: EntryFieldError[] = [];

  const amount = draftAmountMinor(draft);
  if (!amount.ok) errors.push({ field: 'amount', reason: amount.reason });

  const description = draft.description.trim();
  if (description === '') {
    errors.push({ field: 'description', reason: 'DESCRIPTION_REQUIRED' });
  }

  if (!isCalendarDate(draft.occurred_on)) {
    errors.push({ field: 'occurred_on', reason: 'DATE_INVALID' });
  }

  if (draft.account_id === '') {
    errors.push({ field: 'account_id', reason: 'ACCOUNT_REQUIRED' });
  }

  if (!amount.ok || errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    transaction: {
      occurred_on: draft.occurred_on,
      amount_minor: amount.amountMinor,
      description,
      account_id: draft.account_id,
      // Skipping is a decision, recorded as `null` — the state phase 5 triages.
      category_id: draft.category_id === '' ? null : draft.category_id,
      // Quick entry never produces a transfer: a transfer has two accounts and
      // this form has one. Transfers are minted by `addTransfer` alone (ticket
      // 0004 phase 2), and stating `null` here is what makes that structural
      // rather than a convention — the field is required on `Transaction`, so
      // this is a decision the compiler forces every writer to make.
      transfer_id: null,
    },
  };
}

/**
 * The draft to start the next entry from.
 *
 * Amount, description and category reset; **direction, account and date stay**.
 * Somebody logging a day's spending enters several rows from the same wallet on
 * the same day, so re-picking those every time is the friction that makes an
 * entry form feel slow. Category resets rather than sticking because carrying a
 * category forward is how a wrong one gets applied silently.
 */
export function nextDraft(previous: EntryDraft): EntryDraft {
  return {
    ...previous,
    amount: '',
    description: '',
    category_id: '',
  };
}

/**
 * The draft that opens an existing row for editing — the inverse of
 * `draftToTransaction`, and required to round-trip through it exactly.
 *
 * Two things it deliberately does:
 *
 *   - **The amount box gets the MAGNITUDE, grouped, with no sign and no symbol**
 *     (`formatAmountDigits`). The sign is not thrown away: it becomes
 *     `direction`, which is where the contract says direction lives. If the sign
 *     were left in the box, the toggle and the box could disagree — the exact
 *     failure `directionFromAmountInput` exists to prevent.
 *   - **Zero opens as `outflow`.** Zero has no direction, so there is no right
 *     answer; outflow is the entry default, and `draftAmountMinor` collapses
 *     `-1 * 0` back to `0`, so a zero row opened and saved untouched is still
 *     zero and still renders neutral.
 *
 * `category_id: null` becomes `''`, the draft's "skipped" value, so an
 * uncategorised row opens on the same `Chưa phân loại` option quick entry
 * defaults to — and can be left there.
 */
export function draftFromTransaction(txn: Transaction): EntryDraft {
  return {
    amount: formatAmountDigits(txn.amount_minor),
    direction: txn.amount_minor > 0 ? 'inflow' : 'outflow',
    description: txn.description,
    account_id: txn.account_id,
    category_id: txn.category_id ?? '',
    occurred_on: txn.occurred_on,
  };
}
