import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Hub ticket 0004 phase 4 — theme C's month band.
 *
 * The canvas note is the acceptance test in one line: *"Hơn một nửa chi tiêu
 * tháng này chưa biết đi đâu."* The band exists to turn the triage inbox from a
 * badge into a REASON, so these specs check that the band says that sentence
 * when it is true (July 2026: ₫1.25bn of a ₫1.258bn month has no category) and
 * says the amount instead when it is not (August 2026: 2.0%). It is chosen from
 * the data and never asserted.
 *
 * The other two claims are arithmetic, and they are stated as numbers:
 *
 *   1. **the band reconciles** — net is in + out, and the allocation segments sum
 *      to the month's out, exactly, with no bucket and no rounding;
 *   2. **transfers are excluded from every month-scoped figure** — a transfer
 *      created during the run inside the displayed month moves
 *      `data-month-transfer-legs` from 0 to 2 and moves NOTHING else: not in,
 *      not out, not net, not the count, and not one segment. Phase 2 proved this
 *      for the all-time total; none of that carries over to a number scoped to a
 *      month unless it is proved again.
 *
 * One page load per test. `page.goto` re-seeds the prototype and signs it out;
 * the header nav links are client-side and keep the session.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** U+00A0 sits before ₫ in `Intl` output. Attribute comparisons do not forgive it. */
const NBSP = ' ';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
}

function band(page: Page): Locator {
  return page.locator('[data-month-band][data-status="ready"]');
}

interface BandFigures {
  readonly month: string;
  readonly inMinor: number;
  readonly outMinor: number;
  readonly netMinor: number;
  readonly txnCount: number;
  readonly transferLegs: number;
  readonly uncategorizedMinor: number;
  readonly note: string;
}

async function figures(page: Page): Promise<BandFigures> {
  const el = band(page);
  const read = async (name: string): Promise<number> => Number(await el.getAttribute(name));
  return {
    month: (await el.getAttribute('data-month')) ?? '',
    inMinor: await read('data-month-in-minor'),
    outMinor: await read('data-month-out-minor'),
    netMinor: await read('data-month-net-minor'),
    txnCount: await read('data-month-txn-count'),
    transferLegs: await read('data-month-transfer-legs'),
    uncategorizedMinor: await read('data-month-uncategorized-minor'),
    note: (await el.getAttribute('data-band-note')) ?? '',
  };
}

/** Every segment as the legend renders it — the bar's numbers, as text. */
async function slices(
  page: Page,
): Promise<readonly { readonly id: string; readonly name: string; readonly minor: number }[]> {
  return page.$$eval('[data-allocation-legend] [data-slice-category-id]', (nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute('data-slice-category-id') ?? '',
      name: node.getAttribute('data-slice-name') ?? '',
      minor: Number(node.getAttribute('data-slice-minor')),
    })),
  );
}

/* -------------------------------------------------------------------------
 * 1. The band reconciles, as numbers.
 * ---------------------------------------------------------------------- */

test('the month band reconciles: net is in + out, and the segments sum to out', async ({
  page,
}) => {
  await signIn(page);
  const view = band(page);
  await expect(view).toBeVisible();

  const f = await figures(page);
  const parts = await slices(page);
  const segmentSum = parts.reduce((total, slice) => total + slice.minor, 0);

  console.log(`[evidence] band ${f.month}`, JSON.stringify(f));
  console.log('[evidence] segments:');
  for (const slice of parts) console.log(`  ${slice.name.padEnd(16)} ${String(slice.minor).padStart(14)}`);
  console.log(`[evidence] segments sum ${segmentSum} === data-month-out-minor ${f.outMinor}`);

  // The fixtures, unchanged: August 2026.
  expect(f.month).toBe('2026-08');
  expect(f.inMinor).toBe(25_200_000);
  expect(f.outMinor).toBe(-7_460_000);
  expect(f.txnCount).toBe(17);
  expect(f.transferLegs).toBe(0);

  // net is derived, not restated.
  expect(f.netMinor).toBe(f.inMinor + f.outMinor);
  // THE reconciliation: no bucket, no "other", no rounding.
  expect(segmentSum).toBe(f.outMinor);
  // The uncategorised segment IS the sum of the month's uncategorised rows.
  expect(parts[0]?.id).toBe('none');
  expect(parts[0]?.minor).toBe(f.uncategorizedMinor);
  expect(f.uncategorizedMinor).toBe(-150_000);

  // Rendered, not just attributed. `formatAmount` emits U+00A0 before ₫, never a
  // decimal digit, and no `+` on the positive aggregate.
  const headline = view.locator('[data-direction]').first();
  await expect(headline).toHaveText(`-7.460.000${NBSP}₫`);
  await expect(headline).toHaveAttribute('data-direction', 'outflow');
  await expect(view.locator('[data-slice-category-id="none"] [data-direction]')).toHaveText(
    `-150.000${NBSP}₫`,
  );
  // Net is 17.740.000 — positive, and rendered WITHOUT a leading `+`.
  const net = view.locator('[data-direction="inflow"]').last();
  await expect(net).toHaveText(`17.740.000${NBSP}₫`);
  expect(await net.textContent()).not.toContain('+');
  console.log('[evidence] net rendered as "17.740.000 ₫" — no `+`, per design-system.md §3.4');

  await page.screenshot({ path: `${SHOTS}/month-band-1280.png`, fullPage: false });
});

/* -------------------------------------------------------------------------
 * 2. The sentence the band exists for.
 * ---------------------------------------------------------------------- */

test('the band says why triage is worth opening, and picks the line from the data', async ({
  page,
}) => {
  await signIn(page);
  const view = band(page);

  // August: 2.0% unfiled. The band states the amount rather than raising an alarm.
  await expect(view).toHaveAttribute('data-band-note', 'some');
  await expect(view.locator('[data-band-note-text]')).toHaveText(
    `Chi tiêu tháng này chưa biết đi đâu: -150.000${NBSP}₫.`,
  );

  // One click back to July 2026 — where ₫1.25bn of a ₫1.258bn month has no
  // category, and the canvas's own sentence becomes true.
  await view.locator('[data-action="month-prev"]').click();
  await expect(view).toHaveAttribute('data-month', '2026-07');

  const july = await figures(page);
  const parts = await slices(page);
  const segmentSum = parts.reduce((total, slice) => total + slice.minor, 0);
  const share = july.uncategorizedMinor / july.outMinor;
  console.log(`[evidence] band ${july.month}`, JSON.stringify(july));
  console.log(
    `[evidence] uncategorised ${july.uncategorizedMinor} of ${july.outMinor} = ${(share * 100).toFixed(1)}% — segments sum ${segmentSum}`,
  );

  expect(segmentSum).toBe(july.outMinor);
  expect(july.netMinor).toBe(july.inMinor + july.outMinor);
  expect(share).toBeGreaterThan(0.5);
  await expect(view).toHaveAttribute('data-band-note', 'over-half');
  await expect(view.locator('[data-band-note-text]')).toHaveText(
    'Hơn một nửa chi tiêu tháng này chưa biết đi đâu.',
  );

  // The uncategorised segment is the FIRST one and it is drawn as a dash, never
  // as a fifth ramp colour (design-system.md §3.7).
  const first = view.locator('[data-bar-segment]').first();
  await expect(first).toHaveAttribute('data-bar-category-id', 'none');
  await expect(first).toHaveClass(/uncat-hatch/);
  await expect(first).toHaveClass(/border-dashed/);

  // And it is a REASON, not a badge: the link into the inbox is right there,
  // carrying the same count the header shows.
  const headerCount = await page
    .locator('header [data-uncategorized-count]')
    .getAttribute('data-uncategorized-count');
  await expect(view.locator('[data-action="open-triage"]')).toHaveAttribute(
    'data-triage-count',
    headerCount ?? '',
  );

  await page.screenshot({ path: `${SHOTS}/month-band-over-half-1280.png`, fullPage: false });

  await view.locator('[data-action="open-triage"]').click();
  await expect(page.locator('[data-view="triage"][data-status="ready"]')).toBeVisible();
  console.log(`[evidence] the band's link reaches /triage with ${headerCount} rows waiting`);
});

/* -------------------------------------------------------------------------
 * 3. Transfers are excluded from every month-scoped figure.
 * ---------------------------------------------------------------------- */

test('a transfer made inside the displayed month changes no figure on the band', async ({
  page,
}) => {
  await signIn(page);
  const view = band(page);

  const before = await figures(page);
  const slicesBefore = await slices(page);
  console.log('[evidence] BEFORE', JSON.stringify(before));

  // Client-side navigation — a `goto` would re-seed the app and sign it out.
  await page.locator('header a[href="/accounts"]').click();
  await expect(page.locator('[data-view="accounts"][data-status="ready"]')).toBeVisible();

  // Real key events, the same 13-keystroke path phase 2 measured. The date
  // defaults to today, which is inside the month the band is showing — that is
  // what makes this a MONTH-scoped test and not a repeat of phase 2's.
  await page.keyboard.press('T');
  await expect(page.locator('#transfer-amount')).toBeFocused();
  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  await page.keyboard.press('Tab');
  await page.keyboard.press('v');
  await page.keyboard.press('v'); // the Vietnamese first-letter collision -> Vietcombank
  await page.keyboard.press('Tab');
  await page.keyboard.press('v'); // -> Ví Momo
  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute('data-from', 'acc_vcb');
  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute('data-to', 'acc_momo');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-view="accounts"]')).toHaveAttribute(
    'data-transfer-leg-count',
    '2',
  );

  await page.locator('header a[href="/"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();

  const after = await figures(page);
  const slicesAfter = await slices(page);
  console.log('[evidence] AFTER ', JSON.stringify(after));

  // The legs are there, in this month, and counted as excluded.
  expect(after.transferLegs).toBe(2);
  expect(before.transferLegs).toBe(0);

  // AND THE POINT: nothing else moved.
  expect(after.month).toBe(before.month);
  expect(after.inMinor).toBe(before.inMinor);
  expect(after.outMinor).toBe(before.outMinor);
  expect(after.netMinor).toBe(before.netMinor);
  expect(after.txnCount).toBe(before.txnCount);
  expect(after.uncategorizedMinor).toBe(before.uncategorizedMinor);
  expect(slicesAfter).toEqual(slicesBefore);
  // Both legs are stored `category_id: null` and NEITHER reached the
  // uncategorised segment or the inbox link.
  expect(after.note).toBe(before.note);
  console.log(
    `[evidence] transfer legs 0 -> 2; in/out/net/count/segments identical; uncategorised still ${after.uncategorizedMinor}`,
  );

  await page.screenshot({ path: `${SHOTS}/month-band-transfer-excluded-1280.png`, fullPage: false });
});

/* -------------------------------------------------------------------------
 * 4. The band did not cost a keystroke.
 * ---------------------------------------------------------------------- */

test('quick entry is still 11 keystrokes with the band above it', async ({ page }) => {
  await signIn(page);
  await expect(band(page)).toBeVisible();

  const rowsBefore = Number(
    await page.locator('[data-view="ledger"] [data-result-count]').getAttribute('data-result-count'),
  );

  // The caret starts in the amount box on mount — the band sits above it in the
  // DOM and `autoFocus` does not care.
  const amount = page.locator('#entry-amount');
  await expect(amount).toBeFocused();

  let keys = 0;
  await amount.pressSequentially('30000', { delay: 15 });
  keys += '30000'.length;
  await page.keyboard.press('Tab');
  keys += 1;
  await page.locator('#entry-description').pressSequentially('Cafe', { delay: 15 });
  keys += 'Cafe'.length;
  await page.keyboard.press('Enter');
  keys += 1;

  await expect(page.locator('[data-view="ledger"] [data-result-count]')).toHaveAttribute(
    'data-result-count',
    String(rowsBefore + 1),
  );
  console.log(`[evidence] quick entry, cold ledger -> saved row: ${keys} keystrokes`);
  expect(keys).toBe(11);

  // The band picked the new row up in the same render — it reads the shared
  // state, not a copy of it.
  const after = await figures(page);
  console.log(`[evidence] band after the entry: out ${after.outMinor}, rows ${after.txnCount}`);
  expect(after.outMinor).toBe(-7_460_000 - 30_000);
  expect(after.txnCount).toBe(18);
});
