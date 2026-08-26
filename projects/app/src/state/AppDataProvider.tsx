/**
 * Holds the app's data in React state, seeded from the JSON.
 *
 * The seed arrives as a prop rather than being imported here: `main.tsx` reads
 * and validates it before the first render, so a hand-edited fixture fails with
 * a named message instead of taking the mount down (see `src/data/seed.ts`).
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Transaction } from '../data/types';
import type { Seed } from '../data/seed';
import { AppDataContext, type AppData } from './AppDataContext';

export function AppDataProvider({
  seed,
  children,
}: {
  readonly seed: Seed;
  readonly children: ReactNode;
}) {
  const [transactions, setTransactions] = useState<readonly Transaction[]>(seed.transactions);

  // Accounts and categories are reference data: nothing in this prototype edits
  // them (category CRUD and accounts are ticket 0004), so they stay as seeded.
  const { accounts, categories } = seed;

  // A counter, not `transactions.length`: two adds in one tick would otherwise
  // mint the same id. `txn_057`, `txn_058`, … continues the fixture numbering.
  const nextId = useRef(seed.transactions.length);

  const addTransaction = useCallback((input: Omit<Transaction, 'id'>): Transaction => {
    nextId.current += 1;
    const created: Transaction = {
      ...input,
      id: `txn_${String(nextId.current).padStart(3, '0')}`,
    };
    setTransactions((current) => [...current, created]);
    return created;
  }, []);

  const value = useMemo<AppData>(
    () => ({ transactions, accounts, categories, addTransaction }),
    [transactions, accounts, categories, addTransaction],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
