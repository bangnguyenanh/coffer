# Seed data — and why each awkward row is here

These three JSON files **are** the prototype's data. They are read once at
startup by `src/data/seed.ts` and held in React state by
`src/state/AppDataProvider.tsx`; there is no server, no mock layer, and no
persistence, so **a reload re-seeds from these files**. They are hand-editable on
purpose: reshaping a screen to see how it holds up should be a text edit, not a
code change.

**Read this before deleting a row.** These are not filler. Most of the odd-looking
rows exist to keep a specific failure mode visible, and a fixture set trimmed to
the tidy cases stops testing the things the prototype was built to test. This
file replaces the header comment that `fixtures.ts` carried before the data moved
to JSON — JSON has no comments, so the rationale lives here or nowhere.

## Files

| File | Rows | Type it is checked against |
|---|---|---|
| `accounts.json` | 4 | `Account` in `src/data/types.ts` |
| `categories.json` | 8 | `Category` |
| `transactions.json` | 56 | `Transaction` |

They are imported and type-checked at one place — `src/data/seed.ts`. A
malformed edit (a missing field, a misspelled key, `amount_minor` written as a
string) fails `tsc`, not the screen at runtime. The one exception is
`accounts.json`'s `kind`: TypeScript widens a JSON string literal, so an unknown
kind is caught by a runtime check in `seed.ts` that throws a named error, which
`src/main.tsx` renders onto the page instead of leaving a blank screen.

## The money contract these rows obey

Hub `CLAUDE.md` + [ADR 0003](../../../../../management/decisions/0003-currency-vnd-single-exponent-zero.md):
**VND, ISO exponent 0.** One integer unit of `amount_minor` is **one đồng**.

- A 30.000 ₫ coffee is `"amount_minor": 30000` — **not** `3000000`. There is no
  divide-by-100 in this product; importing the "cents" reflex is a 100× bug.
- **Sign is direction.** Outflow negative, inflow positive. Neither the account
  nor the category may imply it — that is why salary rows are positive by their
  own sign and not by being in `cat_salary`.
- `occurred_on` is a calendar date `YYYY-MM-DD`, never a timestamp.
- No per-row currency field, and no `balance` field on an account — a balance is
  derived from `opening_balance_minor` plus the account's transactions.

## The rows that must not be trimmed

Each of these was added to cover a case the happy path does not reach. Deleting
one silently removes the only coverage of the thing named in the right column.

| Row | What it is | What it exists to prove |
|---|---|---|
| `txn_047` | `amount_minor: 0` — a cancelled Grab ride refunded in full | **Zero is a real amount, not an empty one.** It must render `0 ₫` and must render **neutral** — zero has no direction, so it is neither the outflow nor the inflow colour. |
| `txn_033` | `amount_minor: -1250000000` (~10⁹ đồng), a flat deposit — and uncategorized | The **largest magnitude the formatter has to hold**. It must render `-1.250.000.000 ₫` in full, with no truncation, no exponent notation, and no layout break in the amount column. Doubles as a large uncategorized row. |
| `txn_017`, `txn_033`, `txn_052`, `txn_056` | `category_id: null` | **Uncategorized is a first-class state, not missing data.** These four back the `Chưa phân loại` chip, the `category_id=none` filter, and the phase-5 triage inbox. Four is deliberate: enough to batch-clear and still see the count change. |
| `acc_tpb_savings` | An account with **zero** transactions | The **empty-per-account path**. Filtering to it must produce the "no rows match this filter" state, which is a different state from "the ledger is empty" — two different nothings, and only this account exercises the first. |
| `txn_011`–`txn_013` (2026-06-05), `txn_048`–`txn_050` (2026-08-15), `txn_054`–`txn_056` (2026-08-22) | Three rows sharing one date, three times over | **Same-date ordering.** Date alone does not order these, so they prove the tiebreak (`id` descending) is applied and stable rather than falling back to whatever order storage returned. `txn_001`/`txn_002` and `txn_026`/`txn_027` are two-row pairs on the same day. |
| `txn_011`, `txn_026`, `txn_027`, `txn_043`, `txn_047`, `txn_056` | Positive amounts | **Inflows alongside outflows.** Salary, a project bonus, a zero refund, and a friend repaying a debt — inflows must not be a single monotonous case. |

Counts worth keeping stable, because the observed-behavior checks quote them:
**56 transactions unfiltered**, **4 uncategorized**, **0 for `acc_tpb_savings`**,
**9 matching the search `ca phe`** (diacritic-insensitive — it has to match
`Cà phê`).

## What is deliberately absent

- **No transfers between accounts.** The transfer model is an open decision
  (hub ticket 0004); inventing one in fixtures would pre-empt it.
- **No nested categories.** Categories are flat — nesting is unresolved in
  `decisions/CANDIDATES.md`.
- **No account balances.** Derived, never stored.
- **No user / credential row.** Accounts are created by the sign up screen into
  React state at runtime (hub ticket 0003 phase 2b), so a fresh load starts with
  **zero accounts** and a reload returns to that. Seeding a user here would make
  both auth screens unreachable in the state they are meant to be judged in — and
  it would put a password in a file the Owner hand-edits.

## Editing them

Amounts are realistic Vietnamese personal-finance magnitudes on purpose — the
prototype exists to find out whether the ledger and the money module hold up at
real numbers, so keep new rows plausible rather than round. One row per line
keeps a diff readable. After editing, run `npm run build`: the type check is the
first thing that will tell you a row is wrong.
