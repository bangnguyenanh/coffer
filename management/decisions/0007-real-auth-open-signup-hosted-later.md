# ADR 0007: Real credential auth with open signup — designed for other people, hosted later

**Status:** Accepted
**Date:** 2026-08-29
**Owner:** Kevin

## Context

Coffer has run on an assumption written down on 2026-08-22 and never revisited: the service binds to localhost, assumes one trusted user, and — per the shape the Owner chose that day — first-run setup provisions a single credential, after which the app is **login-only, never an open signup form**.

**On 2026-08-29 the Owner ended that assumption:** *"ý muốn này đã không còn đúng, tôi muốn login để bạn bè có thể dùng."* Friends are going to use this. That answers the oldest operational question in [CANDIDATES](CANDIDATES.md) — *"Does this ever leave localhost?"* — with **yes**, and it reverses the login-only shape in the same breath, because a friend with no account and no way to make one is not a user.

Two things make this cheaper than it sounds:

- **The data model was already there.** [ADR 0004](0004-multi-user-tenant-scoped-from-day-one.md) made the product multi-user on 2026-08-25, before a single row existed. `user_id` on every table and every query was decided for exactly this moment.
- **The client was already there.** `app/documents/architecture/01-overview.md` §auth already reads *"more than one account may exist in a session, each with its own credentials, and that is deliberate… do not re-introduce a first-run/provisioning state to cap it"*, and `SignupView` has existed since [backlog 0003](../backlog/0003-app-ui-prototype-mock-data.md). The client was built for this decision before it was made; the stale document was the hub's, not the client's.

What was genuinely undecided is the server half: hashing, session storage, transport, and who runs the box.

## Decision

**Coffer authenticates real people with real credentials, and anyone who reaches the app may create an account.** Specifically:

1. **Open signup.** `POST /auth/signup` is public. No invite token, no provisioning step, no first-run cap. A duplicate email is rejected (`email_taken`); a second account is ordinary. This **reverses the 2026-08-22 login-only shape**, which is recorded here rather than quietly dropped.
2. **Passwords are hashed with bcrypt**, never stored or logged in any recoverable form. The plaintext exists only in the request body and only long enough to hash or compare.
3. **Sessions are server-side and revocable** — an opaque random token in a `sessions` table, delivered in an `httpOnly`, `SameSite=Lax` cookie. Not a JWT.
4. **The session identifies the `user_id` that every repository call is already scoped by.** Auth does not introduce a new scoping mechanism; it supplies the argument ADR 0004 already made mandatory.
5. **Build it real now; host it later.** The service still binds to localhost through this arc, and episode 2's hook shot is unchanged — log in, add an expense, reload. **Putting Coffer on a public address is a separate, `ops`-gated decision** covering TLS, domain, backups, and who runs the machine. Nothing here authorises a deploy.

**Two mechanical calls inside this decision are the PM's, and stand unless the Owner says otherwise:** bcrypt (rather than argon2id) because `CLAUDE.md`'s episode-2 plan names it and the difference does not matter at this scale, and server-side sessions (rather than JWT) because a logout that does not actually log out is a bug this product should not ship. Both are reversible before [backlog 0008](../backlog/0008-api-auth-signup-login-sessions.md) starts and expensive after.

## Alternatives considered

- **Invite-only, or Owner-provisioned accounts.** Recommended by the PM and **declined by the Owner on 2026-08-29** in favour of open signup. It would have kept the 22/08 shape intact and left no unauthenticated write endpoint — at the cost of the Owner hand-running an account for every friend.
- **JWT / stateless sessions.** Rejected: nothing here has a scaling problem that statelessness solves, and it trades a revocable token for one that stays valid until it expires. Logout, password change, and "sign out everywhere" all become approximations.
- **Deploying in this arc.** Rejected by the Owner: episode 2's subject is a real backend, not a hosted product, and the public edge is hard-gated per action. Designing for it now and shipping it later costs nothing, because the data model already assumes it.
- **Leaving auth out of episode 2 entirely.** Not viable — `CLAUDE.md` puts bcrypt auth in episode 2's subject line and *log in → add an expense → reload* in its hook shot.

## Consequences

- **Easier:** the client stops pretending. `AuthGate`, `LoginView`, `SignupView` and the seeded-account fiction all get a real server behind them, and "the data is still there after a reload" becomes true because a session says whose data it is.
- **Harder, and it is the direct cost of open signup:** `POST /auth/signup` is an **unauthenticated write endpoint** — the first one this product has ever had. [Backlog 0008](../backlog/0008-api-auth-signup-login-sessions.md) carries the mitigations as part of its scope, not as a follow-up: rate limiting on both auth routes, a password minimum, and a uniform failure response so login cannot be used to enumerate which emails have accounts.
- **To watch:** password reset does not exist and is not in scope. With friends on the system, the first forgotten password is a support request answered by hand, and that is accepted until a ticket says otherwise. Email delivery is a whole subsystem and it is not being started by accident.
- **Supersedes in practice, not by number:** the *"first-run provisions the single credential, then login-only"* shape from 2026-08-22, and the localhost-only assumption in [ADR 0001](0001-surfaces-and-stack.md)'s "to watch" note. ADR 0001 is annotated rather than rewritten.
- **Propagation, per pm-playbook:** `api/documents/architecture/01-overview.md` stated the old single-user, no-`users`-table model as law. Fixed in the same change that accepted this ADR.
