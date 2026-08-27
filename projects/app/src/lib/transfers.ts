/**
 * What a transfer is, and the one place that says a transfer is not spending.
 *
 * ## The model built here is PROVISIONAL (hub ticket 0004 phase 2)
 *
 * A transfer is a **linked pair**: two ordinary transactions sharing one
 * `transfer_id`, negative in the source account and positive in the
 * destination. The alternative shape — a single row with a counter-account
 * column — is still live, and the choice is an open ADR in the hub's
 * `decisions/CANDIDATES.md` that must be resolved before `api` writes the
 * migration. This module exists so that the shape can change without the RULE
 * having to be found again in six screens.
 *
 * ## The rule
 *
 * Moving ₫500.000 from a bank account to Momo is the same money in a different
 * place. If the product does not model that, **every spending total is inflated
 * by every transfer the Owner makes** — and here cash, bank and e-wallet are all
 * in daily use, so that is the common case, not an edge case.
 *
 * So a row carrying a `transfer_id` is excluded from:
 *
 *   - **spending totals** — `spendingTotalMinor` below;
 *   - **category breakdowns** — a transfer has no category and never gets one;
 *   - **the uncategorised count and the triage inbox** — `needsCategory` below.
 *     This one is easy to miss and it bites immediately: both legs are stored
 *     with `category_id: null`, so without this rule every transfer would land
 *     in the inbox asking to be filed under something it can never be.
 *
 * What it is deliberately NOT excluded from: the ledger (a transfer is real and
 * has to be visible), an account's balance (the money genuinely moved), and the
 * ledger's per-day subtotal, which is a NET of the day and where a transfer's
 * two legs cancel each other out on their own.
 *
 * Nothing here formats or renders. Integer minor units throughout — VND is
 * exponent 0, so there is nothing to scale and no float ever touches a total.
 */

import type { Transaction } from '../data/types';

/** Is this row one leg of a transfer? */
export function isTransfer(txn: Transaction): boolean {
  return txn.transfer_id !== null;
}

/**
 * Does this row count as spending or income?
 *
 * The inverse of `isTransfer`, named for what callers actually ask. Reads at the
 * call site as the rule rather than as a null check.
 */
export function isSpendable(txn: Transaction): boolean {
  return txn.transfer_id === null;
}

/**
 * Is this row waiting to be categorised?
 *
 * `category_id === null` is not enough: a transfer leg is stored uncategorised
 * and must never be offered for filing.
 */
export function needsCategory(txn: Transaction): boolean {
  return txn.category_id === null && txn.transfer_id === null;
}

/**
 * Total spending, as a NEGATIVE integer in minor units — outflows only, and
 * transfers excluded.
 *
 * Negative because sign is direction in this product and an aggregate does not
 * get to drop it (design-system.md §3.3). `formatAmount` renders it with the
 * minus and `AmountCell` colours it as an outflow; nothing adds a `+` anywhere,
 * which stays Owner-gated.
 *
 * This is the number hub ticket 0004 phase 2 has to prove does NOT move when
 * money is transferred. It is deliberately not a month figure: the month band
 * and every month-scoped summary belong to phase 4.
 */
export function spendingTotalMinor(transactions: readonly Transaction[]): number {
  return transactions.reduce(
    (sum, txn) => (isSpendable(txn) && txn.amount_minor < 0 ? sum + txn.amount_minor : sum),
    0,
  );
}

/** How many rows that total is over. Rendered beside it as evidence. */
export function spendingRowCount(transactions: readonly Transaction[]): number {
  return transactions.filter((txn) => isSpendable(txn) && txn.amount_minor < 0).length;
}

/**
 * For every transfer leg, the OTHER leg — keyed by the leg's own id.
 *
 * A ledger row has to render a transfer as movement (`Vietcombank → Ví Momo`),
 * and one leg alone cannot say where the money went. The lookup is built from
 * the FULL transaction list rather than from the rows on screen, because the
 * sibling may be filtered out of the view the row is rendering in — a filter
 * that hides one leg must not turn the other into a mystery.
 *
 * A `transfer_id` with only one leg present yields no entry rather than a
 * guess; the row then renders as a transfer with no counter-account named,
 * which is the honest thing to show for a state that should not exist.
 */
export function transferCounterpartsById(
  transactions: readonly Transaction[],
): ReadonlyMap<string, Transaction> {
  const legsByTransfer = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    if (txn.transfer_id === null) continue;
    const legs = legsByTransfer.get(txn.transfer_id);
    if (legs === undefined) legsByTransfer.set(txn.transfer_id, [txn]);
    else legs.push(txn);
  }

  const counterparts = new Map<string, Transaction>();
  for (const legs of legsByTransfer.values()) {
    if (legs.length !== 2) continue;
    const [first, second] = legs;
    if (first === undefined || second === undefined) continue;
    counterparts.set(first.id, second);
    counterparts.set(second.id, first);
  }
  return counterparts;
}
