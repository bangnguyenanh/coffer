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
 * appends to it, and login searches it.
 *
 * **That question is SETTLED — do not re-open it.** The conflict with
 * `CLAUDE.md`'s old single-user line was escalated and then decided: hub ADR
 * 0004 (`decisions/0004-multi-user-tenant-scoped-from-day-one.md`, Accepted
 * 2026-08-25) makes Coffer multi-user, every row scoped to a user from the first
 * migration, and the single-user constraint is gone from `CLAUDE.md`. A list of
 * accounts is the product's law here, not a prototype shortcut; collapsing it
 * back to one owner is a regression. ADR 0004 is a DATA-MODEL decision binding
 * on `api` and buys this surface nothing at runtime — the no-network,
 * no-persistence, no-hashing boundary above is untouched by it.
 *
 * **Seeded with ONE account, and a reload re-seeds to exactly that one**
 * (Owner directive 2026-08-27, hub ticket 0003 phase 2c). The account is the
 * prototype fixture in `prototype-account.ts` — read its banner before touching
 * it; it is deleted in episode 2, not migrated. Accounts created during a
 * session are still gone on refresh: there is no persistence anywhere in this
 * prototype, and seeding is not a step towards it.
 *
 * **This replaces "seeded EMPTY", which used to be stated here as law.** That
 * paragraph existed because sign up was the screen being built and a fresh load
 * had to land on something it could act on. Phase 2b ended that: `/login` and
 * `/signup` are both permanently reachable and neither redirects to the other,
 * so an empty account list stopped buying reachability and only cost the Owner
 * a sign up on every reload.
 *
 * **A seeded account is NOT a session.** `currentUserId` still starts `null`,
 * so a fresh load is `anonymous` and lands on the login screen exactly as
 * before — with its fields prefilled. That screen is the opening shot of
 * episode 2 (*log in → add an expense → reload*); auto-signing-in would delete
 * the shot. Prefilled fields, never a bypass.
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
import { PROTOTYPE_ACCOUNT } from './prototype-account';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const OK: AuthResult = { ok: true };
const fail = (code: AuthFailure): AuthResult => ({ ok: false, code });

/** Email is the identity, and identity is case-insensitive. Passwords never are. */
const emailKey = (email: string): string => email.trim().toLowerCase();

/**
 * The seed, built here rather than inlined so the account and its password go
 * into the two structures TOGETHER — an account seeded without its password is
 * an account nobody can sign in as, and the failure would look like a wrong
 * password rather than a missing seed.
 *
 * `useState(seedAccounts)` passes the function, not its result: React calls it
 * once. `useRef` keeps the first Map it is given and drops later ones, so the
 * map sign up writes to is the seeded one for the life of the session.
 */
const seedAccounts = (): readonly User[] => [
  { id: PROTOTYPE_ACCOUNT.id, email: PROTOTYPE_ACCOUNT.email },
];

const seedPasswords = (): Map<string, string> =>
  new Map([[emailKey(PROTOTYPE_ACCOUNT.email), PROTOTYPE_ACCOUNT.password]]);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [accounts, setAccounts] = useState<readonly User[]>(seedAccounts);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * The credentials, for the length of this session. A ref and not state on
   * purpose: passwords must never be reachable from anything that renders.
   * Keyed by `emailKey`, so lookup matches the way login compares addresses.
   *
   * Starts holding the prototype fixture's password — through the same map and
   * the same `===` comparison as any account signed up in the session.
   */
  const passwords = useRef(seedPasswords());

  /**
   * A counter, not `accounts.length`: two sign ups in one tick must not collide.
   * Starts at 1 because the seeded fixture already took `user_1`.
   */
  const nextUserId = useRef(1);

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
