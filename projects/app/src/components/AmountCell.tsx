import { formatAmount } from '../lib/money';

/**
 * One amount, rendered as a direction.
 *
 * Hub CLAUDE.md: sign IS direction — outflow negative, inflow positive, and
 * neither the account nor the category may imply it. So the sign is never
 * stripped and re-derived from context; it is shown, and the colour agrees with
 * it. Zero has no direction and is rendered neutral.
 *
 * The string itself comes from `formatAmount` and nowhere else: no local
 * grouping, no `₫` typed in this file, no division. **No `+` is added to a
 * positive amount** — not on a row and not on the day subtotal. The mockup shows
 * one; `formatAmount` does not emit one, and teaching it to would be a change to
 * the money contract, which is Owner-gated (ADR 0005).
 *
 * `className` exists so the same component can be a 16px row amount and a 12px
 * day subtotal (ticket 0005) — SIZE is the caller's business, colour and sign
 * are not.
 *
 * **It moved out of `routes/ledger/` in phase 5**, when the triage inbox became
 * a second screen rendering amounts. That is the promotion rule in
 * documents/coding-conventions.md — shared once a second consumer exists — and
 * it matters more than usual here: two screens rendering the same amount with
 * two components is two chances for the same number to pick up a different sign
 * colour, which rule 3 of the design system forbids outright.
 */
export function AmountCell({
  amountMinor,
  className = '',
  ...rest
}: { readonly amountMinor: number; readonly className?: string } & Pick<
  React.ComponentProps<'span'>,
  'aria-label'
>) {
  const direction = amountMinor > 0 ? 'inflow' : amountMinor < 0 ? 'outflow' : 'zero';
  const tone =
    direction === 'inflow'
      ? 'text-inflow'
      : direction === 'outflow'
        ? 'text-outflow'
        : 'text-ink-muted';

  return (
    <span
      data-direction={direction}
      className={`font-medium tabular-nums ${tone} ${className}`}
      {...rest}
    >
      {formatAmount(amountMinor)}
    </span>
  );
}
