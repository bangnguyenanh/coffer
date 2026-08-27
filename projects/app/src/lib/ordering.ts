/**
 * The orders this app renders things in — one definition each.
 *
 * These used to be private helpers inside `useLedger.ts`. They moved here when
 * phase 5's triage inbox became a **second** list of the same transactions
 * (hub ticket 0003): two screens sorting "the same way" with two copies of the
 * comparator is how they quietly stop sorting the same way. One comparator, two
 * consumers — the same reasoning that made `matchesFilters` an export.
 *
 * **It moved again in ticket 0004 phase 5**, out of `routes/ledger/` and into
 * `src/lib/`. By then it had six consumers across four route folders plus a
 * shared component (`components/MonthBand.tsx`), and a shared component reaching
 * back INTO a route folder for a comparator inverts the layering the
 * architecture doc describes. Same promotion rule as `AmountCell` and
 * `MonthBand`, one level lower: these are rules, not UI.
 *
 * Nothing here formats, filters or slices; these are ordering rules only.
 */

import type { Transaction } from '../data/types';

/**
 * Ledger order: `occurred_on` descending (most recent first), then `id`
 * descending so rows sharing a date have a stable, deterministic order rather
 * than whatever order they happened to be seeded in.
 *
 * **This is what makes an undone delete land back where it was.** Restoring a
 * transaction re-appends it to the shared state with its original `id` and
 * `occurred_on`, and this comparator puts it back in exactly its old slot — so
 * "undo" needs no stored index and cannot drift from the list's own order.
 */
export function byLedgerOrder(a: Transaction, b: Transaction): number {
  if (a.occurred_on !== b.occurred_on) {
    return a.occurred_on < b.occurred_on ? 1 : -1;
  }
  return a.id < b.id ? 1 : -1;
}

/**
 * Reference-data order — accounts and categories, by name, in Vietnamese
 * collation (`Đ` after `D`, diacritics where a Vietnamese reader expects them).
 *
 * The **category order is load-bearing** beyond looking tidy: the triage inbox
 * binds digit keys `1…9` to categories by position, and the ledger derives a
 * category's swatch from position too (`category-color.ts`). Both read the list
 * ordered by this comparator, so the key that assigns `Cà phê` and the colour
 * that renders it agree without either storing anything.
 */
export function byName<T extends { readonly name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'vi');
}
