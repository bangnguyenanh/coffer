/**
 * Keeping the ledger's place across an edit.
 *
 * Hub ticket 0003 phase 4: *"editing must not cost the ledger its place: after a
 * save the row stays where the reader was looking."*
 *
 * A saved edit can move everything under the reader's eyes in three ways, and
 * none of them is a scroll the user asked for:
 *
 *   1. the row shrinks — an open editor is taller than the row it replaces, so
 *      committing it pulls every row below upward;
 *   2. the row MOVES — changing `occurred_on` re-sorts it, possibly into a
 *      different day group somewhere else on the page;
 *   3. a day group appears or disappears, changing the height above the row.
 *
 * The fix is not "don't scroll": the page legitimately reflows. The fix is to
 * measure where the edited row sat **in the viewport** before the commit and put
 * it back at that offset after, so the row the reader was looking at is still
 * under their eyes and everything else moves around it.
 *
 * No React in here on purpose — it is two DOM reads and one scroll, called from
 * a layout effect so it runs before the browser paints and the correction is
 * never seen as a jump.
 */

/** Where a row was, in viewport coordinates, just before the list re-rendered. */
export interface RowAnchor {
  readonly transactionId: string;
  /** `getBoundingClientRect().top` — distance from the top of the viewport. */
  readonly viewportTop: number;
}

function rowElement(transactionId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-transaction-id="${CSS.escape(transactionId)}"]`,
  );
}

/**
 * Measure a row's current position. Returns `null` when the row is not on the
 * page — nothing to hold still, so nothing is attempted.
 */
export function captureRowAnchor(transactionId: string): RowAnchor | null {
  const element = rowElement(transactionId);
  if (element === null) return null;
  return { transactionId, viewportTop: element.getBoundingClientRect().top };
}

/**
 * Scroll so the anchored row sits at the offset it had when it was captured.
 *
 * Returns the number of pixels the page was corrected by — `0` means the row
 * did not move, which is the common case and worth being able to assert. If the
 * row is gone (deleted, or filtered out by the very edit that was saved), there
 * is nothing to anchor to and this returns `null` rather than guessing.
 */
export function restoreRowAnchor(anchor: RowAnchor): number | null {
  const element = rowElement(anchor.transactionId);
  if (element === null) return null;
  const delta = element.getBoundingClientRect().top - anchor.viewportTop;
  if (delta !== 0) window.scrollBy(0, delta);
  return delta;
}
