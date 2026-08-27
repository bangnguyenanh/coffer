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
| Uncategorised bar segment | `uncat-hatch` (utility) | 135° hatch, `oklch(0.88 0.02 72)` / `oklch(0.93 0.014 78)` |
| Uncategorised legend chip | `bg-uncat-swatch` | `oklch(0.91 0.018 75)` |

**Type.** Be Vietnam Pro 400/500/600/700, loaded in `src/index.css` and exposed as `--font-sans`; every fallback in the stack is a system face, so a blocked font request degrades rather than breaks. Sizes come from the artboard: 21px/700 wordmark, 20px/700 page title, 28px quick-entry amount, 16px row amount, 15px row description, 13px meta, 12px subtotal, 11px eyebrow.

**Radii.** `rounded-panel` = 16px (panels and cards), `rounded-row` = 10px (ledger rows, boxed inputs, buttons — also `--radius`), `rounded-pill` = 999px (chips, toggles, the save button).

**Measure.** The content column is `max-w-content` = 1040px. Theme C was drawn at a 1280px viewport.

**Two utilities carry the look where a class list would be repeated:**
- `panel` — the raised 16px surface (`bg-surface-raised` + `border-border-subtle` + `rounded-panel`). It is a utility rather than a shadcn `Card` because three of the four panels on this surface are form elements (`<form>`, `<fieldset>`), which a component that renders a `<div>` cannot be.
- `eyebrow` — 11px/16, 600, uppercase, `0.1em` tracking, ink-muted. The small label above a number or a ledger day group.
- `uncat-hatch` — the diagonal hatch on the month band's first bar segment (ticket 0004 phase 4). A utility and not an inline style because it is three colour literals, and a colour literal outside `src/index.css` is a bug (rule 5).

## 2. The component vocabulary

**Vendored, in `src/components/ui/`** (shadcn/ui, radix base — source we own and may edit, not a runtime dependency to upgrade):

| Component | Used by | Why it is here |
|---|---|---|
| `Button` | save transaction, sign in, sign up, sign out | Every button on the surface. Variants carry the ochre primary and the ghost header action. |
| `Input` | the four auth fields | Focus ring, invalid state and sizing in one place. The ledger's own fields are ruled lines, not boxes, so they stay native elements styled with tokens. |
| `Label` | every quick-entry control, every auth field | Radix `Label` — the quick-entry row has no room for visible labels, so they are `sr-only` and the accessible name still survives. |
| `Badge` | the uncategorised count in the header | The count chip. **It is now inside a `NavLink` to `/triage`** (ticket 0003 phase 5) — ticket 0005 left it a bare status only because the screen it points at did not exist. |

**App-level shared components, in `src/components/`** (ours, not vendored — promoted only once a second consumer existed, per `coding-conventions.md`):

| Component | Used by | Why it is shared |
|---|---|---|
| `AmountCell` | ledger rows, day subtotals, triage rows, account balances, the accounts total | Rule 3 below is only enforceable if one component owns sign→colour. Two screens rendering amounts with two components is two chances for the same number to pick up a different colour. |
| `UndoBar` | ledger delete, triage assignment, account archive, a completed transfer | The product has **no confirmation dialogs** (§3 rule 9). One bar, so "how do I take that back" has one answer and one look. |
| `category-color` | ledger rows, triage rows | The ramp, and the dashed uncategorised swatch. Not a component — the ramp derived from list position, which triage also renders. |
| `MonthBand` | the dashboard, the top of the ledger | Theme C's summary strip. **Promoted out of `routes/ledger/` in ticket 0004 phase 5**, when the dashboard became its second consumer. Two screens computing "the month's spending by category" with two implementations is two answers to one question — and the whole point of the band is that its numbers reconcile. |

**Deliberately NOT added, and the reasons are load-bearing:**

- **`Select`.** Category and account stay **native `<select>`**. A Radix listbox changes the keyboard model — `Enter` opens a popper instead of submitting the form, and options need arrow keys rather than first-letter matching. Entry speed is the acceptance test on this product (§4), so this is not a style preference and should not be "modernised" without measuring the keystroke path again.
- **`Tabs` / `ToggleGroup`** for the direction control. It is drawn as a two-segment pill but it is **one `<button>` that toggles** — one tab stop, one key to flip. A roving-tabindex group would be two stops and an arrow key.
- **`Card`, `Separator`, `DropdownMenu`.** No consumer. Add one when a screen actually needs it, not in advance.

Adding a primitive later: `npx shadcn@latest add <name>`. If what you add references utilities from `shadcn/tailwind.css` (`scroll-fade`, `shimmer`, the `data-*` variants) or `tw-animate-css`, those imports were removed as unused during ticket 0005 — re-add the import rather than inlining the utility.

## 3. Rules that are not negotiable

1. **Money is tabular.** Any element rendering an amount carries `tabular-nums`. Columns of numbers that shift under their own digits are unreadable, and this product is a column of numbers.
2. **Every amount string comes from `src/lib/money.ts`.** No component formats, groups, or types a `₫`. `CURRENCY_SYMBOL` is exported for the one static adornment in the quick-entry row; anything that renders a *value* calls `formatAmount`.
3. **Sign colour comes from the amount's direction, never from context.** `AmountCell` derives `data-direction` from the sign — positive is `inflow`, negative is `outflow`, **zero is neutral ink-muted**. An account or a category never implies a direction, and the same amount never renders positive in one view and negative in another.
   **A transfer leg does not bend this** (ticket 0004 phase 2). The ticket asks that the ledger render a transfer as *movement* rather than as income or expense, and it does — the row carries a `Chuyển khoản` chip and names both ends (`Vietcombank → Ví Momo`) in the slot a category would occupy, with a two-way arrow instead of a category dot. But **the amount keeps its sign and its sign colour**: the money really did leave that account. Movement is said by the ROW; recolouring the number to a third "neutral movement" tone would be exactly the context-driven colour this rule forbids.
4. **No `+` on a positive amount, aggregates included.** The artboard shows `+10.977.000 ₫`; `formatAmount` does not emit a `+` and `Intl` does not either. Rendering one is a money-contract extension and Owner-gated (ADR 0005 → *Watch*).
5. **No colour literal outside `src/index.css`.** No hex, no `oklch(...)` in a component, no `style={{ color: … }}`. If a token is missing, add it to the palette.
6. **`data-*` attributes are the evidence surface.** Every terminal state carries `data-status="ready"` — error and empty states included. What a reviewer must confirm goes on the DOM (`data-result-count`, `data-direction`, `data-day-subtotal`, `data-amount-minor`, `data-balance-minor`, `data-spending-total-minor`, `data-transfer-id`), because that turns a claim into one greppable command.
7. **Uncategorised is a state, not a category.** It renders as a **dashed** swatch and the accent-coloured word `Chưa phân loại` — never as a fifth ramp colour.
8. **Copy lives in `src/copy/strings.ts`.** No user-facing string typed into a component.
9. **No confirmation dialog, anywhere.** A destructive action happens, and an
   `UndoBar` offers to take it back with the caret already on it. A dialog taxes
   the ninety-nine correct actions to protect the hundredth, and by then it is
   being dismissed unread. There is no `dialog`, `role="dialog"` or
   `role="alertdialog"` on this surface and adding one is Owner-gated.
10. **One evidence attribute, one scope.** `data-uncategorized-count` is the
    header badge's and nothing else's; the triage screen's own count is
    `data-inbox-count`. Two elements answering to one attribute is an ambiguous
    selector, which defeats the entire point of rule 6.
    Ticket 0004 keeps to it: the accounts screen counts money accounts as
    `data-active-account-count` / `data-archived-account-count`, never
    `data-account-count` — which is the header's, and counts **users**.
    `data-spending-total-minor` is on exactly one element on the surface.
    Ticket 0004 phases 3–4 keep to it as well. The month band's figures are
    `data-month-in-minor` / `-out-minor` / `-net-minor` / `-txn-count` /
    `-transfer-legs` / `-uncategorized-minor` — **never** `data-spending-total-minor`,
    which is the accounts screen's all-time number and answers a different
    question. The bar's segments carry `data-bar-segment`; the legend beneath
    carries `data-slice-minor`, so "sum the segments" is one selector with one
    answer. And the categories screen counts categories as
    `data-category-count`, never `data-uncategorized-count` (the header badge's)
    or `data-inbox-count` (the triage screen's).
    **Phase 5 keeps to it where it would have been easiest to break.** The
    dashboard renders the same balances `/accounts` does, so it names them
    `data-dashboard-total-minor`, `data-dashboard-balance-minor` and
    `data-dashboard-account-count` — never `data-total-balance-minor` /
    `data-balance-minor` / `data-active-account-count`, which are the accounts
    screen's. Two routes rendering the same figure is a reason for MORE naming
    discipline, not less: a reviewer greps one attribute and gets one answer, on
    one screen.

11. **No account carries a stored balance, and no screen may add one.** Every
    balance is derived from `opening_balance_minor` plus that account's rows, on
    every render (`src/lib/account-balance.ts`). Hub ticket 0001 makes a cached
    balance column an explicit non-goal; a derived number that disagrees with the
    ledger is the bug this rule exists to prevent. **And a transfer is not
    spending**: a row carrying a `transfer_id` is excluded from every spending
    total, every category breakdown, the uncategorised count and the triage
    inbox — with exactly one implementation, `src/lib/transfers.ts`. Balances are
    the deliberate exception: the money genuinely moved.

12. **A category's colour and its digit key are POSITIONS, not properties — and
    a rename or a create moves both.** The swatch comes from the index in the
    name-ordered list (`category-color.ts`, four ramp steps) and the triage digit
    comes from the same index (`triage/category-keys.ts`, `1`–`9`). Nothing is
    stored on the data, which is the point: no colour field to drift, no shortcut
    field to go stale against a renamed category. **The cost is that adding
    `Bảo hiểm` to today's eight categories moves seven of them to a different
    digit AND a different ramp step** — observed under Playwright, ticket 0004
    phase 3. That is accepted, not overlooked, and it is accepted because of
    where the risk actually is: the ramp carries no identity (nothing reads
    colour as "which category"), and a digit key is only dangerous while it is
    under a finger — which cannot happen mid-edit, because `/categories` and
    `/triage` are different routes and the triage legend is re-read on arrival.
    **What is NOT acceptable is hiding it**, so `/categories` renders the swatch
    and the digit for every row, on the one screen where the re-ordering is
    caused. Storing a colour or a shortcut to stabilise them is a data-model
    change and is Owner-gated.

## 4. Entry speed outranks the look

From ADR 0005, and it is the acceptance test for any change to the ledger screen:

> *"nếu nhập nhanh chậm đi vì layout này thì đó là hồi quy, không phải khẩu vị."*

**The path is 11 keystrokes, no mouse, cold ledger → saved row:** `3 0 0 0 0` · `Tab` · `C a f e` · `Enter`. The caret starts in the amount box on mount, so starting an entry costs zero keys and zero clicks; the form itself costs **2 keystrokes** on top of the data. The DOM order of the row **is** the tab order: amount → description → category → account → date → save. Re-ordering the row re-orders the hands.

Anything that adds a keystroke to that path is a regression and needs the Owner, not a design opinion.

**The other measured paths** (ticket 0003 phases 4–5, all observed under Playwright with real key events, not asserted):

| Path | Keystrokes | Notes |
|---|---|---|
| Quick entry, cold ledger → saved row | **11** | Unchanged by the `EntryFields` extraction — same DOM order, same tab order. |
| Ledger row → open the editor | **1** (`Enter`) | The row **is** the control: one tab stop per row, not two. `Enter` edits, `Delete`/`Backspace` deletes. A per-row edit + delete button pair would be 112 tab stops on a 56-row ledger. |
| Delete a row **and fully recover it** | **2** (`Delete`, `Enter`) | Focus moves to `Hoàn tác` on the bar, so the recovery is already under the caret. |
| Triage: clear N rows one at a time | **N** (one digit each) | The assigned row leaves the inbox, so the next row falls under the cursor by itself. No `Tab`, no arrow, no `<select>`. |
| Triage: clear N rows into one category | **2** (`A`, digit) | Measured at N = 12. |
| Quick entry, with the month band above it | **11** | Unchanged by ticket 0004 phase 4. The band sits above quick entry in the DOM, as the artboard draws it, and costs nothing: the amount box carries `autoFocus`, so the caret still starts there on mount, and nothing was inserted INTO the tab order between amount and description. Re-measured under Playwright with real key events. |
| Quick entry, with the ledger on its own route (`/ledger`) | **11** | Unchanged by ticket 0004 phase 5. The move cost a nav **click**, not a key: nothing was inserted into the entry path's tab order and the amount box still carries `autoFocus`, so the caret starts there on arrival. Re-measured under Playwright with real key events. |
| Ledger row → correct its amount and save | **1** + the digits + **1** | `Enter` opens the editor with the caret in the amount box and the old value selected-on-open; `ControlOrMeta+a`, the new digits, `Enter`. Measured end-to-end in the ticket 0003 phase 6 walkthrough. |
| Triage: file the row you just entered | **1** | The row just entered is the most recent, so it is already under the cursor when `/triage` opens — the digit is the whole cost. |
| Transfer, cold accounts screen → saved pair | **13** | `T` · `5 0 0 0 0 0` · `Tab` · `v v` · `Tab` · `v` · `Enter`. Ticket 0004 phase 2, measured with real key events. `T` is this screen's `N`. Two of those keys are a **Vietnamese first-letter collision** — `Ví Momo` and `Vietcombank` both start with `V`, so the source costs a second `v` to cycle past the first match. An unambiguous account costs one key, and the description is optional (it defaults to `Chuyển tiền: {from} → {to}`), so the floor is **11**. |

**Transfer entry lives on `/accounts`, and that placement is an entry-speed decision.** The obvious home is the ledger's quick-entry row with a source/destination mode — and it is refused, because a mode toggle on that row adds a tab stop to the **11-keystroke** path the Owner walks dozens of times a day, to serve something done a few times a week. That is the regression this section forbids. On the accounts screen the transfer also sits beside the two balances it moves, so its effect is visible in the same glance as the action.

**Digit keys, not a `<select>`, on the triage screen — and this is the same rule as §2's.** First-letter matching collides in Vietnamese (`Cà phê` / `Chợ & siêu thị`), and a listbox per row costs a tab in and a tab out. Categories bind to `1`–`9` by their position in the name-ordered list; past the ninth there is no key and the legend renders `—` rather than lying.

## 5. What theme C does NOT include yet

- ~~**The month band.**~~ **Built — ticket 0004 phase 4, and on two screens since phase 5.** It sits at the top of the **dashboard** (the landing route) and at the top of the **ledger**, where the artboard draws it: the month's spend as the largest number on the page, earned / net / count beside it, then a single-hue allocation bar whose first segment is uncategorised — **dashed, never a fifth ramp colour** (rule 7) — with a legend under it and a link into `/triage`. Three departures from the artboard, all deliberate: **no `+`** on the net figure (rule 4, Owner-gated); the headline and the legend amounts render with their real negative sign and outflow colour rather than as unsigned magnitudes in muted ink (rule 3, and the accounts screen's spending total set that precedent in phase 2); and there is **no "Khác" bucket** — every category with spending gets its own segment, so the segments sum to the month's outflow exactly, which is what makes the band checkable. It reads a MONTH and deliberately ignores the ledger's filters. **Its month cursor is per-instance** — two mounted bands keep two selections, and that is view state, not a third thing worth lifting into the shared store. The accounts screen's running spending total stays what it was: the all-time exclusion proof, no period, no bar.
- **Dark mode.** See the top of this file.
- **Shortcut chips and a status bar** — worth revisiting inside theme C per ADR 0005, not built.

*Last updated: 2026-08-27 (hub ticket 0004 phase 5 + hub ticket 0003 phase 6: `MonthBand` added to the shared-components table on its promotion out of `routes/ledger/`; rule 10 gained the dashboard's attribute scope and why two routes rendering one figure need MORE naming discipline; three measured keyboard paths added — quick entry re-measured at 11 with the ledger on `/ledger`, the row-correction path, and the one-key triage of a just-entered row; §5's month-band entry now names both screens and the per-instance month cursor. Earlier the same day — hub ticket 0004 phases 3–4: rule 12 — a category's colour and digit key are positions, what a rename moves, and why that is accepted rather than overlooked; rule 10 gained the month band's and the categories screen's attribute scopes; the `uncat-hatch` / `bg-uncat-swatch` tokens; the measured quick-entry path re-confirmed at 11 with the band above it; §5's month-band entry replaced with what was built and the three deliberate departures from the artboard. Earlier the same day — hub ticket 0004 phases 1–2: rule 3 now says how a transfer leg renders as movement without recolouring the number, rules 10–11 added, the measured transfer path and the reason transfer entry is not on the ledger, and §5's month-band note narrowed to phase 4. Earlier the same day — hub ticket 0003 phases 4–5: the app-level shared components table, rules 9 and 10, and the measured keyboard paths beyond entry. Earlier the same day: created — hub ticket 0005 phase 4) — keep this stamp current in the same edit that changes content.*
