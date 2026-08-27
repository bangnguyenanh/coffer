/**
 * An account's balance — DERIVED, every time, and never stored.
 *
 * Hub ticket 0001 makes a cached balance column an explicit non-goal, and hub
 * ticket 0004's contract repeats it: *"No `balance` field on an account — it is
 * derived, here and in the eventual API."* The reason is not tidiness. A stored
 * balance is a second copy of a number the ledger already answers, and the day
 * the two disagree the ledger is right and the account page is lying — with no
 * way for a reader to tell which one they are looking at.
 *
 * So: opening balance, plus every transaction in that account. Integer addition
 * in minor units. VND is exponent 0 (hub ADR 0003), so there is nothing to
 * scale, nothing to round, and no float ever touches this file.
 *
 * **Transfers ARE included**, deliberately. A transfer is excluded from
 * SPENDING (`src/lib/transfers.ts`) because it is not money spent — but the
 * money genuinely left one account and arrived in another, so a balance that
 * ignored it would be wrong. That difference is the whole point of phase 2: the
 * balances move, the spending total does not.
 */

import type { Account, Transaction } from '../data/types';

/** One account's balance: opening balance plus its rows. */
export function accountBalanceMinor(
  account: Account,
  transactions: readonly Transaction[],
): number {
  return transactions.reduce(
    (sum, txn) => (txn.account_id === account.id ? sum + txn.amount_minor : sum),
    account.opening_balance_minor,
  );
}

/** How many transactions an account holds. Rendered beside the balance. */
export function accountTransactionCount(
  account: Account,
  transactions: readonly Transaction[],
): number {
  return transactions.filter((txn) => txn.account_id === account.id).length;
}

/**
 * Every account's balance, in one pass over the transactions.
 *
 * The list is walked ONCE rather than once per account: the accounts screen
 * renders every balance at the same moment, and per-account filtering there is
 * O(accounts × transactions) for a number that is the same either way.
 */
export function accountBalancesById(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): ReadonlyMap<string, number> {
  const balances = new Map<string, number>(
    accounts.map((account) => [account.id, account.opening_balance_minor]),
  );
  for (const txn of transactions) {
    const current = balances.get(txn.account_id);
    // A row pointing at an account that is not in the list is skipped rather
    // than folded into some other account's number.
    if (current === undefined) continue;
    balances.set(txn.account_id, current + txn.amount_minor);
  }
  return balances;
}

/**
 * Everything the given accounts hold, added up.
 *
 * A sum across accounts, NOT a month figure — the month summary and the month
 * band are phase 4's, and nothing here is scoped to a period. It answers the
 * accounts screen's own question: *how much do I have.*
 */
export function totalBalanceMinor(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): number {
  const balances = accountBalancesById(accounts, transactions);
  let total = 0;
  for (const account of accounts) total += balances.get(account.id) ?? 0;
  return total;
}
