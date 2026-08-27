import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import type { Account, Category, Transaction } from '../../data/types';
import { amountErrorCopy, entryErrorCopy, rowCopy } from '../../copy/strings';
import { formatAmount } from '../../lib/money';
import { EntryFeedback } from './EntryFeedback';
import { EntryFields } from './EntryFields';
import {
  draftAmountMinor,
  draftFromTransaction,
  draftToTransaction,
  type EntryDraft,
  type EntryField,
} from './quick-entry';

/**
 * One ledger row, opened for correction — in place, in the list, at its own
 * position.
 *
 * ## Why in place and not a modal or a route
 *
 * The same reasoning that put quick entry inline (see `QuickEntry`), plus one
 * more that only applies to editing: **a correction is a comparison.** The row
 * being fixed is fixed *against* the rows around it — "that coffee was 35, not
 * 30, look at the others" — and a modal covers exactly the evidence the user is
 * editing from. So the row becomes the form, the list stays put, and the row's
 * neighbours never leave the screen.
 *
 * ## It is the same form as entry, not a lookalike
 *
 * The controls come from `EntryFields` and the validation from
 * `draftToTransaction` — the identical function quick entry submits through.
 * That is what the ticket's *"editing goes through the same parsing and the same
 * rejection rules as entry"* means mechanically: there is no second parse to get
 * out of step, so `30,5` is refused **with a reason** here exactly as it is
 * there, and nothing rounds it.
 *
 * `draftFromTransaction` seeds the draft, and it round-trips: opening a row and
 * saving it untouched stores the value that was already there.
 *
 * ## Keys
 *
 *   - `Enter` saves (native form submit from any control in the row).
 *   - `Escape` cancels and returns focus to the row, so a mistaken open costs
 *     one key to undo and never leaves the keyboard.
 *   - The delete button is inside the editor for the mouse; the keyboard path is
 *     `Delete` on the row itself and does not require opening this at all.
 */

interface RowEditorProps {
  readonly transaction: Transaction;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Commit. The parent owns the write and the "where did the row go" answer. */
  readonly onSave: (id: string, input: Omit<Transaction, 'id'>) => void;
  readonly onCancel: () => void;
  readonly onDelete: (transaction: Transaction) => void;
}

export function RowEditor({
  transaction,
  accounts,
  categories,
  onSave,
  onCancel,
  onDelete,
}: RowEditorProps) {
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // Seeded once, from the row. Re-seeding on every render would fight the typist.
  const [draft, setDraft] = useState<EntryDraft>(() => draftFromTransaction(transaction));
  const [submitted, setSubmitted] = useState(false);

  const result = draftToTransaction(draft);
  const errors = submitted && !result.ok ? result.errors : [];
  const errorFor = (field: EntryField): string | null => {
    const hit = errors.find((error) => error.field === field);
    if (hit === undefined) return null;
    return hit.field === 'amount' ? amountErrorCopy[hit.reason] : entryErrorCopy[hit.reason];
  };
  const amountErrorCode = errors.find((error) => error.field === 'amount')?.reason ?? '';
  const preview = draftAmountMinor(draft);

  const idPrefix = `edit-${transaction.id}`;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const attempt = draftToTransaction(draft);
    if (!attempt.ok) {
      // Rejected, not coerced — and the caret lands on the first thing that is
      // wrong so the fix is typing rather than hunting.
      setSubmitted(true);
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
    onSave(transaction.id, attempt.transaction);
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      data-row-editor=""
      data-editing-id={transaction.id}
      data-direction={draft.direction}
      data-amount-minor={preview.ok ? String(preview.amountMinor) : ''}
      data-amount-preview={preview.ok ? formatAmount(preview.amountMinor) : ''}
      data-amount-error={amountErrorCode}
      data-error-fields={errors.map((error) => error.field).join(' ')}
      className="rounded-row border border-border-subtle bg-surface-raised px-4 py-3"
      aria-label={rowCopy.editing}
    >
      <EntryFields
        idPrefix={idPrefix}
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
        dense
        actions={
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="submit"
              data-action="save-edit"
              className="h-9 rounded-pill px-4 text-sm font-semibold"
            >
              {rowCopy.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-action="cancel-edit"
              className="h-9 rounded-pill px-3 text-sm text-ink-muted"
              onClick={onCancel}
            >
              {rowCopy.cancel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-action="delete-transaction"
              aria-label={rowCopy.deleteLabel.replace('{description}', transaction.description)}
              className="h-9 rounded-pill px-3 text-sm text-outflow"
              onClick={() => onDelete(transaction)}
            >
              {rowCopy.delete}
            </Button>
          </div>
        }
      />

      <EntryFeedback
        idPrefix={idPrefix}
        preview={preview}
        direction={draft.direction}
        errors={errors}
        errorFor={errorFor}
      />
    </form>
  );
}
