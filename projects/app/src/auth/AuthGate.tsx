/**
 * Route protection — and, as of phase 2b, almost nothing else.
 *
 * The old gate ran a three-state redirect table: `/setup` only while no account
 * existed, `/login` only once one did, each bouncing to the other. **That whole
 * state machine is gone** (Owner directive 2026-08-25). Sign up and login are
 * both permanently reachable and neither knows or cares whether an account
 * exists, which is what makes the pair read as conventional rather than as
 * provisioning.
 *
 * ONE redirect is left, and it is the one every signed-in product has:
 *
 *   - a protected route while signed out  -> /login
 *   - /login or /signup while signed in   -> the ledger
 *
 * This decides what RENDERS, and nothing else — see AuthProvider's banner.
 */

import { Navigate, Outlet } from 'react-router-dom';
import type { AuthStatus } from './AuthContext';
import { useAuth } from './useAuth';

export function AuthGate({ allow }: { readonly allow: AuthStatus }) {
  const { status } = useAuth();

  if (status === allow) return <Outlet />;
  return <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />;
}
