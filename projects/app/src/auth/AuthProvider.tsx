/**
 * The auth surface, as screen state.
 *
 * ============================ READ THIS FIRST ============================
 * THIS IS NOT AUTHENTICATION AND MUST NEVER BE MISTAKEN FOR IT.
 *
 * There is no token, no bearer header, no session store, no hashing, and no
 * request — those were deleted with the mock network layer (hub ticket 0003,
 * Owner directive 2026-08-25). The accounts are React state and the passwords
 * are a `useRef` map compared with `===`.
 *
 * That is the correct amount of security for a click-through prototype, and
 * adding more would be worse, not better: it would look like real auth while
 * protecting nothing. Real auth arrives with the hosting decision
 * (decisions/CANDIDATES.md) and brings TLS and an `ops` gate with it. If you
 * are reaching for a crypto dependency here, stop and raise it.
 * ========================================================================
 *
 * **Phase 2b: there is no "the owner" any more.** This used to hold at most one
 * account and refuse a second (`setup_already_complete`), because the product
 * was declared single-user. The Owner has asked for conventional sign up +
 * login *"để có thể sau này đẩy lên cloud cho mọi người dùng"*, so the cap is
 * removed here and not merely hidden by routing: `accounts` is a list, sign up
 * appends to it, and login searches it. The conflict with `CLAUDE.md`'s
 * single-user line is escalated to the Owner (hub `decisions/CANDIDATES.md`) —
 * this file just stops asserting the answer.
 *
 * Seeded EMPTY, and a reload re-seeds: every account created in a session is
 * gone on refresh. That is deliberate; there is no persistence anywhere in this
 * prototype, and the first screen a fresh load can act on is sign up.
 *
 * The validation rules below (email shape, minimum length) are what they always
 * really were on this surface: the UI states the two forms have to render. They
 * are not a contract — nothing downstream reads them.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Credentials, User } from '../data/types';
import {
  AuthContext,
  type AuthFailure,
  type AuthResult,
  type AuthState,
  type AuthStatus,
} from './AuthContext';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const OK: AuthResult = { ok: true };
const fail = (code: AuthFailure): AuthResult => ({ ok: false, code });

/** Email is the identity, and identity is case-insensitive. Passwords never are. */
const emailKey = (email: string): string => email.trim().toLowerCase();

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [accounts, setAccounts] = useState<readonly User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * The credentials, for the length of this session. A ref and not state on
   * purpose: passwords must never be reachable from anything that renders.
   * Keyed by `emailKey`, so lookup matches the way login compares addresses.
   */
  const passwords = useRef(new Map<string, string>());

  /** A counter, not `accounts.length`: two sign ups in one tick must not collide. */
  const nextUserId = useRef(0);

  const status: AuthStatus = currentUserId === null ? 'anonymous' : 'authenticated';
  const user = accounts.find((candidate) => candidate.id === currentUserId) ?? null;

  const signUp = useCallback(
    ({ email, password: secret }: Credentials): AuthResult => {
      const trimmed = email.trim();
      if (trimmed === '' || secret === '') return fail('invalid_body');
      if (!EMAIL_SHAPE.test(trimmed)) return fail('invalid_email');
      if (secret.length < MIN_PASSWORD_LENGTH) return fail('weak_password');

      const key = emailKey(trimmed);
      // A second account is now ordinary; a second account on the SAME address
      // is not. This is a rendered form error, the same as a wrong password.
      if (accounts.some((candidate) => emailKey(candidate.email) === key)) {
        return fail('email_taken');
      }

      nextUserId.current += 1;
      const created: User = { id: `user_${nextUserId.current}`, email: trimmed };
      passwords.current.set(key, secret);
      setAccounts((current) => [...current, created]);
      // Creating an account signs you in as it — the conventional flow. No
      // "now log in with the account you just made" round trip.
      setCurrentUserId(created.id);
      return OK;
    },
    [accounts],
  );

  const signIn = useCallback(
    ({ email, password: secret }: Credentials): AuthResult => {
      const trimmed = email.trim();
      if (trimmed === '' || secret === '') return fail('invalid_body');

      const key = emailKey(trimmed);
      const match = accounts.find((candidate) => emailKey(candidate.email) === key);

      // ONE code covers an unknown address AND a wrong password, and the two
      // are deliberately indistinguishable to the screen. Splitting them is the
      // account-enumeration leak every login grows, and it matters more, not
      // less, for a product aimed at the cloud.
      if (match === undefined) return fail('invalid_credentials');
      if (passwords.current.get(key) !== secret) return fail('invalid_credentials');

      setCurrentUserId(match.id);
      return OK;
    },
    [accounts],
  );

  const signOut = useCallback((): void => {
    // Only the session ends. The accounts created this session stay, so signing
    // back in is something the Owner can actually try.
    setCurrentUserId(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, accountCount: accounts.length, signIn, signUp, signOut }),
    [status, user, accounts.length, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
