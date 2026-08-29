# Candidate decisions

Decisions that are *on the table* but not yet made. When one is resolved, promote it to a numbered ADR (`NNNN-slug.md`) and add it to the [index](README.md); when one is dropped, delete it with a one-line note in the relevant ticket.

Keep entries short — a candidate is a question, not a spec.

## Open questions

- **Does the no-unit-test exception still hold, and for what?** `app/documents/coding-conventions.md` §Tests scopes it to hub tickets 0002/0003/0004 and says it expires with them — all three are closed, and [0006](../backlog/0006-app-login-screen-staging.md) and [0007](../backlog/0007-app-gach-bong-ground-app-shell.md) invoked it anyway, both trading unit tests for Playwright plus screenshots. Two shapes: **name each ticket** as it claims the exception (explicit, and the list keeps growing), or **restate it as a standing prototype-track rule** that ends when `api` lands and the client stops running on seeded mock state. → *Owner's call; it is a convention question, not a product one, so it can resolve as a one-line edit to §Tests rather than a numbered ADR.*
- **Flat categories, or a hierarchy?** Flat today. Hierarchy affects the schema, the reporting queries, and every category picker. → *resolve before reports are built.*
- **How do transactions get in?** Manual entry only today. CSV import, OFX/QFX, or a bank aggregator (Plaid et al.) are three very different products — the aggregator route adds a third-party holding the Owner's bank credentials, which cuts against "own the data". → *ADR before any import work is ticketed.*
- **Budgets: envelopes, targets per category, or none?** Determines whether "spending vs. intent" is a first-class model or a report. → *resolve before the reporting epic.*
- **Recurring transactions — modeled, or just repeated entries?** Affects the ledger schema. → *resolve when entry speed work lands.*
- **When do we graduate from the file board to a shared database?** Trigger: a second (especially non-technical) teammate, or parallel agents colliding on `STATUS.md`. See pm-playbook → "Graduate to a team board". → *resolve to an ADR when the trigger fires.*

## Resolved — promoted to ADRs

Kept as pointers so a question does not look unasked.

- ~~**How are transfers between accounts modeled?**~~ → **[ADR 0006](0006-transfers-linked-pair-invariant-in-db.md)**, 2026-08-29. Linked pair sharing a `transfer_id`, invariant enforced by the database rather than by callers. Decided on the evidence [backlog 0004](../backlog/0004-app-prototype-accounts-transfers-insight.md) produced by building it on the client — the pair is right for reading and wrong for writing, so the write hazards move into constraints. Was the oldest blocker on the board.
- ~~**Does this ever leave localhost?**~~ → **[ADR 0007](0007-real-auth-open-signup-hosted-later.md)**, 2026-08-29. Yes: the Owner wants friends using Coffer. Real bcrypt credentials, **open signup** — which reverses the 2026-08-22 "first-run provisions the single credential, then login-only, never an open signup form" shape, chosen by the Owner against the PM's invite-only recommendation — and server-side revocable sessions. **Hosting itself is still not decided:** TLS, domain, backups and who runs the box remain a separate `ops`-gated call, and the service binds to localhost until then.
