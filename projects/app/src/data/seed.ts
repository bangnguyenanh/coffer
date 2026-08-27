/**
 * The typed import site for the JSON — and nothing more.
 *
 * This is NOT a store, a repository, or a service (hub ticket 0003, Owner
 * directive 2026-08-25: no abstraction layer over the JSON). It reads the three
 * files once, proves they have the right shape, and hands them to
 * `AppDataProvider`, which is where the state actually lives. Screens never
 * import this module — they read `useAppData()`.
 *
 * **Why the type check is here.** Everything JSON can express is checked
 * statically by the `satisfies` clauses below: a missing field, a misspelled
 * key, a string where a number belongs, or `amount_minor` written as `"30000"`
 * all fail `tsc` rather than surfacing as an empty screen at runtime. The Owner
 * hand-edits these files, so that boundary is the whole point of the file.
 *
 * The ONE thing JSON cannot express is a string-literal union: TypeScript
 * widens `"cash"` in a JSON module to `string`, so `Account["kind"]` cannot be
 * proved statically. That single field is narrowed by `toAccount`, which throws
 * a NAMED error — `src/main.tsx` catches it and puts it on the page, because a
 * hand-edited typo must say what it was, not render a blank screen.
 *
 * `readSeed` is a function, not a set of module constants, precisely so that
 * throw happens where `main.tsx` can catch it rather than at import time.
 *
 * VND, exponent 0 (ADR 0003): `amount_minor` is đồng. A 30.000 ₫ coffee is
 * `30000`, NOT `3000000`. There is no divide-by-100 in this product.
 */

import type { Account, AccountKind, Category, Transaction } from './types';
import accountsJson from './accounts.json';
import categoriesJson from './categories.json';
import transactionsJson from './transactions.json';

/**
 * `Account` with only the string-literal union relaxed — the exact shape a JSON
 * module can be proved to have. Every other field is checked against the real
 * `Account` type, so the boundary is as static as the format allows.
 *
 * `archived` is OPTIONAL here and required on `Account` (ticket 0004 phase 1).
 * A fixture row should not have to write `"archived": false` to mean "an
 * ordinary account" — but every row the app holds in memory answers the
 * question, so the default is applied once, here, rather than at each reader.
 */
type JsonAccount = Omit<Account, 'kind' | 'archived'> & {
  readonly kind: string;
  readonly archived?: boolean;
};

/**
 * `Transaction` with `transfer_id` optional — same reasoning as `archived`
 * above, and the same default-once treatment. In memory the field is always
 * present and always answers the question, because that answer is what decides
 * whether a row counts as spending (`src/lib/transfers.ts`).
 */
type JsonTransaction = Omit<Transaction, 'transfer_id'> & {
  readonly transfer_id?: string | null;
};

/** The `AccountKind` members, kept next to the type they narrow to. */
const ACCOUNT_KINDS: readonly AccountKind[] = ['cash', 'bank', 'ewallet'];

function isAccountKind(value: string): value is AccountKind {
  return (ACCOUNT_KINDS as readonly string[]).includes(value);
}

function toAccount(row: JsonAccount): Account {
  if (!isAccountKind(row.kind)) {
    throw new TypeError(
      `data/accounts.json: account \`${row.id}\` has kind \`${row.kind}\`; expected one of ${ACCOUNT_KINDS.join(', ')}.`,
    );
  }
  return { ...row, kind: row.kind, archived: row.archived ?? false };
}

/** A JSON row, with `transfer_id` defaulted. No fixture row is a transfer today. */
function toTransaction(row: JsonTransaction): Transaction {
  return { ...row, transfer_id: row.transfer_id ?? null };
}

export interface Seed {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly transactions: readonly Transaction[];
}

/** Read and validate the seed data. Called once, before the first render. */
export function readSeed(): Seed {
  return {
    accounts: (accountsJson satisfies readonly JsonAccount[]).map(toAccount),
    /** Flat — nested categories are an open decision, out of scope for 0003. */
    categories: categoriesJson satisfies readonly Category[],
    transactions: (transactionsJson satisfies readonly JsonTransaction[]).map(toTransaction),
  };
}
