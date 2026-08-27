import { quickEntryCopy } from '../../copy/strings';
import { formatAmount } from '../../lib/money';
import type { Direction, EntryField, EntryFieldError } from './quick-entry';

/**
 * What the form is about to store, and why it will not.
 *
 * Shared by the quick-entry bar and the inline row editor for the same reason
 * `EntryFields` is (see that file): two writers, one set of rules, and the
 * **amount preview is the anti-100× affordance** — the single thing on either
 * form that catches `30000` typed as `3000000`. A second, slightly different
 * copy of it in the editor is how the editor ends up without one.
 *
 * The preview is the signed integer the draft WOULD store, rendered through
 * `formatAmount` — the same module, the same string, the same U+00A0 before `₫`
 * that the ledger row will show. Nothing is formatted in this file.
 *
 * `aria-live="polite"` rather than `assertive`: it updates on every keystroke of
 * the amount, and an assertive region would interrupt a screen reader mid-digit.
 */

interface EntryFeedbackProps {
  /** Matches the prefix given to `EntryFields` — this is its `aria-describedby`. */
  readonly idPrefix: string;
  /** The keyboard contract, shown by the always-mounted bar and not by the editor. */
  readonly hint?: string;
  /** `draftAmountMinor(draft)` — the value, or the money module's rejection. */
  readonly preview: { readonly ok: true; readonly amountMinor: number } | { readonly ok: false };
  readonly direction: Direction;
  readonly errors: readonly EntryFieldError[];
  readonly errorFor: (field: EntryField) => string | null;
}

export function EntryFeedback({
  idPrefix,
  hint,
  preview,
  direction,
  errors,
  errorFor,
}: EntryFeedbackProps) {
  return (
    <>
      {/* The keyboard contract on the left, what will be stored on the right.
          One live region for both halves of the second: the preview while the
          amount parses, a blank while it does not. */}
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-ink-faint">{hint ?? ' '}</p>
        <p id={`${idPrefix}-amount-status`} className="text-xs" aria-live="polite">
          {preview.ok ? (
            <span className="text-ink-muted">
              {quickEntryCopy.previewLabel}{' '}
              <span
                data-amount-preview-value=""
                data-direction={direction}
                className={`font-semibold tabular-nums ${
                  direction === 'outflow' ? 'text-outflow' : 'text-inflow'
                }`}
              >
                {formatAmount(preview.amountMinor)}
              </span>
            </span>
          ) : (
            <span className="text-ink-muted">&nbsp;</span>
          )}
        </p>
      </div>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert" data-entry-errors="">
          {errors.map((error) => (
            <li
              key={error.field}
              data-error-field={error.field}
              data-error-reason={error.reason}
              className="text-xs text-outflow"
            >
              {errorFor(error.field)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
