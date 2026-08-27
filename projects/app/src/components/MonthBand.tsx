import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AmountCell } from './AmountCell';
import { categoryDotClass, UNCATEGORIZED_DOT_CLASS } from './category-color';
import { Button } from '@/components/ui/button';
import { monthCopy } from '../copy/strings';
import { formatAmount } from '../lib/money';
import { currentMonthKey, monthKeyParts, type MonthKey } from '../lib/calendar-date';
import {
  monthsPresent,
  monthSummary,
  spendingByCategory,
  uncategorizedOutMinor,
} from '../lib/month-summary';
import { needsCategory } from '../lib/transfers';
import { useAppData } from '../state/useAppData';
import { byName } from '../lib/ordering';

/**
 * Theme C's month band — hub ticket 0004 phase 4.
 *
 * Drawn in the design canvas (`management/decisions/assets/0005-theme-c-ledger.html`)
 * and deliberately held back from ticket 0005 as feature work belonging here.
 *
 * ## What it is FOR, and the sentence that is its acceptance test
 *
 * *"Hơn một nửa chi tiêu tháng này chưa biết đi đâu."* — **the band exists to
 * turn the triage inbox from a badge into a reason.** A count in the header says
 * how many rows are unfiled; it does not say that most of the month's money is
 * among them. The allocation bar does, in one glance, because the uncategorised
 * segment is drawn first and at its true width beside the categories that DO
 * have names. If a reader cannot see from this band why triage is worth opening,
 * the band has not landed.
 *
 * That line is chosen from the DATA and never asserted: `over-half` when more
 * than half the month's spending is unfiled, `some` (which states the amount)
 * when it is less, `clear` when there is none. `data-band-note` says which.
 *
 * ## Transfers are excluded from every figure here
 *
 * In, out, net, the transaction count and every segment — the arithmetic is in
 * `src/lib/month-summary.ts`, which routes all of it through
 * `src/lib/transfers.ts`. `data-month-transfer-legs` is rendered precisely so
 * the exclusion is countable: make a transfer and that number moves while every
 * other number on the band holds still.
 *
 * ## The `+` stays off
 *
 * The artboard draws `+10.977.000 ₫` on the net figure. `formatAmount` does not
 * emit a `+` and does not learn to here — that is a money-contract change and it
 * is Owner-gated (design-system.md §3.4). Net goes through `AmountCell` like
 * every other amount on the surface, so its sign and its colour come from its
 * own direction and from nothing else.
 *
 * **Two deliberate departures from the artboard**, both in service of §3.3:
 * the headline figure and the legend amounts render with their real (negative)
 * sign and their outflow colour, rather than as unsigned magnitudes in muted
 * ink. The artboard predates the rule; the accounts screen's spending total
 * already set this precedent in phase 2 and the two must not disagree.
 *
 * ## Where the band lives — TWO screens as of phase 5
 *
 * It was written under `routes/ledger/` and **promoted to `src/components/` in
 * ticket 0004 phase 5**, when the dashboard became a second consumer — the
 * promotion rule in documents/coding-conventions.md, which is *shared only once
 * a second consumer actually exists*.
 *
 * **It stayed on the ledger as well as arriving on the dashboard**, and that is
 * a decision rather than an oversight. The artboard draws it at the top of the
 * ledger and `design-system.md` §5 records that placement as law; the dashboard
 * needs it because *"where did the month go"* is one of the two questions a
 * landing screen owes an answer to. Rendering it twice costs nothing — it reads
 * the shared state, ignores the ledger's filters, and adds no tab stop, so the
 * measured 11-keystroke entry path is untouched (re-measured in phase 5).
 *
 * It does NOT respond to the ledger's filters: it is a MONTH summary, and a band
 * that silently re-scoped itself to a filtered subset would be a different
 * number under the same label.
 *
 * **The selected month is per-instance, deliberately.** Two mounted bands keep
 * two month cursors; stepping to July on the dashboard does not step the
 * ledger's. Lifting the selection into shared state would make it a third
 * cross-cutting concern (architecture/01-overview.md → State) for something that
 * is view state and is discarded on navigation anyway.
 *
 * ## The month picker is not in the ticket, and it is here on purpose
 *
 * Without one the band can only ever show whatever month the clock is in, which
 * makes it unverifiable and makes four fifths of the fixtures unreachable. It is
 * two buttons and no new state shape. It steps through the months that actually
 * have rows, plus the current one.
 */
export function MonthBand() {
  const { transactions, categories } = useAppData();

  /**
   * The months that can be shown: every month with a row, plus the current one
   * even when it is empty — a band that vanished on the first of the month would
   * be a band the Owner cannot trust to be there.
   */
  const months = useMemo<readonly MonthKey[]>(() => {
    const present = monthsPresent(transactions);
    const now = currentMonthKey();
    return present.includes(now) ? present : [now, ...present].sort().reverse();
  }, [transactions]);

  const [selected, setSelected] = useState<MonthKey>(() => currentMonthKey());
  // Derived, not stored: the month list changes as rows are added, and a stored
  // index would point at the wrong month one entry later.
  const index = Math.max(0, months.indexOf(selected));
  const month = months[index] ?? currentMonthKey();

  const summary = useMemo(() => monthSummary(transactions, month), [transactions, month]);

  const orderedCategories = useMemo(() => [...categories].sort(byName), [categories]);
  const slices = useMemo(
    () => spendingByCategory(transactions, orderedCategories, month),
    [transactions, orderedCategories, month],
  );
  const uncategorized = uncategorizedOutMinor(slices);

  /** The WHOLE inbox, so the link and the header badge always say one number. */
  const inboxCount = transactions.filter(needsCategory).length;

  const parts = monthKeyParts(month);
  const label = monthCopy.label
    .replace('{month}', parts.month)
    .replace('{year}', parts.year);

  const note =
    summary.outMinor === 0
      ? summary.txnCount === 0
        ? 'empty'
        : 'no-spending'
      : uncategorized === 0
        ? 'clear'
        : uncategorized / summary.outMinor > 0.5
          ? 'over-half'
          : 'some';

  const noteText =
    note === 'empty'
      ? monthCopy.emptyMonth
      : note === 'no-spending'
        ? monthCopy.noSpending
        : note === 'clear'
          ? monthCopy.noteClear
          : note === 'over-half'
            ? monthCopy.noteOverHalf
            : monthCopy.noteSome.replace('{amount}', formatAmount(uncategorized));

  return (
    <section
      aria-label={label}
      data-month-band=""
      data-status="ready"
      data-month={month}
      data-month-in-minor={summary.inMinor}
      data-month-out-minor={summary.outMinor}
      data-month-net-minor={summary.netMinor}
      data-month-txn-count={summary.txnCount}
      data-month-transfer-legs={summary.transferLegCount}
      data-month-uncategorized-minor={uncategorized}
      data-segment-count={slices.length}
      data-band-note={note}
      className="panel px-7 py-6"
    >
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-action="month-prev"
              aria-label={monthCopy.prev}
              disabled={index >= months.length - 1}
              onClick={() => setSelected(months[index + 1] ?? month)}
              className="size-6 rounded-pill p-0 text-ink-muted"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="eyebrow" data-month-label="">
              {label}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-action="month-next"
              aria-label={monthCopy.next}
              disabled={index <= 0}
              onClick={() => setSelected(months[index - 1] ?? month)}
              className="size-6 rounded-pill p-0 text-ink-muted"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-0.5 flex items-baseline gap-2.5">
            <AmountCell
              amountMinor={summary.outMinor}
              className="text-[40px] leading-[46px] font-bold tracking-[-0.03em]"
            />
            <span className="text-sm text-ink-muted">{monthCopy.spent}</span>
          </div>
        </div>

        <div className="flex gap-9 pb-1.5">
          <div>
            <span className="eyebrow">{monthCopy.earned}</span>
            <AmountCell
              amountMinor={summary.inMinor}
              className="block text-[19px] leading-[26px] font-semibold"
            />
          </div>
          <div>
            <span className="eyebrow">{monthCopy.net}</span>
            {/* No `+`, aggregates included — design-system.md §3.4. */}
            <AmountCell
              amountMinor={summary.netMinor}
              className="block text-[19px] leading-[26px] font-semibold"
            />
          </div>
          <div>
            <span className="eyebrow">{monthCopy.txnCount}</span>
            <span className="block text-[19px] leading-[26px] font-semibold tabular-nums text-ink">
              {summary.txnCount}
            </span>
          </div>
        </div>
      </div>

      {slices.length > 0 && (
        <>
          {/* The bar itself is decoration: every number it draws is in the
              legend below, which is real text. */}
          <div
            aria-hidden="true"
            data-allocation-bar=""
            className="mt-5 flex h-3 gap-[3px]"
          >
            {slices.map((slice, position) => (
              <div
                key={slice.categoryId ?? 'none'}
                data-bar-segment=""
                data-bar-category-id={slice.categoryId ?? 'none'}
                // A WIDTH, not a colour and not an amount: the one thing on this
                // surface that has to be an inline style, because it is data.
                style={{ width: `${slice.share * 100}%` }}
                className={`${
                  slice.categoryId === null
                    ? 'uncat-hatch border border-dashed border-dash-strong'
                    : categoryDotClass(slice.categoryId, orderedCategories)
                } ${position === 0 ? 'rounded-l-md' : ''} ${
                  position === slices.length - 1 ? 'rounded-r-md' : ''
                }`}
              />
            ))}
          </div>

          <ul
            data-allocation-legend=""
            aria-label={monthCopy.allocationLabel
              .replace('{month}', parts.month)
              .replace('{year}', parts.year)}
            className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {slices.map((slice) => (
              <li
                key={slice.categoryId ?? 'none'}
                data-slice-category-id={slice.categoryId ?? 'none'}
                data-slice-minor={slice.amountMinor}
                data-slice-name={slice.name ?? monthCopy.uncategorized}
                className="flex items-center gap-2 text-[13px]"
              >
                <span
                  aria-hidden="true"
                  className={`size-2.5 shrink-0 rounded-sm ${
                    slice.categoryId === null
                      ? `bg-uncat-swatch ${UNCATEGORIZED_DOT_CLASS}`
                      : categoryDotClass(slice.categoryId, orderedCategories)
                  }`}
                />
                <span className={slice.categoryId === null ? 'text-brand' : 'text-ink'}>
                  {slice.name ?? monthCopy.uncategorized}
                </span>
                <AmountCell amountMinor={slice.amountMinor} className="text-[13px]" />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule pt-3.5">
        <p className="text-sm text-ink" data-band-note-text="">
          {noteText}
        </p>
        {inboxCount > 0 && (
          <Link
            to="/triage"
            data-action="open-triage"
            data-triage-count={inboxCount}
            className="inline-flex items-center gap-2 rounded-pill text-[13px] font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {monthCopy.triageAction.replace('{count}', String(inboxCount))}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
        <span className="ml-auto text-xs text-ink-faint">{monthCopy.allocationNote}</span>
      </div>
    </section>
  );
}
