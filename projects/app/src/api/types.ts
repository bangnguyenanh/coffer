/**
 * Response types for the finance API.
 *
 * These mirror the shapes the mock handlers in `src/mocks/handlers.ts` serve,
 * which are the DRAFT of the phase-2 API contract (hub ticket 0003). They are
 * declared once, here, and never redefined ad hoc inside a component.
 *
 * Field names are the ones pinned in hub ticket 0001: `amount_minor`,
 * `occurred_on`, `account_id`, `category_id`.
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

/** Every collection response is enveloped so pagination has somewhere to live. */
export interface Collection<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  };
}

/**
 * Query parameters for `GET /api/transactions`.
 *
 * Filtering is a SERVER concern: these travel in the request. The client does
 * not fetch-everything-then-filter, because that would draft nothing.
 */
export interface TransactionQuery {
  /** Inclusive lower bound on `occurred_on`. */
  readonly from?: CalendarDate;
  /** Inclusive upper bound on `occurred_on`. */
  readonly to?: CalendarDate;
  readonly account_id?: string;
  /** An account id, or the literal `none` for uncategorized rows. */
  readonly category_id?: string;
  /** Free-text match against `description`. Case- and diacritic-insensitive. */
  readonly q?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** The shape an error response takes. */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}
