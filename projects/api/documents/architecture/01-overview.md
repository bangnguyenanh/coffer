# Architecture — overview

How the finance backend is built. The owning agent reads this before any structural call.

## Shape

`routes → controllers → services → repositories → Postgres`.

- **Routes** declare the HTTP surface and nothing else — no logic, no SQL.
- **Services** hold the finance logic: balances, categorization, period rollups. This layer is pure and unit-testable; it does not know Express exists.
- **Repositories** are the only place SQL lives. No query strings anywhere else in the tree.

The layering exists so money arithmetic can be tested without a server or a database in the loop.

## Data model (current scope)

**Coffer is multi-user, and every user-data table carries `user_id` from the first migration** ([ADR 0004](../../../../management/decisions/0004-multi-user-tenant-scoped-from-day-one.md), Accepted 2026-08-25). This doc previously said *"single user, so no `users` table and no tenancy column anywhere"* — **that is gone**, and collapsing back to it is a regression, not a simplification.

**Scoping is a repository-layer guarantee, not developer discipline.** A repository takes the user as a **required argument**, never an optional filter, because a partially-applied scope reads as working right up until a second user exists — and then it serves one person's finances inside another's ledger, indistinguishably. Make an unscoped query hard to write, not merely discouraged.

What this does **not** license: organizations, teams, roles, sharing, invitations, billing, or an admin surface. The owning unit is a person. Flag rather than add.

- **`users`** — a person with an account. Owns everything below.
- **`accounts`** — a place money sits (checking, savings, a credit card). Has a name, a type, and an opening balance in minor units.
- **`categories`** — a flat list to start (`groceries`, `rent`, …). Hierarchy is not decided — see `management/decisions/CANDIDATES.md`.
- **`transactions`** — the ledger. Belongs to one user and one account, optionally one category. Carries `amount_minor` (integer, signed), `occurred_on` (date), `description`, and `created_at`. **A foreign key must not cross users** — `account_id` may only reference an account of the same `user_id`, and a plain FK does not express that.
- **Transfers are a linked pair** of transaction rows sharing a `transfer_id`, and **the pair invariant is enforced by the database**, not by callers ([ADR 0006](../../../../management/decisions/0006-transfers-linked-pair-invariant-in-db.md)). A transfer is excluded from every spending figure by the presence of `transfer_id` — never by category, account type, or sign.

**A balance is derived, never stored.** An account's balance is its opening balance plus the sum of its transactions. If you ever find yourself writing a cached balance column, stop and flag it — a stored balance that disagrees with the ledger is the single most common way a finance app lies to its user.

## Money handling

Governed by the money contract in `management/CLAUDE.md`. In this surface specifically:

- Column type is `bigint` for minor units. **Never `float`, `double precision`, or `real`.** `numeric` is acceptable only where a rate (not an amount) is stored.
- All arithmetic happens on integers. Division (splitting, averaging, percentages) must state its rounding rule explicitly and account for the remainder — **đồng may not vanish**. VND is exponent 0 ([ADR 0003](../../../../management/decisions/0003-currency-vnd-single-exponent-zero.md)): ₫1 is the smallest representable amount, there is no subunit, and there is no divide-by-100 anywhere in this product. *(This line used to say "cents" — that is the reflex the money contract calls a 100× bug.)*
- JSON responses carry `amount_minor` as a **number**, not a formatted string. Formatting is the client's job.

## Data

- Postgres. Migrations are versioned, forward-only, and checked in.
- Every migration is reversible in practice: destructive ones (dropping a column that holds ledger data) are `ops`-gated and never run without the Owner's go.

## Auth

**Real credential auth, decided 2026-08-29** ([ADR 0007](../../../../management/decisions/0007-real-auth-open-signup-hosted-later.md)) and built by [backlog 0008](../../../../management/backlog/0008-api-auth-signup-login-sessions.md). The Owner wants friends using Coffer, so the old *"localhost, one trusted user"* posture above is **retired**.

- **Signup is open.** `POST /auth/signup` is public — no invite, no provisioning step, no first-run cap. It is this product's first unauthenticated write endpoint, so rate limiting, a password minimum, and a uniform failure response that does not reveal which emails exist are part of building it, not a follow-up.
- **Passwords are bcrypt-hashed.** Never stored, never logged, never returned in any response — including an error.
- **Sessions are server-side and revocable:** an opaque token in a `sessions` table, delivered in an `httpOnly`, `SameSite=Lax` cookie. Not a JWT.
- **The session supplies the `user_id`** that every repository call is already scoped by. Auth adds no second scoping mechanism.
- **The service still binds to localhost.** Building auth is not hosting it: TLS, a domain, backups, and who runs the machine are a separate `ops`-gated decision, and nothing here authorises a deploy.
- **Password reset is out of scope** and is not to be started incidentally — it drags in email delivery.

## Config

Environment variables, documented in `.env.example`. Never commit secrets, and never commit a real database URL.

*Last updated: 2026-08-29 (PM, propagating accepted ADRs per pm-playbook → "An ADR that changes a cross-surface contract is not finished when it is written": the data model is now multi-user and repository-scoped per [ADR 0004](../../../../management/decisions/0004-multi-user-tenant-scoped-from-day-one.md) — this file had still been asserting the opposite as law five days after that ADR was accepted, and would have halted the `api` agent on its first ticket; transfers as a DB-enforced linked pair per [ADR 0006](../../../../management/decisions/0006-transfers-linked-pair-invariant-in-db.md); the auth section rewritten per [ADR 0007](../../../../management/decisions/0007-real-auth-open-signup-hosted-later.md); and "cents" corrected to "đồng" in the rounding rule. Earlier: 2026-08-22 — created.) — keep this stamp current in the same edit that changes content.*
