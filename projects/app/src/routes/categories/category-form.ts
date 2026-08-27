/**
 * The category form's draft, and the rules that turn it into a `Category`.
 *
 * Same split as quick entry (`../ledger/quick-entry.ts`) and the account form
 * (`../accounts/account-form.ts`), for the same reason: the component owns the
 * fields, this module owns what is legal — so create and rename run through one
 * function and a rule cannot hold on create and lapse on rename.
 *
 * **A category is flat and it is a NAME.** There is no parent, no colour and no
 * shortcut field: nesting is an unresolved question in the hub's
 * `decisions/CANDIDATES.md` (hub ticket 0004 explicitly does not settle it), the
 * swatch is derived from list position (`components/category-color.ts`), and the
 * digit key is derived from list position too (`../triage/category-keys.ts`).
 * Storing any of those three would be storing a second copy of something the
 * ordering already answers.
 *
 * There is no amount here, so nothing in this file touches the money contract.
 */

import type { Category } from '../../data/types';

export interface CategoryDraft {
  readonly name: string;
}

export const emptyCategoryDraft: CategoryDraft = { name: '' };

export function categoryDraftFrom(category: Category): CategoryDraft {
  return { name: category.name };
}

export type CategoryFailure = 'NAME_REQUIRED' | 'NAME_TAKEN';

export type CategoryDraftResult =
  | { readonly ok: true; readonly category: Omit<Category, 'id'> }
  | { readonly ok: false; readonly reason: CategoryFailure };

/**
 * Case-insensitive, Vietnamese-aware comparison for the duplicate check.
 *
 * Deliberately NOT the diacritic-folding `fold()` the ledger search uses.
 * Search wants `ca phe` to find `Cà phê`, because a searcher is guessing;
 * a category list is being AUTHORED, and in Vietnamese the diacritics are the
 * word — refusing `Do` because `Đo` exists would block a legitimate name. Case
 * is folded because `Cà phê` and `cà phê` are the same category by any reading.
 */
function sameName(a: string, b: string): boolean {
  return a.toLocaleLowerCase('vi') === b.toLocaleLowerCase('vi');
}

/**
 * Validate a draft.
 *
 * `existing` is the full category list and `selfId` is the category being
 * renamed, or `null` when creating. Excluding itself is what lets a rename that
 * only changes case (`cà phê` -> `Cà phê`) through, while still refusing a name
 * another category already holds.
 *
 * A duplicate is refused rather than allowed because both of the things a
 * category's position decides — its swatch and its triage digit — are read off a
 * name-ordered list. Two categories with one name are two chips a reader cannot
 * tell apart, bound to two different digits.
 */
export function categoryDraftToCategory(
  draft: CategoryDraft,
  existing: readonly Category[],
  selfId: string | null,
): CategoryDraftResult {
  const name = draft.name.trim();
  if (name === '') return { ok: false, reason: 'NAME_REQUIRED' };

  const clash = existing.some(
    (category) => category.id !== selfId && sameName(category.name, name),
  );
  if (clash) return { ok: false, reason: 'NAME_TAKEN' };

  return { ok: true, category: { name } };
}
