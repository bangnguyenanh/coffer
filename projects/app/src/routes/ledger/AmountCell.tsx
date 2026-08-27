import { formatAmount } from '../../lib/money';

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
