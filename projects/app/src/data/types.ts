/**
 * The shapes the prototype's screens read.
 *
 * These used to be `src/api/types.ts` — response types for a mock network layer.
 * **There is no API in this prototype** (hub ticket 0003, Owner directive
 * 2026-08-25): the screens read JSON from `./` and hold it in React state, so
 * everything that only described transport is gone — the collection envelope,
 * the error body, the session/grant shapes, the single-resource wrapper, and the
 * query-parameter type. What is left describes the DATA, which outlives the way
 * it happens to arrive today.
 *
 * Field names are still the ones pinned in hub ticket 0001 — `amount_minor`,
 * `occurred_on`, `account_id`, `category_id` — because those are the product's
 * names for these things, not one transport's names for them.
 */

/** A calendar date, `YYYY-MM-DD`. Never a timestamp — a transaction happens on a day. */
export type CalendarDate = string;

export type AccountKind = 'cash' | 'bank' | 'ewallet';

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly kind: AccountKind;
  /**
   * Signed integer, minor units. The balance is NOT a field: it is derived from
   * this plus the account's transactions (hub 0003 contract).
   */
  readonly opening_balance_minor: number;
  /**
   * Archived rather than deleted (hub ticket 0004 phase 1).
   *
   * An account with transactions cannot be deleted without orphaning history,
   * so there is no delete on this surface at all. Archiving takes the account
   * out of the pickers — quick entry and the transfer form offer active
   * accounts only — while its balance, its rows and its detail page all stay
   * exactly where they were.
   *
   * **It is a field the eventual schema does not have yet.** Hub ticket 0001
   * pins `accounts` as `id, user_id, name, type, opening_balance_minor,
   * created_at`; archiving needs one more column and that is flagged to the PM
   * rather than assumed. In the JSON it may be omitted — `seed.ts` reads a
   * missing value as `false`, so a fixture row does not have to say "not
   * archived" to mean it.
   */
  readonly archived: boolean;
}

export interface Category {
  readonly id: string;
  readonly name: string;
}

export interface Transaction {
  readonly id: string;
  /** Calendar date, `YYYY-MM-DD`. */
  readonly occurred_on: CalendarDate;
  /**
   * Signed integer in minor units (VND, exponent 0 — one unit is one đồng).
   * Sign is direction: outflow negative, inflow positive. Neither the account
   * nor the category may imply it.
   */
  readonly amount_minor: number;
  readonly description: string;
  readonly account_id: string;
  /** `null` means uncategorized — a first-class state, not missing data. */
  readonly category_id: string | null;
  /**
   * The transfer this row is one leg of, or `null` for an ordinary transaction.
   *
   * **Provisional — the shape is an open ADR** (hub `decisions/CANDIDATES.md`;
   * hub ticket 0004 phase 2 builds it to inform that decision, not to settle
   * it). The model here is the **linked pair**: two transactions share one
   * `transfer_id`, negative in the source account and positive in the
   * destination. The alternative on the table is a single row carrying a
   * counter-account column.
   *
   * **Whatever the shape ends up being, this field is the exclusion rule.** A
   * row with a `transfer_id` is money that MOVED, not money spent or earned, so
   * it is excluded from every spending total and every category breakdown —
   * and, because a transfer has no category, from the uncategorised count and
   * the triage inbox too. That rule has exactly one implementation:
   * `src/lib/transfers.ts`. Nothing re-derives it inline.
   *
   * It is `string | null` and NOT optional on purpose: every construction site
   * has to say which of the two it is, so a new writer cannot forget the field
   * and silently mint a row that looks like spending. In the JSON it may be
   * omitted — `seed.ts` reads a missing value as `null`.
   */
  readonly transfer_id: string | null;
}

/**
 * A person who can sign in.
 *
 * Named `User` and not `Account` on purpose: `Account` in this file is a MONEY
 * account (cash, bank, e-wallet), and one type named `Account` doing both jobs
 * is the kind of collision that produces a silent bug six screens later.
 *
 * **It is deliberately no longer named `Owner`.** That name encoded "there is
 * exactly one of these", which is precisely the assumption under revision — the
 * Owner asked on 2026-08-25 for conventional sign up + login *"để có thể sau
 * này đẩy lên cloud cho mọi người dùng"*. Whether this product actually grows
 * tenants is an open question in the hub's `decisions/CANDIDATES.md`; this type
 * simply stops pre-answering it. There can be more than one `User` in a session.
 *
 * There is no password field: the prototype's credential lives in React state
 * inside `src/auth/AuthProvider.tsx` and never reaches a type anything renders.
 */
export interface User {
  readonly id: string;
  readonly email: string;
}

/** What the sign up and login forms submit. Screen state — it goes nowhere else. */
export interface Credentials {
  readonly email: string;
  readonly password: string;
}
