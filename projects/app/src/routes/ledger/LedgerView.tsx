import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UndoBar } from '../../components/UndoBar';
import { ledgerCopy, rowCopy } from '../../copy/strings';
import type { Transaction } from '../../data/types';
import { formatAmount } from '../../lib/money';
import { useAppData } from '../../state/useAppData';
import { LedgerFilters } from './LedgerFilters';
import { MonthBand } from './MonthBand';
import { QuickEntry } from './QuickEntry';
import { TransactionList } from './TransactionList';
import {
  emptyLedgerFilters,
  filtersFromSearchParams,
  isFiltered,
  matchesFilters,
  searchParamsFromFilters,
  useLedger,
  type LedgerFilters as Filters,
} from './useLedger';

/**
 * The landing route (hub ticket 0003 phase 3; ticket 0004 later moves it).
 *
 * The view owns layout and the filter state, and nothing else: the rows come
 * from the app's shared state via `useLedger`, the amounts are formatted by the
 * money module, and the matching lives in the hook.
 *
 * `data-filter-query` and `data-result-count` are on the DOM on purpose: what
 * this view is FOR is showing the right subset, so the applied filter and the
 * count it produced are rendered as evidence rather than left to be inferred.
 * Since ticket 0005 the count sits in the ledger's heading line and is therefore
 * rendered in EVERY state, including the two empty ones — a count that vanishes
 * exactly when it reads zero is the least useful moment to lose it.
 *
 * **Phase 4 puts quick entry at the TOP of this view, above the filters.** Entry
 * is what the Owner does dozens of times a day and filtering is what they do
 * occasionally, so entry gets the first screen position and the initial focus.
 * It sits inside the ledger rather than behind a modal or a `/new` route
 * precisely so the row it creates lands in a list that is already on screen.
 *
 * **A saved row is never removed by a filter, only hidden by one.** The append
 * always happens; if the active filter excludes the new row, `QuickEntry` says
 * so and offers to clear the filters. The alternative — silently widening the
 * filter on save — throws away the subset the Owner deliberately asked for, and
 * doing nothing at all makes a saved row look lost. See `onClearFilters` below.
 *
 * ## Phase 4, edit half: this view owns what happens AFTER a write
 *
 * The list owns which row is open (`TransactionList`) and the editor owns the
 * draft (`RowEditor`). What lands here is the consequence of a commit, because
 * only this view knows the filters:
 *
 * - **Deleting** removes the row and raises an undo bar holding the removed row.
 *   The row is not retained by the shared state — undo restores the object this
 *   view is holding, with its original id, and `ordering.ts` puts it back in
 *   exactly the slot it left. No stored index, no re-numbering.
 * - **Saving an edit that no longer matches the filter** would make the row
 *   vanish under the reader's cursor. It is said out loud, with a way to clear
 *   the filters — the same rule quick entry follows, for the same reason. The
 *   filter is never silently widened.
 *
 * **There is no confirmation dialog anywhere in this flow**, and the reasoning
 * is written out in `UndoBar`.
 *
 * ## The month band, ticket 0004 phase 4
 *
 * The artboard's summary strip — spent / earned / difference / allocation bar —
 * is built and it sits at the TOP of this view, where the artboard puts it. Two
 * things about that placement are deliberate:
 *
 * - **It does not shift the 11-keystroke entry path.** The amount box carries
 *   `autoFocus`, so the caret still starts there on mount however much chrome
 *   sits above it, and Tab from the amount box still reaches the description
 *   next — nothing was inserted INTO the tab order between them. Re-measured.
 * - **The band ignores the ledger's filters, on purpose.** It is a MONTH
 *   summary. A band that quietly re-scoped itself to whatever subset is filtered
 *   would be a different number under the same label, which is the one thing a
 *   summary may not be.
 *
 * Phase 5 moves it to the dashboard; until that second consumer exists it stays
 * a `routes/ledger/` component (documents/coding-conventions.md, promotion rule).
 */

/**
 * What just happened to a row, and what can be done about it.
 *
 * `deleted` holds a LIST since ticket 0004 phase 2: deleting one leg of a
 * transfer deletes both, and the undo bar restores exactly what was removed. An
 * ordinary delete is a list of one, so there is one delete path and not two.
 */
type LedgerNotice =
  | { readonly kind: 'deleted'; readonly transactions: readonly Transaction[] }
  | { readonly kind: 'updated-hidden'; readonly transaction: Transaction };

export function LedgerView() {
  // Filter state is the URL, not component state: one source of truth, and a
  // filtered ledger is linkable.
  const [searchParams, setSearchParams] = useSearchParams();
  const filterKey = searchParams.toString();
  const filters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(filterKey)),
    [filterKey],
  );
  const setFilters = useCallback(
    (next: Filters): void => {
      setSearchParams(searchParamsFromFilters(next), { replace: true });
    },
    [setSearchParams],
  );

  // Asked by the entry bar at save time, against the filters in force then.
  const matchesCurrentFilter = useCallback(
    (txn: Transaction): boolean => matchesFilters(txn, filters),
    [filters],
  );
  const clearFilters = useCallback((): void => setFilters(emptyLedgerFilters), [setFilters]);

  const { transactions, total, accounts, categories, filterQuery } = useLedger(filters);
  const { updateTransaction, removeTransaction, restoreTransactions } = useAppData();

  /**
   * Quick entry offers ACTIVE accounts only (ticket 0004 phase 1) — that is what
   * archiving is for. Everything else on this screen keeps the full list: the
   * filter controls and the row labels have to be able to name an archived account, or
   * its history becomes unreadable the moment it is put away.
   */
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.archived),
    [accounts],
  );

  const [notice, setNotice] = useState<LedgerNotice | null>(null);

  const filtered = isFiltered(filters);

  const saveEdit = useCallback(
    (id: string, input: Omit<Transaction, 'id'>): void => {
      const updated = updateTransaction(id, input);
      if (updated === null) return;
      // The only thing worth saying after a successful save is when the row is
      // about to disappear from the list the user is looking at.
      setNotice(
        matchesFilters(updated, filters)
          ? null
          : { kind: 'updated-hidden', transaction: updated },
      );
    },
    [updateTransaction, filters],
  );

  const deleteRow = useCallback(
    (transaction: Transaction): void => {
      const removed = removeTransaction(transaction.id);
      if (removed.length === 0) return;
      setNotice({ kind: 'deleted', transactions: removed });
    },
    [removeTransaction],
  );

  return (
    <section
      aria-labelledby="ledger-title"
      data-view="ledger"
      data-filter-query={filterQuery}
      data-notice={notice?.kind ?? ''}
      data-status="ready"
    >
      <MonthBand />

      <div className="mt-5">
        <QuickEntry
          accounts={activeAccounts}
        categories={categories}
          matchesCurrentFilter={matchesCurrentFilter}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="mt-7 flex items-baseline gap-3.5">
        <h1
          id="ledger-title"
          className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
        >
          {ledgerCopy.title}
        </h1>
        <p className="text-[13px] tabular-nums text-ink-muted" data-result-count={total}>
          {ledgerCopy.resultCount.replace('{count}', String(total))}
        </p>
      </div>

      <LedgerFilters
        value={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
      />

      {transactions.length === 0 ? (
        // Two different nothings: an unused ledger, versus filters that matched
        // none of a ledger that does have transactions.
        <Placeholder
          title={filtered ? ledgerCopy.noMatchTitle : ledgerCopy.emptyTitle}
          body={filtered ? ledgerCopy.noMatchBody : ledgerCopy.emptyBody}
        />
      ) : (
        <div className="mt-3.5">
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onSave={saveEdit}
            onDelete={deleteRow}
          />
        </div>
      )}

      {notice?.kind === 'deleted' && (
        <UndoBar
          kind="deleted"
          message={deletedMessage(notice.transactions)}
          actionLabel={rowCopy.undo}
          onAction={() => {
            const restored = notice.transactions;
            restoreTransactions(restored);
            setNotice(null);
            // The undo button unmounts with the bar; hand the caret back to the
            // row that just came back, so the keyboard keeps its place. For a
            // restored transfer that is the leg the reader was standing on —
            // the first of the pair, which is the source leg.
            const anchor = restored[0];
            if (anchor === undefined) return;
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLElement>(
                  `[data-transaction-id="${CSS.escape(anchor.id)}"] [data-row-control]`,
                )
                ?.focus();
            });
          }}
          dismissLabel={rowCopy.dismiss}
          onDismiss={() => setNotice(null)}
        />
      )}

      {notice?.kind === 'updated-hidden' && (
        <UndoBar
          kind="updated-hidden"
          message={`${rowCopy.updated
            .replace('{description}', notice.transaction.description)
            .replace('{amount}', formatAmount(notice.transaction.amount_minor))} — ${
            rowCopy.updatedHidden
          }`}
          actionLabel={rowCopy.clearFilters}
          onAction={() => {
            clearFilters();
            setNotice(null);
          }}
          dismissLabel={rowCopy.dismiss}
          onDismiss={() => setNotice(null)}
          // Informational: the row is safe, it is just not on screen. Stealing
          // the caret here would interrupt somebody mid-correction.
          autoFocusAction={false}
        />
      )}
    </section>
  );
}

/**
 * What the undo bar says after a delete.
 *
 * One row reads as itself; a transfer reads as the pair it was, because that is
 * what was removed. Naming only the leg the reader pressed would under-report
 * the deletion by exactly one row and one account balance.
 */
function deletedMessage(removed: readonly Transaction[]): string {
  const anchor = removed.find((txn) => txn.amount_minor < 0) ?? removed[0];
  if (anchor === undefined) return '';
  const template = removed.length > 1 ? rowCopy.deletedTransfer : rowCopy.deleted;
  return template
    .replace('{description}', anchor.description)
    .replace('{amount}', formatAmount(anchor.amount_minor));
}

function Placeholder({ title, body }: { readonly title: string; readonly body?: string }) {
  return (
    <div
      data-ledger-placeholder=""
      className="mt-3.5 rounded-panel border border-dashed border-border-subtle bg-surface-raised px-6 py-16 text-center"
    >
      <p className="font-medium text-ink">{title}</p>
      {body !== undefined && body !== '' && <p className="mt-2 text-sm text-ink-muted">{body}</p>}
    </div>
  );
}
