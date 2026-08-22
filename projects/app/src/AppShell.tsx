import { NavLink, Outlet } from 'react-router-dom';
import { appCopy } from './copy/strings';

/** Application shell: header, nav, and the slot every route renders into. */
export function AppShell() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border-subtle bg-surface-raised">
        <div className="mx-auto flex max-w-4xl items-baseline gap-4 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-brand">{appCopy.name}</span>
          <span className="text-sm text-ink-muted">{appCopy.tagline}</span>
          <nav className="ml-auto">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'text-sm font-medium text-ink' : 'text-sm text-ink-muted'
              }
            >
              {appCopy.nav.ledger}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
