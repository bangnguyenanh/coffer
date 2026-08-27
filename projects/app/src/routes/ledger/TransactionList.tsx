import { useMemo } from 'react';
import type { Account, Category, Transaction } from '../../data/types';
import { ledgerCopy } from '../../copy/strings';
import { formatDayHeading } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
import { AmountCell } from './AmountCell';
import { categoryDotClass } from './category-color';

interface TransactionListProps {
  /** Already in ledger order (`occurred_on` descending) as `useLedger` sorted them. */
  readonly transactions: readonly Transaction[];
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
}

/**
 * The ledger, grouped by day — theme C (hub ADR 0005).
 *
 * This replaces the flat table. **Nothing about ORDER changed**: rows arrive in
 * ledger order and are grouped where the date changes, so the grouping is a
 * reading of the order, not a re-sort. This component still does not sort,
 * filter or slice.
 *
 * **The day subtotal is the one thing the table could not say.** Direction A in
 * the design canvas contributed it and C kept it: a day's rows add up to
 * something, and a ledger that never adds up leaves the arithmetic to the
 * reader. It is a sum of integer minor units — no floats, no scaling — rendered
 * through the same `AmountCell` as every other amount, so its sign, its colour
 * and its formatting cannot drift from the rows above it.
 *
 * `data-day`, `data-day-count` and `data-day-subtotal` (the raw signed integer)
 * are on the DOM so the grouping and its arithmetic are checkable rather than
 * merely visible.
 */
export function TransactionList({ transactions, accounts, categories }: TransactionListProps) {
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  /** Consecutive rows sharing `occurred_on`. The list is already in date order. */
  const days = useMemo(() => {
    const groups: { date: string; rows: Transaction[] }[] = [];
    for (const txn of transactions) {
      const last = groups[groups.length - 1];
      if (last !== undefined && last.date === txn.occurred_on) {
        last.rows.push(txn);
      } else {
        groups.push({ date: txn.occurred_on, rows: [txn] });
      }
    }
    return groups;
  }, [transactions]);

  return (
    <div data-transaction-list="">
      {days.map((day) => {
        // Integer addition in minor units. VND is exponent 0: nothing to scale,
        // nothing to round, and no float ever touches this.
        const subtotal = day.rows.reduce((sum, txn) => sum + txn.amount_minor, 0);

        return (
          <section
            key={day.date}
            data-day={day.date}
            data-day-count={day.rows.length}
            data-day-subtotal={subtotal}
            className="mt-3.5 first:mt-0"
          >
            <div className="flex items-baseline justify-between px-4 pb-1.5">
              <h2 className="eyebrow">{formatDayHeading(day.date)}</h2>
              <AmountCell
                amountMinor={subtotal}
                className="text-xs font-semibold"
                aria-label={ledgerCopy.dayTotalLabel.replace('{amount}', formatAmount(subtotal))}
              />
            </div>

            <ol>
              {day.rows.map((txn, index) => (
                <li
                  key={txn.id}
                  data-transaction-id={txn.id}
                  data-occurred-on={txn.occurred_on}
                  // Alternating fill, so a long day still reads row by row.
                  className={`grid grid-cols-[1fr_200px_170px] items-center gap-5 rounded-row px-4 py-2.5 ${
                    index % 2 === 0 ? 'bg-surface-raised' : ''
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-[15px]">
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-pill ${categoryDotClass(txn.category_id, categories)}`}
                    />
                    {txn.description}
                  </span>

                  <span className="text-[13px] text-ink-muted">
                    {txn.category_id === null ? (
                      // `null` is a first-class state, not missing data — so it
                      // is named, in the accent, rather than left blank.
                      <span className="font-medium text-brand">{ledgerCopy.uncategorized}</span>
                    ) : (
                      categoryNames.get(txn.category_id)
                    )}
                    {' · '}
                    {accountNames.get(txn.account_id) ?? ledgerCopy.unknownAccount}
                  </span>

                  <AmountCell
                    amountMinor={txn.amount_minor}
                    className="text-right text-base font-semibold"
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
