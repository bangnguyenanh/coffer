/**
 * Data wiring for the ledger.
 *
 * Filtering happens HERE, over the rows already in React state (hub ticket
 * 0003, Owner directive 2026-08-25). It used to be sent as query parameters to
 * a mock server, because the ticket's job was to draft an API contract; that
 * goal is formally dropped, there is no request, and a filter that travels
 * nowhere is a filter that runs client-side.
 *
 * The MATCHING RULES are unchanged, deliberately — this is the same code the
 * mock store ran, moved:
 *   - every filter narrows, and they combine with AND
 *   - `from`/`to` are inclusive bounds on `occurred_on`
 *   - `category_id: 'none'` means uncategorized
 *   - `q` is case- and diacritic-insensitive, so `ca phe` finds `Cà phê`
 *   - ledger order is `occurred_on` descending, then `id` descending
 *
 * **The two comparators moved to `./ordering.ts`** when phase 5's triage inbox
 * became a second consumer of the same orders — see that file.
 */

import { useMemo } from 'react';
import type { Account, Category, Transaction } from '../../data/types';
import { useAppData } from '../../state/useAppData';
import { byLedgerOrder, byName } from '../../lib/ordering';

/** Every field is a string because every field comes from a form control. */
export interface LedgerFilters {
  readonly from: string;
  readonly to: string;
  readonly account_id: string;
  /** A category id, or `none` for uncategorized only. */
  readonly category_id: string;
  readonly q: string;
}

export const emptyLedgerFilters: LedgerFilters = {
  from: '',
  to: '',
  account_id: '',
  category_id: '',
  q: '',
};

/** The literal `category_id` value meaning "uncategorized". */
export const UNCATEGORIZED_FILTER_VALUE = 'none';

export function isFiltered(filters: LedgerFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== '');
}

/** The filter fields, in the order they appear in a URL. */
const FILTER_KEYS = ['from', 'to', 'account_id', 'category_id', 'q'] as const;

/**
 * Filters are MIRRORED to the page URL — they no longer live in it.
 *
 * The two reasons they were put there are still served: a filtered ledger is
 * linkable and survives a reload (the URL seeds `LedgerView`'s state at mount),
 * and the address bar shows exactly what is being matched. What changed is the
 * direction: `LedgerView` owns the filters in React state and writes them out,
 * and nothing reads them back while the view is mounted. Reading them back on
 * every keystroke was [bug 0001](../../../../management/bugs/0001-ledger-filter-drops-keystrokes.md)
 * — see that file and the comment on `LedgerView`'s state.
 */
export function filtersFromSearchParams(params: URLSearchParams): LedgerFilters {
  const read = (key: (typeof FILTER_KEYS)[number]): string => params.get(key) ?? '';
  return {
    from: read('from'),
    to: read('to'),
    account_id: read('account_id'),
    category_id: read('category_id'),
    q: read('q'),
  };
}

/**
 * **Nothing is trimmed here, and that is the fix for half of bug 0001.**
 *
 * This used to write `filters[key].trim()`. While the URL was also the source
 * the input read back from, that trim deleted a trailing space the instant it
 * was typed — so `"pho "` became `"pho"` and the next key made `"phog"`, and an
 * interior space could never survive being, for one keystroke, a trailing one.
 * A multi-word ledger search could not be typed at all.
 *
 * Trimming is a question for the point of USE, and that is where it happens:
 * `matches()`, `matchesFilters()` and `isFiltered()` each trim what they read.
 * Storage keeps what was typed, so the URL is a faithful mirror of the box.
 */
export function searchParamsFromFilters(filters: LedgerFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== '') params.set(key, value);
  }
  return params;
}

/**
 * Fold a Vietnamese string to a comparable form: lower-cased, diacritics
 * stripped, `đ` folded to `d`. Searching for `ca phe` has to find `Cà phê` or
 * the search box is decorative.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function matches(txn: Transaction, filters: LedgerFilters, needle: string | null): boolean {
  const from = filters.from.trim();
  const to = filters.to.trim();
  const accountId = filters.account_id.trim();
  const categoryId = filters.category_id.trim();

  if (from !== '' && txn.occurred_on < from) return false;
  if (to !== '' && txn.occurred_on > to) return false;
  if (accountId !== '' && txn.account_id !== accountId) return false;
  if (categoryId !== '') {
    if (categoryId === UNCATEGORIZED_FILTER_VALUE) {
      if (txn.category_id !== null) return false;
    } else if (txn.category_id !== categoryId) {
      return false;
    }
  }
  if (needle !== null && !fold(txn.description).includes(needle)) return false;
  return true;
}

/**
 * Does this row survive the current filters?
 *
 * Exported for quick entry (phase 4): a row saved while a filter is on may not
 * match it, and a new row that simply is not there reads as data loss. The entry
 * bar asks this question so it can SAY so instead of leaving the Owner to guess.
 * Same rules as the list — one matcher, so the answer and the list cannot drift.
 */
export function matchesFilters(txn: Transaction, filters: LedgerFilters): boolean {
  const q = filters.q.trim();
  return matches(txn, filters, q === '' ? null : fold(q));
}

export interface LedgerData {
  /** The matching rows, in ledger order. */
  readonly transactions: readonly Transaction[];
  readonly total: number;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** The filters currently applied, as a query string. Rendered as evidence. */
  readonly filterQuery: string;
}

export function useLedger(filters: LedgerFilters): LedgerData {
  const { transactions, accounts, categories } = useAppData();

  const matched = useMemo(() => {
    const q = filters.q.trim();
    const needle = q === '' ? null : fold(q);
    return transactions.filter((txn) => matches(txn, filters, needle)).sort(byLedgerOrder);
  }, [transactions, filters]);

  // Reference data, ordered once for both the filter controls and the row labels.
  const sortedAccounts = useMemo(() => [...accounts].sort(byName), [accounts]);
  const sortedCategories = useMemo(() => [...categories].sort(byName), [categories]);

  const filterQuery = useMemo(() => searchParamsFromFilters(filters).toString(), [filters]);

  return {
    transactions: matched,
    total: matched.length,
    accounts: sortedAccounts,
    categories: sortedCategories,
    filterQuery,
  };
}
