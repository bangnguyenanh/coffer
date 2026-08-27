# ADR 0005: shadcn/ui is the component substrate, and theme C ("Ấm") is the app's visual law

**Status:** Accepted
**Date:** 2026-08-26
**Owner:** Kevin

## Context

`app` reached phase 4 of [backlog 0003](../backlog/0003-app-ui-prototype-mock-data.md) with a working core loop — auth, ledger, filters, quick entry — built out of hand-written Tailwind. There are no primitives: every select, pill, badge and focus ring is bespoke, and phases 5–6 plus [0004](../backlog/0004-app-prototype-accounts-transfers-insight.md) add most of the surface area still to come. Each new screen re-invents the same six controls.

Four ledger directions were drawn as a design canvas — *Coffer — Màn hình Sổ cái* — against real numbers from `src/data/*.json`: the current build as a baseline, plus **A · Sổ tay**, **B · Bàn phím**, and **C · Ấm**. The Owner chose **C** on 2026-08-26, and the canvas records why the other two lost: A dropped the product's identity colour and stopped making inputs look like inputs; B is dark-mode-first, which would have decided dark mode — an Owner call nobody has made — as a side effect of picking a look.

**This runs against a constraint in `CLAUDE.md`, deliberately.** Episode 1 told viewers on camera *"don't rush to polish the UI"* (`61:16`) and *"layout and design come last"* (`72:20`), and episode 2's subject is the `api` surface, which is still an empty folder. The Owner has weighed that and directed UI completion first. This ADR exists so that override is a recorded decision with a scope, not a drift — and `CLAUDE.md`'s scoping paragraph is amended in the same change to name it, so the next agent that reads the law is not contradicted by it.

## Decision

1. **shadcn/ui is the component substrate for `app`** — vendored into `src/components/ui/`, on Tailwind v4 and React 19. Not a runtime dependency to be upgraded; source we own and may edit.
2. **Theme C ("Ấm") is the visual law**: Be Vietnam Pro, a cream ground (`oklch(0.975 0.012 78)`), one ochre accent (`oklch(0.48 0.1 68)`), and the existing outflow/inflow pair carried forward. Its tokens live in `src/index.css` as the single token layer — shadcn's variable names resolve to them, so there is one palette, not two.
3. **Light only.** Dark mode remains an unmade Owner decision; this ADR does not make it, and no agent turns it on.

## Alternatives considered

- **Keep hand-rolling Tailwind components.** Why not: the cost is paid per screen, and most screens are still unbuilt. Rejected on timing, not taste.
- **Radix primitives directly, no shadcn.** Same accessibility floor, but every component still has to be written and styled here. shadcn is that work, already done, in a form we can edit.
- **Direction A · Sổ tay** — dense, typographic, rules instead of cards. Rejected: inputs stopped reading as inputs and the product lost its identity colour. Its day-subtotal idea was kept and folded into C.
- **Direction B · Bàn phím** — dark, left rail, command-line entry, shortcut chips on every affordance. Rejected: choosing it would have silently decided dark mode. Its shortcut-chip and status-bar ideas are worth revisiting inside C.

## Consequences

**Easier.** Phases 5–6 and 0004 build on primitives instead of inventing them. Focus states, keyboard behaviour and ARIA come from Radix rather than from whoever writes the screen — which matters on a product whose stated feature is keyboard entry.

**Harder.** A dependency tree (`radix-ui`, `class-variance-authority`, `tailwind-merge`, `lucide-react`) lands on a prototype that had three. The vendored components are ours to maintain and will drift from upstream.

**Watch.**
- **Entry speed is the acceptance test, not the look.** The canvas note says it outright: *"nếu nhập nhanh chậm đi vì layout này thì đó là hồi quy, không phải khẩu vị."* 11 keystrokes stays 11.
- **The money contract is untouched by this ADR.** Theme C's mockup shows `+10.977.000 ₫` on aggregates; `formatAmount` never emits `+`, and `Intl` does not either. Rendering that sign would be a contract extension and is therefore **not** part of adopting theme C — it stays an open question for the Owner.
- **`api` slips.** [backlog 0001](../backlog/0001-api-ledger-foundation.md), the whole subject of episode 2, stays unstarted while this runs. That is the price of the override and it is stated here so it is visible later.
