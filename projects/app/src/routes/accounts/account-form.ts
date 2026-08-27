/**
 * The account form's draft, and the rules that turn it into an `Account`.
 *
 * Same split as quick entry (`../ledger/quick-entry.ts`) and for the same
 * reason: the form component owns the fields, this module owns what is legal.
 * Create and edit run through this one function, so a rule cannot hold on
 * create and lapse on edit.
 *
 * The only amount here is the **opening balance**, and it goes through
 * `parseAmount` like every other amount in this product — dot groups thousands,
 * a decimal separator is a rejection with a reason, and there is no divide-by-100
 * anywhere near it.
 */

import type { Account, AccountKind } from '../../data/types';
import { parseAmount, type ParseAmountFailure } from '../../lib/money';

export interface AccountDraft {
  readonly name: string;
  readonly kind: AccountKind | '';
  /** What the user typed. `''` means "no opening balance", which is `0`. */
  readonly opening: string;
}

export const ACCOUNT_KINDS: readonly AccountKind[] = ['cash', 'bank', 'ewallet'];

export type AccountFailure = 'NAME_REQUIRED' | 'KIND_REQUIRED';

export type AccountFieldError =
  | { readonly field: 'name'; readonly reason: AccountFailure }
  | { readonly field: 'kind'; readonly reason: AccountFailure }
  | { readonly field: 'opening'; readonly reason: ParseAmountFailure };

export type AccountField = AccountFieldError['field'];

export type AccountDraftResult =
  | { readonly ok: true; readonly account: Omit<Account, 'id'> }
  | { readonly ok: false; readonly errors: readonly AccountFieldError[] };

export const emptyAccountDraft: AccountDraft = { name: '', kind: 'bank', opening: '' };

export function accountDraftFrom(account: Account): AccountDraft {
  return {
    name: account.name,
    kind: account.kind,
    // Deliberately the raw integer and not `formatAmountDigits`: an opening
    // balance may be NEGATIVE (a credit card, a debt), and the grouped-digits
    // helper is unsigned by contract. Typing the integer back is lossless and
    // `parseAmount` accepts it unchanged.
    opening: String(account.opening_balance_minor),
  };
}

/**
 * An empty opening-balance box means zero.
 *
 * This is a DEFAULT for an omitted field, not a coercion of something typed:
 * `parseAmount` still rejects `12,5`, `1.2345` and `30k` with a reason. Most
 * accounts are opened by someone who does not know last month's balance to the
 * đồng, and forcing a `0` to be typed buys nothing.
 */
function openingBalance(
  raw: string,
): { readonly ok: true; readonly amountMinor: number } | { readonly ok: false; readonly reason: ParseAmountFailure } {
  if (raw.trim() === '') return { ok: true, amountMinor: 0 };
  return parseAmount(raw);
}

export function accountDraftToAccount(
  draft: AccountDraft,
  archived: boolean,
): AccountDraftResult {
  const errors: AccountFieldError[] = [];

  const name = draft.name.trim();
  if (name === '') errors.push({ field: 'name', reason: 'NAME_REQUIRED' });
  if (draft.kind === '') errors.push({ field: 'kind', reason: 'KIND_REQUIRED' });

  const opening = openingBalance(draft.opening);
  if (!opening.ok) errors.push({ field: 'opening', reason: opening.reason });

  if (!opening.ok || draft.kind === '' || errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    account: {
      name,
      kind: draft.kind,
      opening_balance_minor: opening.amountMinor,
      // Archiving is its own action with its own undo — the form never changes
      // it, it only carries the value the account already had.
      archived,
    },
  };
}
