import { useMemo } from 'react';
import type { Account, Category, Transaction } from '../../api/types';
import { ledgerCopy } from '../../copy/strings';
import { formatCalendarDate } from '../../lib/calendar-date';
import { AmountCell } from './AmountCell';

interface TransactionTableProps {
  /** Already in ledger order (`occurred_on` descending) as the server returned them. */
  readonly transactions: readonly Transaction[];
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
}

/**
 * The ledger table. Rows are rendered in the order the server sent them — this
 * component does not sort, filter, or slice. Ordering is part of the contract
 * being drafted, so re-deciding it here would hide whether the API got it right.
 */
export function TransactionTable({ transactions, accounts, categories }: TransactionTableProps) {
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-ink-muted">
          <th scope="col" className="py-2 pr-4 font-medium">{ledgerCopy.columns.date}</th>
          <th scope="col" className="py-2 pr-4 font-medium">{ledgerCopy.columns.description}</th>
          <th scope="col" className="py-2 pr-4 font-medium">{ledgerCopy.columns.account}</th>
          <th scope="col" className="py-2 pr-4 font-medium">{ledgerCopy.columns.category}</th>
          <th scope="col" className="py-2 text-right font-medium">{ledgerCopy.columns.amount}</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((txn) => (
          <tr
            key={txn.id}
            data-transaction-id={txn.id}
            data-occurred-on={txn.occurred_on}
            className="border-b border-border-subtle last:border-0"
          >
            <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-ink-muted">
              {formatCalendarDate(txn.occurred_on)}
            </td>
            <td className="py-2 pr-4">{txn.description}</td>
            <td className="whitespace-nowrap py-2 pr-4 text-ink-muted">
              {accountNames.get(txn.account_id) ?? ledgerCopy.unknownAccount}
            </td>
            <td className="whitespace-nowrap py-2 pr-4">
              {txn.category_id === null ? (
                <span className="rounded bg-surface px-2 py-0.5 text-xs text-ink-muted">
                  {ledgerCopy.uncategorized}
                </span>
              ) : (
                <span className="text-ink-muted">{categoryNames.get(txn.category_id)}</span>
              )}
            </td>
            <td className="whitespace-nowrap py-2 text-right">
              <AmountCell amountMinor={txn.amount_minor} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
