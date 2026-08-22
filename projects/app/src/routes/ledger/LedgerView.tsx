import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ledgerCopy } from '../../copy/strings';
import { LedgerFilters } from './LedgerFilters';
import { TransactionTable } from './TransactionTable';
import {
  filtersFromSearchParams,
  isFiltered,
  searchParamsFromFilters,
  useLedger,
  type LedgerFilters as Filters,
} from './useLedger';

/**
 * The landing route (hub ticket 0003 phase 3; ticket 0004 later moves it).
 *
 * The view owns layout and the filter state, and nothing else: the data comes
 * from `useLedger`, the amounts are formatted by the money module, and the
 * matching is done by the server.
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
  const setFilters = (next: Filters): void => {
    setSearchParams(searchParamsFromFilters(next), { replace: true });
  };

  const { status, transactions, total, accounts, categories, errorMessage, requestUrl } =
    useLedger(filters);

  const filtered = isFiltered(filters);

  return (
    <section aria-labelledby="ledger-title" data-request-url={requestUrl} data-status={status}>
      <h1 id="ledger-title" className="text-2xl font-semibold tracking-tight">
        {ledgerCopy.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{ledgerCopy.subtitle}</p>

      <LedgerFilters
        value={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
      />

      {status === 'error' ? (
        <Placeholder title={ledgerCopy.errorTitle} body={errorMessage ?? ''} />
      ) : status === 'loading' && transactions.length === 0 ? (
        <Placeholder title={ledgerCopy.loading} />
      ) : transactions.length === 0 ? (
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
