# Backlog 0007: Carry the gạch bông ground into the signed-in app

**Status:** Closed — commit gate cleared 2026-08-29, committed as `ba7ffdc`
**Priority:** Medium
**Surfaces:** app
**Opened:** 2026-08-28
**Reported by:** Owner

## Context

[0006](0006-app-login-screen-staging.md) put the gạch bông tile behind the auth
screens. The Owner wants the same texture on every screen after login, so the
walkthrough does not cross a visual seam the moment it signs in.

**Auto-persisted:** No — Owner directed it in session, 2026-08-28.

## Goal & non-goals

- **Goal:** one ground, used by both halves of the app, that reads as texture on
  a dense ledger and never fights the content sitting on it.
- **Non-goal — re-skinning anything.** No new colours, no spacing changes, no
  component restyling. The ground goes behind what already exists.
- **Non-goal — a second copy of the motif.** One component, two consumers.

## Plan

- **`app`, one phase.**

  **1. Promote the component.** `src/auth/GachBongGround.tsx` →
  `src/components/`. `documents/coding-conventions.md` promotes a shared piece
  *once a second consumer actually exists* — that is now true, and this is the
  promotion, not a speculative one. Update the header comment: it currently
  explains itself as an auth-screen decoration.

  **2. Mount it in `AppShell`.** The shell's root has no stacking context —
  `min-h-screen bg-surface text-ink`, no `relative isolate`. `-z-10` needs one,
  or the tile lands in the wrong layer. Add it at the root the same way
  `AuthScreen`'s `<main>` does.

  **3. Tune the opacity for a dense screen — this is the real work.** `text-brand/5`
  was tuned behind a single card on an otherwise empty page. The ledger is rows,
  panels, a month band, category colours and the `--uncat-hatch` texture, all at
  once. Judge it on `/ledger` with the seeded data, not on the dashboard, and
  expect to go lighter than 5%. If login and the shell genuinely want different
  values, take a prop with the login value as the default — do not fork the file.

  **4. Confirm panels stay opaque.** Rows and cards must not let the tile show
  through and muddy the text. If `--panel` is not fully opaque, say so and stop
  rather than patching per-component.

## Traps, named so they are not rediscovered

- **`PATTERN_ID` is a hardcoded SVG `id`,** justified in the file by *"only one
  auth screen is ever mounted, so it cannot collide."* That sentence is about to
  be false as written. Auth and the shell are still mutually exclusive branches
  of the route tree, so one element mounts at a time — but either re-justify it
  for the new arrangement or switch to `useId()`. Do not leave a stale comment
  asserting a condition that no longer holds.
- **Scroll behaviour is a decision, not a detail.** Login never scrolls; the
  ledger does. `absolute` scrolls the tile with the content, `fixed` holds it
  still. Pick one deliberately and say why.
- Keep every guarantee 0006 established: `aria-hidden`, `focusable="false"`,
  `pointer-events-none`, no colour literal, no network fetch. Nothing in the
  shell may become focusable or intercept a click.
- `data-*` hooks the e2e suite keys off are untouchable.

## Evidence bar

- `npm run build` green.
- `npx playwright test` — full count, baseline is 45. No new failures.
- Screenshots at 1280x900 of **`/`, `/ledger`, `/accounts`, `/categories`,
  `/triage`** — `/ledger` is the one that decides whether the opacity is right.
- One sentence on the scroll decision and the final opacity, with the reason.

## Outcome

**Done 2026-08-28.** **Committed 2026-08-29 as `ba7ffdc`** — the Owner cleared the gate.

- **Files changed:** `src/components/GachBongGround.tsx` (promoted from
  `src/auth/`, gained a `density` prop, `useId()`, `[overflow-anchor:none]`),
  `src/AppShell.tsx:53`, `src/auth/AuthScreen.tsx` (import path only),
  `e2e/0007-ground-app-shell.spec.ts` (new, 2 specs),
  `documents/design-system.md` §4c.
- **Verified:** `npm run build` green; `npx playwright test` **47 passed / 0
  failed** (45 baseline + 2 new). **PM re-ran both independently** — same result.
- **Evidence:** `e2e-shots/0007-{dashboard,ledger,accounts,categories,triage}-1280x900.png`.
  PM checked `/ledger` by eye: motif reads in the gutters, panels opaque, rows clean.
- **No re-skin:** `git diff --stat` empty for `src/routes/`, `src/lib/`,
  `src/index.css`, `src/copy/strings.ts`, and every `auth/` module but `AuthScreen`.

**The regression this ticket found and fixed.** Mounting the ground broke
`phase4-edit-delete.spec.ts` — *"a saved edit keeps the row where the reader was
looking"* — failing by exactly 24px, and by a **different count each run**, which
reads as flake. It was not. The ground is `absolute inset-0` on a container as
tall as the whole scrollable document, so Chromium's native **scroll anchoring
picked the decoration as its anchor**; a re-sorted row changes document height,
the browser "corrected" scroll to hold the tile still, and that fought
`src/lib/row-anchor.ts`, which was already holding the right row. Established by
controlled A/B across three builds — no ground 12/12 green, ground 3/6 red always
by 24px, ground + `overflow-anchor: none` 8/8 green — not by re-running until it
passed. Recorded in the component and in §4c.

**Decisions, standing unless the Owner says otherwise**

1. **`absolute`, not `fixed`.** It sizes to the parent's scroll height (4932px
   observed on `/ledger`), so a long ledger never runs off the texture onto bare
   cream — and it renders correctly in the `fullPage` screenshots this workspace
   uses as evidence, where a `fixed` layer paints one viewport and leaves the
   rest flat. At these opacities the slide-vs-hold difference is imperceptible,
   so coverage and honest evidence were the deciding criteria.
2. **3% in the shell, 5% on auth**, via one `density` prop — one component, not a
   fork. A/B'd, not assumed: 5% competes with the ledger, and 2% dissolves the
   motif into formless warm noise, which reintroduces the seam in the other
   direction. 3% keeps it legible as a tile in the gutters and never touches content.
3. `PATTERN_ID` is gone — `useId()` replaces it, so no comment asserts a
   route-tree invariant that nothing enforces.

**Panels confirmed opaque:** `--panel` is `oklch(0.995 0.004 78)`, no alpha,
asserted from computed style on all five screens.

**Harness delta — two, both worth keeping.**

1. **A failure whose count changes between runs is not automatically flake.** The
   discriminator is a controlled A/B across builds; it took three builds and 6–8
   runs each to get a real answer.
2. **Any full-bleed decorative layer on a scrolling surface needs
   `overflow-anchor: none`.** The symptom is a scroll-position test failing
   intermittently by a small constant, nowhere near the code that changed.
