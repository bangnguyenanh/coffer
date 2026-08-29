# Backlog 0006: Login screen — gạch bông ground and the receipt panel

**Status:** Closed — commit gate cleared 2026-08-29, committed as `3a5045d`
**Priority:** Medium
**Surfaces:** app
**Opened:** 2026-08-28
**Reported by:** Owner

## Context

The login screen is the opening shot of the next recording — the Owner starts
there, signs in, and walks the prototype. Today it is a plain card centred on
flat cream: correct, and forgettable on camera. This ticket dresses the **frame
around the form**, not the form.

The Owner picked two of five directions offered on 2026-08-28:

- **(2) A gạch bông ground** — a Vietnamese encaustic-tile motif behind everything.
- **(3) A receipt panel** — a paper-receipt slab beside the form.

**Auto-persisted:** No — Owner directed it in session, and chose the direction.

## Goal & non-goals

- **Goal:** the login screen reads as a warm Vietnamese expense book at a glance,
  and holds up as the first frame of a recording.
- **Non-goal — the form itself.** Fields, labels, button, error rendering, the
  cross-link, and every `auth/` module stay exactly as they are. Episode 2
  rewrites the auth internals; this ticket must not make that rewrite harder.
- **Non-goal — the other screens.** If the walkthrough later wants dashboard or
  ledger staging, that is a separate ticket. This one does not grow.
- **Non-goal — a second data source.** The receipt is decorative, static, and
  invisible to assistive tech.

## Plan

- **`app`, one phase.**

  **1. The gạch bông ground.** An SVG tile of a Vietnamese encaustic-tile motif,
  repeated as the page background under both auth screens, in ochre on cream at
  very low opacity (start ~4%, tune by eye — it must read as texture, not as
  pattern competing with the card). Tokens, not literals: the motif's colour
  comes from `--brand` / `--ground`, so it moves if the theme does. Inline or
  local asset — no network fetch.

  **2. The receipt panel.** `AuthScreen` grows a split layout: the form card
  keeps its current place and size, and a paper-receipt slab sits beside it —
  torn/zigzag bottom edge, mono type, faint horizontal rules, four transaction
  lines and a total. Sample lines, formatted through `lib/money.ts` like
  everything else:

  | Line | `amount_minor` |
  |---|---|
  | Cà phê | `-45000` |
  | Đi chợ | `-320000` |
  | Tiền nhà | `-1200000` |
  | Lương | `+18000000` |

  The panel is a `const` in the component — **not** wired to `state/` or
  `data/*.json`, and never a second seed. `aria-hidden` and
  `pointer-events-none`.

  **3. The wordmark.** Owner directive, added 2026-08-28 mid-execution: the
  `Coffer` wordmark carries no weight today — 21px sitting quietly above the
  title. Make it the anchor of the screen. Bigger and bolder is the direction,
  not the specification: target roughly **40–48px**, heaviest weight the type
  stack gives, tighter tracking as it scales up, still `--brand` ochre. **Tune it
  by eye against the receipt panel and the tile ground** — the three land
  together and the wordmark has to win without shouting over the form. Same
  treatment on signup, since `AuthScreen` owns it. `appCopy.name` stays the
  source of the string; consider pairing it with `appCopy.tagline` ("Sổ chi tiêu
  cá nhân"), which already exists and is currently unused here — your call, say
  which you chose.

  **4. Narrow viewports.** Below the split's breakpoint the receipt drops out
  entirely and the screen returns to today's centred card. The form is never the
  thing that shrinks.

## Constraints — read before touching anything

- **`data-view="login"` / `data-view="signup"` and `data-status="ready"` must
  survive.** Ten e2e specs key off these. `npx playwright test` stays green —
  report the count.
- **Signup shares `AuthScreen`.** Whatever the split does, both screens must
  still render correctly. Decide deliberately whether the receipt shows on
  signup too, and say which you chose and why.
- Copy goes in `copy/strings.ts`; amounts go through `lib/money.ts`. No `₫`
  typed inline, no `/ 100`, no `toFixed(2)`.
- Tokens over literals (`documents/coding-conventions.md` → Styling).
- Do not touch `auth/useAuth.ts`, `auth/AuthProvider.tsx`, `auth/AuthContext.ts`,
  `auth/prototype-account.ts`, or the prefill in `LoginView.tsx`.
- If any of this collides with `documents/`, **stop and flag it** — don't improvise.

## Evidence bar

The prototype track's exception applies: green build plus demonstrated behaviour.

- `npm run build` green.
- `npx playwright test` — full count, no new failures.
- **A screenshot of `/login` at 1280x900**, and one at a narrow viewport showing
  the receipt correctly absent.
- One line confirming the form still rejects a wrong password.

## Outcome

**Done 2026-08-28.** All four steps. **Committed 2026-08-29 as `3a5045d`** — the Owner cleared the gate. The doc call below is still open and now tracked in [CANDIDATES](../decisions/CANDIDATES.md).

- **Files changed:** `src/auth/GachBongGround.tsx` (new), `src/auth/ReceiptPanel.tsx`
  (new), `src/auth/AuthScreen.tsx:37-100` (layout) and `:91-97` (wordmark),
  `src/copy/strings.ts:313`, `src/index.css:108` (`--font-receipt`) and `:200`
  (`@utility receipt-torn`), `e2e/0006-login-staging.spec.ts` (new, 4 specs),
  `documents/design-system.md` §4b.
- **Verified:** `npm run build` green. `npx playwright test` **45 passed / 0
  failed** (baseline 41 + 4 new). PM re-verified the wordmark in the shipped
  screenshot, after the first agent report claimed the ticket done with the
  wordmark step untouched.
- **Evidence:** `e2e-shots/0006-login-1280x900.png`,
  `0006-signup-1280x900.png`, `0006-login-narrow-480x900.png`,
  `0006-login-wrong-password-1280x900.png`. Amounts observed, not asserted from
  memory: `-45000 → -45.000 ₫`, `-320000 → -320.000 ₫`, `-1200000 → -1.200.000 ₫`,
  `18000000 → 18.000.000 ₫` with no `+`, total `16435000 → 16.435.000 ₫`.
  Wrong password still renders `[data-auth-error="invalid_credentials"]` from
  real key events, screen still `[data-view="login"][data-status="ready"]`.
- **Boundary held:** `git diff --stat` empty for `useAuth.ts`, `AuthProvider.tsx`,
  `AuthContext.ts`, `prototype-account.ts`, `AuthError.tsx`, `AuthGate.tsx`,
  `LoginView.tsx`, `SignupView.tsx`, `money.ts`, `AppShell.tsx`. Episode 2's
  auth rewrite is untouched by this ticket.

**Decisions the agent made, standing unless the Owner says otherwise**

1. Receipt on `/login` only — a filled expense book is a fiction beside "create
   an account". Gạch bông ground on both screens.
2. `AuthScreen` branches on `view` instead of taking an `aside` prop, which is
   what keeps `LoginView`/`SignupView` byte-identical.
3. Wordmark at **44px / 700 / `tracking-[-0.035em]`**, title spacing `mt-6 → mt-8`.
   700 is the ceiling: `index.css` requests Be Vietnam Pro at 400;500;600;700, so
   heavier would be a synthesised faux weight. Real 800 costs two lines plus a
   second font file — Owner's call.
4. No tagline under the wordmark; the login subtitle already says "Mở sổ chi
   tiêu của bạn."
5. The app shell's wordmark stays 21px — deliberately different from the opening
   frame, and written into §4b so it does not get "fixed" back.

**Harness delta:** `data-wordmark` + computed-style measurement turns a visual
claim into logged numbers. Worth repeating for any future "make it look like X"
ticket — it is what let the PM catch a claimed-done step that had not happened.

**Open, needs the Owner:** `documents/coding-conventions.md` §Tests scopes the
no-unit-test exception to hub tickets 0002/0003/0004 and says it expires with
them. 0006 invoked it anyway. Either name 0006, or restate it as a standing
prototype-track rule.
