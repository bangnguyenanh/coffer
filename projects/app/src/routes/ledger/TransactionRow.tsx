import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { AmountCell } from '../../components/AmountCell';
import { categoryDotClass } from '../../components/category-color';
import type { Account, Category, Transaction } from '../../data/types';
import { ledgerCopy, rowCopy, transferCopy } from '../../copy/strings';
import { formatCalendarDate } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
import { RowEditor } from './RowEditor';

/**
 * One ledger row — the thing you read, and the thing you correct.
 *
 * ## The row IS the control: one tab stop, two keys
 *
 * The obvious build is a `Sửa` button and a `Xóa` button per row. On a 56-row
 * ledger that is **112 tab stops** between the reader and anything below the
 * fold, which turns a keyboard user's ledger into a corridor. So instead the row
 * itself is one `<button>`:
 *
 *   - `Tab` reaches the row (one stop),
 *   - `Enter` opens it for editing,
 *   - `Delete` / `Backspace` deletes it, with undo.
 *
 * One stop per row, one key per action, no mouse anywhere in the path. The keys
 * are stated in the row's accessible name and once above the list, because a
 * keyboard model nobody is told about is a keyboard model nobody has.
 *
 * `Backspace` is accepted alongside `Delete` for the same reason both exist on a
 * keyboard: laptop keyboards frequently have only one of them. It is
 * `preventDefault`-ed so it cannot reach a browser that still treats it as Back.
 *
 * ## Deleting is undoable, not confirmed
 *
 * There is no confirmation dialog. See `LedgerView` for the full reasoning; the
 * consequence here is that `Delete` deletes — immediately, with the row gone
 * from the list — and the recovery lives in the undo bar, not in a modal the
 * user has to get past 99 times to be protected on the hundredth.
 */

interface TransactionRowProps {
  readonly transaction: Transaction;
  /**
   * The other leg, when this row is one leg of a transfer (ticket 0004 phase 2).
   * `null` for an ordinary row — and also for a transfer whose sibling is
   * somehow missing, which renders honestly rather than guessing.
   */
  readonly counterpart: Transaction | null;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly accountNames: ReadonlyMap<string, string>;
  readonly categoryNames: ReadonlyMap<string, string>;
  /** Alternating fill, so a long day still reads row by row. */
  readonly striped: boolean;
  readonly editing: boolean;
  readonly onEdit: (id: string) => void;
  readonly onCancelEdit: () => void;
  readonly onSave: (id: string, input: Omit<Transaction, 'id'>) => void;
  readonly onDelete: (transaction: Transaction) => void;
}

export function TransactionRow({
  transaction,
  counterpart,
  accounts,
  categories,
  accountNames,
  categoryNames,
  striped,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: TransactionRowProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    // Backspace must never reach a history-navigating browser from here.
    event.preventDefault();
    onDelete(transaction);
  };

  /**
   * Leaving the editor returns the caret to the row it came from.
   *
   * Without this the editor unmounts and focus falls to `<body>`, which on a
   * keyboard-driven screen is the same as losing your place entirely: the next
   * `Tab` restarts from the top of the document. The row re-renders as a button
   * in the same commit, so the focus call is deferred one frame.
   */
  const refocusRow = (): void => {
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const cancelEdit = (): void => {
    onCancelEdit();
    refocusRow();
  };

  const saveEdit = (id: string, input: Omit<Transaction, 'id'>): void => {
    onSave(id, input);
    refocusRow();
  };

  /**
   * A transfer leg is rendered as MOVEMENT, not as income or expense.
   *
   * What that means here, concretely, and what it deliberately does NOT mean:
   *
   *   - the row names both ends (`Vietcombank → Ví Momo`) in the slot a category
   *     would occupy, because a transfer has no category and never gets one;
   *   - the swatch is a two-way arrow rather than a category dot or the dashed
   *     uncategorised outline — this row is not waiting to be filed;
   *   - **the amount keeps its sign and its sign colour.** Design-system rule 3
   *     is not bent for this: the money really did leave this account, and
   *     `AmountCell` still derives the colour from the sign alone. "Movement"
   *     is said by the row, never by recolouring the number.
   *   - it does not open the inline editor. The editor edits ONE row, and the
   *     two legs of a transfer have to agree on amount, date and description;
   *     an editor that can change one of them is an editor that can put the
   *     ledger ₫500.000 out of balance. Delete still works and takes both legs.
   */
  const isTransfer = transaction.transfer_id !== null;
  const thisAccount = accountNames.get(transaction.account_id) ?? transferCopy.unknownAccount;
  const otherAccount =
    counterpart === null
      ? transferCopy.unknownAccount
      : (accountNames.get(counterpart.account_id) ?? transferCopy.unknownAccount);
  const movement =
    transaction.amount_minor < 0
      ? transferCopy.movement.replace('{from}', thisAccount).replace('{to}', otherAccount)
      : transferCopy.movement.replace('{from}', otherAccount).replace('{to}', thisAccount);

  const label = isTransfer
    ? transferCopy.rowLabel
        .replace('{movement}', movement)
        .replace('{amount}', formatAmount(transaction.amount_minor))
        .replace('{date}', formatCalendarDate(transaction.occurred_on))
    : rowCopy.rowLabel
        .replace('{description}', transaction.description)
        .replace('{amount}', formatAmount(transaction.amount_minor))
        .replace('{date}', formatCalendarDate(transaction.occurred_on));

  return (
    <li
      data-transaction-id={transaction.id}
      data-occurred-on={transaction.occurred_on}
      data-editing={editing ? 'true' : 'false'}
      data-transfer-id={transaction.transfer_id ?? ''}
    >
      {editing ? (
        <RowEditor
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onDelete={onDelete}
        />
      ) : (
        <button
          ref={buttonRef}
          type="button"
          data-row-control=""
          data-action={isTransfer ? 'transfer-row' : 'edit-transaction'}
          aria-label={label}
          onClick={isTransfer ? undefined : () => onEdit(transaction.id)}
          onKeyDown={onKeyDown}
          className={`grid w-full grid-cols-[1fr_200px_170px] items-center gap-5 rounded-row px-4 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
            striped ? 'bg-surface-raised' : ''
          }`}
        >
          <span className="flex items-center gap-2.5 text-[15px]">
            {isTransfer ? (
              <>
                <ArrowLeftRight aria-hidden="true" className="size-3 shrink-0 text-ink-faint" />
                {/* The chip rides in the DESCRIPTION cell, where there is room
                    for it: the meta column is 200px and `Chuyển khoản` plus
                    `Vietcombank → Ví Momo` wraps to two lines there, which puts
                    one two-line row in a ledger of one-line rows. */}
                <span className="shrink-0 rounded-pill bg-inset px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                  {transferCopy.rowBadge}
                </span>
              </>
            ) : (
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-pill ${categoryDotClass(transaction.category_id, categories)}`}
              />
            )}
            {transaction.description}
          </span>

          {isTransfer ? (
            <span className="text-[13px] text-ink-muted" data-transfer-movement={movement}>
              {movement}
            </span>
          ) : (
            <span className="text-[13px] text-ink-muted">
              {transaction.category_id === null ? (
                // `null` is a first-class state, not missing data — so it
                // is named, in the accent, rather than left blank.
                <span className="font-medium text-brand">{ledgerCopy.uncategorized}</span>
              ) : (
                categoryNames.get(transaction.category_id)
              )}
              {' · '}
              {accountNames.get(transaction.account_id) ?? ledgerCopy.unknownAccount}
            </span>
          )}

          <AmountCell
            amountMinor={transaction.amount_minor}
            className="text-right text-base font-semibold"
          />
        </button>
      )}
    </li>
  );
}
