/**
 * In-memory fixture store behind the mock handlers.
 *
 * It exists so the mock behaves like a service and not like a static JSON file:
 * a write is visible to every subsequent read, in the same browser session.
 * State lives for the lifetime of the page — a reload re-seeds from fixtures.
 *
 * This module is loaded only by the mock layer, which is dev-only.
 */

import type { Account, Category, Transaction, TransactionQuery } from '../api/types';
import { seedAccounts, seedCategories, seedTransactions } from './fixtures';

/** The literal `category_id` value meaning "uncategorized" in a query. */
export const UNCATEGORIZED_QUERY_VALUE = 'none';

let accounts: Account[] = [...seedAccounts];
let categories: Category[] = [...seedCategories];
let transactions: Transaction[] = [...seedTransactions];

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
 * than whatever the storage layer happened to return.
 */
function byLedgerOrder(a: Transaction, b: Transaction): number {
  if (a.occurred_on !== b.occurred_on) {
    return a.occurred_on < b.occurred_on ? 1 : -1;
  }
  return a.id < b.id ? 1 : -1;
}

export function listAccounts(): readonly Account[] {
  return [...accounts].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function listCategories(): readonly Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/**
 * Apply the query server-side. Every filter narrows; they combine with AND.
 * Returns the full matching set plus the requested page of it.
 */
export function listTransactions(query: TransactionQuery): {
  readonly rows: readonly Transaction[];
  readonly total: number;
} {
  const needle = query.q === undefined || query.q.trim() === '' ? null : fold(query.q.trim());

  const matched = transactions
    .filter((txn) => {
      if (query.from !== undefined && txn.occurred_on < query.from) return false;
      if (query.to !== undefined && txn.occurred_on > query.to) return false;
      if (query.account_id !== undefined && txn.account_id !== query.account_id) return false;
      if (query.category_id !== undefined) {
        if (query.category_id === UNCATEGORIZED_QUERY_VALUE) {
          if (txn.category_id !== null) return false;
        } else if (txn.category_id !== query.category_id) {
          return false;
        }
      }
      if (needle !== null && !fold(txn.description).includes(needle)) return false;
      return true;
    })
    .sort(byLedgerOrder);

  const offset = query.offset ?? 0;
  const limit = query.limit ?? matched.length;
  return { rows: matched.slice(offset, offset + limit), total: matched.length };
}

/**
 * Insert a transaction. The server owns the id; the caller supplies the rest.
 * Present so the store is a store — a write here shows up in `listTransactions`
 * immediately, which is what makes the mock worth building against.
 */
export function createTransaction(input: Omit<Transaction, 'id'>): Transaction {
  const created: Transaction = { ...input, id: `txn_${String(transactions.length + 1).padStart(3, '0')}` };
  transactions = [...transactions, created];
  return created;
}

/** Restore the seed state. Used by nothing in the app; useful from the console. */
export function resetStore(): void {
  accounts = [...seedAccounts];
  categories = [...seedCategories];
  transactions = [...seedTransactions];
}
