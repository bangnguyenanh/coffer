import type { Account, Category } from '../../data/types';
import { filterCopy } from '../../copy/strings';
import { emptyLedgerFilters, isFiltered, type LedgerFilters as Filters } from './useLedger';

interface LedgerFiltersProps {
  readonly value: Filters;
  readonly onChange: (next: Filters) => void;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
}

const FIELD_CLASS =
  'w-full rounded-md border border-border-subtle bg-surface-raised px-2 py-1.5 text-sm text-ink';
const LABEL_CLASS = 'block text-xs font-medium text-ink-muted';

/**
 * The filter controls. They hold no results and do no matching — each control
 * only edits the filter value, and the value becomes a query parameter on the
 * next request (see `useLedger`).
 */
export function LedgerFilters({ value, onChange, accounts, categories }: LedgerFiltersProps) {
  const set = <K extends keyof Filters>(key: K, next: Filters[K]): void => {
    onChange({ ...value, [key]: next });
  };

  return (
    <fieldset className="mt-6 rounded-lg border border-border-subtle bg-surface-raised p-4">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {filterCopy.legend}
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={LABEL_CLASS} htmlFor="filter-from">{filterCopy.from}</label>
          <input
            id="filter-from"
            name="from"
            type="date"
            className={FIELD_CLASS}
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
            className={FIELD_CLASS}
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
          <input
            id="filter-q"
            name="q"
            type="search"
            autoComplete="off"
            placeholder={filterCopy.searchPlaceholder}
            className={FIELD_CLASS}
            value={value.q}
            onChange={(event) => set('q', event.target.value)}
          />
        </div>
      </div>

      {isFiltered(value) && (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-brand underline underline-offset-2"
          onClick={() => onChange(emptyLedgerFilters)}
        >
          {filterCopy.reset}
        </button>
      )}
    </fieldset>
  );
}
