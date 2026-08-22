/**
 * The typed API client — the ONLY place `fetch` appears in this surface
 * (documents/architecture/01-overview.md).
 *
 * In development the requests are answered by the MSW handlers in
 * `src/mocks/handlers.ts`; the client neither knows nor cares. It builds the
 * query string, so a filter is always a request parameter and never a
 * client-side array pass over an already-fetched list.
 *
 * Server data is cached here rather than duplicated into component state where
 * it can drift. The cache is keyed by the fully-built request URL, so two
 * different filter sets are two different entries.
 */

import type { Account, Category, Collection, Transaction, TransactionQuery } from './types';

const API_BASE = '/api';

/** Cache of in-flight and settled GETs, keyed by URL. */
const cache = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function getJson<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached as Promise<T>;

  const pending = (async () => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { code?: string; message?: string } }
        | null;
      throw new ApiError(
        response.status,
        body?.error?.code ?? 'unknown',
        body?.error?.message ?? response.statusText,
      );
    }
    return (await response.json()) as T;
  })();

  cache.set(url, pending);
  // A failed request must not be cached as the answer for the rest of the session.
  pending.catch(() => cache.delete(url));
  return pending;
}

/** Drop cached reads. Any write invalidates the collections it can affect. */
export function invalidateCache(): void {
  cache.clear();
}

/**
 * Build `GET /api/transactions`'s query string. Empty values are omitted rather
 * than sent blank, so "no filter" and "filter on nothing" stay distinguishable
 * on the wire.
 */
function buildTransactionUrl(query: TransactionQuery): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | undefined): void => {
    if (value === undefined) return;
    const text = String(value).trim();
    if (text === '') return;
    params.set(key, text);
  };

  put('from', query.from);
  put('to', query.to);
  put('account_id', query.account_id);
  put('category_id', query.category_id);
  put('q', query.q);
  put('limit', query.limit);
  put('offset', query.offset);

  const search = params.toString();
  return search === '' ? `${API_BASE}/transactions` : `${API_BASE}/transactions?${search}`;
}

export function fetchAccounts(): Promise<Collection<Account>> {
  return getJson<Collection<Account>>(`${API_BASE}/accounts`);
}

export function fetchCategories(): Promise<Collection<Category>> {
  return getJson<Collection<Category>>(`${API_BASE}/categories`);
}

export function fetchTransactions(query: TransactionQuery): Promise<Collection<Transaction>> {
  return getJson<Collection<Transaction>>(buildTransactionUrl(query));
}

/**
 * The URL a given filter set will actually request. Public because "did this
 * filter travel in the request?" has to be answerable from outside the client —
 * the ledger renders it as a `data-request-url` attribute.
 */
export const transactionsRequestUrl = buildTransactionUrl;
