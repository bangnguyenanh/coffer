/**
 * The paper receipt beside the login form.
 *
 * Backlog 0006: staging for the opening frame of a recording — a slab of till
 * paper with four lines and a total, so the screen says what the product is for
 * before anyone signs in.
 *
 * **It is decoration, and the constraints are the point:**
 *
 *   - `aria-hidden` and `pointer-events-none`. It is invisible to assistive tech
 *     and cannot be clicked, focused, or tabbed into — the form's keyboard path
 *     is untouched by it.
 *   - **Not a second data source.** `RECEIPT_LINES` is a `const` in this file.
 *     It does not read `src/state/`, it does not read `src/data/*.json`, and it
 *     must never become a second seed that can disagree with the first one.
 *   - **The money contract still applies to a fake receipt.** The amounts are
 *     integer minor units (VND, exponent 0 — `-45_000` is ₫45.000), the total is
 *     an integer SUM of them rather than a typed-in figure, and every string on
 *     screen comes from `AmountCell` -> `lib/money.ts`. No `₫` typed here, no
 *     `/ 100`, no `toFixed`.
 *   - `AmountCell` rather than a local span: sign IS direction
 *     (documents/design-system.md §3.3), and one component owns sign -> colour.
 *     So `Lương` is green and the three outflows are red for the same reason
 *     they are on the ledger, and no `+` appears on the inflow (§3.4).
 *
 * **It renders on `/login` only** — `AuthScreen` decides, see the note there.
 *
 * The torn bottom edge is the `receipt-torn` utility in `src/index.css`. It is a
 * utility and not an inline style for the same reason `uncat-hatch` is: a mask
 * is CSS colour values, and a colour outside `index.css` is a bug (§3.5).
 */

import { AmountCell } from '../components/AmountCell';
import { authReceiptCopy } from '../copy/strings';

/**
 * The four lines. `amount_minor`, straight from the ticket — outflows negative,
 * the inflow positive. Underscores are digit separators, not grouping: the
 * values are 45000, 320000, 1200000 and 18000000 đồng.
 */
const RECEIPT_LINES = [
  { key: 'coffee', label: authReceiptCopy.lines.coffee, amountMinor: -45_000 },
  { key: 'market', label: authReceiptCopy.lines.market, amountMinor: -320_000 },
  { key: 'rent', label: authReceiptCopy.lines.rent, amountMinor: -1_200_000 },
  { key: 'salary', label: authReceiptCopy.lines.salary, amountMinor: 18_000_000 },
] as const;

/** Summed, never typed: a total that can disagree with its lines is the bug. */
const RECEIPT_TOTAL_MINOR = RECEIPT_LINES.reduce((sum, line) => sum + line.amountMinor, 0);

export function ReceiptPanel() {
  return (
    <aside
      aria-hidden="true"
      data-auth-receipt="login"
      className="receipt-torn pointer-events-none hidden w-72 shrink-0 select-none border-x border-t border-border-subtle bg-surface-raised px-6 pt-6 pb-9 font-receipt lg:block"
    >
      <p className="eyebrow">{authReceiptCopy.title}</p>
      <p className="mt-1 text-xs text-ink-faint">{authReceiptCopy.subtitle}</p>

      <ul className="mt-4 border-t border-rule">
        {RECEIPT_LINES.map((line) => (
          <li
            key={line.key}
            data-receipt-line={line.key}
            data-receipt-amount-minor={line.amountMinor}
            className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5 text-[13px] text-ink"
          >
            <span className="truncate">{line.label}</span>
            <AmountCell amountMinor={line.amountMinor} className="text-[13px]" />
          </li>
        ))}
      </ul>

      <div
        data-receipt-total-minor={RECEIPT_TOTAL_MINOR}
        className="mt-4 flex items-baseline justify-between gap-4"
      >
        <span className="eyebrow">{authReceiptCopy.total}</span>
        <AmountCell amountMinor={RECEIPT_TOTAL_MINOR} className="text-[15px] font-semibold" />
      </div>
    </aside>
  );
}
