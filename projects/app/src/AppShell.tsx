import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { appCopy } from './copy/strings';

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
 */
export function AppShell() {
  const { user, accountCount, signOut } = useAuth();
  const email = user?.email ?? '';

  return (
    <div
      className="min-h-screen bg-surface text-ink"
      data-auth="authenticated"
      data-user-email={email}
      data-account-count={accountCount}
    >
      <header className="border-b border-border-subtle bg-surface-raised">
        <div className="mx-auto flex max-w-4xl items-baseline gap-4 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-brand">{appCopy.name}</span>
          <span className="text-sm text-ink-muted">{appCopy.tagline}</span>
          <nav className="ml-auto flex items-baseline gap-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'text-sm font-medium text-ink' : 'text-sm text-ink-muted'
              }
            >
              {appCopy.nav.ledger}
            </NavLink>
            <span className="text-sm font-medium text-ink" data-slot="signed-in-as">
              {email}
            </span>
            <button
              type="button"
              data-action="sign-out"
              aria-label={appCopy.signOutLabel.replace('{email}', email)}
              className="rounded-md border border-border-subtle px-2 py-1 text-sm text-ink-muted"
              onClick={signOut}
            >
              {appCopy.signOut}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
