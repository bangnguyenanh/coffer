/**
 * Data wiring for the ledger.
 *
 * The filter values live here as component state, but the FILTERING does not:
 * every filter is turned into a query parameter and sent to the API. There is
 * no array pass over an already-fetched list anywhere in this file — that is
 * the point of hub ticket 0003 phase 3. A filter that never travels drafts
 * nothing about the contract the `api` surface will have to implement.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  fetchAccounts,
  fetchCategories,
  fetchTransactions,
  transactionsRequestUrl,
} from '../../api/client';
import type { Account, Category, Transaction, TransactionQuery } from '../../api/types';

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

export function isFiltered(filters: LedgerFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== '');
}

/** The filter fields, in the order they appear in a URL. */
const FILTER_KEYS = ['from', 'to', 'account_id', 'category_id', 'q'] as const;

/**
 * Filters live in the page URL, under the SAME parameter names the API takes.
 *
 * Two reasons, both deliberate: a filtered ledger is then linkable and survives
 * a reload, and the browser address bar shows exactly what the request will
 * carry — which is the artefact this ticket exists to produce.
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

/** Form state -> request parameters. An empty control means "do not narrow". */
function toQuery(filters: LedgerFilters): TransactionQuery {
  const present = (value: string): string | undefined =>
    value.trim() === '' ? undefined : value.trim();

  const from = present(filters.from);
  const to = present(filters.to);
  const accountId = present(filters.account_id);
  const categoryId = present(filters.category_id);
  const q = present(filters.q);

  return {
    ...(from !== undefined && { from }),
    ...(to !== undefined && { to }),
    ...(accountId !== undefined && { account_id: accountId }),
    ...(categoryId !== undefined && { category_id: categoryId }),
    ...(q !== undefined && { q }),
  };
}

/** Typing in the search box should not fire a request per keystroke. */
const FILTER_DEBOUNCE_MS = 250;

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export type LedgerStatus = 'loading' | 'ready' | 'error';

export interface LedgerData {
  readonly status: LedgerStatus;
  readonly transactions: readonly Transaction[];
  /** Total matching the filters server-side, which may exceed the page returned. */
  readonly total: number;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly errorMessage: string | null;
  /** The URL the current filters actually requested. Rendered as evidence. */
  readonly requestUrl: string;
}

export function useLedger(filters: LedgerFilters): LedgerData {
  const debounced = useDebounced(filters, FILTER_DEBOUNCE_MS);
  const query = useMemo(() => toQuery(debounced), [debounced]);
  const requestUrl = useMemo(() => transactionsRequestUrl(query), [query]);

  const [status, setStatus] = useState<LedgerStatus>('loading');
  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<readonly Account[]>([]);
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accounts and categories are reference data: fetched once, reused by both the
  // filter controls and the row labels.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchAccounts(), fetchCategories()])
      .then(([accountsResponse, categoriesResponse]) => {
        if (cancelled) return;
        setAccounts(accountsResponse.data);
        setCategories(categoriesResponse.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(describe(error));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One request per settled filter set. `requestUrl` is the identity of that
  // request, so it is the only dependency needed.
  const latestRequest = useRef('');
  useEffect(() => {
    latestRequest.current = requestUrl;
    setStatus('loading');
    void fetchTransactions(query)
      .then((response) => {
        // A slower earlier request must not overwrite a newer answer.
        if (latestRequest.current !== requestUrl) return;
        setTransactions(response.data);
        setTotal(response.meta.total);
        setErrorMessage(null);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (latestRequest.current !== requestUrl) return;
        setErrorMessage(describe(error));
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `query` is the source of `requestUrl`.
  }, [requestUrl]);

  return { status, transactions, total, accounts, categories, errorMessage, requestUrl };
}

function describe(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
