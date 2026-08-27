import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';

/**
 * "That happened, and you can take it back."
 *
 * ## Undo, not confirm — and this is the decision, not a detail
 *
 * Hub ticket 0003 phase 4 left the choice open and asked for the reasoning. It
 * is this: a confirmation dialog taxes the **99 correct deletions** to protect
 * the one mistake, and the tax is paid in the currency this product says it
 * cares about — keystrokes. Worse, a dialog that appears every time is a dialog
 * that gets dismissed reflexively, so by the hundredth deletion it is not being
 * read and protects nothing. Undo inverts that: the correct case costs nothing,
 * the mistake costs one key, and the recovery is *exact* rather than a
 * re-typing of what was lost.
 *
 * It is also the only one of the two that survives the keyboard requirement in
 * the ticket. A modal has to be reached, read and dismissed; this bar puts the
 * recovery **under the caret already** — focus moves to the undo button the
 * moment the bar appears, so correcting a mistaken delete is one `Enter`.
 *
 * ## Why it is fixed to the viewport
 *
 * Because focus has to move here, and moving focus to something off-screen
 * scrolls the page — which would undo the work `row-anchor.ts` does to keep the
 * ledger's place. A bar pinned to the bottom of the viewport is already visible
 * wherever the reader is, so the focus move costs no scrolling at all. It is not
 * a modal: it takes no focus trap, blocks nothing behind it, and the page stays
 * fully usable with it up.
 *
 * ## Why there is no timer
 *
 * A five-second window is a race between the user reading what happened and the
 * only way to undo it disappearing — and it is unusable for anyone who reads
 * slowly, or looked away. This bar stays until it is answered: undone,
 * dismissed (`Escape` or the close button), or replaced by the next action. The
 * cost is one line of persistent chrome; the alternative is a recovery that
 * expires.
 */

interface UndoBarProps {
  /** Already-formatted text — no amount is assembled in this component. */
  readonly message: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly dismissLabel: string;
  readonly onDismiss: () => void;
  /**
   * Put the caret on the action when the bar appears. True for a delete (the
   * thing you may need to take back); false for a purely informational notice.
   */
  readonly autoFocusAction?: boolean;
  /** Distinguishes what happened, for evidence: `deleted`, `updated`, `assigned`. */
  readonly kind: string;
}

export function UndoBar({
  message,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
  autoFocusAction = true,
  kind,
}: UndoBarProps) {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocusAction) actionRef.current?.focus();
  }, [autoFocusAction, message]);

  /** Escape dismisses from anywhere inside the bar — no mouse, no Tab hunt. */
  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onDismiss();
  };

  return (
    <div
      role="status"
      data-undo-bar=""
      data-undo-kind={kind}
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-6 z-10 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-pill border border-border-subtle bg-surface-raised px-4 py-2 shadow-lg"
    >
      <span className="text-[13px] text-ink" data-undo-message="">
        {message}
      </span>
      <Button
        ref={actionRef}
        type="button"
        size="sm"
        data-action="undo"
        className="h-8 shrink-0 rounded-pill px-4 text-[13px] font-semibold"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        data-action="dismiss-undo"
        aria-label={dismissLabel}
        className="h-8 shrink-0 rounded-pill px-3 text-[13px] text-ink-muted"
        onClick={onDismiss}
      >
        {dismissLabel}
      </Button>
    </div>
  );
}
