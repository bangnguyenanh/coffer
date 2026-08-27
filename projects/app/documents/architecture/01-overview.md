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

**The auth gate is part of the shape, not a detail inside a view.** Every route in `src/App.tsx` sits inside an `AuthGate` — `/login` and `/signup` in the anonymous branch, everything else in the authenticated one — so "which screen may render at all" is answered by the tree before a view is reached, and no view checks it for itself. The shell (`src/AppShell.tsx`) is mounted inside the authenticated branch, which is why it may assume somebody is signed in.

A typed API client returns as the single place `fetch` appears when the `api` surface lands; until then, a component reaching for `fetch` is a bug — there is nothing on the other end of it.

The route gate (`src/auth/AuthGate.tsx`) decides what renders by reading auth status out of **React state**, not a session or a token. Because that state is known synchronously there is no round trip to wait on and no interstitial to render.

- **Views** are routes; they compose features and own layout, not logic.
- **Features** (transaction entry, ledger, reports) own their local state and their formatting.
- **Shared state** lives in `src/state/` — React context plus `useState`, and deliberately nothing else: no store module, no repository, no service layer. Its types (`src/data/types.ts`) mirror the **data**, not a transport — no collection envelope, no error body, no query-param types. Field names stay the product's names (`amount_minor`, `occurred_on`, `account_id`), which outlive whatever way the data happens to arrive.

## State

- Local component state by default. A shared store only where state is genuinely cross-cutting. **Today exactly two things are, and both are settled — don't re-litigate them:** **the auth state** (`src/auth/`) — the **accounts list plus the current-user id**, from which the gate's `status` is derived — which every route gate reads, and the **transaction list** (`src/state/`), because entry speed is this product's stated feature and a transaction entered has to appear in the ledger *during the session* — per-route state makes the new row vanish on navigation (hub ticket 0003, Owner directive 2026-08-25). A third one still needs a demonstrated second consumer.
- **More than one account may exist in a session, each with its own credentials, and that is deliberate.** Sign up appends to the accounts list and login searches it; a duplicate address is rejected (`email_taken`), a second *account* is ordinary. This is [ADR 0004](../../../../management/decisions/0004-multi-user-tenant-scoped-from-day-one.md), not a mocking convenience — do not reduce the list to a single owner, and do not re-introduce a first-run/provisioning state to cap it.
- **The app's data is held in React state at the top of the tree, seeded from JSON at boot, and a reload re-seeds it deliberately.** The rule that stood here — never duplicate server data into component state where it can drift against the API-client cache — is **suspended pending the `api` surface, not repealed**: there is no server and no cache for anything to drift against, so as written it forbade the architecture the Owner chose. It returns unchanged the moment a real API lands, and `src/state/` is where that cache will attach.

## Money display — the client's half of the contract

The API sends `amount_minor` as a signed integer. This surface is responsible for turning that into something a human reads, and for turning what a human types back into an integer.

**The currency is VND and its exponent is 0** (ADR 0003 in the hub). One integer unit is **one đồng** — `1234` is ₫1.234. **There is no `/ 100` in this product, in any module.** Importing the "cents" reflex from other currencies is a 100× bug.

- **Formatting is centralized.** One module converts minor units to a display string; no component formats on its own. Output follows `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` — `1.234 ₫`, dot grouping thousands, ₫ suffixed, **never** decimal digits.
- **Never do arithmetic on formatted strings**, and never round for display in a way that changes a stored value.
- **Sign is shown, not assumed.** An outflow reads as an outflow (colour and sign), and the same amount never renders positive in one view and negative in another.
- **Input parsing is strict — and `.` is the *thousands* separator here.** `30.000` is thirty thousand đồng, and `12.345` is twelve thousand three hundred forty-five — both **valid**. What gets rejected, with a visible reason, is a decimal separator used as a decimal, a fractional amount, or malformed input. Never coerce, round, or truncate.

## Entry speed

Transaction entry is the screen that decides whether this tool survives. Keyboard-first, no modal that costs a click to open, sane defaults (today's date, last-used account). Treat a regression in entry speed as a bug, not a polish item.

## Styling

Tailwind utilities; shared design tokens over ad-hoc values. No inline magic numbers where a token exists.

**The tokens, the component vocabulary and the rules that are not negotiable live in [`documents/design-system.md`](../design-system.md)** (hub ADR 0005: shadcn/ui on theme C · "Ấm"). Read it before adding a screen. Two of its rules are the ones that break things quietly if ignored: money is always tabular-numeral and always rendered through `src/lib/money.ts`, and a colour literal outside `src/index.css` is a bug.

*Last updated: 2026-08-27 (ticket 0005: the "Shape" line named no auth gate — corrected, with the gate placed in the tree where it actually sits; Styling now points at the new `design-system.md`. Earlier the same day: the "reload re-seeds to zero accounts" line was made false by hub ticket 0003 phase 2c — one prototype-fixture account is now seeded and the login form is prefilled with it; recorded together with what it deliberately does not change: no persistence, no auto-sign-in, no special case in the provider) — keep this stamp current in the same edit that changes content.*
