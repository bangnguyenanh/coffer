import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AuthGate } from './auth/AuthGate';
import { AccountDetailView } from './routes/accounts/AccountDetailView';
import { AccountsView } from './routes/accounts/AccountsView';
import { CategoriesView } from './routes/categories/CategoriesView';
import { DashboardView } from './routes/dashboard/DashboardView';
import { LedgerView } from './routes/ledger/LedgerView';
import { TriageView } from './routes/triage/TriageView';
import { LoginView } from './routes/login/LoginView';
import { SignupView } from './routes/signup/SignupView';

/**
 * Routes.
 *
 * **Phase 2b (Owner directive 2026-08-25): the conventional pair.** `/login`
 * and `/signup` are both permanently reachable, sit in the SAME gate, and are
 * cross-linked to each other. Neither redirects to the other based on whether
 * an account exists — that state machine, and the `/setup` route it served, are
 * gone.
 *
 *   /login, /signup   reachable whenever nobody is signed in
 *   /                 THE DASHBOARD, and the landing route since ticket 0004
 *                     phase 5. Balances plus the month summary: the two
 *                     questions this product exists to answer — *how much do I
 *                     have* and *where did the month go* — both above the fold,
 *                     with everything else a route away.
 *   /ledger           the ledger, which USED to be `/`. It answers a third
 *                     question — *what happened* — one row at a time, and it is
 *                     where entry, correction and filtering live. It is one
 *                     click from the landing screen and it kept every one of
 *                     its measured keyboard paths; only its path changed.
 *   /accounts         balances (DERIVED, never stored) and the transfer form
 *                     — hub ticket 0004 phases 1 and 2. Transfer entry lives
 *                     HERE and not on the ledger for two reasons: a transfer is
 *                     a question about accounts, so the balances it moves are
 *                     on the same screen and the proof needs no navigation; and
 *                     a mode toggle on the quick-entry row would have added a
 *                     tab stop to the measured 11-keystroke entry path, which
 *                     is a regression the design system does not permit.
 *   /accounts/:id     one account, its derived balance, and its own ledger.
 *   /categories       flat category CRUD — hub ticket 0004 phase 3. It is its
 *                     own route rather than a panel on the ledger because it is
 *                     reference-data maintenance, done rarely, and it must not
 *                     share a screen with the measured 11-keystroke entry path.
 *                     Deleting a category REASSIGNS its rows to uncategorised
 *                     (never cascade-deletes them), so the rows it touches land
 *                     in /triage — which is why the two are siblings.
 *   /triage           the uncategorised inbox (phase 5). It is a ROUTE and not
 *                     a filtered ledger because it is a different job with a
 *                     different keyboard model: the ledger reads and corrects
 *                     one row at a time, this one assigns a category to many at
 *                     once. `?category_id=none` on the ledger still exists and
 *                     still answers "which rows are uncategorised" — this
 *                     answers "clear them".
 *
 * `/setup` REDIRECTS to `/signup` rather than 404ing. It is a URL this app was
 * shipping last week: it is in the Owner's history, in this ticket's evidence,
 * and in the verification scripts. In a prototype whose entire job is to be
 * clicked through and judged, a dead end reads as a broken app, while a
 * redirect lands on the screen that replaced it and needs no explanation. It
 * costs one line and can be deleted once nothing points at it. It sits outside
 * every gate so it behaves the same in both auth states (signed in, `/signup`
 * then forwards to the ledger).
 *
 * The catch-all lives inside the authenticated branch, so an unknown path while
 * signed out still resolves through the gate to login rather than to a blank
 * screen.
 */
export function App() {
  return (
    <Routes>
      <Route path="/setup" element={<Navigate to="/signup" replace />} />

      <Route element={<AuthGate allow="anonymous" />}>
        <Route path="/login" element={<LoginView />} />
        <Route path="/signup" element={<SignupView />} />
      </Route>

      <Route element={<AuthGate allow="authenticated" />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardView />} />
          <Route path="/ledger" element={<LedgerView />} />
          <Route path="/accounts" element={<AccountsView />} />
          <Route path="/accounts/:accountId" element={<AccountDetailView />} />
          <Route path="/categories" element={<CategoriesView />} />
          <Route path="/triage" element={<TriageView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
