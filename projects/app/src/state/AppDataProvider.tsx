/**
 * Holds the app's data in React state, seeded from the JSON.
 *
 * The seed arrives as a prop rather than being imported here: `main.tsx` reads
 * and validates it before the first render, so a hand-edited fixture fails with
 * a named message instead of taking the mount down (see `src/data/seed.ts`).
 *
 * **Every mutator here is a whole-list replacement over immutable rows** — no
 * row object is ever mutated in place. That is what lets deleted rows be handed
 * to the caller and put back later byte-for-byte, and what lets the triage inbox
 * record a previous `category_id` and write it back on undo.
 *
 * **Accounts are state too since ticket 0004 phase 1** — created, edited and
 * archived, never deleted.
 *
 * **Categories are state since ticket 0004 phase 3** — created, renamed and
 * deleted. Deleting one is the only mutator here that writes BOTH lists: the
 * category goes, and every row filed under it is reassigned to uncategorised
 * rather than deleted with it.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Account, Category, Transaction } from '../data/types';
import type { Seed } from '../data/seed';
import {
  AppDataContext,
  type AppData,
  type CategoryRemoval,
  type TransferInput,
  type TransferPair,
} from './AppDataContext';

export function AppDataProvider({
  seed,
  children,
}: {
  readonly seed: Seed;
  readonly children: ReactNode;
}) {
  const [transactions, setTransactions] = useState<readonly Transaction[]>(seed.transactions);
  const [accounts, setAccounts] = useState<readonly Account[]>(seed.accounts);
  // Writable since ticket 0004 phase 3 — created, renamed and deleted. Deleting
  // one reassigns its rows rather than taking them with it (`removeCategory`).
  const [categories, setCategories] = useState<readonly Category[]>(seed.categories);

  // A counter, not `transactions.length`: two adds in one tick would otherwise
  // mint the same id. `txn_057`, `txn_058`, … continues the fixture numbering.
  // Deleting does NOT decrement it — a reused id would collide with a row the
  // user can still restore from an undo bar.
  const nextId = useRef(seed.transactions.length);
  const nextTransferId = useRef(0);
  const nextAccountId = useRef(seed.accounts.length);
  const nextCategoryId = useRef(0);

  const mintTransactionId = useCallback((): string => {
    nextId.current += 1;
    return `txn_${String(nextId.current).padStart(3, '0')}`;
  }, []);

  const addTransaction = useCallback(
    (input: Omit<Transaction, 'id'>): Transaction => {
      const created: Transaction = { ...input, id: mintTransactionId() };
      setTransactions((current) => [...current, created]);
      return created;
    },
    [mintTransactionId],
  );

  /**
   * Both legs, one id, one update.
   *
   * The signs are decided HERE and nowhere else: negative out of the source,
   * positive into the destination. The form hands over a magnitude, so there is
   * no way for a draft to arrive already-signed and end up moving money the
   * wrong way.
   */
  const addTransfer = useCallback(
    (input: TransferInput): TransferPair => {
      nextTransferId.current += 1;
      const transferId = `tfr_${String(nextTransferId.current).padStart(3, '0')}`;
      const magnitude = Math.abs(input.amount_minor);

      const from: Transaction = {
        id: mintTransactionId(),
        occurred_on: input.occurred_on,
        amount_minor: -magnitude,
        description: input.description,
        account_id: input.from_account_id,
        // A transfer has no category and never gets one. `src/lib/transfers.ts`
        // is what keeps that from putting both legs in the triage inbox.
        category_id: null,
        transfer_id: transferId,
      };
      const to: Transaction = {
        id: mintTransactionId(),
        occurred_on: input.occurred_on,
        amount_minor: magnitude,
        description: input.description,
        account_id: input.to_account_id,
        category_id: null,
        transfer_id: transferId,
      };

      setTransactions((current) => [...current, from, to]);
      return { transfer_id: transferId, from, to };
    },
    [mintTransactionId],
  );

  /**
   * Replace a row's fields, keeping its id.
   *
   * The updated row is built here and returned synchronously so the caller can
   * render a "saved" notice about the row that actually landed, rather than
   * about the draft it submitted.
   */
  const updateTransaction = useCallback(
    (id: string, input: Omit<Transaction, 'id'>): Transaction | null => {
      // Read from the render's own list, NOT from inside the updater. React does
      // not promise a functional `setState` updater runs synchronously, so a
      // return value smuggled out of one is a value that is sometimes `null`.
      if (!transactions.some((txn) => txn.id === id)) return null;
      const updated: Transaction = { ...input, id };
      setTransactions((current) =>
        current.map((txn) => (txn.id === id ? updated : txn)),
      );
      return updated;
    },
    [transactions],
  );

  const assignCategories = useCallback(
    (
      assignments: readonly { readonly id: string; readonly category_id: string | null }[],
    ): void => {
      if (assignments.length === 0) return;
      const byId = new Map(assignments.map((a) => [a.id, a.category_id]));
      setTransactions((current) =>
        current.map((txn) =>
          byId.has(txn.id) ? { ...txn, category_id: byId.get(txn.id) ?? null } : txn,
        ),
      );
    },
    [],
  );

  /**
   * Remove a row — and, if it is one leg of a transfer, the other leg with it.
   *
   * Half a transfer is not a smaller transfer, it is a wrong balance. The
   * invariant is enforced here rather than at the call sites, because a caller
   * that has to remember it is a caller that will one day forget.
   */
  const removeTransaction = useCallback(
    (id: string): readonly Transaction[] => {
      // Same reason as `updateTransaction`: the rows handed back to the caller —
      // the ones an undo bar will restore — are read here, in render scope.
      const target = transactions.find((txn) => txn.id === id) ?? null;
      if (target === null) return [];
      const removed =
        target.transfer_id === null
          ? [target]
          : transactions.filter((txn) => txn.transfer_id === target.transfer_id);
      const removedIds = new Set(removed.map((txn) => txn.id));
      setTransactions((current) => current.filter((txn) => !removedIds.has(txn.id)));
      return removed;
    },
    [transactions],
  );

  const restoreTransactions = useCallback((restored: readonly Transaction[]): void => {
    if (restored.length === 0) return;
    setTransactions((current) => {
      const present = new Set(current.map((txn) => txn.id));
      const missing = restored.filter((txn) => !present.has(txn.id));
      return missing.length === 0 ? current : [...current, ...missing];
    });
  }, []);

  const addAccount = useCallback((input: Omit<Account, 'id'>): Account => {
    nextAccountId.current += 1;
    const created: Account = {
      ...input,
      id: `acc_${String(nextAccountId.current).padStart(3, '0')}`,
    };
    setAccounts((current) => [...current, created]);
    return created;
  }, []);

  const updateAccount = useCallback(
    (id: string, input: Omit<Account, 'id'>): Account | null => {
      if (!accounts.some((account) => account.id === id)) return null;
      const updated: Account = { ...input, id };
      setAccounts((current) =>
        current.map((account) => (account.id === id ? updated : account)),
      );
      return updated;
    },
    [accounts],
  );

  const setAccountArchived = useCallback(
    (id: string, archived: boolean): Account | null => {
      const target = accounts.find((account) => account.id === id) ?? null;
      if (target === null) return null;
      const updated: Account = { ...target, archived };
      setAccounts((current) =>
        current.map((account) => (account.id === id ? updated : account)),
      );
      return updated;
    },
    [accounts],
  );

  const addCategory = useCallback((input: Omit<Category, 'id'>): Category => {
    nextCategoryId.current += 1;
    // A minted prefix rather than a slug of the name: the fixture ids read
    // `cat_food`, and a renamed category must not end up with an id that
    // contradicts its own name.
    const created: Category = { ...input, id: `cat_new_${String(nextCategoryId.current)}` };
    setCategories((current) => [...current, created]);
    return created;
  }, []);

  const updateCategory = useCallback(
    (id: string, input: Omit<Category, 'id'>): Category | null => {
      // Render scope, not inside the updater — same reason as `updateAccount`.
      if (!categories.some((category) => category.id === id)) return null;
      const updated: Category = { ...input, id };
      setCategories((current) =>
        current.map((category) => (category.id === id ? updated : category)),
      );
      return updated;
    },
    [categories],
  );

  /**
   * Delete a category; its transactions become uncategorised.
   *
   * The two `setState` calls are one React update — and the ORDER of the reads
   * matters more than the order of the writes: both the removed category and the
   * rows that pointed at it are read from render scope, so the value handed to
   * the caller for undo is never the `null` a functional updater would sometimes
   * return.
   */
  const removeCategory = useCallback(
    (id: string): CategoryRemoval | null => {
      const target = categories.find((category) => category.id === id) ?? null;
      if (target === null) return null;

      const reassigned = transactions
        .filter((txn) => txn.category_id === id)
        .map((txn) => ({ id: txn.id, category_id: txn.category_id }));

      setCategories((current) => current.filter((category) => category.id !== id));
      // Reassign, never cascade-delete. Losing ledger history to a category
      // cleanup would be unrecoverable; these rows go to the triage inbox.
      setTransactions((current) =>
        current.map((txn) => (txn.category_id === id ? { ...txn, category_id: null } : txn)),
      );

      return { category: target, reassigned };
    },
    [categories, transactions],
  );

  const restoreCategories = useCallback((restored: readonly Category[]): void => {
    if (restored.length === 0) return;
    setCategories((current) => {
      const present = new Set(current.map((category) => category.id));
      const missing = restored.filter((category) => !present.has(category.id));
      return missing.length === 0 ? current : [...current, ...missing];
    });
  }, []);

  const value = useMemo<AppData>(
    () => ({
      transactions,
      accounts,
      categories,
      addTransaction,
      addTransfer,
      updateTransaction,
      assignCategories,
      removeTransaction,
      restoreTransactions,
      addAccount,
      updateAccount,
      setAccountArchived,
      addCategory,
      updateCategory,
      removeCategory,
      restoreCategories,
    }),
    [
      transactions,
      accounts,
      categories,
      addTransaction,
      addTransfer,
      updateTransaction,
      assignCategories,
      removeTransaction,
      restoreTransactions,
      addAccount,
      updateAccount,
      setAccountArchived,
      addCategory,
      updateCategory,
      removeCategory,
      restoreCategories,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
