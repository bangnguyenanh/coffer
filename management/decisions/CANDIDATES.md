# Candidate decisions

Decisions that are *on the table* but not yet made. When one is resolved, promote it to a numbered ADR (`NNNN-slug.md`) and add it to the [index](README.md); when one is dropped, delete it with a one-line note in the relevant ticket.

Keep entries short — a candidate is a question, not a spec.

## Open questions

- **What is this thing called?** No product name chosen; the repo says "personal finance manager". → *resolve before anything user-facing carries a title.*
- **Multi-currency, or one currency forever?** Currently pinned as a single workspace-wide currency with no per-row currency field. Adding it later is a schema *and* API contract change, so decide before the ledger has real data in it. → *ADR when the Owner has a second currency in play.*
- **Flat categories, or a hierarchy?** Flat today. Hierarchy affects the schema, the reporting queries, and every category picker. → *resolve before reports are built.*
- **How do transactions get in?** Manual entry only today. CSV import, OFX/QFX, or a bank aggregator (Plaid et al.) are three very different products — the aggregator route adds a third-party holding the Owner's bank credentials, which cuts against "own the data". → *ADR before any import work is ticketed.*
- **Budgets: envelopes, targets per category, or none?** Determines whether "spending vs. intent" is a first-class model or a report. → *resolve before the reporting epic.*
- **Recurring transactions — modeled, or just repeated entries?** Affects the ledger schema. → *resolve when entry speed work lands.*
- **Does this ever leave localhost?** If yes: auth, TLS, and an `ops` gate all arrive together. Currently no. → *ADR the moment hosting is wanted.*
- **When do we graduate from the file board to a shared database?** Trigger: a second (especially non-technical) teammate, or parallel agents colliding on `STATUS.md`. See pm-playbook → "Graduate to a team board". → *resolve to an ADR when the trigger fires.*
