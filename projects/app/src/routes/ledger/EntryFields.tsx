import { type ReactNode, type RefObject } from 'react';
import { Label } from '@/components/ui/label';
import type { Account, Category } from '../../data/types';
import { quickEntryCopy } from '../../copy/strings';
import { CURRENCY_SYMBOL } from '../../lib/money';
import {
  directionFromAmountInput,
  type Direction,
  type EntryDraft,
  type EntryField,
} from './quick-entry';

/**
 * The six controls a transaction is made of, as one row.
 *
 * **Why this is a component and not two copies of the same JSX.** Phase 4 has
 * two writers — the quick-entry bar at the top of the ledger and the inline
 * editor a row turns into — and they are the same six fields in the same order.
 * Duplicating the markup would have duplicated the two things that must never
 * drift: **the DOM order, which IS the tab order** (documents/design-system.md
 * §4 — amount → description → category → account → date → save, and re-ordering
 * the row re-orders the hands), and the leading-sign-is-a-direction-control
 * behaviour. One file, so a change to either reaches both.
 *
 * The extraction moved no behaviour: the elements, their order, their classes
 * and their handlers are what shipped in `QuickEntry` at 11 keystrokes, and the
 * count was re-measured afterwards rather than assumed.
 *
 * **What stays out of here:** the `<form>`, the submit handler, the validation
 * result, and the trailing buttons. Those differ (save vs. save + delete +
 * cancel), so they are the caller's, and arrive as `actions`.
 *
 * The selects are still NATIVE `<select>` elements (design-system.md §2) — a
 * Radix listbox changes the keyboard model and costs keystrokes.
 */

interface EntryFieldsProps {
  /**
   * Prefix for every control id, so a page holding the entry bar AND an open
   * row editor has no duplicate ids and every `<Label htmlFor>` still points at
   * exactly one control.
   */
  readonly idPrefix: string;
  readonly draft: EntryDraft;
  readonly onDraftChange: (updater: (current: EntryDraft) => EntryDraft) => void;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** The message for a field, or `null`. Errors are the caller's business. */
  readonly errorFor: (field: EntryField) => string | null;
  readonly amountRef: RefObject<HTMLInputElement | null>;
  readonly descriptionRef: RefObject<HTMLInputElement | null>;
  readonly accountRef: RefObject<HTMLSelectElement | null>;
  readonly dateRef: RefObject<HTMLInputElement | null>;
  /** Put the caret in the amount box on mount. True for both writers today. */
  readonly autoFocusAmount: boolean;
  /** Smaller type, for the editor sitting inside a ledger row. */
  readonly dense?: boolean;
  /** The trailing buttons. Last in the DOM, therefore last in the tab order. */
  readonly actions: ReactNode;
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

export function EntryFields({
  idPrefix,
  draft,
  onDraftChange,
  accounts,
  categories,
  errorFor,
  amountRef,
  descriptionRef,
  accountRef,
  dateRef,
  autoFocusAmount,
  dense = false,
  actions,
}: EntryFieldsProps) {
  const id = (field: string): string => `${idPrefix}-${field}`;

  const focusAmount = (): void => {
    amountRef.current?.focus();
    amountRef.current?.select();
  };

  const setAmount = (raw: string): void => {
    // A leading sign is a DIRECTION control, not arithmetic (see quick-entry.ts).
    const asserted = directionFromAmountInput(raw);
    onDraftChange((current) => ({
      ...current,
      amount: raw,
      direction: asserted ?? current.direction,
    }));
  };

  const toggleDirection = (): void => {
    onDraftChange((current) => {
      const direction: Direction = current.direction === 'outflow' ? 'inflow' : 'outflow';
      // Drop a leading sign the user had typed, so the box can never show one
      // direction while the toggle shows the other.
      return { ...current, direction, amount: current.amount.replace(/^\s*[-+]/, '') };
    });
    focusAmount();
  };

  const { outflowLabel, inflowLabel, toggleLabel } = quickEntryCopy.direction;
  const current = draft.direction === 'outflow' ? outflowLabel : inflowLabel;
  const other = draft.direction === 'outflow' ? inflowLabel : outflowLabel;
  const directionLabel = toggleLabel.replace('{current}', current).replace('{other}', other);

  const outflowActive = draft.direction === 'outflow';
  /** One segment of the direction pill. The active one carries its own colour. */
  const segment = (active: boolean, tone: 'outflow' | 'inflow'): string =>
    active
      ? `rounded-pill px-3.5 py-1 text-[13px] font-semibold text-brand-foreground ${
          tone === 'outflow' ? 'bg-outflow' : 'bg-inflow'
        }`
      : 'rounded-pill px-3.5 py-1 text-[13px] font-medium text-ink-muted';

  return (
    /* ONE row. The DOM order IS the tab order, and it is the order the
       hands expect: amount, description, category, account, date, save. */
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Direction: one tab stop, one key to flip. Two segments are drawn,
          but this is a single toggle button — clicking either flips it. */}
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
      {/* The amount/description share of the row is FLIPPED when dense. Entry
          starts with an empty amount box, so description deserves the room;
          the editor opens seeded with a full-magnitude value — `1.250.000.000`
          is thirteen glyphs — and an amount box that clips the number being
          corrected is the one thing this row must never do. */}
      <div
        className={`flex items-baseline gap-2 border-b-2 border-field-line px-1 pt-0.5 pb-1.5 focus-within:border-brand ${
          dense ? 'min-w-[11rem] flex-[1.6]' : 'min-w-[8.5rem] flex-1'
        }`}
      >
        <Label htmlFor={id('amount')} className="sr-only">
          {quickEntryCopy.amount}
        </Label>
        <input
          id={id('amount')}
          ref={amountRef}
          name="amount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          // The landing route puts the cursor here. Entry is what this screen
          // is for; nothing else on it deserves the caret more.
          autoFocus={autoFocusAmount}
          placeholder={quickEntryCopy.amountPlaceholder}
          aria-invalid={errorFor('amount') !== null}
          aria-describedby={id('amount-status')}
          className={`w-full border-0 bg-transparent font-semibold tracking-[-0.02em] tabular-nums text-ink outline-none placeholder:text-ink-faint/60 ${
            dense ? 'text-[20px] leading-[26px]' : 'text-[28px] leading-[34px]'
          }`}
          value={draft.amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {/* The symbol comes from the money module, never typed here. */}
        <span aria-hidden="true" className="text-[17px] text-ink-faint">
          {CURRENCY_SYMBOL}
        </span>
      </div>

      <div className={`flex min-w-[8rem] flex-col ${dense ? 'flex-1' : 'flex-[1.6]'}`}>
        <Label htmlFor={id('description')} className="sr-only">
          {quickEntryCopy.description}
        </Label>
        <input
          id={id('description')}
          ref={descriptionRef}
          name="description"
          type="text"
          autoComplete="off"
          placeholder={quickEntryCopy.descriptionPlaceholder}
          aria-invalid={errorFor('description') !== null}
          className={`${LINE_CLASS} border-field-line-soft py-1.5 text-base text-ink placeholder:text-ink-faint/60`}
          value={draft.description}
          onChange={(event) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              description: event.target.value,
            }))
          }
        />
      </div>

      <div className="shrink-0">
        <Label htmlFor={id('category')} className="sr-only">
          {quickEntryCopy.category}
        </Label>
        <select
          id={id('category')}
          name="category_id"
          title={quickEntryCopy.categoryHint}
          className={draft.category_id === '' ? CHIP_DASHED_CLASS : CHIP_CLASS}
          value={draft.category_id}
          onChange={(event) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              category_id: event.target.value,
            }))
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
        <Label htmlFor={id('account')} className="sr-only">
          {quickEntryCopy.account}
        </Label>
        <select
          id={id('account')}
          ref={accountRef}
          name="account_id"
          aria-invalid={errorFor('account_id') !== null}
          className={CHIP_CLASS}
          value={draft.account_id}
          onChange={(event) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              account_id: event.target.value,
            }))
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
        <Label htmlFor={id('date')} className="sr-only">
          {quickEntryCopy.date}
        </Label>
        <input
          id={id('date')}
          ref={dateRef}
          name="occurred_on"
          type="date"
          aria-invalid={errorFor('occurred_on') !== null}
          className="rounded-pill bg-inset px-3 py-1.5 text-[13px] tabular-nums text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          value={draft.occurred_on}
          onChange={(event) =>
            onDraftChange((currentDraft) => ({
              ...currentDraft,
              occurred_on: event.target.value,
            }))
          }
        />
      </div>

      {actions}
    </div>
  );
}
