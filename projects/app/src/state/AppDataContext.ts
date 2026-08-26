/**
 * The app's data, and the one way to change it.
 *
 * ONE shared place, at the top of the app (hub ticket 0003, Owner directive
 * 2026-08-25) rather than a copy per route. The reason is phase 4: entry speed
 * is this product's stated feature, and a transaction entered has to appear in
 * the ledger DURING the session or the flow cannot be judged at all. Per-route
 * state makes the new row vanish on navigation.
 *
 * This is context plus `useState` and deliberately nothing else — no store
 * module, no repository, no service layer. A component reads `transactions` and
 * calls `addTransaction`; that is the entire design.
 *
 * **A reload re-seeds from the JSON.** Accepted and expected by the Owner —
 * there is no persistence here, no `localStorage`, no backup.
 *
 * Split from the provider so the provider file exports only a component: a file
 * exporting both breaks React Fast Refresh.
 */

import { createContext } from 'react';
import type { Account, Category, Transaction } from '../data/types';

export interface AppData {
  /** Seeded from `src/data/transactions.json`; lives for this session only. */
  readonly transactions: readonly Transaction[];
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /**
   * Append a transaction. The id is assigned here because the row has to have
   * one to be rendered, and nothing else is in a position to assign it.
   *
   * Present so the shared state has the shape phase 4 needs. **Quick entry
   * itself is not built** — that is phase 4 and out of scope for this strip.
   */
  readonly addTransaction: (input: Omit<Transaction, 'id'>) => Transaction;
}

export const AppDataContext = createContext<AppData | null>(null);
