# Backlog 0005: Design system — shadcn/ui on theme C ("Ấm")

**Status:** Done 2026-08-27 — Awaiting Owner (commit gate)  ·  **Priority:** High  ·  **Surfaces:** app  ·  **Opened:** 2026-08-26
**Epic:** Foundation — first usable expense tracker (phase 1.7)
**Decision:** [ADR 0005](../decisions/0005-design-system-shadcn-theme-c.md)

## Context / problem

`app` has a working core loop and no component vocabulary. Every control on it is bespoke Tailwind, and phases 5–6 of [0003](0003-app-ui-prototype-mock-data.md) plus all of [0004](0004-app-prototype-accounts-transfers-insight.md) are still to be built. The Owner directed on 2026-08-26: install and use shadcn, then build the design system from **theme C · Ấm**, the direction chosen in the design canvas that same day.

**Auto-persisted:** No — Owner directive, 2026-08-26. Rubric would say *ask* anyway (addition, new dependency).

**The override this ticket rides on is recorded, not assumed.** `CLAUDE.md` defers UI polish and points `app` work at an episode; ADR 0005 states the Owner's override and its price (`api`/0001 slips), and `CLAUDE.md` names it. Read the ADR before the first edit.

## Reference — theme C

- **Vendored, read this first:** [`decisions/assets/0005-theme-c-ledger.html`](../decisions/assets/0005-theme-c-ledger.html) — the chosen artboard, exact values. Notes: [`0005-canvas-notes.json`](../decisions/assets/0005-canvas-notes.json).
- Live canvas (all four directions incl. the rejected A and B): https://claude.ai/code/artifact/213ce0ba-1a16-4b02-9c63-12e997ab50a7

**Tokens, as measured from the artboard — not to be re-eyeballed:**

| Role | Value |
|---|---|
| Ground | `oklch(0.975 0.012 78)` — cream |
| Panel / raised | `oklch(0.995 0.004 78)` |
| Panel border | `oklch(0.915 0.012 78)` |
| Inset / chip ground | `oklch(0.955 0.012 78)` |
| Ink | `oklch(0.26 0.02 55)` |
| Ink muted | `oklch(0.55 0.015 60)` |
| Accent (ochre) — links, primary button, "chưa phân loại" | `oklch(0.48 0.1 68)`, hover `oklch(0.38 0.1 68)`, on-accent text `oklch(0.99 0.004 78)` |
| Outflow | `oklch(0.53 0.18 25)` |
| Inflow | `oklch(0.5 0.13 158)` |
| Category ramp (one hue, 5 steps) | `oklch(0.55 0.11 72)` → `0.65 0.09 72` → `0.74 0.07 72` → `0.83 0.05 72`; uncategorised is a **dashed** swatch, not a colour |

**Type:** Be Vietnam Pro 400/500/600/700. Numerals always `font-variant-numeric: tabular-nums`. Eyebrow = 11px/16, 600, uppercase, `0.1em` tracking, ink-muted. Radii: 16px panels, 10px ledger rows, 999px pills. Content column max 1040px.

## Goal & non-goals

- **Goal:** shadcn/ui installed and actually used; one token layer in `src/index.css` that both shadcn's variables and our own names resolve to; every existing screen wearing theme C.
- **Goal:** the vocabulary is reusable — phase 5 and 0004 pick components off the shelf.
- **Non-goal — the month band.** Theme C's summary band (spent / earned / difference / allocation bar) is **feature work belonging to [0004](0004-app-prototype-accounts-transfers-insight.md)**, as the canvas note itself says. Build the token layer it will use; do not build the band. When 0004 runs, it lands in theme C.
- **Non-goal — the `+` sign on aggregates.** The mockup shows `+10.977.000 ₫`. `formatAmount` does not emit `+` and must not learn to here — that is a money-contract change and Owner-gated. Render aggregates through the existing module unchanged.
- **Non-goal — dark mode.** Not enabled, not scaffolded, not left half-wired.
- **Non-goal — [bug 0001](../bugs/0001-ledger-filter-drops-keystrokes.md).** The filter's race is a separate open bug. Restyle `LedgerFilters` **without touching how its state is derived** — do not "fix it while in there", and do not make it harder to fix.
- **Non-goal:** phases 5–6 of 0003, and any new route.

## Plan (by phase)

1. **Phase 1 — install.** `shadcn` init against Tailwind v4 + React 19 (`components.json`, `cn()` util, `@/` path alias in `tsconfig` + `vite.config.ts`). Add only the primitives the current screens need — button, input, label, select, tabs or toggle-group, badge, card, separator, dropdown-menu — and say in the outcome which ones and why. Report the dependency delta.
2. **Phase 2 — the token layer.** Rewrite `src/index.css` to theme C. shadcn's variables (`--background`, `--foreground`, `--primary`, `--border`, `--muted-foreground`, `--ring`, …) must resolve to the same tokens the app names directly (`--color-outflow`, `--color-inflow`, …) — **one palette, defined once.** Load Be Vietnam Pro. Keep the existing token names that already work; do not rename `--color-outflow`/`--color-inflow`.
3. **Phase 3 — re-skin what exists**, in theme C, with no behaviour change: app shell + header (Coffer wordmark in accent, pill nav with the uncategorised count badge), auth screens, quick-entry row (direction toggle pill, oversized tabular amount, dashed "chưa phân loại" pill, ochre Lưu button, the hint line), ledger (day groups with a day subtotal on the right in outflow/inflow colour, 10px rows, alternating panel fill, category dot).
4. **Phase 4 — write the law down.** `../projects/app/documents/design-system.md`: tokens, the component vocabulary, and the rules that are not negotiable (tabular numerals on money, sign colour from direction, no raw hex). Also fix the **stale** `documents/architecture/01-overview.md` — its "Shape" line still omits the auth gate (owed since 0003 phase 2).

## Contract

Nothing crosses a surface here. The two contracts that constrain it are **the money contract** (`CLAUDE.md` → *The money contract*: `1.234 ₫`, U+00A0 before ₫, never a decimal digit, never a `+`, `0 ₫` neutral) and **entry speed**: quick entry stays 11 keystrokes with no mouse. A slower entry path is a regression, not a matter of taste.

## Verification bar

- Hooks already enforce no divide-by-100, no `toFixed`, and `tsc -b` on every edit — quote the result, don't re-run it as ritual.
- **Playwright, and nobody builds a driver.** Screenshot the ledger, the quick-entry row, and one auth screen at 1280px.
- Re-run the 11-keystroke quick-entry path **as real keystrokes** and state the count observed. At least one text input driven by real keystrokes, per the app agent's standing rule.
- Money spot-check through the real module in Node: `-50.000 ₫`, `0 ₫`, a ~10⁹ amount.

## PAUSED mid-flight — 2026-08-26, and where to pick it up

The Owner paused the session while the `app` agent was **inside phase 3**. The PM stopped the agent; its last action was writing the day-grouped ledger list. Nothing is committed — the whole change sits in the working tree (**19 files, +2474/−304, 27 entries in `git status`**).

**The tree is not broken.** `npx tsc -b --force` → exit 0 after the interruption. Verified by the PM, 2026-08-26.

**Landed already:**

- Phase 1 — shadcn installed. `components.json` (style `radix-nova`, lucide), `@/` alias in `tsconfig.json` + `tsconfig.app.json` + `vite.config.ts`, `src/lib/utils.ts`. Primitives so far: `button`, `input`, `label`, `badge`. Deps added: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`; `@playwright/test` as a devDependency.
- Phase 2 — `src/index.css` rewritten to theme C.
- Phase 3 — mostly done: `AppShell`, `AuthScreen`, `AuthError`, `LoginView`, `SignupView`, `QuickEntry`, `LedgerView`, `LedgerFilters`, `AmountCell`, `strings.ts`, `calendar-date.ts` all re-skinned. `TransactionTable.tsx` **deleted**, replaced by new `TransactionList.tsx` (day groups + day subtotal) plus `category-color.ts`. `e2e/theme-c.spec.ts` + `playwright.config.ts` written; `test-results/` is Playwright scratch and should not be committed.

**Owed when this resumes, in order:**

1. **Every piece of the verification bar** — none of it has been reported. Screenshots at 1280px, the real-keystroke count on quick entry, the Node money spot-check.
2. **Phase 4** — `app/documents/design-system.md`, and the stale "Shape" line in `documents/architecture/01-overview.md`.
3. **A PM re-check of the two fences.** Both look honoured on inspection: `LedgerFilters`'s `set()` is byte-identical (restyle and re-indent only — bug 0001 is untouched, and the component now carries a comment saying so), and no month band was built.

**One thing for the Owner, and it is the only change to a contract-bearing file:** `src/lib/money.ts` now **exports `CURRENCY_SYMBOL`** (previously module-private), so theme C's quick-entry row can set `₫` beside the amount box as a static adornment. Formatting behaviour is unchanged and `formatAmount` is still the only path for a rendered amount. It is a widening of the money module's surface that the ticket did not authorise in advance — accept it or have it reverted.

## Outcome — DONE 2026-08-27, all four phases

Built over two sessions: phases 1–3 on 2026-08-26 (interrupted by the Owner mid-phase-3, see the pause note above), finished 2026-08-27 after the resume.

- **Phase 1 — shadcn installed.** `components.json`, `src/lib/utils.ts` (`cn()`), `@` alias in `vite.config.ts` + both tsconfigs (`paths`-only — `tsc` v7 removed `baseUrl`). Primitives: **`button`, `input`, `label`, `badge`** — four, each with a named consumer. Deps: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, + `@playwright/test` (dev). Bundle 267.22 → **307.54 kB** JS, CSS flat at 30.76 kB.
  **Refused, with reasons that are worth keeping:** `Select` — a Radix listbox makes `Enter` open a popper instead of submitting, which costs keystrokes on the one path this product is measured by, so category/account stay native `<select>`. `Tabs`/`ToggleGroup` — the direction control is one `<button>`, one tab stop. `Card`/`Separator` — three of the four panels are `<form>`/`<fieldset>`, which a div-rendering `Card` cannot be; the panel is a CSS utility instead.
  **Also removed what the CLI added:** `shadcn`, `@fontsource-variable/geist`, `tw-animate-css` and the `@import "shadcn/tailwind.css"` line. ADR 0005 says vendored source, not a runtime dependency; the typeface is Be Vietnam Pro; and none of the four primitives referenced that stylesheet (read, not assumed — 629 unreferenced lines). `design-system.md` records how to re-add it.
- **Phase 2 — one token layer.** `src/index.css`, 195 lines. shadcn's variables are *assigned from* the app's palette and `@theme inline` maps the app's own names to the same values; `--color-outflow` / `--color-inflow` kept verbatim. **PM-verified:** `grep -rE '#[0-9a-fA-F]{3,8}|oklch\('` over every `.ts`/`.tsx` → **no matches**. Every colour lives in one file.
  **Dark mode is welded off, not scaffolded.** The single line `@custom-variant dark (&:is(.dark *))` redefines Tailwind's `dark:` to key off a `.dark` class the app never sets — without it, shadcn's `dark:` utilities would fire on `prefers-color-scheme` and half-theme the app for any viewer whose OS is dark. There is no `.dark` block anywhere.
- **Phase 3 — re-skin.** `AppShell`, `AuthScreen`, `AuthError`, `LoginView`, `SignupView`, `QuickEntry`, `LedgerView`, `LedgerFilters`, `AmountCell`, `calendar-date.ts` (`formatDayHeading`), `strings.ts`. **New** `TransactionList.tsx` (day groups + day subtotal) and `category-color.ts`; **deleted** `TransactionTable.tsx`.
- **Phase 4 — the law.** New `../projects/app/documents/design-system.md`: measured palette, type/radii/measure, the component vocabulary *including why `Select` and `ToggleGroup` are refused*, eight non-negotiable rules, the 11-keystroke acceptance test, and what theme C deliberately excludes (month band → 0004, dark mode, shortcut chips). `documents/architecture/01-overview.md` **edited, not overwritten** — the "Shape" line finally names the auth gate (owed since 0003 phase 2), and the other agent's same-day phase-2c entry is preserved.

### Evidence

**Build** — `tsc -b --force` clean, `vite build` `✓ 1949 modules transformed · ✓ built in 213ms`. **Re-run by the PM**, not relayed.

**Playwright** — `playwright.config.ts` + `e2e/theme-c.spec.ts`, `vite preview`, viewport 1280×900: **4 passed (4.7s)**. Screenshots at 1280: ledger (full + crop), quick entry before/after save, header, login.

- `data-result-count = 56`; first day group `2026-08-22` subtotal `105000` rendered `105.000 ₫`.
- **`+` audit: 105 rendered amounts checked, none carries a leading `+`.** The contract held through a re-skin whose own mockup showed one.
- Every day group's `data-day-count` equals its rendered row count.
- **Keystrokes observed: 11** — `3 0 0 0 0` · `Tab` · `C a f e` · `Enter`, delivered as **real key events**, no mouse. Caret starts in `#entry-amount` and returns there; rows 56 → 57; new row `Cafe | Chưa phân loại · Tiền mặt | -30.000 ₫`. **Entry speed did not regress, which was this ticket's acceptance test.**

**Money, Node against the real module — PM re-ran this independently:**

```
formatAmount(-50000)      "-50.000 ₫"        2d 35 30 2e 30 30 30 a0 20ab
formatAmount(0)           "0 ₫"              30 a0 20ab
formatAmount(1234567890)  "1.234.567.890 ₫"  ... 30 a0 20ab
parseAmount('12,34') -> DECIMAL_NOT_ALLOWED    parseAmount('1.2345') -> MALFORMED_GROUPING
```

U+00A0 (`a0`) before ₫ (`20ab`) on all three, no decimal digits, `0 ₫` neutral.

**Fences — PM-verified, not taken on trust:** `LedgerFilters.set()` is **byte-identical** in the diff (`onChange({ ...value, [key]: next })`) — bug 0001's line is untouched and its fix is not made harder. No month band. No new route. No `.dark` block.

### For the Owner

**1. `CURRENCY_SYMBOL` — the only widening of a contract-bearing file, and it is cheap to undo.** `src/lib/money.ts` now exports it; **one consumer**, `QuickEntry.tsx:301`, an `aria-hidden` `<span>` drawing the static `₫` beside the big amount input as the artboard does. The row can be built without it — the live preview line already states the currency through `formatAmount`. **Reverting costs 4 lines in one file, no behaviour change, no other consumer.** The alternative the agent correctly refused was string-surgery on `formatAmount` output, which is arithmetic on formatted money and banned outright.

**2. Playwright now lives in the surface** (`playwright.config.ts`, `e2e/theme-c.spec.ts`) rather than being run and deleted. The agent's reasoning: deleting a working loop guarantees the next agent rebuilds one, which is the 4.6-hour failure this workspace already paid for once. Delete both files if the surface should stay test-free; the evidence above stands either way.

**3. `skipCategory` copy shortened** `'Chưa phân loại (bỏ qua)'` → `'Chưa phân loại'` — it was the widest fixed element on the one-line row and forced a wrap. Meaning moved to the control's `title`. Revert-safe.

### Notes carried forward, none folded in silently

- **Bug 0001 did not reproduce** during the restyle: `zzz` at 40 ms/key into `#filter-q` came back `zzz`, in a run whose control passed. **One observation at one speed — not a diagnosis, and not a claim the bug is gone.** [Bug 0001](../bugs/0001-ledger-filter-drops-keystrokes.md) stays open, and this is now a third data point in a defect whose two observers already disagreed.
- The description placeholder clips slightly at 1280 (`ví dụ: Cà phê sán…`). The row's width budget went to the amount field, where clipped digits are the 100× risk. Typed text scrolls normally.
- `ledgerCopy.subtitle` is now unrendered — left in place, flagged as dead copy rather than deleted.
- `documents/coding-conventions.md` → Styling still says only "design tokens over literals" and does not point at `design-system.md`. Not folded in; a one-line follow-up.

### Harness delta — a real hole, and it is being fixed

**The `PostToolUse` hook matches `Write|Edit` only.** This environment instructs agents to edit through Bash under bypass-permissions — so **every Bash-driven edit silently skipped the money-contract and typecheck gate.** The agent compensated by invoking `.claude/hooks/post-edit-check.sh` by hand over all 14 changed files (exit 0 on each), which is precisely the "an agent remembering to do it" failure the hook exists to remove. The whole premise of commit `b0762bd` — *"build green is no longer something an agent proves; it is something an agent cannot avoid"* — had a door in it.

Fixed by the PM in the same change: see `.claude/settings.json` and `.claude/hooks/`.
