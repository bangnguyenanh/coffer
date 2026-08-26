# Candidate decisions

Decisions that are *on the table* but not yet made. When one is resolved, promote it to a numbered ADR (`NNNN-slug.md`) and add it to the [index](README.md); when one is dropped, delete it with a one-line note in the relevant ticket.

Keep entries short — a candidate is a question, not a spec.

## Open questions

- **How are transfers between accounts modeled?** Moving money between cash / bank / e-wallet is neither income nor expense, and if it is not modeled it inflates every spending total. Two shapes: a **linked pair** of transactions sharing a `transfer_id`, or a **single row with a counter-account**. Either way, transfers must be excludable from spending totals. [Backlog 0003](../backlog/0003-app-ui-prototype-mock-data.md) prototypes the linked pair provisionally. → *This is a schema question — ADR required **before 0001 phase 2 writes the migration**.*
- **Flat categories, or a hierarchy?** Flat today. Hierarchy affects the schema, the reporting queries, and every category picker. → *resolve before reports are built.*
- **How do transactions get in?** Manual entry only today. CSV import, OFX/QFX, or a bank aggregator (Plaid et al.) are three very different products — the aggregator route adds a third-party holding the Owner's bank credentials, which cuts against "own the data". → *ADR before any import work is ticketed.*
- **Budgets: envelopes, targets per category, or none?** Determines whether "spending vs. intent" is a first-class model or a report. → *resolve before the reporting epic.*
- **Recurring transactions — modeled, or just repeated entries?** Affects the ledger schema. → *resolve when entry speed work lands.*
- **Does this ever leave localhost?** If yes: auth, TLS, and an `ops` gate all arrive together. Currently no — but [ADR 0004](0004-multi-user-tenant-scoped-from-day-one.md) settled the *data model* half of this on 2026-08-25 (multi-user, `user_id` everywhere), so what is left here is purely operational: password hashing, session storage, transport, and who runs the box. → *ADR the moment hosting is wanted.* **Shape already chosen by the Owner (2026-08-22) and prototyped in [0003](../backlog/0003-app-ui-prototype-mock-data.md) phase 2: first-run setup provisions the single credential, then login-only — never an open signup form.** The ADR inherits that; what it still has to decide is hashing, session storage, and transport.
- **When do we graduate from the file board to a shared database?** Trigger: a second (especially non-technical) teammate, or parallel agents colliding on `STATUS.md`. See pm-playbook → "Graduate to a team board". → *resolve to an ADR when the trigger fires.*
