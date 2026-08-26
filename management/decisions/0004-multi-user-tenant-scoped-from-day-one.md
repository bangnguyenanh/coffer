# ADR 0004: The product is multi-user — data is tenant-scoped from day one

**Status:** Accepted
**Date:** 2026-08-25
**Owner:** Kevin

## Context

`CLAUDE.md` opened with a hard product constraint: *"Single user, no multi-tenancy. There is no organization, no sharing, no roles. Don't build for tenants that don't exist."* It was written during workspace setup on 2026-08-22, in the same pass as everything else, and never separately examined.

On 2026-08-25 the Owner asked for conventional login and sign-up screens *"để có thể sau này đẩy lên cloud cho mọi người dùng"* — so that the product can later be hosted for other people. Asked whether that reversed the constraint, the Owner's answer was direct: **the constraint itself was written too hastily and pointed the wrong way** (*"chúng ta đã làm quá vội và đi sai hướng đoạn đó"*).

Two facts make the timing unusually favourable, and are the reason this is decided now rather than deferred again:

- **[Backlog 0001](../backlog/0001-api-ledger-foundation.md) has not written a line of schema.** A `user_id` column on an empty table costs nothing. The same column retrofitted onto live financial rows is a backfill with no correct default — every existing row must be attributed to someone, and guessing wrong silently mixes one person's money into another's ledger.
- **The client has no persistence and no network** (the prototype's mock layer was deleted the same day), so nothing on the app side has to be unwound.

## Decision

**Coffer is a multi-user product.** Every row of user data is owned by a user and scoped to that user from the first migration.

Concretely, and binding on `api`:

- **Every user-data table carries `user_id`** — `accounts`, `categories`, `transactions`, and every table added later. Not nullable.
- **Every query is scoped by `user_id`.** A read or write that does not constrain on the owning user is a bug, not an optimisation opportunity. This is enforced at the repository layer so no endpoint can forget it.
- **Users are strangers to each other.** No sharing, no visibility across accounts, no admin who can read another user's ledger.
- **Sign-up is open**, not provisioned. Anyone can create an account; there is no "the one owner".

**What this decision deliberately does *not* buy**, because building it now would be building for tenants that still don't exist:

- No organizations, teams, workspaces, or memberships. The unit is a person, not a group.
- No roles or permission model. A user has exactly one relationship to their data: it is theirs.
- No sharing, invitations, or delegated access.
- No billing, plans, or quotas.
- No admin surface.

Each of those is a separate future decision. The schema keeps them possible; nothing here builds them.

**This does not by itself put the product on the internet.** Hosting still brings real auth (hashing, session storage, transport), TLS, and an `ops` gate — see [CANDIDATES](CANDIDATES.md). What changes is that the data model no longer has to be rebuilt when that day comes.

## Alternatives considered

- **Stay single-user; add tenancy when hosting is actually wanted.** The option the superseded constraint implied. Rejected because it puts the expensive half of the work at the worst possible moment: the migration would run against real financial history, where a mis-attributed row is indistinguishable from a legitimate one and money silently crosses between people. The cost of being tenant-ready now is one column and one predicate.
- **Go fully multi-tenant now — open sign-up, sessions, hashing, TLS, deploy.** Rejected as premature for a different reason: it changes the near-term job from *"build a finance tool that works"* to *"operate a service for strangers"*, and it front-loads security work that has no deadline while the product still has no transaction-entry screen. The schema commitment above is what has a deadline; the operational commitment does not.
- **A `tenant_id` naming that anticipates organizations.** Rejected as false precision. The owning unit today is a person; `user_id` says that honestly. If organizations ever arrive they get their own ADR and their own column, and renaming a column is cheaper than having lied about what one meant.

## Consequences

**Easier.** Hosting stops being a rewrite and becomes a deployment plus an auth decision. The client's conventional login/sign-up screens now describe something real rather than mocking a shape the backend contradicts. The scoping predicate is written once, at the repository layer, while there is exactly one developer and no legacy queries.

**Harder.** Every query carries a scope condition forever, and **a partially-applied scope is worse than none** — it reads as working until the day two users exist, and then it leaks one person's finances to another. This is the single thing to watch: it wants a repository-layer guarantee and a test that a query without a `user_id` predicate cannot compile or cannot run, not developer discipline.

**Changed elsewhere in the same edit:**

- `CLAUDE.md`'s product-constraints list — the single-user constraint is replaced by this one.
- [Backlog 0001](../backlog/0001-api-ledger-foundation.md) — the migration plan gains `users` and `user_id`; its "no auth, single-user" non-goal is rewritten. **0001 had not started, so nothing is being unwound.**
- [ADR 0001](0001-surfaces-and-stack.md) — its "to watch" note (*"the API is unauthenticated and localhost-only"*) still describes today accurately and is not superseded; what changes is that the data model no longer assumes it stays that way.
- [CANDIDATES](CANDIDATES.md) — the multi-tenancy question is resolved here and removed; the hosting question remains open and now carries the auth work explicitly.

**Not changed.** The money contract is untouched — VND at exponent 0, `amount_minor` as an integer, sign as direction ([ADR 0003](0003-currency-vnd-single-exponent-zero.md)). Multi-user changes who a row belongs to, never what it is worth.
