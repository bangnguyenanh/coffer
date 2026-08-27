/**
 * Digit keys, bound to categories by position.
 *
 * ## Why a digit and not a `<select>`
 *
 * Hub ticket 0003 phase 5 asks for *"everything with no category, cleared in a
 * batch"*, and the phase-4 agent measured why that matters: categorising during
 * entry is slower than skipping, so people skip, so this screen carries the
 * volume. A native `<select>` per row — the obvious build — costs, per row, a
 * `Tab` in, arrow keys or a mouse to pick, and a `Tab` out. Worse, its one fast
 * affordance does not work here: **first-letter matching collides in
 * Vietnamese.** `Cà phê` and `Chợ & siêu thị` both answer to `C`, and so do
 * their diacritic-folded forms.
 *
 * A digit does not collide, does not need the option list to be open, and does
 * not move focus. One key, one assignment — and the same key applies to a whole
 * selection, which is what makes the batch a batch rather than a loop.
 *
 * ## Position, not a stored key
 *
 * The binding is the category's **index in the name-ordered list**
 * (`ordering.ts` → `byName`), so nothing in `src/data/` gains a `shortcut` field
 * and no key can go stale against a renamed category. It is the same list, in
 * the same order, that `category-color.ts` derives a swatch from — so the digit
 * that assigns `Cà phê` and the colour the ledger paints it are two readings of
 * one ordering.
 *
 * ## The ninth category is the edge, and it is handled by saying so
 *
 * There are ten digits and one of them (`0`) reads as "none". Categories past
 * the ninth get **no key**; the legend renders `—` for them and they stay
 * assignable by click. Today's fixtures hold eight, so nothing is unreachable —
 * but a tenth category must not silently become the one nobody can assign.
 */

/** How many categories can carry a digit. `1`–`9`; `0` is deliberately unused. */
export const MAX_KEYED_CATEGORIES = 9;

/** The key for a category at this position, or `null` past the ninth. */
export function categoryKeyForIndex(index: number): string | null {
  if (index < 0 || index >= MAX_KEYED_CATEGORIES) return null;
  return String(index + 1);
}

/**
 * The category position a pressed key selects, or `null` if the key is not one
 * of ours. `'0'` is not ours: it would read as "no category", which is the state
 * these rows are already in.
 */
export function indexForCategoryKey(key: string): number | null {
  if (key.length !== 1) return null;
  const digit = Number(key);
  if (!Number.isInteger(digit) || digit < 1 || digit > MAX_KEYED_CATEGORIES) return null;
  return digit - 1;
}
