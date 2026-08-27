import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AmountCell } from '../../components/AmountCell';
import { UNCATEGORIZED_DOT_CLASS } from '../../components/category-color';
import { UndoBar } from '../../components/UndoBar';
import { triageCopy } from '../../copy/strings';
import type { Transaction } from '../../data/types';
import { formatCalendarDate } from '../../lib/calendar-date';
import { formatAmount } from '../../lib/money';
import { needsCategory } from '../../lib/transfers';
import { useAppData } from '../../state/useAppData';
import { byLedgerOrder, byName } from '../ledger/ordering';
import { categoryKeyForIndex, indexForCategoryKey } from './category-keys';

/**
 * The uncategorised triage inbox — hub ticket 0003 phase 5.
 *
 * *"Everything with no category, cleared in a batch. This is the other half of
 * fast entry: skip the category while typing, sort it out later."*
 *
 * ## The interaction model, and the two findings it is built on
 *
 * The phase-4 agent reported that categorising **during** entry is slower than
 * skipping it, so people skip — which means this screen is where the volume
 * ends up, and it has to be fast at volume rather than merely correct at one
 * row. It also reported that a `<select>` per row is the wrong instrument, both
 * because of the tab-in/arrow/tab-out cost and because first-letter matching
 * collides in Vietnamese (`Cà phê` / `Chợ & siêu thị`). See `category-keys.ts`.
 *
 * So this is **one listbox, one tab stop, and digit keys**:
 *
 *   - the list takes focus on arrival, so triaging costs zero clicks to start;
 *   - `↑` `↓` move a cursor, `Shift` with them extends a selection;
 *   - `Space` toggles the cursor row, `A` selects all, `Esc` clears;
 *   - `1`–`9` assign a category — **to the selection if there is one, otherwise
 *     to the row under the cursor.**
 *
 * That last rule is what gives the screen two speeds out of one keystroke:
 * clearing rows one at a time is **one key per row** (assign, the row leaves,
 * the next row falls under the cursor, assign again — no `Tab`, no arrow, no
 * round trip), and clearing a whole batch into one category is `A` then a digit
 * — **two keys for any N**.
 *
 * ## Assignment is undoable and nothing is confirmed
 *
 * Same call as delete on the ledger, same reasoning (`UndoBar`): a batch that
 * went to the wrong category is one `Tab` + `Enter` from being exactly restored,
 * because the previous `category_id` of every affected row is captured before
 * the write. **Focus deliberately stays in the list** rather than jumping to the
 * undo bar — assigning is not destructive, and stealing the caret after every
 * batch would break the one-key-per-row rhythm this screen exists for. The bar
 * is the next thing in the tab order, so the keyboard path to it is one key.
 *
 * ## What it renders as evidence
 *
 * `data-inbox-count`, `data-selected-count`, `data-cursor-index` and
 * `data-cursor-id` on the container (`data-inbox-count`, not
 * `data-uncategorized-count` — that name is the header badge's, and one
 * attribute answering for two scopes is an ambiguous selector, and the point of
 * the attribute is that a reviewer greps it and gets ONE answer);
 * `data-selected` and `data-cursor` per row.
 * The count is rendered in **every** state including zero, and the empty state
 * carries `data-status="ready"` like every other terminal state — a poll that
 * only accepts the populated screen hangs forever on a cleared inbox.
 */

/** What one assignment did, kept so it can be undone exactly. */
interface AssignUndo {
  readonly previous: readonly { readonly id: string; readonly category_id: string | null }[];
  readonly categoryName: string;
}

export function TriageView() {
  const { transactions, accounts, categories, assignCategories } = useAppData();

  const listRef = useRef<HTMLDivElement>(null);

  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [undo, setUndo] = useState<AssignUndo | null>(null);

  /**
   * The inbox: `category_id === null`, in the same order the ledger shows them.
   * One comparator, shared — see `ledger/ordering.ts`.
   */
  const rows = useMemo(
    // A transfer leg is stored uncategorised and can never BE categorised —
    // it is movement, not spending (ticket 0004 phase 2). Filing it under
    // `Ăn uống` would be filing money that was never spent, so the inbox never
    // offers one. Same predicate as the header badge, from the same module.
    () => transactions.filter(needsCategory).sort(byLedgerOrder),
    [transactions],
  );

  const orderedCategories = useMemo(() => [...categories].sort(byName), [categories]);
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );

  // Derived, not stored: rows leave this list as they are assigned, so a stored
  // cursor would point past the end within one keystroke.
  const cursorIndex = rows.length === 0 ? -1 : Math.min(cursor, rows.length - 1);
  const cursorRow: Transaction | undefined = cursorIndex < 0 ? undefined : rows[cursorIndex];

  /** Arrival costs zero clicks: the keys work the moment the screen renders. */
  useEffect(() => {
    listRef.current?.focus();
  }, []);

  const moveCursor = useCallback(
    (next: number, extend: boolean): void => {
      if (rows.length === 0) return;
      const clamped = Math.max(0, Math.min(next, rows.length - 1));
      setCursor(clamped);
      if (!extend) {
        setRangeAnchor(null);
        return;
      }
      const anchor = rangeAnchor ?? cursorIndex;
      setRangeAnchor(anchor);
      const from = Math.min(anchor, clamped);
      const to = Math.max(anchor, clamped);
      const ids = rows.slice(from, to + 1).map((row) => row.id);
      setSelected(new Set(ids));
    },
    [rows, rangeAnchor, cursorIndex],
  );

  const toggleAt = useCallback(
    (index: number): void => {
      const row = rows[index];
      if (row === undefined) return;
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
      setRangeAnchor(index);
    },
    [rows],
  );

  const selectAll = useCallback((): void => {
    setSelected(new Set(rows.map((row) => row.id)));
    setRangeAnchor(null);
  }, [rows]);

  const clearSelection = useCallback((): void => {
    setSelected(new Set());
    setRangeAnchor(null);
  }, []);

  /**
   * Assign one category to the selection, or — when nothing is selected — to the
   * row under the cursor.
   *
   * The cursor is **not** advanced afterwards, on purpose: the assigned rows
   * leave the list, so the row that was next falls into the cursor's index by
   * itself. Advancing as well would skip a row on every keystroke.
   */
  const assign = useCallback(
    (categoryId: string, categoryName: string): void => {
      const targets =
        selected.size > 0
          ? rows.filter((row) => selected.has(row.id))
          : cursorRow === undefined
            ? []
            : [cursorRow];
      if (targets.length === 0) return;

      setUndo({
        previous: targets.map((row) => ({ id: row.id, category_id: row.category_id })),
        categoryName,
      });
      assignCategories(targets.map((row) => ({ id: row.id, category_id: categoryId })));
      clearSelection();
    },
    [assignCategories, clearSelection, cursorRow, rows, selected],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const digit = indexForCategoryKey(event.key);
    if (digit !== null) {
      const category = orderedCategories[digit];
      if (category === undefined) return;
      event.preventDefault();
      assign(category.id, category.name);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        event.preventDefault();
        moveCursor(cursorIndex + 1, event.shiftKey);
        return;
      case 'ArrowUp':
      case 'k':
        event.preventDefault();
        moveCursor(cursorIndex - 1, event.shiftKey);
        return;
      case 'Home':
        event.preventDefault();
        moveCursor(0, event.shiftKey);
        return;
      case 'End':
        event.preventDefault();
        moveCursor(rows.length - 1, event.shiftKey);
        return;
      case ' ':
        event.preventDefault();
        toggleAt(cursorIndex);
        return;
      case 'a':
      case 'A':
        event.preventDefault();
        selectAll();
        return;
      case 'Escape':
        event.preventDefault();
        clearSelection();
        return;
      default:
    }
  };

  const undoAssign = (): void => {
    if (undo === null) return;
    assignCategories(undo.previous);
    setUndo(null);
    listRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="triage-title"
      data-view="triage"
      data-status="ready"
      data-inbox-count={rows.length}
      data-selected-count={selected.size}
      data-cursor-index={cursorIndex}
      data-cursor-id={cursorRow?.id ?? ''}
    >
      <div className="flex items-baseline gap-3.5">
        <h1
          id="triage-title"
          className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
        >
          {triageCopy.title}
        </h1>
        <p className="text-[13px] tabular-nums text-ink-muted">
          {triageCopy.count.replace('{count}', String(rows.length))}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{triageCopy.subtitle}</p>

      {rows.length === 0 ? (
        <div
          data-triage-empty=""
          className="mt-5 rounded-panel border border-dashed border-border-subtle bg-surface-raised px-6 py-16 text-center"
        >
          <p className="font-medium text-ink">{triageCopy.emptyTitle}</p>
          <p className="mt-2 text-sm text-ink-muted">{triageCopy.emptyBody}</p>
        </div>
      ) : (
        <>
          {/* The legend is the keyboard model made visible — and clickable, so
              the screen is not keyboard-only. */}
          <div className="panel mt-5 px-5 py-4" data-category-legend="">
            <h2 className="eyebrow">{triageCopy.keysTitle}</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {orderedCategories.map((category, index) => {
                const key = categoryKeyForIndex(index);
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-assign-category={category.id}
                    data-assign-key={key ?? ''}
                    aria-label={triageCopy.assignLabel
                      .replace('{name}', category.name)
                      .replace('{key}', key ?? triageCopy.noKey)}
                    onClick={() => {
                      assign(category.id, category.name);
                      listRef.current?.focus();
                    }}
                    className="flex items-center gap-2 rounded-pill bg-inset px-3 py-1.5 text-[13px] font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink-muted">
                      {key ?? triageCopy.noKey}
                    </span>
                    {category.name}
                  </button>
                );
              })}
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-faint">
              {triageCopy.keys.map((entry) => (
                <li key={entry.key}>
                  <span className="font-semibold text-ink-muted">{entry.key}</span> {entry.what}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <p className="text-[13px] tabular-nums text-ink-muted">
              {triageCopy.selectedCount.replace('{count}', String(selected.size))}
            </p>
            <button
              type="button"
              data-action="select-all"
              onClick={() => {
                selectAll();
                listRef.current?.focus();
              }}
              className="rounded-pill bg-inset px-3 py-1 text-xs font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {triageCopy.selectAll}
            </button>
            <button
              type="button"
              data-action="clear-selection"
              onClick={() => {
                clearSelection();
                listRef.current?.focus();
              }}
              className="rounded-pill px-3 py-1 text-xs font-medium text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {triageCopy.clearSelection}
            </button>
          </div>

          {/* ONE tab stop for the whole list — `aria-activedescendant` is what
              lets a single focusable element still expose a moving cursor. */}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label={triageCopy.listLabel}
            aria-activedescendant={cursorRow === undefined ? undefined : `triage-${cursorRow.id}`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            data-triage-list=""
            className="mt-2.5 rounded-panel outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {rows.map((row, index) => {
              const isCursor = index === cursorIndex;
              const isSelected = selected.has(row.id);
              return (
                <div
                  key={row.id}
                  id={`triage-${row.id}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={triageCopy.rowLabel
                    .replace('{description}', row.description)
                    .replace('{amount}', formatAmount(row.amount_minor))
                    .replace('{date}', formatCalendarDate(row.occurred_on))}
                  data-transaction-id={row.id}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-cursor={isCursor ? 'true' : 'false'}
                  onClick={() => {
                    setCursor(index);
                    toggleAt(index);
                    listRef.current?.focus();
                  }}
                  className={`grid cursor-pointer grid-cols-[110px_1fr_180px_170px] items-center gap-5 rounded-row px-4 py-2.5 ${
                    isSelected ? 'bg-brand-wash' : index % 2 === 0 ? 'bg-surface-raised' : ''
                  } ${isCursor ? 'ring-2 ring-brand' : ''}`}
                >
                  <span className="text-[13px] tabular-nums text-ink-muted">
                    {formatCalendarDate(row.occurred_on)}
                  </span>
                  <span className="flex items-center gap-2.5 text-[15px]">
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-pill ${UNCATEGORIZED_DOT_CLASS}`}
                    />
                    {row.description}
                  </span>
                  <span className="text-[13px] text-ink-muted">
                    {accountNames.get(row.account_id) ?? ''}
                  </span>
                  <AmountCell
                    amountMinor={row.amount_minor}
                    className="text-right text-base font-semibold"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {undo !== null && (
        <UndoBar
          kind="assigned"
          message={triageCopy.assigned
            .replace('{count}', String(undo.previous.length))
            .replace('{name}', undo.categoryName)}
          actionLabel={triageCopy.undo}
          onAction={undoAssign}
          dismissLabel={triageCopy.dismiss}
          onDismiss={() => setUndo(null)}
          // Focus stays in the list: assigning is recoverable, and taking the
          // caret after every batch would break the one-key-per-row rhythm.
          autoFocusAction={false}
        />
      )}
    </section>
  );
}
