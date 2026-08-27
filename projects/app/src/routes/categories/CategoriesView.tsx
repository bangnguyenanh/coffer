import { useCallback, useMemo, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { categoryDotClass } from '../../components/category-color';
import { UndoBar } from '../../components/UndoBar';
import { categoriesCopy, categoryErrorCopy } from '../../copy/strings';
import type { Category } from '../../data/types';
import { useAppData } from '../../state/useAppData';
import type { CategoryRemoval } from '../../state/AppDataContext';
import { byName } from '../ledger/ordering';
import { categoryKeyForIndex } from '../triage/category-keys';
import {
  categoryDraftFrom,
  categoryDraftToCategory,
  emptyCategoryDraft,
  type CategoryDraft,
} from './category-form';

/**
 * Categories — hub ticket 0004 phase 3. Create, rename, delete. Flat.
 *
 * ## Deleting a category never deletes a transaction
 *
 * This is the whole point of the screen, and it is the one thing here that would
 * be unrecoverable if it were wrong. A category is a label somebody put on a row
 * afterwards; the row is the thing that actually happened. So deleting a
 * category REASSIGNS its rows to uncategorised and they land in the triage
 * inbox, where they can be re-filed — the count of rows about to move is
 * rendered on the delete button's own row before it is pressed, and the undo bar
 * afterwards names exactly how many moved. The invariant is enforced in
 * `src/state/` (`removeCategory`), not here, so no caller can forget it.
 *
 * There is no confirmation dialog, here or anywhere on this surface
 * (design-system.md §3.9): the action happens and the undo bar arrives with the
 * caret already on `Hoàn tác`.
 *
 * ## Flat, and that is not this ticket's call to change
 *
 * Nested categories are an open question in the hub's `decisions/CANDIDATES.md`.
 * There is no parent field, no indentation and no drag target — adding one would
 * be settling a decision this ticket explicitly does not own.
 *
 * ## The list order is load-bearing, so this screen renders it
 *
 * Two things are derived from a category's POSITION in the name-ordered list:
 * its swatch (`components/category-color.ts`, four ramp steps by index) and its
 * triage digit (`../triage/category-keys.ts`, `1`–`9` by index). Neither is
 * stored on the data — which is why a rename or a create RE-ORDERS both.
 *
 * That is a real consequence and hiding it would be the bug. So this screen
 * shows both: the swatch beside every name and the digit in its own column, on
 * the one screen where the reordering is caused. A rename moves a colour and a
 * key while you watch, instead of silently changing what `3` means on a screen
 * you are not looking at. Categories past the ninth render `—`, exactly as the
 * triage legend does — a category with no key must never look like one that has
 * a key nobody can find.
 */

type CategoriesNotice = { readonly kind: 'removed'; readonly removal: CategoryRemoval };

export function CategoriesView() {
  const {
    transactions,
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    restoreCategories,
    assignCategories,
  } = useAppData();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(emptyCategoryDraft);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<CategoriesNotice | null>(null);

  /** The SAME order the swatch and the digit key are derived from. */
  const ordered = useMemo(() => [...categories].sort(byName), [categories]);

  /** How many rows each category currently holds — the number a delete moves. */
  const usage = useMemo(() => {
    const counts = new Map<string, number>(ordered.map((category) => [category.id, 0]));
    for (const txn of transactions) {
      if (txn.category_id === null) continue;
      const current = counts.get(txn.category_id);
      if (current === undefined) continue;
      counts.set(txn.category_id, current + 1);
    }
    return counts;
  }, [ordered, transactions]);

  const result = categoryDraftToCategory(draft, categories, editingId);
  const error = submitted && !result.ok ? categoryErrorCopy[result.reason] : null;

  const closeForm = useCallback((): void => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyCategoryDraft);
    setSubmitted(false);
  }, []);

  const startCreate = useCallback((): void => {
    setEditingId(null);
    setDraft(emptyCategoryDraft);
    setSubmitted(false);
    setCreating(true);
  }, []);

  const startEdit = useCallback((category: Category): void => {
    setCreating(false);
    setDraft(categoryDraftFrom(category));
    setSubmitted(false);
    setEditingId(category.id);
  }, []);

  const submitForm = useCallback((): void => {
    const attempt = categoryDraftToCategory(draft, categories, editingId);
    if (!attempt.ok) {
      setSubmitted(true);
      return;
    }
    if (editingId === null) addCategory(attempt.category);
    else updateCategory(editingId, attempt.category);
    closeForm();
  }, [addCategory, categories, closeForm, draft, editingId, updateCategory]);

  const remove = useCallback(
    (category: Category): void => {
      const removal = removeCategory(category.id);
      if (removal === null) return;
      if (editingId === category.id) closeForm();
      setNotice({ kind: 'removed', removal });
    },
    [closeForm, editingId, removeCategory],
  );

  /**
   * Undo is exact: the category comes back with its own id, and every row that
   * was reassigned is written back to the `category_id` it actually had — not to
   * "the category we just restored", which would re-file rows that had been
   * uncategorised all along if the two ever came apart.
   */
  const undoNotice = useCallback((): void => {
    if (notice === null) return;
    restoreCategories([notice.removal.category]);
    assignCategories(notice.removal.reassigned);
    setNotice(null);
  }, [assignCategories, notice, restoreCategories]);

  const noticeMessage =
    notice === null
      ? ''
      : notice.removal.reassigned.length === 0
        ? categoriesCopy.removedEmpty.replace('{name}', notice.removal.category.name)
        : categoriesCopy.removed
            .replace('{name}', notice.removal.category.name)
            .replace('{count}', String(notice.removal.reassigned.length));

  return (
    <section
      aria-labelledby="categories-title"
      data-view="categories"
      data-status="ready"
      data-category-count={ordered.length}
      data-notice={notice?.kind ?? ''}
      data-reassigned-count={notice === null ? '' : String(notice.removal.reassigned.length)}
    >
      <div className="flex items-baseline gap-3.5">
        <h1
          id="categories-title"
          className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
        >
          {categoriesCopy.title}
        </h1>
        <p className="text-[13px] tabular-nums text-ink-muted">
          {categoriesCopy.count.replace('{count}', String(ordered.length))}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{categoriesCopy.subtitle}</p>

      <div className="panel mt-5">
        {/* The action column is a FIXED width in both the header and the rows.
            An `auto` track sizes to its own content, so a header cell holding
            nothing and a row cell holding two buttons produce two different
            grids — and the column labels drift off the values they name. */}
        <div className="grid grid-cols-[1fr_88px_140px_168px] items-baseline gap-4 border-b border-rule px-5 py-3">
          <h2 className="eyebrow">{categoriesCopy.colName}</h2>
          <h2 className="eyebrow">{categoriesCopy.colKey}</h2>
          <h2 className="eyebrow">{categoriesCopy.colUsage}</h2>
          <span />
        </div>

        {ordered.length === 0 ? (
          <div className="px-5 py-12 text-center" data-categories-empty="">
            <p className="font-medium text-ink">{categoriesCopy.emptyTitle}</p>
            <p className="mt-2 text-sm text-ink-muted">{categoriesCopy.emptyBody}</p>
          </div>
        ) : (
          <ul>
            {ordered.map((category, index) =>
              editingId === category.id ? (
                <li
                  key={category.id}
                  data-category-id={category.id}
                  className="border-b border-rule last:border-b-0"
                >
                  <CategoryForm
                    idPrefix={`category-${category.id}`}
                    draft={draft}
                    onDraftChange={setDraft}
                    error={error}
                    onSubmit={submitForm}
                    onCancel={closeForm}
                    legend={categoriesCopy.editLegend}
                  />
                </li>
              ) : (
                <CategoryRow
                  key={category.id}
                  category={category}
                  index={index}
                  ordered={ordered}
                  usageCount={usage.get(category.id) ?? 0}
                  onEdit={startEdit}
                  onRemove={remove}
                />
              ),
            )}
          </ul>
        )}

        {creating ? (
          <div className="border-t border-rule">
            <CategoryForm
              idPrefix="category-new"
              draft={draft}
              onDraftChange={setDraft}
              error={error}
              onSubmit={submitForm}
              onCancel={closeForm}
              legend={categoriesCopy.addLegend}
            />
          </div>
        ) : (
          <div className="border-t border-rule px-4 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-action="add-category"
              onClick={startCreate}
              className="rounded-pill text-[13px] font-medium text-brand"
            >
              <Plus aria-hidden="true" />
              {categoriesCopy.add}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-2.5 px-1 text-xs text-ink-faint" data-order-note="">
        {categoriesCopy.orderNote}
      </p>

      {notice !== null && (
        <UndoBar
          kind={notice.kind}
          message={noticeMessage}
          actionLabel={categoriesCopy.undo}
          onAction={undoNotice}
          dismissLabel={categoriesCopy.dismiss}
          onDismiss={() => setNotice(null)}
        />
      )}
    </section>
  );
}

/**
 * One category: its swatch, its digit key, how many rows it holds, and the two
 * things that can be done to it.
 *
 * `data-category-key` and `data-category-index` are on the row because the whole
 * point of this screen is that both are DERIVED from position — a reviewer has
 * to be able to watch them move when a rename re-sorts the list, and a claim
 * about that is only checkable if the values are on the DOM.
 */
function CategoryRow({
  category,
  index,
  ordered,
  usageCount,
  onEdit,
  onRemove,
}: {
  readonly category: Category;
  readonly index: number;
  readonly ordered: readonly Category[];
  readonly usageCount: number;
  readonly onEdit: (category: Category) => void;
  readonly onRemove: (category: Category) => void;
}) {
  const key = categoryKeyForIndex(index);
  return (
    <li
      data-category-id={category.id}
      data-category-index={index}
      data-category-key={key ?? ''}
      data-category-name={category.name}
      data-category-usage={usageCount}
      className="grid grid-cols-[1fr_88px_140px_168px] items-center gap-4 border-b border-rule px-5 py-2.5 last:border-b-0"
    >
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
        <span
          aria-hidden="true"
          data-category-swatch={categoryDotClass(category.id, ordered)}
          className={`size-2.5 shrink-0 rounded-sm ${categoryDotClass(category.id, ordered)}`}
        />
        {category.name}
      </span>

      <span className="text-[13px] tabular-nums text-ink-muted">
        {key === null ? (
          categoriesCopy.noKey
        ) : (
          <span className="rounded-sm bg-inset px-1.5 py-0.5 text-[11px] font-semibold">{key}</span>
        )}
      </span>

      <span className="text-[13px] tabular-nums text-ink-muted">
        {categoriesCopy.usage.replace('{count}', String(usageCount))}
      </span>

      <span className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-action="edit-category"
          aria-label={categoriesCopy.editLabel.replace('{name}', category.name)}
          onClick={() => onEdit(category)}
          className="rounded-pill text-[13px] text-ink-muted"
        >
          {categoriesCopy.edit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-action="remove-category"
          aria-label={categoriesCopy.removeLabel.replace('{name}', category.name)}
          onClick={() => onRemove(category)}
          className="rounded-pill text-[13px] text-ink-muted"
        >
          {categoriesCopy.remove}
        </Button>
      </span>
    </li>
  );
}

/**
 * One form for create and for rename — the same component, because the rules are
 * the same (`category-form.ts`). Two forms over one rule set is how a rule ends
 * up enforced on create and forgotten on rename.
 *
 * Theme C: a ruled-line input, not a box. `Escape` backs out, the same key that
 * clears the quick-entry draft and the account form.
 */
function CategoryForm({
  idPrefix,
  draft,
  onDraftChange,
  error,
  onSubmit,
  onCancel,
  legend,
}: {
  readonly idPrefix: string;
  readonly draft: CategoryDraft;
  readonly onDraftChange: (next: CategoryDraft) => void;
  readonly error: string | null;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly legend: string;
}) {
  const id = (field: string): string => `${idPrefix}-${field}`;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onCancel();
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      data-category-form=""
      data-category-form-error={error === null ? 'false' : 'true'}
      aria-labelledby={id('legend')}
      className="px-5 py-3"
    >
      <h3 id={id('legend')} className="eyebrow">
        {legend}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[14rem] flex-1 flex-col">
          <Label htmlFor={id('name')} className="sr-only">
            {categoriesCopy.name}
          </Label>
          <input
            id={id('name')}
            name="name"
            type="text"
            autoComplete="off"
            autoFocus
            placeholder={categoriesCopy.namePlaceholder}
            aria-invalid={error !== null}
            className="w-full border-0 border-b-2 border-field-line bg-transparent px-1 py-1.5 text-base text-ink outline-none placeholder:text-ink-faint/60 focus-visible:border-b-brand"
            value={draft.name}
            onChange={(event) => onDraftChange({ name: event.target.value })}
          />
        </div>

        <Button
          type="submit"
          data-action="save-category"
          className="h-9 shrink-0 rounded-pill px-4 text-[13px] font-semibold"
        >
          {categoriesCopy.save}
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-action="cancel-category"
          onClick={onCancel}
          className="h-9 shrink-0 rounded-pill px-3 text-[13px] text-ink-muted"
        >
          {categoriesCopy.cancel}
        </Button>
      </div>

      {error !== null && (
        <p className="mt-2 text-xs text-outflow" role="alert" data-category-error="">
          {error}
        </p>
      )}
    </form>
  );
}
