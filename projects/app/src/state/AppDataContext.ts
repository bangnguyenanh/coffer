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
 *
 * ## Accounts became writable in hub ticket 0004 phase 1
 *
 * They used to be read-only reference data. Create / edit / **archive** live
 * here now, with the same whole-list-replacement discipline the transactions
 * have. **There is no delete**: an account with transactions cannot be removed
 * without orphaning history, so `setAccountArchived` is the destructive edge of
 * this surface and it is reversible by construction.
 */

import { createContext } from 'react';
import type { Account, CalendarDate, Category, Transaction } from '../data/types';

/**
 * What the transfer form submits — one movement, not two rows.
 *
 * `amount_minor` is a MAGNITUDE (positive): a transfer has a source and a
 * destination, so its direction is already said by those two fields and a sign
 * would be saying it twice. `addTransfer` applies the signs — negative in the
 * source, positive in the destination — which is the only place in this
 * codebase that decides them.
 */
export interface TransferInput {
  readonly from_account_id: string;
  readonly to_account_id: string;
  /** Positive integer, minor units. VND exponent 0 — 500.000 ₫ is `500000`. */
  readonly amount_minor: number;
  readonly occurred_on: CalendarDate;
  readonly description: string;
}

/** Both legs of a created transfer, in the order source → destination. */
export interface TransferPair {
  readonly transfer_id: string;
  readonly from: Transaction;
  readonly to: Transaction;
}

export interface AppData {
  /** Seeded from `src/data/transactions.json`; lives for this session only. */
  readonly transactions: readonly Transaction[];
  /** Every account, archived ones included. Pickers filter; history does not. */
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /**
   * Append a transaction. The id is assigned here because the row has to have
   * one to be rendered, and nothing else is in a position to assign it.
   */
  readonly addTransaction: (input: Omit<Transaction, 'id'>) => Transaction;

  /**
   * Move money between two accounts, as ONE state update (ticket 0004 phase 2).
   *
   * **Provisional model — the linked pair.** Two rows sharing a minted
   * `transfer_id`: `-amount_minor` in the source, `+amount_minor` in the
   * destination. The schema question is open (hub `decisions/CANDIDATES.md`)
   * and this is the shape being built to inform it.
   *
   * It is one mutator and not two `addTransaction` calls on purpose. Two calls
   * are two renders and, worse, a window in which HALF a transfer exists — a
   * ledger that has taken money out of one account and not yet put it into the
   * other. A pair whose invariant lives in the caller is a pair that will
   * eventually be created without it.
   */
  readonly addTransfer: (input: TransferInput) => TransferPair;

  /**
   * Replace every field of an existing row except its id (hub ticket 0003 phase
   * 4, edit half).
   *
   * It takes the same `Omit<Transaction, 'id'>` that `addTransaction` takes —
   * on purpose. That is exactly what `draftToTransaction` produces, so an edit
   * runs through the SAME parsing and the SAME rejection rules as an entry, and
   * there is no second code path where a decimal could be coerced instead of
   * refused. Returns the row as stored, or `null` if the id is unknown.
   */
  readonly updateTransaction: (id: string, input: Omit<Transaction, 'id'>) => Transaction | null;

  /**
   * Set `category_id` on many rows in ONE state update (phase 5, triage).
   *
   * Batch rather than a loop of single writes because that is what the screen
   * actually does — assign one category to a selection — and because N calls to
   * a per-row setter is N renders of a list the user is looking at. `null` is a
   * legal target: it is what undoing an assignment writes back.
   */
  readonly assignCategories: (
    assignments: readonly { readonly id: string; readonly category_id: string | null }[],
  ) => void;

  /**
   * Remove a row and hand back **everything that was removed**, so the caller
   * can offer to put it back.
   *
   * **It returns a LIST because of the linked pair** (ticket 0004 phase 2).
   * Deleting one leg of a transfer would otherwise leave the other behind:
   * money that arrived in Momo from nowhere, and a balance that is simply wrong.
   * So removing a leg removes the transfer — both rows, one update — and the
   * caller restores whatever it was given. An ordinary row still comes back as
   * a list of one, so there is a single delete path and not two.
   *
   * The removed rows are NOT retained here: this state holds the ledger, not a
   * wastebasket. Undo works because the caller keeps the returned value and
   * calls `restoreTransactions` with it.
   */
  readonly removeTransaction: (id: string) => readonly Transaction[];

  /**
   * Put removed rows back, ids and all. Not an add: no new id is minted, so a
   * restored row sorts into exactly the slot it left (see `ordering.ts`), and a
   * restored transfer comes back as a whole transfer. Rows already present are
   * skipped rather than duplicated.
   */
  readonly restoreTransactions: (transactions: readonly Transaction[]) => void;

  /** Create an account (ticket 0004 phase 1). The id is minted here. */
  readonly addAccount: (input: Omit<Account, 'id'>) => Account;

  /**
   * Replace an account's fields, keeping its id. Returns it as stored, or
   * `null` if the id is unknown.
   *
   * Editing `opening_balance_minor` re-derives every balance that account is
   * part of on the next render — which is the property a stored balance column
   * would not have.
   */
  readonly updateAccount: (id: string, input: Omit<Account, 'id'>) => Account | null;

  /**
   * Archive or un-archive an account — the ONLY destructive edge on accounts,
   * and it is reversible by construction. There is no delete: an account with
   * transactions cannot be removed without orphaning history.
   */
  readonly setAccountArchived: (id: string, archived: boolean) => Account | null;
}

export const AppDataContext = createContext<AppData | null>(null);
