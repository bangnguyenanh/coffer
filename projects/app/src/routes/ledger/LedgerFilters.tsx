import { Search } from 'lucide-react';
import type { Account, Category } from '../../data/types';
import { filterCopy } from '../../copy/strings';
import { emptyLedgerFilters, isFiltered, type LedgerFilters as Filters } from './useLedger';

interface LedgerFiltersProps {
  readonly value: Filters;
  readonly onChange: (next: Filters) => void;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
}

/** A control that reads as a chip: inset ground, pill radius, one tab stop. */
const FIELD_CLASS =
  'w-full appearance-none rounded-pill bg-inset px-3.5 py-1.5 text-[13px] text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const LABEL_CLASS = 'eyebrow block pb-1 pl-1';

/**
 * The filter controls. They hold no results and do no matching — each control
 * only edits the filter value, and the value becomes a query parameter that
 * `useLedger` matches against (see `useLedger`).
 *
 * **Ticket 0005 restyled this file and NOTHING else.** Every control keeps its
 * id, name, value and `onChange`, and `set()` below is untouched: the filter box
 * has an open keystroke-loss race ([bug 0001](../../../../management/bugs/0001-ledger-filter-drops-keystrokes.md))
 * whose fix is a separate ticket, and the way this component derives its next
 * state is exactly the thing that fix will change. Restyling around it must not
 * move it.
 *
 * Theme C draws filters as chips on one line rather than as a boxed fieldset.
 * The eyebrow labels stay VISIBLE — the artboard shows display-only pills, but
 * two of these five are date pickers, and "Từ ngày" / "Đến ngày" cannot be told
 * apart from their controls alone.
 */
export function LedgerFilters({ value, onChange, accounts, categories }: LedgerFiltersProps) {
  const set = <K extends keyof Filters>(key: K, next: Filters[K]): void => {
    onChange({ ...value, [key]: next });
  };

  return (
    <fieldset className="panel mt-3.5 px-5 py-3.5">
      <legend className="sr-only">{filterCopy.legend}</legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={LABEL_CLASS} htmlFor="filter-from">{filterCopy.from}</label>
          <input
            id="filter-from"
            name="from"
            type="date"
            className={`${FIELD_CLASS} tabular-nums`}
            value={value.from}
            onChange={(event) => set('from', event.target.value)}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="filter-to">{filterCopy.to}</label>
          <input
            id="filter-to"
            name="to"
            type="date"
            className={`${FIELD_CLASS} tabular-nums`}
            value={value.to}
            onChange={(event) => set('to', event.target.value)}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="filter-account">{filterCopy.account}</label>
          <select
            id="filter-account"
            name="account_id"
            className={FIELD_CLASS}
            value={value.account_id}
            onChange={(event) => set('account_id', event.target.value)}
          >
            <option value="">{filterCopy.allAccounts}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="filter-category">{filterCopy.category}</label>
          <select
            id="filter-category"
            name="category_id"
            className={FIELD_CLASS}
            value={value.category_id}
            onChange={(event) => set('category_id', event.target.value)}
          >
            <option value="">{filterCopy.allCategories}</option>
            {/* `none` is the filter value meaning "uncategorized" — see useLedger.ts. */}
            <option value="none">{filterCopy.uncategorizedOnly}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="filter-q">{filterCopy.search}</label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="filter-q"
              name="q"
              type="search"
              autoComplete="off"
              placeholder={filterCopy.searchPlaceholder}
              className={`${FIELD_CLASS} pl-8`}
              value={value.q}
              onChange={(event) => set('q', event.target.value)}
            />
          </div>
        </div>
      </div>

      {isFiltered(value) && (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
          onClick={() => onChange(emptyLedgerFilters)}
        >
          {filterCopy.reset}
        </button>
      )}
    </fieldset>
  );
}
