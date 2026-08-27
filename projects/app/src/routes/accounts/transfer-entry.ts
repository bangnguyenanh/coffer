/**
 * The transfer form's draft, and the rules that turn it into a `TransferInput`.
 *
 * ## The one thing this module is really about
 *
 * A transfer's direction is said by its two accounts — source and destination —
 * so the amount here is a **magnitude**, never a signed value. The signs are
 * applied in exactly one place, `addTransfer` in `src/state/AppDataProvider.tsx`:
 * negative out of the source, positive into the destination. A draft that could
 * arrive already-signed would be a draft that can move money the wrong way while
 * both accounts still read correctly on screen.
 *
 * That is why `parseAmount`'s sign is taken as `Math.abs` here and why the
 * form has no direction toggle: the direction control on this screen is the
 * pair of `<select>`s.
 *
 * Rejections are machine-readable and never coerced, the same contract quick
 * entry follows. Amount reasons come straight from `parseAmount`; the two rules
 * that are this form's own are `AMOUNT_ZERO` and `SAME_ACCOUNT`.
 */

import type { TransferInput } from '../../state/AppDataContext';
import { isCalendarDate } from '../../lib/calendar-date';
import { parseAmount, type ParseAmountFailure } from '../../lib/money';
import { transferCopy } from '../../copy/strings';

export interface TransferDraft {
  readonly amount: string;
  readonly from_account_id: string;
  readonly to_account_id: string;
  readonly description: string;
  readonly occurred_on: string;
}

export type TransferFailure =
  | 'SAME_ACCOUNT'
  | 'AMOUNT_ZERO'
  | 'ACCOUNT_REQUIRED'
  | 'DATE_INVALID';

export type TransferFieldError =
  | { readonly field: 'amount'; readonly reason: ParseAmountFailure | 'AMOUNT_ZERO' }
  | { readonly field: 'from_account_id'; readonly reason: TransferFailure }
  | { readonly field: 'to_account_id'; readonly reason: TransferFailure }
  | { readonly field: 'occurred_on'; readonly reason: TransferFailure };

export type TransferField = TransferFieldError['field'];

export type TransferDraftResult =
  | { readonly ok: true; readonly input: TransferInput }
  | { readonly ok: false; readonly errors: readonly TransferFieldError[] };

/**
 * The positive integer this draft would move, shown live under the amount box.
 *
 * The same anti-100x affordance quick entry has: `500000` previews as
 * `500.000 ₫` before anything is saved, so a mistyped magnitude is visible at
 * the moment it is typed rather than in a balance three screens later.
 */
export function transferDraftAmountMinor(
  draft: TransferDraft,
): { readonly ok: true; readonly amountMinor: number } | { readonly ok: false; readonly reason: ParseAmountFailure | 'AMOUNT_ZERO' } {
  const parsed = parseAmount(draft.amount);
  if (!parsed.ok) return parsed;
  const magnitude = Math.abs(parsed.amountMinor);
  // Zero is a real amount in this product (a fully refunded ride is `0`), but a
  // transfer of zero moves nothing between two accounts and would put two empty
  // rows in the ledger. It is refused with a reason, not silently dropped.
  if (magnitude === 0) return { ok: false, reason: 'AMOUNT_ZERO' };
  return { ok: true, amountMinor: magnitude };
}

/**
 * Validate a draft into the input `addTransfer` takes.
 *
 * `accountNames` is needed only for the default description — a transfer that
 * is not described still has to read as something in the ledger, and the two
 * accounts are what it is. Typing a description stays optional, which is what
 * keeps the keyboard path short.
 */
export function transferDraftToInput(
  draft: TransferDraft,
  accountNames: ReadonlyMap<string, string>,
): TransferDraftResult {
  const errors: TransferFieldError[] = [];

  const amount = transferDraftAmountMinor(draft);
  if (!amount.ok) errors.push({ field: 'amount', reason: amount.reason });

  const from = draft.from_account_id;
  const to = draft.to_account_id;
  if (from === '') errors.push({ field: 'from_account_id', reason: 'ACCOUNT_REQUIRED' });
  if (to === '') errors.push({ field: 'to_account_id', reason: 'ACCOUNT_REQUIRED' });
  if (from !== '' && from === to) {
    errors.push({ field: 'to_account_id', reason: 'SAME_ACCOUNT' });
  }

  if (!isCalendarDate(draft.occurred_on)) {
    errors.push({ field: 'occurred_on', reason: 'DATE_INVALID' });
  }

  if (!amount.ok || errors.length > 0) return { ok: false, errors };

  const typed = draft.description.trim();
  const description =
    typed === ''
      ? transferCopy.defaultDescription
          .replace('{from}', accountNames.get(from) ?? transferCopy.unknownAccount)
          .replace('{to}', accountNames.get(to) ?? transferCopy.unknownAccount)
      : typed;

  return {
    ok: true,
    input: {
      from_account_id: from,
      to_account_id: to,
      amount_minor: amount.amountMinor,
      occurred_on: draft.occurred_on,
      description,
    },
  };
}
