# Architecture — overview

How the finance web client is built. The owning agent reads this before any structural call.

## The prototype's boundary — no network, no persistence, by design

**This surface has no API client, no `fetch`, and no storage of any kind.** Hub ticket 0003, Owner directive 2026-08-25. The mock network layer that used to sit here (MSW, the service worker, `api/client.ts`) was **deleted, not paused** — the Owner asked for click-through UI to shape UX, not a fake server. Screens import JSON from `src/data/` and hold it in React state.

Two consequences a future agent must **not** "fix":

- **A reload re-seeds from the JSON and loses whatever was entered in the session.** That is the accepted trade, deliberately chosen — not a bug to be closed with `localStorage`. There is no persistence, no backup, no server.
- **The auth state is a list of accounts plus a current-user id.** `src/auth/AuthProvider.tsx` holds `accounts: readonly User[]` and `currentUserId: string | null` in React state, with a **per-account credential map** in a `useRef` compared with `===`. `status` is *derived* (`currentUserId === null ? 'anonymous' : 'authenticated'`), not stored — there is no boolean flag to flip, and re-introducing one would delete the multi-account model described below. No session, no token, no credential leaves the browser (hub 0003 non-goal: "real authentication"). The screens are real; nothing sits behind them.

### Many accounts is the product's law, not a mocking artifact — [ADR 0004](../../../../management/decisions/0004-multi-user-tenant-scoped-from-day-one.md)

**Read this before touching anything under `src/auth/`.** Coffer is a **multi-user product by accepted ADR** (`management/decisions/0004-multi-user-tenant-scoped-from-day-one.md`, Accepted 2026-08-25). `CLAUDE.md`'s old *"single user, no multi-tenancy"* constraint is **gone**, replaced by *"every row belongs to a user, from the first migration"*. So an auth surface where **any number of accounts may be created, each with its own credentials**, is what the product's settled direction requires. It is not a prototype shortcut, and **collapsing it back to one owner is a regression, not a cleanup.**

**What ADR 0004 does *not* change: this surface's boundary, above.** It is a *data-model* decision, binding on `api` — `user_id` on every table, every query scoped. It buys the client nothing at runtime. Concretely, all of the following still hold and must not be "fixed" in the ADR's name:

- **Still no network, no persistence, no hashing here.** ADR 0004 explicitly does not put the product on the internet; real auth (hashing, session storage, transport, TLS) arrives with the hosting decision and an `ops` gate.
- **A reload re-seeds to exactly *one* account, and it is a fixture** — `src/auth/prototype-account.ts` (Owner directive 2026-08-27), seeded so the Owner stops signing up before every look at a screen. Anything signed up during a session is still gone on refresh: accounts are session state and are not in `src/data/`. **Seeding is not persistence and is not a step towards it** — that file is deleted in episode 2, when a real `api` brings bcrypt and a database. "Multi-user is now official" is still **not** a reason to reach for `localStorage`; that is the wrong inference and the easiest one to draw.
- **The seeded account is an ordinary account.** It goes into the same list and the same password map sign up writes to, and no code branches on it — signing up again on its address fails `email_taken` like any other duplicate. A fresh load is still `anonymous` and still lands on the login screen; the fields are **prefilled, never bypassed**.
- The ADR also buys no organizations, teams, roles, sharing, invitations, or admin surface. The unit is a person.

Rules elsewhere in this file that describe an API are marked **suspended pending the `api` surface**. They are not wrong and they are not deleted — they simply have no referent yet, and they return with a real backend.

## Shape

`routes → auth gate → routed views → feature components → shared React state → JSON fixtures in src/data/`.

**Four authenticated routes now**: the ledger (`/`, the landing route until ticket 0004 phase 5 moves it), the accounts screen (`/accounts`), one account's own ledger (`/accounts/:accountId`), and the uncategorised inbox (`/triage`).

**`/accounts` also owns transfer entry**, and that is a placement decision rather than an accident: a transfer is a question about accounts, so the two balances it moves are on the same screen as the action — and putting a source/destination mode on the ledger's quick-entry row would have added a tab stop to the measured 11-keystroke entry path, which `design-system.md` §4 treats as a regression needing the Owner. `/triage` is a route rather than a filtered ledger because it is a different job with a different keyboard model — the ledger reads and corrects one row at a time, the inbox assigns a category to many at once. `?category_id=none` on the ledger still answers *which* rows are uncategorised; `/triage` is how they get cleared.

**The auth gate is part of the shape, not a detail inside a view.** Every route in `src/App.tsx` sits inside an `AuthGate` — `/login` and `/signup` in the anonymous branch, everything else in the authenticated one — so "which screen may render at all" is answered by the tree before a view is reached, and no view checks it for itself. The shell (`src/AppShell.tsx`) is mounted inside the authenticated branch, which is why it may assume somebody is signed in.

A typed API client returns as the single place `fetch` appears when the `api` surface lands; until then, a component reaching for `fetch` is a bug — there is nothing on the other end of it.

The route gate (`src/auth/AuthGate.tsx`) decides what renders by reading auth status out of **React state**, not a session or a token. Because that state is known synchronously there is no round trip to wait on and no interstitial to render.

- **Views** are routes; they compose features and own layout, not logic.
- **Features** (transaction entry, ledger, reports) own their local state and their formatting.
- **Shared state** lives in `src/state/` — React context plus `useState`, and deliberately nothing else: no store module, no repository, no service layer. Its types (`src/data/types.ts`) mirror the **data**, not a transport — no collection envelope, no error body, no query-param types. Field names stay the product's names (`amount_minor`, `occurred_on`, `account_id`), which outlive whatever way the data happens to arrive.

## State

- Local component state by default. A shared store only where state is genuinely cross-cutting. **Today exactly two things are, and both are settled — don't re-litigate them:** **the auth state** (`src/auth/`) — the **accounts list plus the current-user id**, from which the gate's `status` is derived — which every route gate reads, and the **transaction list** (`src/state/`), because entry speed is this product's stated feature and a transaction entered has to appear in the ledger *during the session* — per-route state makes the new row vanish on navigation (hub ticket 0003, Owner directive 2026-08-25). A third one still needs a demonstrated second consumer.
- **More than one account may exist in a session, each with its own credentials, and that is deliberate.** Sign up appends to the accounts list and login searches it; a duplicate address is rejected (`email_taken`), a second *account* is ordinary. This is [ADR 0004](../../../../management/decisions/0004-multi-user-tenant-scoped-from-day-one.md), not a mocking convenience — do not reduce the list to a single owner, and do not re-introduce a first-run/provisioning state to cap it.
- **`src/state/` is the only writer of the app's data.** For transactions: `addTransaction`, `addTransfer`, `updateTransaction`, `assignCategories` (batch), `removeTransaction` and `restoreTransactions` (hub tickets 0003 phases 4–5 and 0004 phase 2). For accounts, writable since ticket 0004 phase 1: `addAccount`, `updateAccount` and `setAccountArchived` — **and deliberately no delete**, because an account with transactions cannot be removed without orphaning history. Three properties are load-bearing and must not be "simplified" away: every mutator **replaces** rather than mutates, so removed rows can be handed to the caller and put back byte-for-byte; `updateTransaction`/`removeTransaction`/`setAccountArchived` read from **render scope**, not from inside a `setState` updater — React does not promise a functional updater runs synchronously, so a return value smuggled out of one is sometimes `null`; and **`removeTransaction` returns a LIST**, because deleting one leg of a transfer deletes both. **Deleted rows are not retained here.** This state is the ledger, not a wastebasket: undo works because the *view* holds the removed rows while its undo bar is up.
- **A transfer is one mutator, not two adds.** `addTransfer` mints the `transfer_id` and appends both legs in a single update. Two `addTransaction` calls would be two renders and, worse, a window in which HALF a transfer exists — money taken out of one account and not yet put into the other. The pair invariant lives in the state, not in its callers, because a caller that has to remember it is a caller that will one day forget. **The shape is provisional** and the ADR is open (hub `decisions/CANDIDATES.md`): linked pair versus a single row with a counter-account column.
- **The app's data is held in React state at the top of the tree, seeded from JSON at boot, and a reload re-seeds it deliberately.** The rule that stood here — never duplicate server data into component state where it can drift against the API-client cache — is **suspended pending the `api` surface, not repealed**: there is no server and no cache for anything to drift against, so as written it forbade the architecture the Owner chose. It returns unchanged the moment a real API lands, and `src/state/` is where that cache will attach.

## Money display — the client's half of the contract

The API sends `amount_minor` as a signed integer. This surface is responsible for turning that into something a human reads, and for turning what a human types back into an integer.

**The currency is VND and its exponent is 0** (ADR 0003 in the hub). One integer unit is **one đồng** — `1234` is ₫1.234. **There is no `/ 100` in this product, in any module.** Importing the "cents" reflex from other currencies is a 100× bug.

- **Formatting is centralized.** One module converts minor units to a display string; no component formats on its own. Output follows `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` — `1.234 ₫`, dot grouping thousands, ₫ suffixed, **never** decimal digits.
- **Never do arithmetic on formatted strings**, and never round for display in a way that changes a stored value.
- **A balance is DERIVED, never stored** — `opening_balance_minor` plus that account's transactions, on every render (`src/lib/account-balance.ts`). Hub ticket 0001 makes a cached balance column an explicit non-goal, here and in the eventual API. A stored balance is a second copy of a number the ledger already answers, and the day the two disagree there is no way for a reader to tell which one is lying.
- **A transfer is not spending.** A transaction carrying a `transfer_id` is excluded from every spending total, every category breakdown, the uncategorised count and the triage inbox. Balances are the deliberate exception — the money genuinely moved. One implementation, `src/lib/transfers.ts`; nothing re-derives the rule inline.
- **Sign is shown, not assumed.** An outflow reads as an outflow (colour and sign), and the same amount never renders positive in one view and negative in another.
- **Input parsing is strict — and `.` is the *thousands* separator here.** `30.000` is thirty thousand đồng, and `12.345` is twelve thousand three hundred forty-five — both **valid**. What gets rejected, with a visible reason, is a decimal separator used as a decimal, a fractional amount, or malformed input. Never coerce, round, or truncate.

## Entry speed

Transaction entry is the screen that decides whether this tool survives. Keyboard-first, no modal that costs a click to open, sane defaults (today's date, last-used account). Treat a regression in entry speed as a bug, not a polish item.

**This extends to correcting and triaging, not just entering.** Quick entry and the inline row editor are **the same form** — one `EntryFields`, one `draftToTransaction` — so a rejection rule cannot hold on entry and lapse on edit, and the tab order cannot drift between them. The measured keyboard paths for entry, edit, delete and triage live in [`design-system.md` §4](../design-system.md); they are the acceptance test, and a change that lengthens one of them needs the Owner.

## Styling

Tailwind utilities; shared design tokens over ad-hoc values. No inline magic numbers where a token exists.

**The tokens, the component vocabulary and the rules that are not negotiable live in [`documents/design-system.md`](../design-system.md)** (hub ADR 0005: shadcn/ui on theme C · "Ấm"). Read it before adding a screen. Two of its rules are the ones that break things quietly if ignored: money is always tabular-numeral and always rendered through `src/lib/money.ts`, and a colour literal outside `src/index.css` is a bug.

*Last updated: 2026-08-27 (hub ticket 0004 phases 1–2: `/accounts` and `/accounts/:accountId` added to the Shape along with why transfer entry lives there; the mutator list now covers accounts and the transfer pair, and `removeTransaction` returns a list; the money section gained the derived-balance and transfer-exclusion rules. Earlier the same day — hub ticket 0003 phases 4–5: `/triage` added to the Shape; the shared state's five mutators and the two properties that make undo exact; Entry speed now covers editing and triage. Earlier the same day — ticket 0005: the "Shape" line named no auth gate — corrected, with the gate placed in the tree where it actually sits; Styling now points at the new `design-system.md`. Earlier the same day: the "reload re-seeds to zero accounts" line was made false by hub ticket 0003 phase 2c — one prototype-fixture account is now seeded and the login form is prefilled with it; recorded together with what it deliberately does not change: no persistence, no auto-sign-in, no special case in the provider) — keep this stamp current in the same edit that changes content.*
