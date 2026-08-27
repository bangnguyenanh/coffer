/**
 * The one account the prototype boots with.
 *
 * ===================== A FIXTURE, NOT A CREDENTIAL =====================
 * DELETE THIS FILE IN EPISODE 2. It is not migrated, not hashed, not moved
 * to an env var, and not "made safe" — episode 2 replaces this surface's
 * session state with a real `api`: Postgres, bcrypt, and a login that leaves
 * the browser. At that point a hardcoded password in client source is a
 * defect, and the fix is removal, not rework.
 *
 * It exists for exactly one reason (Owner directive 2026-08-27, hub ticket
 * 0003 phase 2c): the auth state is session-only, so every reload used to
 * cost the Owner a sign up before any other screen could be judged. One
 * seeded account plus a prefilled login form makes reaching the ledger a
 * single Enter, and reaching *any* screen stops being a typing exercise.
 * =======================================================================
 *
 * **It is an ORDINARY account, and that is load-bearing.** `AuthProvider`
 * seeds it into the same `accounts` list and the same password map that sign
 * up writes to — there is no branch anywhere that asks "is this the seeded
 * one?". So signing up again on this address fails with `email_taken` like
 * any other duplicate, the password is compared with `===` like any other,
 * and deleting this file removes the fixture without leaving a special case
 * behind.
 *
 * **The password is exactly 8 characters, which is exactly the minimum the
 * forms enforce.** The rule was not lowered to fit the fixture and must not
 * be: `MIN_PASSWORD_LENGTH` in `AuthProvider.tsx` stays at 8. If that
 * minimum ever rises, this string changes — not the rule.
 */

interface PrototypeAccount {
  /** Matches `AuthProvider`'s `user_N` scheme; its counter starts after this one. */
  readonly id: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Typed as `string`, not left to `as const`. A literal type here infects every
 * consumer — `useState(PROTOTYPE_ACCOUNT.email)` would infer the state as the
 * literal `'kevin@coffer.com'` and reject the first keystroke that changes it.
 * The fields are still `readonly`; nothing may reassign the fixture.
 */
export const PROTOTYPE_ACCOUNT: PrototypeAccount = {
  id: 'user_1',
  email: 'kevin@coffer.com',
  password: '12345678',
};
