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
 */

import { useMemo } from 'react';
import type { Account, Category, Transaction } from '../../data/types';
import { useAppData } from '../../state/useAppData';

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
 * Filters live in the page URL.
 *
 * Two reasons, both still true without a network layer: a filtered ledger is
 * linkable and survives a reload, and the address bar shows exactly what is
 * being matched — which is what makes the filter behaviour observable rather
 * than something you have to take on trust.
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

export function searchParamsFromFilters(filters: LedgerFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key].trim();
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

/**
 * Ledger order: `occurred_on` descending (most recent first), then `id`
 * descending so rows sharing a date have a stable, deterministic order rather
 * than whatever order they happened to be seeded in.
 */
function byLedgerOrder(a: Transaction, b: Transaction): number {
  if (a.occurred_on !== b.occurred_on) {
    return a.occurred_on < b.occurred_on ? 1 : -1;
  }
  return a.id < b.id ? 1 : -1;
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
  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [accounts],
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [categories],
  );

  const filterQuery = useMemo(() => searchParamsFromFilters(filters).toString(), [filters]);

  return {
    transactions: matched,
    total: matched.length,
    accounts: sortedAccounts,
    categories: sortedCategories,
    filterQuery,
  };
}
