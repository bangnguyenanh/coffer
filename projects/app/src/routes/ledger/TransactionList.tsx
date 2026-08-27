import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Account, Category, Transaction } from '../../data/types';
import { ledgerCopy, rowCopy } from '../../copy/strings';
import { formatDayHeading } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
import { captureRowAnchor, restoreRowAnchor, type RowAnchor } from '../../lib/row-anchor';
import { transferCounterpartsById } from '../../lib/transfers';
import { useAppData } from '../../state/useAppData';
import { AmountCell } from '../../components/AmountCell';
import { TransactionRow } from './TransactionRow';

interface TransactionListProps {
  /** Already in ledger order (`occurred_on` descending) as `useLedger` sorted them. */
  readonly transactions: readonly Transaction[];
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Commit an edit. The parent owns the write and the notice it produces. */
  readonly onSave: (id: string, input: Omit<Transaction, 'id'>) => void;
  readonly onDelete: (transaction: Transaction) => void;
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
 *
 * ## Phase 4 (edit half) added two things, both about not losing the reader
 *
 * **Which row is open** is this component's state and nothing else's: it is a
 * property of the list, it has no meaning off this screen, and the row that has
 * it is the one the user just pressed a key on.
 *
 * **The scroll anchor.** A saved edit reflows the page — the editor is taller
 * than the row it replaces, and a changed date can move the row into a different
 * day group entirely. `captureRowAnchor` measures where the row sat in the
 * viewport before the commit and a layout effect puts it back at that offset
 * afterwards, so the reader keeps their place. `data-anchor-shift` records how
 * many pixels the correction moved the page, which is what turns *"the ledger
 * keeps its place"* from a claim into a number.
 */
export function TransactionList({
  transactions,
  accounts,
  categories,
  onSave,
  onDelete,
}: TransactionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // The counterpart lookup is built from the WHOLE transaction list, not from
  // the rows this list was handed: a filter (or an account's own ledger) can
  // hide one leg of a transfer, and the leg that is still on screen must not
  // become a mystery because of it. Read straight from the shared state — the
  // rule in coding-conventions.md is to read from the context, not to copy it.
  const { transactions: allTransactions } = useAppData();
  const counterparts = useMemo(
    () => transferCounterpartsById(allTransactions),
    [allTransactions],
  );

  /** Set just before a commit that will reflow the list; consumed by the effect. */
  const anchorRef = useRef<RowAnchor | null>(null);
  const [anchorShift, setAnchorShift] = useState<number | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (anchor === null) return;
    anchorRef.current = null;
    setAnchorShift(restoreRowAnchor(anchor));
  }, [transactions]);

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

  const saveEdit = (id: string, input: Omit<Transaction, 'id'>): void => {
    // Measure BEFORE the write: after it, the row this is about may have moved
    // or left the list entirely.
    anchorRef.current = captureRowAnchor(id);
    setEditingId(null);
    onSave(id, input);
  };

  const deleteRow = (transaction: Transaction): void => {
    setEditingId(null);
    onDelete(transaction);
  };

  return (
    <div
      data-transaction-list=""
      data-editing-id={editingId ?? ''}
      data-anchor-shift={anchorShift === null ? '' : String(anchorShift)}
    >
      <p className="px-4 pb-2 text-xs text-ink-faint">{rowCopy.listHint}</p>

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
                <TransactionRow
                  key={txn.id}
                  transaction={txn}
                  counterpart={counterparts.get(txn.id) ?? null}
                  accounts={accounts}
                  categories={categories}
                  accountNames={accountNames}
                  categoryNames={categoryNames}
                  striped={index % 2 === 0}
                  editing={editingId === txn.id}
                  onEdit={setEditingId}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={saveEdit}
                  onDelete={deleteRow}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
