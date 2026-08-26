import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ledgerCopy } from '../../copy/strings';
import type { Transaction } from '../../data/types';
import { LedgerFilters } from './LedgerFilters';
import { QuickEntry } from './QuickEntry';
import { TransactionTable } from './TransactionTable';
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
 */
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

  const filtered = isFiltered(filters);

  return (
    <section
      aria-labelledby="ledger-title"
      data-view="ledger"
      data-filter-query={filterQuery}
      data-status="ready"
    >
      <h1 id="ledger-title" className="text-2xl font-semibold tracking-tight">
        {ledgerCopy.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{ledgerCopy.subtitle}</p>

      <div className="mt-6">
        <QuickEntry
          accounts={accounts}
          categories={categories}
          matchesCurrentFilter={matchesCurrentFilter}
          onClearFilters={clearFilters}
        />
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
        <>
          <p className="mt-6 text-xs text-ink-muted" data-result-count={total}>
            {ledgerCopy.resultCount.replace('{count}', String(total))}
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised px-4">
            <TransactionTable
              transactions={transactions}
              accounts={accounts}
              categories={categories}
            />
          </div>
        </>
      )}
    </section>
  );
}

function Placeholder({ title, body }: { readonly title: string; readonly body?: string }) {
  return (
    <div
      data-ledger-placeholder=""
      className="mt-6 rounded-lg border border-dashed border-border-subtle bg-surface-raised px-6 py-16 text-center"
    >
      <p className="font-medium">{title}</p>
      {body !== undefined && body !== '' && <p className="mt-2 text-sm text-ink-muted">{body}</p>}
    </div>
  );
}
