import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GachBongGround } from './components/GachBongGround';
import { useAuth } from './auth/useAuth';
import { appCopy } from './copy/strings';
import { needsCategory } from './lib/transfers';
import { useAppData } from './state/useAppData';

/**
 * Application shell: header, nav, and the slot every route renders into.
 *
 * Rendered only inside the authenticated branch of the route tree, so it can
 * assume somebody is signed in. It carries the product name — Coffer, ADR 0002
 * — the signed-in account, and the way out.
 *
 * **The identity chip is not decoration any more.** More than one account can
 * exist in a session (Owner directive 2026-08-25), so "which account is this?"
 * is a real question the header has to answer; the sign-out button's accessible
 * name repeats the address for the same reason.
 *
 * `data-user-email` and `data-account-count` are on the DOM as evidence: the
 * second is what makes "the single-account assumption is gone" observable on
 * the page rather than a claim about the source.
 *
 * **Theme C (ticket 0005):** ochre wordmark, a pill-nav trough, and the
 * uncategorised count as a badge. `data-uncategorized-count` puts the number on
 * the DOM so it is checkable rather than merely visible.
 *
 * **Ticket 0004 phase 5 added the dashboard to the nav, first**, and moved the
 * ledger to `/ledger`. The order of the pills is the order of the questions:
 * how much do I have, then what happened, then the reference data, then what
 * still needs filing.
 *
 * **Phase 5 of ticket 0003 made that badge a LINK.** Ticket 0005 left it a status only because
 * there was nowhere to send it — *"the triage screen it will eventually point at
 * … does not exist"* — and `/triage` now does. The count is live: it is read
 * off the shared transaction list, so clearing rows in the inbox decrements the
 * number in the header without either screen telling the other anything.
 *
 * **Backlog 0007: the gạch bông ground is here too**, so signing in no longer
 * crosses a visual seam. Two things that are load-bearing and easy to undo by
 * accident:
 *
 *   - the root carries `relative isolate`. It had NEITHER before, and the
 *     ground's `-z-10` needs a stacking context or it lands under the root's own
 *     `bg-surface` and is invisible. `isolate` also keeps the negative index
 *     from escaping into whatever renders around the shell.
 *   - it is mounted at `density="dense"`, a lighter tone than the auth screens
 *     use. The signed-in screens carry rows, panels, the month band, the
 *     category ramp and the `uncat-hatch`; the value was tuned on `/ledger`
 *     against the seeded data, which is the busiest screen the app has.
 *
 * The ground is `aria-hidden`, `pointer-events-none` and not focusable, so it
 * changes nothing about the header's tab order or the measured entry paths.
 */
export function AppShell() {
  const { user, accountCount, signOut } = useAuth();
  const { transactions } = useAppData();
  const email = user?.email ?? '';
  const initial = email.slice(0, 1).toUpperCase();
  // `needsCategory`, not `category_id === null`: both legs of a transfer are
  // stored uncategorised and neither can ever be filed under anything, so
  // counting them here would send the Owner to an inbox holding rows the inbox
  // refuses to show (ticket 0004 phase 2, `src/lib/transfers.ts`).
  const uncategorized = transactions.filter(needsCategory).length;

  return (
    <div
      className="relative isolate min-h-screen bg-surface text-ink"
      data-auth="authenticated"
      data-user-email={email}
      data-account-count={accountCount}
    >
      <GachBongGround density="dense" />

      <header>
        <div className="mx-auto flex max-w-content items-center gap-4 px-8 pt-6">
          <span className="text-[21px] leading-7 font-bold tracking-[-0.02em] text-brand">
            {appCopy.name}
          </span>

          <nav className="flex items-center gap-1 rounded-pill bg-inset-strong p-1">
            {/*
              `end` is load-bearing on this one and on this one only: without it
              `/` matches every path below it and the dashboard pill would read
              as active on every screen in the app.
            */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive
                  ? 'rounded-pill bg-surface-raised px-4 py-1.5 text-sm font-semibold text-ink shadow-sm'
                  : 'rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted'
              }
            >
              {appCopy.nav.dashboard}
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-pill bg-surface-raised px-4 py-1.5 text-sm font-semibold text-ink shadow-sm'
                  : 'rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted'
              }
            >
              {appCopy.nav.ledger}
            </NavLink>
            <NavLink
              to="/accounts"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-pill bg-surface-raised px-4 py-1.5 text-sm font-semibold text-ink shadow-sm'
                  : 'rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted'
              }
            >
              {appCopy.nav.accounts}
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-pill bg-surface-raised px-4 py-1.5 text-sm font-semibold text-ink shadow-sm'
                  : 'rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted'
              }
            >
              {appCopy.nav.categories}
            </NavLink>
            <NavLink
              to="/triage"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm ${
                  isActive
                    ? 'bg-surface-raised font-semibold text-ink shadow-sm'
                    : 'font-medium text-ink-muted'
                }`
              }
              data-uncategorized-count={uncategorized}
              title={appCopy.uncategorizedCountLabel.replace('{count}', String(uncategorized))}
            >
              {appCopy.nav.uncategorized}
              <Badge className="bg-outflow text-brand-foreground tabular-nums">
                {uncategorized}
              </Badge>
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[13px] text-ink-muted" data-slot="signed-in-as">
              {email}
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-pill bg-brand-wash text-[13px] font-semibold text-brand"
            >
              {initial}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-action="sign-out"
              aria-label={appCopy.signOutLabel.replace('{email}', email)}
              className="rounded-pill text-ink-muted"
              onClick={signOut}
            >
              <LogOut aria-hidden="true" />
              {appCopy.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-content px-8 pt-6 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
