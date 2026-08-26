import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AuthGate } from './auth/AuthGate';
import { LedgerView } from './routes/ledger/LedgerView';
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
 *   the app           only while signed in — the ledger is the landing route
 *                     until ticket 0004 introduces a dashboard and moves it
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
          <Route index element={<LedgerView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
