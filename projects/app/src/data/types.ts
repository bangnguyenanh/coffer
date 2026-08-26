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
