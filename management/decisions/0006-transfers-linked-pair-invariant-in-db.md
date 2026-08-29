# ADR 0006: Transfers are a linked pair, and the invariant lives in the database

**Status:** Accepted
**Date:** 2026-08-29
**Owner:** Kevin

## Context

Moving money between cash, bank, and e-wallet is neither income nor expense. If it is not modeled, it inflates every spending total — the transfer out of checking reads as ₫5.000.000 of spending, and the arrival in savings reads as ₫5.000.000 of income. Two shapes were on the table since 2026-08-22: a **linked pair** of transactions sharing a `transfer_id`, or a **single row with a counter-account**.

This decision was deliberately deferred until there was evidence. [Backlog 0004](../backlog/0004-app-prototype-accounts-transfers-insight.md) phase 2 built the linked pair on the client on 2026-08-27, against seeded data, and the `app` agent reported back what it cost. **That report, not a preference, is this ADR's input** — and it does not point cleanly at one shape.

**What building the pair taught us:**

- **The pair invariant will not stay in callers.** `removeTransaction(id)` had to stop returning one row and start returning many, because deleting one leg must delete both — half a transfer is not a smaller transfer, it is a wrong balance. `restoreTransaction` became plural. `addTransfer` had to become its own mutator, or there is a window where money has left one account and not arrived at the other.
- **The exclusion rule leaked into four consumers, not one** — spending totals, category breakdowns, the uncategorised count, and the triage inbox. The inbox bit immediately: both legs store `category_id: null`, so without an explicit rule every transfer asks to be filed under a category it can never have.
- **Editing is where the pair is weakest.** Transfer legs had to be made non-editable inline, because one editor changing one leg can put the ledger ₫500.000 out of balance. *"Change the amount of this transfer"* currently means delete and re-enter.
- **What the pair buys back, and it is not nothing:** each account's ledger is complete without a join or a sign flip, because a row genuinely exists in both accounts. With a single row, one of the two accounts has no row of its own, and every per-account balance and ledger must synthesise the other side — the same "derive it twice" hazard that the no-stored-balance rule exists to avoid.

The agent's read, offered as a recommendation and not a decision: **the pair is right for reading and wrong for writing** — and if the pair is kept, the invariant belongs in the database, because this prototype demonstrated that keeping it in application code means remembering it at every mutation site.

## Decision

**Transfers are a linked pair of transaction rows sharing a `transfer_id`, and the pair invariant is enforced by the database — not by application code.**

The migration that introduces `transfer_id` also introduces the constraints that make a broken pair unrepresentable:

- **Both legs sum to zero.** A `DEFERRABLE INITIALLY DEFERRED` constraint, checked at commit, so the two inserts of one transfer are legal inside a transaction and illegal outside one.
- **Both legs share `occurred_on`** and, necessarily, the same `user_id` — a transfer never crosses users ([ADR 0004](0004-multi-user-tenant-scoped-from-day-one.md)).
- **Both legs sit on different accounts.** A transfer from an account to itself is not a transfer.
- **A `transfer_id` has exactly two legs.** Not one, not three.

`transfer_id` is nullable: a null means an ordinary transaction, and that is the common case. **Transfers are excluded from every spending figure by the presence of `transfer_id`, not by category, account type, or sign** — the exclusion rule has one expression, in the repository layer, and consumers do not each re-derive it.

**Amending a transfer is delete-and-re-enter**, as on the client, until a ticket says otherwise. A partial edit of one leg is the failure mode the constraints exist to prevent, and an editor that updates both legs atomically is a feature, not a foundation.

## Alternatives considered

- **Single row with a counter-account column.** Genuinely cheaper to write: one row, one amount, one editor, and "is this a transfer" is a column on the row you already have — it removes every mutation-site hazard listed above. Rejected because it moves the cost to *reading*, which is the operation this product does constantly: every per-account ledger and every balance would have to synthesise the missing side with a union and a sign flip, in exactly the place where the no-stored-balance rule already demands care. The prototype proved the write problems are solvable with constraints; the read problems would have to be solved in every query, forever.
- **Keeping the invariant in application code**, as the prototype does. Rejected on the prototype's own evidence — it leaked into four consumers in a single afternoon on one surface, and the `api` will not be the only writer of these rows.
- **Deferring the decision again.** Rejected: it was the oldest blocker on the board, and [backlog 0001](../backlog/0001-api-ledger-foundation.md) phase 2 writes the migration that this shapes. Deciding after the table exists means a migration against live ledger rows.

## Consequences

- **Easier:** an account's ledger and balance are plain scoped queries with no union and no synthesised row. Spending totals exclude transfers with one predicate. A half-transfer cannot exist in the database, whatever writes to it — including a future importer, or a hand-run SQL statement at 1am.
- **Harder:** every transfer write must be one transaction, and the deferred constraint means a violation surfaces at `COMMIT`, not at the offending `INSERT` — the error message will point at the transaction, not the statement. The `api` agent must say in its outcome which constraint form it used and demonstrate a rejected bad pair, not assert it.
- **To watch:** editing. Delete-and-re-enter is acceptable for a prototype and irritating in a product; the first complaint about it is the signal to ticket an atomic two-leg editor, not to relax the constraints.
- **Unblocks:** [backlog 0001](../backlog/0001-api-ledger-foundation.md) phase 2, which was holding `transactions.transfer_id` pending this decision.
