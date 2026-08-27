/**
 * The category ramp — theme C (hub ADR 0005).
 *
 * ONE hue, four steps. A category's swatch is derived from its POSITION in the
 * ordered category list, so the ledger, and later the allocation bar in ticket
 * 0004, colour the same category the same way without either of them storing a
 * colour on the data. Nothing in `src/data/` gains a presentation field.
 *
 * **Uncategorised is not on the ramp.** `category_id: null` is a first-class
 * state, not a category, so it renders as a DASHED outline with no fill — see
 * `UNCATEGORIZED_DOT_CLASS`. That is the whole point of the ramp having four
 * steps and a dash rather than five colours: "no category" can never be read as
 * "some category I don't recognise".
 *
 * Moved out of `routes/ledger/` alongside `AmountCell` when the triage inbox
 * (phase 5) became a second consumer of the dashed uncategorised swatch.
 *
 * The classes are written out as literals because Tailwind scans source text —
 * a class assembled at runtime (`bg-category-${n}`) is a class that never gets
 * generated.
 */

import type { Category } from '../data/types';

/** The four ramp steps, in order. Tokens live in `src/index.css`. */
const RAMP = [
  'bg-category-1',
  'bg-category-2',
  'bg-category-3',
  'bg-category-4',
] as const;

/** `category_id: null` — an outline, deliberately not a colour. */
export const UNCATEGORIZED_DOT_CLASS = 'border border-dashed border-dash-strong';

/**
 * The swatch class for a category id, or the dashed outline for `null`.
 *
 * `categories` is the ordered list the ledger already has (sorted once in
 * `useLedger`), so the index is stable for a session and identical everywhere
 * the same list is rendered.
 */
export function categoryDotClass(
  categoryId: string | null,
  categories: readonly Category[],
): string {
  if (categoryId === null) return UNCATEGORIZED_DOT_CLASS;
  const index = categories.findIndex((candidate) => candidate.id === categoryId);
  if (index < 0) return UNCATEGORIZED_DOT_CLASS;
  return RAMP[index % RAMP.length] ?? UNCATEGORIZED_DOT_CLASS;
}
