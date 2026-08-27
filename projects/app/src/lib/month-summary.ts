/**
 * The month summary and the month's spending by category — hub ticket 0004
 * phase 4, the arithmetic half of theme C's month band.
 *
 * ## Transfers are excluded from EVERY figure in this file
 *
 * In, out, net, the transaction count, and every category segment. This is the
 * rule that has already leaked into four consumers (`src/lib/transfers.ts`), and
 * a month-scoped total is exactly where it leaks next: `spendingTotalMinor`
 * proved the exclusion for the all-time total in phase 2, and none of that
 * carries over to a number scoped to a month unless it is written again. So it
 * is written once, HERE, and every figure in this file goes through
 * `isSpendable` — nothing re-derives `transfer_id !== null` inline.
 *
 * `transferLegCount` is exported for the same reason the accounts screen renders
 * one: an exclusion nobody can count is an exclusion nobody can check. It is the
 * number that MOVES when a transfer is made while every other number holds
 * still, which is what turns "transfers are excluded" from a claim into evidence.
 *
 * ## Signs are kept, aggregates included
 *
 * `outMinor` is NEGATIVE and every category slice is NEGATIVE, because sign is
 * direction in this product and an aggregate does not get to drop it
 * (documents/design-system.md §3.3). `netMinor` is simply `inMinor + outMinor` —
 * a subtraction of magnitudes would be the same number derived a second way, and
 * the second way is the one that eventually disagrees.
 *
 * Nothing here formats. Integer minor units throughout — VND is exponent 0, so
 * there is nothing to scale and no float ever touches a total. The only division
 * in this file is `share`, which is a BAR WIDTH and never an amount.
 */

import type { Category, Transaction } from '../data/types';
import { monthKeyOf, type MonthKey } from './calendar-date';
import { isSpendable, isTransfer } from './transfers';

/** In / out / net for one month, transfers excluded. */
export interface MonthSummary {
  readonly month: MonthKey;
  /** Positive. The month's inflows. */
  readonly inMinor: number;
  /** NEGATIVE. The month's outflows — the headline figure. */
  readonly outMinor: number;
  /** `inMinor + outMinor`. Rendered through `formatAmount`, which emits no `+`. */
  readonly netMinor: number;
  /** How many rows the three figures are over. Transfers are not among them. */
  readonly txnCount: number;
  /** How many transfer legs fell in this month and were LEFT OUT of all of it. */
  readonly transferLegCount: number;
}

/** Every month that has at least one row, most recent first. */
export function monthsPresent(transactions: readonly Transaction[]): readonly MonthKey[] {
  const months = new Set<MonthKey>();
  for (const txn of transactions) months.add(monthKeyOf(txn.occurred_on));
  return [...months].sort().reverse();
}

export function monthSummary(
  transactions: readonly Transaction[],
  month: MonthKey,
): MonthSummary {
  let inMinor = 0;
  let outMinor = 0;
  let txnCount = 0;
  let transferLegCount = 0;

  for (const txn of transactions) {
    if (monthKeyOf(txn.occurred_on) !== month) continue;
    if (isTransfer(txn)) {
      transferLegCount += 1;
      continue;
    }
    txnCount += 1;
    if (txn.amount_minor > 0) inMinor += txn.amount_minor;
    else outMinor += txn.amount_minor;
  }

  return { month, inMinor, outMinor, netMinor: inMinor + outMinor, txnCount, transferLegCount };
}

/**
 * One segment of the allocation bar.
 *
 * `categoryId: null` is the uncategorised slice — a STATE, not a category
 * (design-system.md §3.7), which is why it is a separate field rather than a
 * `Category` with a placeholder name.
 */
export interface CategorySlice {
  readonly categoryId: string | null;
  readonly name: string | null;
  /** NEGATIVE integer, minor units. The slices sum to `MonthSummary.outMinor`. */
  readonly amountMinor: number;
  /** `0`–`1` of the month's outflow. A bar width, never an amount. */
  readonly share: number;
}

/**
 * The month's OUTFLOWS, grouped by category. Inflows are not in this bar:
 * "where did the money go" is a question about money that left.
 *
 * **Uncategorised is always first**, whatever its size. The artboard draws it
 * first because it happened to be widest; making it first by RULE is what keeps
 * the bar readable when it is not — a state that changes position depending on
 * how bad it is, is a state nobody can find twice.
 *
 * Everything after it is ordered by magnitude, then by name so a tie is stable.
 *
 * **The slices sum to `outMinor` exactly** — no bucket, no "other", no rounding.
 * A tail category is a thin segment rather than a number folded into something
 * else, because this bar is the evidence that the month's spending adds up.
 */
export function spendingByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: MonthKey,
): readonly CategorySlice[] {
  const names = new Map(categories.map((category) => [category.id, category.name]));

  let uncategorized = 0;
  const byCategory = new Map<string, number>();

  for (const txn of transactions) {
    if (monthKeyOf(txn.occurred_on) !== month) continue;
    // The exclusion, again and in one place: a transfer leg is stored
    // `category_id: null`, so without this it would land in the uncategorised
    // segment and inflate the very number the band exists to make honest.
    if (!isSpendable(txn)) continue;
    if (txn.amount_minor >= 0) continue;

    if (txn.category_id === null) {
      uncategorized += txn.amount_minor;
      continue;
    }
    byCategory.set(txn.category_id, (byCategory.get(txn.category_id) ?? 0) + txn.amount_minor);
  }

  const total = uncategorized + [...byCategory.values()].reduce((sum, n) => sum + n, 0);
  // No spending means no bar. A zero denominator would make every share `NaN`
  // and every segment width the string `NaN%`.
  const shareOf = (amount: number): number => (total === 0 ? 0 : amount / total);

  const named: CategorySlice[] = [...byCategory.entries()]
    .map(([categoryId, amountMinor]) => ({
      categoryId,
      name: names.get(categoryId) ?? null,
      amountMinor,
      share: shareOf(amountMinor),
    }))
    .sort((a, b) => {
      if (a.amountMinor !== b.amountMinor) return a.amountMinor - b.amountMinor;
      return (a.name ?? '').localeCompare(b.name ?? '', 'vi');
    });

  if (uncategorized === 0) return named;
  return [
    {
      categoryId: null,
      name: null,
      amountMinor: uncategorized,
      share: shareOf(uncategorized),
    },
    ...named,
  ];
}

/**
 * The month's uncategorised outflow — the number the band exists to surface.
 *
 * Split out rather than read off the slice list because the band asks it even
 * when there is no bar to draw, and a caller that has to find "the slice whose
 * id is null" is a caller that will one day find the first slice instead.
 */
export function uncategorizedOutMinor(slices: readonly CategorySlice[]): number {
  return slices.find((slice) => slice.categoryId === null)?.amountMinor ?? 0;
}
