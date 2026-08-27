import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Account, Category, Transaction } from '../../data/types';
import { amountErrorCopy, entryErrorCopy, quickEntryCopy } from '../../copy/strings';
import { todayCalendarDate } from '../../lib/calendar-date';
import { CURRENCY_SYMBOL, formatAmount } from '../../lib/money';
import { useAppData } from '../../state/useAppData';
import {
  DEFAULT_DIRECTION,
  directionFromAmountInput,
  draftAmountMinor,
  draftToTransaction,
  nextDraft,
  type Direction,
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
 * ## Theme C (ticket 0005) — what changed, and what deliberately did not
 *
 * ONE ROW: a direction pill, an oversized tabular amount on a ruled line, the
 * description, the account chip, the dashed "chưa phân loại" chip, the date, and
 * the ochre `Lưu`. Labels are still rendered — as `sr-only`, so the accessible
 * name of every control survives a layout that has no room for visible ones.
 *
 * **Entry speed is the acceptance test, not the look** (ADR 0005). So none of
 * the behaviour moved: same DOM order, therefore the same tab order; the amount
 * box still autofocuses; the selects are still NATIVE `<select>` elements, which
 * is why `Enter` still submits from anywhere in the row and why arrow keys still
 * pick an option without opening a popper. Swapping them for a Radix listbox
 * would have cost keystrokes, and a slower entry path is a regression.
 */
interface QuickEntryProps {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Whether a saved row survives the ledger's current filters — see `useLedger`. */
  readonly matchesCurrentFilter: (txn: Transaction) => boolean;
  readonly onClearFilters: () => void;
}

/** A chip-shaped native control: pill ground, no browser chrome, one tab stop. */
const CHIP_CLASS =
  'appearance-none rounded-pill bg-inset px-3.5 py-1.5 text-[13px] font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
/** The same chip while the category is skipped — dashed, per theme C. */
const CHIP_DASHED_CLASS =
  'appearance-none rounded-pill border border-dashed border-dash bg-transparent px-3.5 py-1.5 text-[13px] text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
/** A field that is a ruled line rather than a box. */
const LINE_CLASS =
  'w-full border-0 border-b-2 bg-transparent px-1 outline-none focus-visible:border-b-brand';

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
  const categoryRef = useRef<HTMLSelectElement>(null);
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
          target instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      event.preventDefault();
      focusAmount();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusAmount]);

  const setAmount = (raw: string): void => {
    // A leading sign is a DIRECTION control, not arithmetic (see quick-entry.ts).
    const asserted = directionFromAmountInput(raw);
    setDraft((current) => ({
      ...current,
      amount: raw,
      direction: asserted ?? current.direction,
    }));
  };

  const toggleDirection = (): void => {
    setDraft((current) => {
      const direction: Direction = current.direction === 'outflow' ? 'inflow' : 'outflow';
      // Drop a leading sign the user had typed, so the box can never show one
      // direction while the toggle shows the other.
      return { ...current, direction, amount: current.amount.replace(/^\s*[-+]/, '') };
    });
    focusAmount();
  };

  const REF_BY_FIELD: Record<EntryField, { readonly current: HTMLElement | null }> = {
    amount: amountRef,
    description: descriptionRef,
    occurred_on: dateRef,
    account_id: accountRef,
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const attempt = draftToTransaction(draft);
    if (!attempt.ok) {
      setSubmitted(true);
      setSaved(null);
      // Land the cursor on the first thing that is wrong, so the fix is typing.
      const first = attempt.errors[0];
      if (first !== undefined) REF_BY_FIELD[first.field].current?.focus();
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

  const directionLabel = useMemo(() => {
    const { outflowLabel, inflowLabel, toggleLabel } = quickEntryCopy.direction;
    const current = draft.direction === 'outflow' ? outflowLabel : inflowLabel;
    const other = draft.direction === 'outflow' ? inflowLabel : outflowLabel;
    return toggleLabel.replace('{current}', current).replace('{other}', other);
  }, [draft.direction]);

  const outflowActive = draft.direction === 'outflow';
  /** One segment of the direction pill. The active one carries its own colour. */
  const segment = (active: boolean, tone: 'outflow' | 'inflow'): string =>
    active
      ? `rounded-pill px-3.5 py-1 text-[13px] font-semibold text-brand-foreground ${
          tone === 'outflow' ? 'bg-outflow' : 'bg-inflow'
        }`
      : 'rounded-pill px-3.5 py-1 text-[13px] font-medium text-ink-muted';

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

      {/* ONE row. The DOM order IS the tab order, and it is the order the
          hands expect: amount, description, category, account, date, save. */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Direction: one tab stop, one key to flip. Two segments are drawn,
            but this is a single toggle button — clicking either flips it, so
            the control's behaviour is exactly what it was. */}
        <button
          type="button"
          data-direction-toggle=""
          aria-label={directionLabel}
          onClick={toggleDirection}
          className="flex shrink-0 items-center gap-0.5 rounded-pill bg-inset p-[3px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className={segment(outflowActive, 'outflow')}>
            {quickEntryCopy.direction.outflow}
          </span>
          <span className={segment(!outflowActive, 'inflow')}>
            {quickEntryCopy.direction.inflow}
          </span>
        </button>

        {/* Amount — the biggest thing on the row, because it is the field the
            caret starts in and the one a 100x typo hides in. */}
        <div className="flex min-w-[8.5rem] flex-1 items-baseline gap-2 border-b-2 border-field-line px-1 pt-0.5 pb-1.5 focus-within:border-brand">
          <Label htmlFor="entry-amount" className="sr-only">
            {quickEntryCopy.amount}
          </Label>
          <input
            id="entry-amount"
            ref={amountRef}
            name="amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            // The landing route puts the cursor here. Entry is what this screen
            // is for; nothing else on it deserves the caret more.
            autoFocus
            placeholder={quickEntryCopy.amountPlaceholder}
            aria-invalid={errorFor('amount') !== null}
            aria-describedby="entry-amount-status"
            className="w-full border-0 bg-transparent text-[28px] leading-[34px] font-semibold tracking-[-0.02em] tabular-nums text-ink outline-none placeholder:text-ink-faint/60"
            value={draft.amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          {/* The symbol comes from the money module, never typed here. */}
          <span aria-hidden="true" className="text-[17px] text-ink-faint">
            {CURRENCY_SYMBOL}
          </span>
        </div>

        <div className="flex min-w-[8rem] flex-[1.6] flex-col">
          <Label htmlFor="entry-description" className="sr-only">
            {quickEntryCopy.description}
          </Label>
          <input
            id="entry-description"
            ref={descriptionRef}
            name="description"
            type="text"
            autoComplete="off"
            placeholder={quickEntryCopy.descriptionPlaceholder}
            aria-invalid={errorFor('description') !== null}
            className={`${LINE_CLASS} border-field-line-soft py-1.5 text-base text-ink placeholder:text-ink-faint/60`}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>

        <div className="shrink-0">
          <Label htmlFor="entry-category" className="sr-only">
            {quickEntryCopy.category}
          </Label>
          <select
            id="entry-category"
            ref={categoryRef}
            name="category_id"
            title={quickEntryCopy.categoryHint}
            className={draft.category_id === '' ? CHIP_DASHED_CLASS : CHIP_CLASS}
            value={draft.category_id}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category_id: event.target.value }))
            }
          >
            {/* Skipping is the DEFAULT and it is spelled out, so an uncategorized
                row is a choice the user can see themselves making. */}
            <option value="">{quickEntryCopy.skipCategory}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0">
          <Label htmlFor="entry-account" className="sr-only">
            {quickEntryCopy.account}
          </Label>
          <select
            id="entry-account"
            ref={accountRef}
            name="account_id"
            aria-invalid={errorFor('account_id') !== null}
            className={CHIP_CLASS}
            value={draft.account_id}
            onChange={(event) =>
              setDraft((current) => ({ ...current, account_id: event.target.value }))
            }
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0">
          <Label htmlFor="entry-date" className="sr-only">
            {quickEntryCopy.date}
          </Label>
          <input
            id="entry-date"
            ref={dateRef}
            name="occurred_on"
            type="date"
            aria-invalid={errorFor('occurred_on') !== null}
            className="rounded-pill bg-inset px-3 py-1.5 text-[13px] tabular-nums text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            value={draft.occurred_on}
            onChange={(event) =>
              setDraft((current) => ({ ...current, occurred_on: event.target.value }))
            }
          />
        </div>

        <Button
          type="submit"
          data-action="save-transaction"
          className="h-10 shrink-0 rounded-pill px-5 text-sm font-semibold"
        >
          {quickEntryCopy.submit}
        </Button>
      </div>

      {/* The keyboard contract on the left, what will be stored on the right.
          One live region for both halves of the second: the preview while the
          amount parses, a blank while it does not. */}
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-ink-faint">{quickEntryCopy.hint}</p>
        <p id="entry-amount-status" className="text-xs" aria-live="polite">
          {preview.ok ? (
            <span className="text-ink-muted">
              {quickEntryCopy.previewLabel}{' '}
              <span
                data-amount-preview-value=""
                data-direction={draft.direction}
                className={`font-semibold tabular-nums ${
                  draft.direction === 'outflow' ? 'text-outflow' : 'text-inflow'
                }`}
              >
                {formatAmount(preview.amountMinor)}
              </span>
            </span>
          ) : (
            <span className="text-ink-muted">&nbsp;</span>
          )}
        </p>
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert" data-entry-errors="">
          {errors.map((error) => (
            <li
              key={error.field}
              data-error-field={error.field}
              data-error-reason={error.reason}
              className="text-xs text-outflow"
            >
              {errorFor(error.field)}
            </li>
          ))}
        </ul>
      )}

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
