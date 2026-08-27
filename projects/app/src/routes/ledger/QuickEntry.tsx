import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import type { Account, Category, Transaction } from '../../data/types';
import { amountErrorCopy, entryErrorCopy, quickEntryCopy } from '../../copy/strings';
import { todayCalendarDate } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
import { useAppData } from '../../state/useAppData';
import { EntryFeedback } from './EntryFeedback';
import { EntryFields } from './EntryFields';
import {
  DEFAULT_DIRECTION,
  draftAmountMinor,
  draftToTransaction,
  nextDraft,
  type EntryDraft,
  type EntryField,
} from './quick-entry';

/**
 * Quick entry — the bar at the top of the ledger.
 *
 * **Where it lives, and why.** Hub ticket 0003 phase 4 asks for keyboard-first
 * entry with no modal round-trips, and leaves the placement to this surface.
 * This is a PERSISTENT INLINE ROW at the top of the ledger, always mounted and
 * autofocused, so the cost of starting an entry is ZERO keystrokes and zero
 * clicks: the landing route already has the cursor in the amount box. A modal
 * costs a summon plus an animation; a `/new` route costs a navigation and takes
 * the ledger off screen, which is the thing the new row has to appear in. A
 * keyboard-summoned bar costs one key AND hides the feature from anyone who has
 * not been told the key — so the summon key exists (`N`, to come back to the
 * amount box from anywhere on the page) but nothing is hidden behind it.
 *
 * **What it renders as evidence.** Correctness here is about what gets STORED,
 * not what gets laid out, so the stored value is on the DOM before it is saved:
 * `data-amount-minor` (the signed integer), `data-amount-preview` (the same
 * value through the money module), `data-direction`, `data-amount-error`, and
 * after a save `data-saved-id` / `data-saved-visible`.
 *
 * No formatting and no parsing happens in this file — both go through
 * `src/lib/money.ts`, and the rules go through `./quick-entry.ts`.
 *
 * ## The edit half of phase 4 changed this file, and only by subtraction
 *
 * The six controls and the preview/error block moved to `EntryFields` and
 * `EntryFeedback` so the inline row editor is the SAME form, not a lookalike.
 * Nothing about behaviour moved with them: same elements, same DOM order, same
 * handlers — therefore the same tab order and the same **11 keystrokes**, which
 * was re-measured after the extraction rather than assumed
 * (documents/design-system.md §4: a slower entry path is a regression, not a
 * taste).
 *
 * ## Theme C (ticket 0005) — what changed, and what deliberately did not
 *
 * ONE ROW: a direction pill, an oversized tabular amount on a ruled line, the
 * description, the account chip, the dashed "chưa phân loại" chip, the date, and
 * the ochre `Lưu`. Labels are still rendered — as `sr-only`, so the accessible
 * name of every control survives a layout that has no room for visible ones.
 *
 * **Entry speed is the acceptance test, not the look** (ADR 0005). The selects
 * are still NATIVE `<select>` elements, which is why `Enter` still submits from
 * anywhere in the row and why arrow keys still pick an option without opening a
 * popper.
 */
interface QuickEntryProps {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Whether a saved row survives the ledger's current filters — see `useLedger`. */
  readonly matchesCurrentFilter: (txn: Transaction) => boolean;
  readonly onClearFilters: () => void;
}

interface SavedNotice {
  readonly transaction: Transaction;
  /** Resolved at save time; the answer is about the filter that was on THEN. */
  readonly visible: boolean;
}

export function QuickEntry({
  accounts,
  categories,
  matchesCurrentFilter,
  onClearFilters,
}: QuickEntryProps) {
  const { addTransaction } = useAppData();

  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<EntryDraft>(() => ({
    amount: '',
    direction: DEFAULT_DIRECTION,
    description: '',
    // Defaults that make the common case need no input at all: today, and the
    // first account until the session has used one (then `nextDraft` keeps it).
    account_id: accounts[0]?.id ?? '',
    category_id: '',
    occurred_on: todayCalendarDate(),
  }));

  /** Errors appear on the first submit attempt, then track the draft live. */
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState<SavedNotice | null>(null);

  const result = draftToTransaction(draft);
  const errors = submitted && !result.ok ? result.errors : [];
  const errorFor = (field: EntryField): string | null => {
    const hit = errors.find((error) => error.field === field);
    if (hit === undefined) return null;
    return hit.field === 'amount' ? amountErrorCopy[hit.reason] : entryErrorCopy[hit.reason];
  };
  const amountErrorCode = errors.find((error) => error.field === 'amount')?.reason ?? '';

  // The signed integer this draft WOULD store, shown live. This is the
  // anti-100x affordance: `30000` previews as `30.000 ₫`, never `300 ₫`.
  const preview = draftAmountMinor(draft);

  const focusAmount = useCallback((): void => {
    amountRef.current?.focus();
    amountRef.current?.select();
  }, []);

  /**
   * `N` anywhere on the page returns to the amount box — the "start another
   * one" key, for when the hands have left the bar to change a filter. Ignored
   * while a field has focus, or it would eat the letter out of a description.
   *
   * **Also ignored while a ledger row is open for editing** (`[data-row-editor]`
   * in the ancestry, or a focused row waiting for its own keys): the editor is a
   * second form, and yanking the caret out of it into the entry bar would be a
   * keystroke that silently abandons what is being corrected.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'n' && event.key !== 'N') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement ||
          target.closest('[data-row-editor]') !== null)
      ) {
        return;
      }
      event.preventDefault();
      focusAmount();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusAmount]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const attempt = draftToTransaction(draft);
    if (!attempt.ok) {
      setSubmitted(true);
      setSaved(null);
      // Land the cursor on the first thing that is wrong, so the fix is typing.
      const refByField: Record<EntryField, { readonly current: HTMLElement | null }> = {
        amount: amountRef,
        description: descriptionRef,
        occurred_on: dateRef,
        account_id: accountRef,
      };
      const first = attempt.errors[0];
      if (first !== undefined) refByField[first.field].current?.focus();
      return;
    }

    const created = addTransaction(attempt.transaction);
    setSaved({ transaction: created, visible: matchesCurrentFilter(created) });
    setDraft(nextDraft);
    setSubmitted(false);
    focusAmount();
  };

  /** Escape abandons the row being typed without leaving the bar. */
  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setDraft(nextDraft);
    setSubmitted(false);
    setSaved(null);
    focusAmount();
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      className="panel px-5 py-4.5"
      data-quick-entry=""
      data-direction={draft.direction}
      data-amount-minor={preview.ok ? String(preview.amountMinor) : ''}
      data-amount-preview={preview.ok ? formatAmount(preview.amountMinor) : ''}
      data-amount-error={amountErrorCode}
      data-error-fields={errors.map((error) => error.field).join(' ')}
      data-category-skipped={draft.category_id === '' ? 'true' : 'false'}
      data-saved-id={saved?.transaction.id ?? ''}
      data-saved-visible={saved === null ? '' : String(saved.visible)}
      aria-labelledby="quick-entry-legend"
    >
      <h2 id="quick-entry-legend" className="sr-only">
        {quickEntryCopy.legend}
      </h2>

      <EntryFields
        idPrefix="entry"
        draft={draft}
        onDraftChange={setDraft}
        accounts={accounts}
        categories={categories}
        errorFor={errorFor}
        amountRef={amountRef}
        descriptionRef={descriptionRef}
        accountRef={accountRef}
        dateRef={dateRef}
        autoFocusAmount
        actions={
          <Button
            type="submit"
            data-action="save-transaction"
            className="h-10 shrink-0 rounded-pill px-5 text-sm font-semibold"
          >
            {quickEntryCopy.submit}
          </Button>
        }
      />

      <EntryFeedback
        idPrefix="entry"
        hint={quickEntryCopy.hint}
        preview={preview}
        direction={draft.direction}
        errors={errors}
        errorFor={errorFor}
      />

      {saved !== null && (
        <p className="mt-2 text-xs text-ink-muted" role="status" data-saved-notice="">
          {quickEntryCopy.saved
            .replace('{description}', saved.transaction.description)
            .replace('{amount}', formatAmount(saved.transaction.amount_minor))}
          {!saved.visible && (
            <>
              {' '}
              {/* Saved, but filtered out of the list. Said out loud, because a
                  row that simply is not there reads as data loss. */}
              <span data-saved-hidden="">{quickEntryCopy.savedHidden}</span>{' '}
              <button
                type="button"
                data-action="clear-filters-for-saved"
                className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
                onClick={() => {
                  onClearFilters();
                  focusAmount();
                }}
              >
                {quickEntryCopy.savedShow}
              </button>
            </>
          )}
        </p>
      )}
    </form>
  );
}
