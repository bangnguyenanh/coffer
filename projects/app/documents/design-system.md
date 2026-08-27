# Design system — theme C · "Ấm"

Law for how this surface looks, alongside [`coding-conventions.md`](coding-conventions.md). On any conflict between a ticket and this file, **stop and flag it**.

Decided in hub [ADR 0005](../../../management/decisions/0005-design-system-shadcn-theme-c.md) (Accepted 2026-08-26): **shadcn/ui is the component substrate** and **theme C ("Ấm") is the visual law**. The artboard the values were measured from is vendored at [`management/decisions/assets/0005-theme-c-ledger.html`](../../../management/decisions/assets/0005-theme-c-ledger.html) — read it before re-eyeballing anything.

**Light only.** Dark mode is an unmade Owner decision. Nothing here enables it, scaffolds it, or leaves it half-wired.

---

## 1. The token layer

**`src/index.css` is the only file in this surface allowed to contain a colour.** One palette, defined once, in `:root`. Everything else is a name pointing at it:

- **shadcn's variables** — `--background`, `--foreground`, `--primary`, `--border`, `--muted-foreground`, `--ring`, … — are assigned from the palette, so a vendored primitive wears theme C the moment it is added.
- **the app's own names** — `--color-surface`, `--color-ink-muted`, `--color-outflow`, … — are mapped in `@theme inline` to the *same* variables.

There is no second palette to drift against, and changing a colour is one line.

| Role | Token (utility) | Value |
|---|---|---|
| Ground (the page) | `bg-surface` | `oklch(0.975 0.012 78)` |
| Panel / raised | `bg-surface-raised` | `oklch(0.995 0.004 78)` |
| Panel border | `border-border-subtle` | `oklch(0.915 0.012 78)` |
| Inset / chip ground | `bg-inset` | `oklch(0.955 0.012 78)` |
| Pill-nav trough | `bg-inset-strong` | `oklch(0.945 0.014 78)` |
| Hairline inside a panel | `border-rule` | `oklch(0.93 0.01 78)` |
| Ink | `text-ink` | `oklch(0.26 0.02 55)` |
| Ink muted | `text-ink-muted` | `oklch(0.55 0.015 60)` |
| Ink faint (the `₫` suffix, hints) | `text-ink-faint` | `oklch(0.62 0.015 60)` |
| Brand / accent (ochre) | `text-brand` `bg-brand` | `oklch(0.48 0.1 68)` |
| Brand hover | `text-brand-hover` | `oklch(0.38 0.1 68)` |
| Text on brand | `text-brand-foreground` | `oklch(0.99 0.004 78)` |
| Brand wash (avatar chip) | `bg-brand-wash` | `oklch(0.9 0.03 72)` |
| **Outflow** | `text-outflow` | `oklch(0.53 0.18 25)` |
| **Inflow** | `text-inflow` | `oklch(0.5 0.13 158)` |
| Field line (primary) | `border-field-line` | `oklch(0.86 0.02 75)` |
| Field line (soft) | `border-field-line-soft` | `oklch(0.93 0.012 78)` |
| Dashed pill border | `border-dash` | `oklch(0.85 0.02 75)` |
| Dashed dot border | `border-dash-strong` | `oklch(0.68 0.06 72)` |
| Category ramp | `bg-category-1…4` | `0.55 0.11 72` → `0.65 0.09 72` → `0.74 0.07 72` → `0.83 0.05 72` |

**Type.** Be Vietnam Pro 400/500/600/700, loaded in `src/index.css` and exposed as `--font-sans`; every fallback in the stack is a system face, so a blocked font request degrades rather than breaks. Sizes come from the artboard: 21px/700 wordmark, 20px/700 page title, 28px quick-entry amount, 16px row amount, 15px row description, 13px meta, 12px subtotal, 11px eyebrow.

**Radii.** `rounded-panel` = 16px (panels and cards), `rounded-row` = 10px (ledger rows, boxed inputs, buttons — also `--radius`), `rounded-pill` = 999px (chips, toggles, the save button).

**Measure.** The content column is `max-w-content` = 1040px. Theme C was drawn at a 1280px viewport.

**Two utilities carry the look where a class list would be repeated:**
- `panel` — the raised 16px surface (`bg-surface-raised` + `border-border-subtle` + `rounded-panel`). It is a utility rather than a shadcn `Card` because three of the four panels on this surface are form elements (`<form>`, `<fieldset>`), which a component that renders a `<div>` cannot be.
- `eyebrow` — 11px/16, 600, uppercase, `0.1em` tracking, ink-muted. The small label above a number or a ledger day group.

## 2. The component vocabulary

**Vendored, in `src/components/ui/`** (shadcn/ui, radix base — source we own and may edit, not a runtime dependency to upgrade):

| Component | Used by | Why it is here |
|---|---|---|
| `Button` | save transaction, sign in, sign up, sign out | Every button on the surface. Variants carry the ochre primary and the ghost header action. |
| `Input` | the four auth fields | Focus ring, invalid state and sizing in one place. The ledger's own fields are ruled lines, not boxes, so they stay native elements styled with tokens. |
| `Label` | every quick-entry control, every auth field | Radix `Label` — the quick-entry row has no room for visible labels, so they are `sr-only` and the accessible name still survives. |
| `Badge` | the uncategorised count in the header | A count chip that is a status, not a link. |

**Deliberately NOT added, and the reasons are load-bearing:**

- **`Select`.** Category and account stay **native `<select>`**. A Radix listbox changes the keyboard model — `Enter` opens a popper instead of submitting the form, and options need arrow keys rather than first-letter matching. Entry speed is the acceptance test on this product (§4), so this is not a style preference and should not be "modernised" without measuring the keystroke path again.
- **`Tabs` / `ToggleGroup`** for the direction control. It is drawn as a two-segment pill but it is **one `<button>` that toggles** — one tab stop, one key to flip. A roving-tabindex group would be two stops and an arrow key.
- **`Card`, `Separator`, `DropdownMenu`.** No consumer. Add one when a screen actually needs it, not in advance.

Adding a primitive later: `npx shadcn@latest add <name>`. If what you add references utilities from `shadcn/tailwind.css` (`scroll-fade`, `shimmer`, the `data-*` variants) or `tw-animate-css`, those imports were removed as unused during ticket 0005 — re-add the import rather than inlining the utility.

## 3. Rules that are not negotiable

1. **Money is tabular.** Any element rendering an amount carries `tabular-nums`. Columns of numbers that shift under their own digits are unreadable, and this product is a column of numbers.
2. **Every amount string comes from `src/lib/money.ts`.** No component formats, groups, or types a `₫`. `CURRENCY_SYMBOL` is exported for the one static adornment in the quick-entry row; anything that renders a *value* calls `formatAmount`.
3. **Sign colour comes from the amount's direction, never from context.** `AmountCell` derives `data-direction` from the sign — positive is `inflow`, negative is `outflow`, **zero is neutral ink-muted**. An account or a category never implies a direction, and the same amount never renders positive in one view and negative in another.
4. **No `+` on a positive amount, aggregates included.** The artboard shows `+10.977.000 ₫`; `formatAmount` does not emit a `+` and `Intl` does not either. Rendering one is a money-contract extension and Owner-gated (ADR 0005 → *Watch*).
5. **No colour literal outside `src/index.css`.** No hex, no `oklch(...)` in a component, no `style={{ color: … }}`. If a token is missing, add it to the palette.
6. **`data-*` attributes are the evidence surface.** Every terminal state carries `data-status="ready"` — error and empty states included. What a reviewer must confirm goes on the DOM (`data-result-count`, `data-direction`, `data-day-subtotal`, `data-amount-minor`), because that turns a claim into one greppable command.
7. **Uncategorised is a state, not a category.** It renders as a **dashed** swatch and the accent-coloured word `Chưa phân loại` — never as a fifth ramp colour.
8. **Copy lives in `src/copy/strings.ts`.** No user-facing string typed into a component.

## 4. Entry speed outranks the look

From ADR 0005, and it is the acceptance test for any change to the ledger screen:

> *"nếu nhập nhanh chậm đi vì layout này thì đó là hồi quy, không phải khẩu vị."*

**The path is 11 keystrokes, no mouse, cold ledger → saved row:** `3 0 0 0 0` · `Tab` · `C a f e` · `Enter`. The caret starts in the amount box on mount, so starting an entry costs zero keys and zero clicks; the form itself costs **2 keystrokes** on top of the data. The DOM order of the row **is** the tab order: amount → description → category → account → date → save. Re-ordering the row re-orders the hands.

Anything that adds a keystroke to that path is a regression and needs the Owner, not a design opinion.

## 5. What theme C does NOT include yet

- **The month band** — spent / earned / difference / the one-hue allocation bar. It is feature work belonging to [backlog 0004](../../../management/backlog/0004-app-prototype-accounts-transfers-insight.md). Ticket 0005 built the tokens it will use (the category ramp, the eyebrow, the panel) and deliberately not the band.
- **Dark mode.** See the top of this file.
- **Shortcut chips and a status bar** — worth revisiting inside theme C per ADR 0005, not built.

*Last updated: 2026-08-27 (created — hub ticket 0005 phase 4) — keep this stamp current in the same edit that changes content.*
