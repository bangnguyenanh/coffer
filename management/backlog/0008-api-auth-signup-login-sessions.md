# Backlog 0008: Auth — signup, login, sessions, and the scoping they feed

**Status:** Open  ·  **Priority:** High  ·  **Surfaces:** api  ·  **Opened:** 2026-08-29
**Epic:** Foundation — first usable expense tracker
**Blocked by:** [0001](0001-api-ledger-foundation.md) — needs the service skeleton, a database, and the `users` table to exist.

## Context / problem

Episode 2's hook shot is **log in → add an expense → reload the page, the data is still there**, and the middle of that sentence is the only part the workspace can currently fake. The client has had `AuthGate`, `LoginView` and `SignupView` since [0003](0003-app-ui-prototype-mock-data.md), running against a seeded in-memory account list; there is no server that knows who anyone is.

On 2026-08-29 the Owner ended the localhost/one-trusted-user posture — *"tôi muốn login để bạn bè có thể dùng"* — and [ADR 0007](../decisions/0007-real-auth-open-signup-hosted-later.md) records the shape that follows: real credentials, **open signup**, bcrypt, server-side sessions, and hosting deferred to a separate `ops` gate.

This ticket is where [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md) stops being a schema property and starts being true at runtime. 0001 makes every repository *take* a user; this ticket is what finally *supplies* one that was proven rather than assumed.

**Auto-persisted:** No — Owner directed it in session, 2026-08-29 ("tạo ticket cho auth"), and chose the signup model against the PM's recommendation.

## Goal & non-goals

- **Goal:** a person can create an account, log in, stay logged in across a reload, and log out — and every ledger query in the service runs scoped to whoever that session says they are.
- **Non-goal: hosting.** The service still binds to localhost. TLS, a domain, backups and who runs the box are [ADR 0007](../decisions/0007-real-auth-open-signup-hosted-later.md)'s deferred `ops` decision. **Do not deploy anything.**
- **Non-goal: password reset.** It drags in email delivery, which is a subsystem, not a task. The first forgotten password is answered by hand.
- **Non-goal:** OAuth, social login, 2FA, "remember this device", account deletion, email verification.
- **Non-goal:** roles, permissions, sharing, admin. [ADR 0004](../decisions/0004-multi-user-tenant-scoped-from-day-one.md) excludes them and this ticket does not smuggle them in — a session identifies a person, and a person owns their own rows. Nothing else.
- **Non-goal:** changing the client. `app` consumes this in a later ticket; this one ends at the API.

## Plan (by phase)

1. **Phase 1 — `api`: migration `0002`.** `users.password_hash` (not null — 0001 deliberately left it out, and [ADR 0007](../decisions/0007-real-auth-open-signup-hosted-later.md) is the ticket that puts it in), plus a `sessions` table: opaque token (indexed, unique), `user_id`, `created_at`, `expires_at`. **`users.email` is already unique from 0001** — do not add a second uniqueness mechanism in application code; let the constraint do it and translate the violation.
2. **Phase 2 — `api`: `POST /auth/signup`.** Public. bcrypt-hash the password, insert the user, open a session, set the cookie. A duplicate email returns `email_taken`. **A password minimum is part of this phase** — pick a floor, state it in the outcome, and enforce it server-side regardless of what the client checks.
3. **Phase 3 — `api`: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.** Login compares against the hash and opens a session; logout **deletes the session row**, not just the cookie — that is the whole reason [ADR 0007](../decisions/0007-real-auth-open-signup-hosted-later.md) chose server-side sessions over a JWT, and a logout that leaves a valid token behind fails this phase. `GET /auth/me` is how the client rehydrates after a reload.
4. **Phase 4 — `api`: the session middleware, and the scoping it feeds.** Resolve the cookie to a `user_id` before any route that touches user data, reject with 401 when it does not resolve, and pass it into the repository layer as the **required argument** 0001 built. **This phase is the point of the ticket** — the endpoints are plumbing.
5. **Phase 5 — `api`: the mitigations open signup requires.** Rate-limit both auth routes. Make login's failure response **uniform** — a wrong password and an unknown email return the same status, same body, same timing characteristics, so the endpoint cannot be used to enumerate who has an account. Confirm nothing logs a password, a hash, or a session token.

## Constraints — read before touching anything

- **A password never leaves the request body except as a hash.** Not in a log line, not in an error, not in a response, not in a test fixture that gets committed with a real-looking value.
- **A session token is a credential.** Same rule. `GET /auth/me` returns the user, never the token.
- **No endpoint outside `/auth/*` may read user data without a resolved session.** If a route can be reached without one, that is a bug of the same class as an unscoped query — ADR 0004's failure mode, reached by a different road.
- **Do not weaken 0001's scoping to make wiring easier.** If the repository signature is awkward, say so and stop; the required-argument shape is load-bearing, not stylistic.
- **The money contract is untouched here** — but if any auth work leads you into an amount, it is still `amount_minor`, integer, VND at exponent 0.
- **Do not touch `projects/app/`.** The client's turn is a later ticket.

## Evidence bar

Automated tests are expected on this surface — `api/documents/coding-conventions.md` has no prototype-track exception, and the one on `app` is scoped to `app`. Report counts.

Behaviour to demonstrate, not assert:

- **Signup → logout → login** as one real sequence of requests, with the same account, showing the session cookie changing.
- **The reload case, which is the episode's hook shot:** a session cookie alone, with no login in the same run, resolving through `GET /auth/me`.
- **A logged-out session token is dead** — replay the exact token after logout and show the 401.
- **Two users, two ledgers.** Create two accounts, write a transaction as each, and show that neither one's read returns the other's row. **This is the demonstration ADR 0004 has been waiting for since 2026-08-25** — a passing scope test with only one user in the database proves nothing.
- **Login does not enumerate.** A wrong password and an unknown email produce indistinguishable responses.

## Contract

- `POST /auth/signup` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`. Response envelope per `api/documents/response-format.md`.
- Session cookie: `httpOnly`, `SameSite=Lax`. `Secure` is set from config, not hardcoded — it must be on when hosting arrives and must not break localhost before then.
- Auth failures are **401**. `email_taken` on signup is **409**. A password below the minimum is **400** with a reason — the money contract's "reject, never coerce" instinct applies to input generally on this surface.
- The client's existing error codes (`email_taken`) are reused rather than renamed. Gratuitous divergence from what `app` already renders costs a round of rework for nothing.

## Outcome

<!-- Filled per phase by the PM from the sub-agent's evidence. -->

- Phase 1: `<files, evidence>`
- Phase 2: `<files, evidence>`
- Phase 3: `<files, evidence>`
- Phase 4: `<files, evidence>`
- Phase 5: `<files, evidence>`
- Harness delta: `<what this taught the system, or "None">`
