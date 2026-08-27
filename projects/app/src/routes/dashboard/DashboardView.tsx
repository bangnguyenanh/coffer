import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AmountCell } from '../../components/AmountCell';
import { MonthBand } from '../../components/MonthBand';
import { dashboardCopy } from '../../copy/strings';
import { accountBalancesById } from '../../lib/account-balance';
import { byName } from '../../lib/ordering';
import { useAppData } from '../../state/useAppData';

/**
 * The dashboard — hub ticket 0004 phase 5, and the landing route.
 *
 * ## What a landing screen owes somebody who just signed in
 *
 * This product exists to answer two questions: **"how much do I have"** and
 * **"where did the month go"**. Both are on this screen, above the fold at the
 * 1280-wide viewport theme C was drawn at, in that order — a balance is the
 * question you ask before you ask what you spent. Everything else is a route
 * away, which is what the nav is for.
 *
 * That is also why the ledger stopped being the landing route. The ledger
 * answers *"what happened"*, one row at a time; it is where corrections and
 * entry happen and it is one click away at `/ledger`, but a wall of 56 rows is
 * not an answer to either question above.
 *
 * ## Nothing on this screen is a new number
 *
 * Both panels are existing modules rendering existing state — there is no
 * dashboard-specific arithmetic anywhere in this file, deliberately, because a
 * summary screen that computes its own version of a figure is the screen that
 * eventually disagrees with the one it summarises:
 *
 *   - the balances come from `src/lib/account-balance.ts`, the same derivation
 *     `/accounts` renders, and are **derived on every render, never stored**
 *     (design-system.md §3.11, hub ticket 0001 non-goal);
 *   - the month comes from `MonthBand`, promoted to `src/components/` for this
 *     screen — the dashboard is the second consumer the promotion rule in
 *     documents/coding-conventions.md requires. Transfers are excluded from
 *     every figure it shows, by `src/lib/transfers.ts`.
 *
 * The active/archived split matches `/accounts` for the same reason: the
 * question is *how much do I have to work with*, and money in a closed wallet is
 * not it. Archived accounts keep their balance and their history on their own
 * screen; they are not in this total and they are not in this list.
 *
 * ## Evidence attributes, and why they are not the accounts screen's
 *
 * `data-dashboard-total-minor` / `data-dashboard-balance-minor` /
 * `data-dashboard-account-count`, not `data-total-balance-minor` /
 * `data-balance-minor` / `data-active-account-count`. Those names belong to
 * `/accounts`, and design-system.md §3.10 is explicit: one attribute, one scope,
 * because two elements answering to one selector is exactly what defeats the
 * point of putting evidence on the DOM. Two routes rendering the same figure is
 * a reason for MORE naming discipline, not less — a reviewer greps
 * `data-dashboard-total-minor` and gets one answer, on one screen.
 */
export function DashboardView() {
  const { transactions, accounts } = useAppData();

  const active = useMemo(
    () => accounts.filter((account) => !account.archived).sort(byName),
    [accounts],
  );
  const balances = useMemo(
    () => accountBalancesById(active, transactions),
    [active, transactions],
  );

  // Integer addition in minor units. VND is exponent 0 (hub ADR 0003) — nothing
  // to scale, nothing to round, and no float touches this line.
  const total = active.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);

  return (
    <section
      aria-labelledby="dashboard-title"
      data-view="dashboard"
      data-status="ready"
      data-dashboard-total-minor={total}
      data-dashboard-account-count={active.length}
    >
      <div className="flex items-baseline gap-3.5">
        <h1
          id="dashboard-title"
          className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
        >
          {dashboardCopy.title}
        </h1>
        <p className="text-[13px] text-ink-muted">{dashboardCopy.subtitle}</p>
      </div>

      {/* "How much do I have" — first, because it is the first question. */}
      <div className="panel mt-5" data-dashboard-balances="">
        <div className="flex items-end justify-between border-b border-rule px-5 py-4">
          <div>
            <span className="eyebrow">{dashboardCopy.totalLabel}</span>
            <p className="mt-0.5 text-[13px] text-ink-faint">
              {dashboardCopy.accountCount.replace('{count}', String(active.length))} ·{' '}
              {dashboardCopy.derivedNote}
            </p>
          </div>
          <AmountCell
            amountMinor={total}
            className="text-[34px] leading-10 font-bold tracking-[-0.03em]"
          />
        </div>

        {active.length === 0 ? (
          <div className="px-5 py-12 text-center" data-dashboard-empty="">
            <p className="font-medium text-ink">{dashboardCopy.emptyTitle}</p>
            <p className="mt-2 text-sm text-ink-muted">{dashboardCopy.emptyBody}</p>
          </div>
        ) : (
          <ul>
            {active.map((account) => (
              <li
                key={account.id}
                data-dashboard-account-id={account.id}
                data-dashboard-balance-minor={balances.get(account.id) ?? 0}
                className="border-b border-rule last:border-b-0"
              >
                <Link
                  to={`/accounts/${account.id}`}
                  data-action="open-account"
                  aria-label={dashboardCopy.openAccountLabel.replace('{name}', account.name)}
                  className="flex items-center justify-between gap-4 rounded-row px-4 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {/*
                    Name and balance, and deliberately nothing else. The account
                    KIND is reference data and it lives on `/accounts`; on a
                    landing screen it costs a line per account — which is the
                    difference between the month band's "why triage is worth
                    opening" line being on this screen or below the fold.
                  */}
                  <span className="text-[15px] font-medium text-ink">{account.name}</span>
                  <AmountCell
                    amountMinor={balances.get(account.id) ?? 0}
                    className="text-base font-semibold"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule px-5 py-3">
          <Link
            to="/accounts"
            data-action="open-accounts"
            className="inline-flex items-center gap-2 rounded-pill text-[13px] font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {dashboardCopy.openAccounts}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
          <Link
            to="/ledger"
            data-action="open-ledger"
            className="inline-flex items-center gap-2 rounded-pill text-[13px] font-medium text-ink-muted outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {dashboardCopy.openLedger}
          </Link>
        </div>
      </div>

      {/* "Where did the month go" — the same band the ledger renders, the same
          shared state, and the same exclusion of transfers. */}
      <div className="mt-5">
        <MonthBand />
      </div>
    </section>
  );
}
