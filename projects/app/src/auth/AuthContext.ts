/**
 * The auth context's type and the context object itself.
 *
 * Split from the provider so that the provider file exports only a component —
 * a file that exports both a component and a non-component breaks React Fast
 * Refresh, and the auth provider is exactly the module you least want to lose
 * hot reload on.
 */

import { createContext } from 'react';
import type { Credentials, User } from '../data/types';

/**
 * Whether anybody is signed in. That is the whole state machine now.
 *
 * **`setup-required` is gone** (hub ticket 0003 phase 2b, Owner directive
 * 2026-08-25). It existed to express "no account has been provisioned yet", and
 * it was what made `/setup` appear and disappear. The Owner asked for the
 * conventional pair instead — sign up and login are both permanently reachable
 * and neither redirects to the other — so there is no longer any state in which
 * one of the two screens is illegal, and therefore no third status to hold.
 *
 * There is no `checking` and no `unavailable` state either: those went with the
 * mock network layer. The app knows synchronously, so there is nothing to wait
 * for and nothing that can be down.
 */
export type AuthStatus = 'anonymous' | 'authenticated';

/**
 * A rejected credential, as a machine-readable code the form renders.
 *
 * Returned, not thrown: there is no request to fail any more, and a validation
 * result is an ordinary value. `src/copy/strings.ts` maps each code to the
 * Vietnamese the Owner reads.
 *
 * `setup_already_complete` is gone with first-run provisioning; `email_taken`
 * replaces it, and means something different — not "this product already has
 * its one account" but "that address is in use", which is what a sign up form
 * says when more than one account is allowed to exist.
 */
export type AuthFailure =
  | 'invalid_body'
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_credentials'
  | 'email_taken';

export type AuthResult = { readonly ok: true } | { readonly ok: false; readonly code: AuthFailure };

export interface AuthState {
  readonly status: AuthStatus;
  /** The signed-in user, or `null` when nobody is. */
  readonly user: User | null;
  /**
   * How many accounts exist in this session. Rendered onto the shell as
   * evidence: "the single-account assumption is gone" is otherwise a claim
   * about code rather than something observable on the page.
   */
  readonly accountCount: number;
  /** Returns the failure code on a bad credential, so the form can render why. */
  readonly signIn: (credentials: Credentials) => AuthResult;
  /** Creates an account and signs in as it. Any number of accounts may exist. */
  readonly signUp: (credentials: Credentials) => AuthResult;
  readonly signOut: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
