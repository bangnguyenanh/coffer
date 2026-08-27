import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from './auth/useAuth';
import { appCopy } from './copy/strings';
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
 * uncategorised count as a badge. The badge is a STATUS, not a link — the
 * triage screen it will eventually point at is phase 5 of ticket 0003 and does
 * not exist, and this ticket adds no routes. `data-uncategorized-count` puts the
 * number on the DOM so it is checkable rather than merely visible.
 */
export function AppShell() {
  const { user, accountCount, signOut } = useAuth();
  const { transactions } = useAppData();
  const email = user?.email ?? '';
  const initial = email.slice(0, 1).toUpperCase();
  const uncategorized = transactions.filter((txn) => txn.category_id === null).length;

  return (
    <div
      className="min-h-screen bg-surface text-ink"
      data-auth="authenticated"
      data-user-email={email}
      data-account-count={accountCount}
    >
      <header>
        <div className="mx-auto flex max-w-content items-center gap-4 px-8 pt-6">
          <span className="text-[21px] leading-7 font-bold tracking-[-0.02em] text-brand">
            {appCopy.name}
          </span>

          <nav className="flex items-center gap-1 rounded-pill bg-inset-strong p-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? 'rounded-pill bg-surface-raised px-4 py-1.5 text-sm font-semibold text-ink shadow-sm'
                  : 'rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted'
              }
            >
              {appCopy.nav.ledger}
            </NavLink>
            <span
              className="flex items-center gap-2 rounded-pill px-4 py-1.5 text-sm font-medium text-ink-muted"
              data-uncategorized-count={uncategorized}
              title={appCopy.uncategorizedCountLabel.replace('{count}', String(uncategorized))}
            >
              {appCopy.nav.uncategorized}
              <Badge className="bg-outflow text-brand-foreground tabular-nums">
                {uncategorized}
              </Badge>
            </span>
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
