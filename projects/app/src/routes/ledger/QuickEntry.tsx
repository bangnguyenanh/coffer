import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { Account, Category, Transaction } from '../../data/types';
import { amountErrorCopy, entryErrorCopy, quickEntryCopy } from '../../copy/strings';
import { todayCalendarDate } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
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
 */
interface QuickEntryProps {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Whether a saved row survives the ledger's current filters — see `useLedger`. */
  readonly matchesCurrentFilter: (txn: Transaction) => boolean;
  readonly onClearFilters: () => void;
}

const FIELD_CLASS =
  'w-full rounded-md border border-border-subtle bg-surface-raised px-2 py-1.5 text-sm text-ink';
const LABEL_CLASS = 'block text-xs font-medium text-ink-muted';

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

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      data-quick-entry=""
      data-direction={draft.direction}
      data-amount-minor={preview.ok ? String(preview.amountMinor) : ''}
      data-amount-preview={preview.ok ? formatAmount(preview.amountMinor) : ''}
      data-amount-error={amountErrorCode}
      data-error-fields={errors.map((error) => error.field).join(' ')}
      data-category-skipped={draft.category_id === '' ? 'true' : 'false'}
      data-saved-id={saved?.transaction.id ?? ''}
      data-saved-visible={saved === null ? '' : String(saved.visible)}
      className="rounded-lg border border-border-subtle bg-surface-raised p-4"
      aria-labelledby="quick-entry-legend"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="quick-entry-legend"
          className="text-xs font-medium uppercase tracking-wide text-ink-muted"
        >
          {quickEntryCopy.legend}
        </h2>
        <p className="text-xs text-ink-muted">{quickEntryCopy.hint}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Direction: one tab stop, one key to flip. */}
        <div className="lg:col-span-2">
          <span className={LABEL_CLASS}>{quickEntryCopy.direction.legend}</span>
          <button
            type="button"
            data-direction-toggle=""
            aria-label={directionLabel}
            onClick={toggleDirection}
            className={`mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-medium ${
              draft.direction === 'outflow'
                ? 'border-outflow text-outflow'
                : 'border-inflow text-inflow'
            }`}
          >
            {draft.direction === 'outflow'
              ? quickEntryCopy.direction.outflow
              : quickEntryCopy.direction.inflow}
          </button>
        </div>

        <div className="lg:col-span-3">
          <label className={LABEL_CLASS} htmlFor="entry-amount">
            {quickEntryCopy.amount}
          </label>
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
            className={`${FIELD_CLASS} tabular-nums`}
            value={draft.amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="lg:col-span-4">
          <label className={LABEL_CLASS} htmlFor="entry-description">
            {quickEntryCopy.description}
          </label>
          <input
            id="entry-description"
            ref={descriptionRef}
            name="description"
            type="text"
            autoComplete="off"
            placeholder={quickEntryCopy.descriptionPlaceholder}
            aria-invalid={errorFor('description') !== null}
            className={FIELD_CLASS}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>

        <div className="lg:col-span-3">
          <label className={LABEL_CLASS} htmlFor="entry-category">
            {quickEntryCopy.category}
          </label>
          <select
            id="entry-category"
            ref={categoryRef}
            name="category_id"
            className={FIELD_CLASS}
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

        <div className="lg:col-span-4">
          <label className={LABEL_CLASS} htmlFor="entry-account">
            {quickEntryCopy.account}
          </label>
          <select
            id="entry-account"
            ref={accountRef}
            name="account_id"
            aria-invalid={errorFor('account_id') !== null}
            className={FIELD_CLASS}
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

        <div className="lg:col-span-3">
          <label className={LABEL_CLASS} htmlFor="entry-date">
            {quickEntryCopy.date}
          </label>
          <input
            id="entry-date"
            ref={dateRef}
            name="occurred_on"
            type="date"
            aria-invalid={errorFor('occurred_on') !== null}
            className={`${FIELD_CLASS} tabular-nums`}
            value={draft.occurred_on}
            onChange={(event) =>
              setDraft((current) => ({ ...current, occurred_on: event.target.value }))
            }
          />
        </div>

        <div className="flex items-end lg:col-span-2">
          <button
            type="submit"
            data-action="save-transaction"
            className="w-full rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-surface-raised"
          >
            {quickEntryCopy.submit}
          </button>
        </div>

        <p className="text-xs text-ink-muted lg:col-span-3">{quickEntryCopy.categoryHint}</p>
      </div>

      {/* One live region for both halves of "what will be stored": the preview
          while it parses, the reason while it does not. */}
      <p id="entry-amount-status" className="mt-3 text-xs" aria-live="polite">
        {preview.ok ? (
          <span className="text-ink-muted">
            {quickEntryCopy.previewLabel}{' '}
            <span
              data-amount-preview-value=""
              data-direction={draft.direction}
              className={`font-medium tabular-nums ${
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
                className="font-medium text-brand underline underline-offset-2"
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
