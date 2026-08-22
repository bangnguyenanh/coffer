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
 * grouping, no `₫` typed in this file, no division.
 */
export function AmountCell({ amountMinor }: { readonly amountMinor: number }) {
  const direction = amountMinor > 0 ? 'inflow' : amountMinor < 0 ? 'outflow' : 'zero';
  const tone =
    direction === 'inflow'
      ? 'text-inflow'
      : direction === 'outflow'
        ? 'text-outflow'
        : 'text-ink-muted';

  return (
    <span data-direction={direction} className={`font-medium tabular-nums ${tone}`}>
      {formatAmount(amountMinor)}
    </span>
  );
}
