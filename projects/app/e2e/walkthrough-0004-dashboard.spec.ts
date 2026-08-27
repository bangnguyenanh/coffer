import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * **Hub ticket 0004 phase 5 — the closing walkthrough.**
 *
 * The ticket writes it out as one story, and this file is that story in order,
 * with a screenshot at every step:
 *
 *   > *log in, land on the dashboard, transfer money between two accounts,
 *   > confirm both balances moved and that spending did not change, then open
 *   > spending-by-category and confirm the transfer is absent.*
 *
 * It is deliberately ONE test rather than five: a walkthrough that restarts
 * between steps is not a walkthrough. It also has to be one test here for a
 * harder reason — this prototype has no persistence, so `page.goto` re-seeds the
 * data AND signs the session out. Every move between screens below is a
 * client-side nav click, and the whole story runs on a single page load.
 *
 * The claim being closed is phase 2's claim, re-made where the Owner will
 * actually read it: **a transfer moves two balances and changes no spending
 * total.** Phase 2 proved it against an all-time figure on `/accounts`; phase 4
 * proved it against the month band; this proves it on the landing screen, which
 * is the one a person sees without asking for it.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** `Intl` puts U+00A0 before ₫. `toHaveAttribute` does not forgive it. */
const NBSP = '\u00a0';

/** Narration — the walkthrough is evidence for a reader, not just a pass/fail. */
function step(n: number, what: string): void {
  console.log(`\n── STEP ${n} — ${what}`);
}
function note(line: string): void {
  console.log(`   ${line}`);
}

function band(page: Page): Locator {
  return page.locator('[data-month-band][data-status="ready"]');
}

async function num(locator: Locator, attribute: string): Promise<number> {
  return Number(await locator.getAttribute(attribute));
}

/** The dashboard's balance for one account, straight off the DOM. */
async function balance(page: Page, accountId: string): Promise<number> {
  return num(
    page.locator(`[data-dashboard-account-id="${accountId}"]`),
    'data-dashboard-balance-minor',
  );
}

/** Every month-band figure, as one record. */
async function figures(page: Page): Promise<Record<string, number | string>> {
  const el = band(page);
  return {
    month: (await el.getAttribute('data-month')) ?? '',
    in: await num(el, 'data-month-in-minor'),
    out: await num(el, 'data-month-out-minor'),
    net: await num(el, 'data-month-net-minor'),
    txnCount: await num(el, 'data-month-txn-count'),
    transferLegs: await num(el, 'data-month-transfer-legs'),
    uncategorized: await num(el, 'data-month-uncategorized-minor'),
    segments: await num(el, 'data-segment-count'),
  };
}

/** Spending by category, as the legend renders it — the bar's numbers, as text. */
async function spendingByCategory(
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

test('0004 phase 5 walkthrough: land on the dashboard, transfer, and watch spending hold still', async ({
  page,
}) => {
  /* ---------------------------------------------------------------------
   * 1. Log in.
   * ------------------------------------------------------------------ */
  step(1, 'log in');
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/wt-0004-1-login-1280.png` });
  note('login screen, fields prefilled with the prototype account (ticket 0003 phase 2c)');

  // One Enter, nothing typed.
  await page.locator('#login-email').press('Enter');

  /* ---------------------------------------------------------------------
   * 2. Land on the dashboard — the phase-5 change itself.
   * ------------------------------------------------------------------ */
  step(2, 'land on the dashboard');
  const dashboard = page.locator('[data-view="dashboard"][data-status="ready"]');
  await expect(dashboard).toBeVisible();
  // The landing route IS the dashboard now, not the ledger, and not a redirect
  // to one: the URL a sign-in lands on is `/`.
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.locator('[data-view="ledger"]')).toHaveCount(0);

  const totalBefore = await num(dashboard, 'data-dashboard-total-minor');
  const vcbBefore = await balance(page, 'acc_vcb');
  const momoBefore = await balance(page, 'acc_momo');
  const bandBefore = await figures(page);
  const slicesBefore = await spendingByCategory(page);

  note(`URL ${page.url()}`);
  note(`accounts on screen: ${await num(dashboard, 'data-dashboard-account-count')}`);
  note(`total balance      ${totalBefore}  rendered "${await dashboard.locator('[data-dashboard-balances] [data-direction]').first().textContent()}"`);
  note(`Vietcombank        ${vcbBefore}`);
  note(`Ví Momo            ${momoBefore}`);
  note(`month band         ${JSON.stringify(bandBefore)}`);

  // Both questions the landing screen owes an answer to are on it, in one view.
  await expect(page.locator('[data-dashboard-balances]')).toBeVisible();
  await expect(band(page)).toBeVisible();
  expect(totalBefore).toBe(184_141_000);
  expect(vcbBefore).toBe(122_221_000);
  expect(momoBefore).toBe(770_000);
  expect(bandBefore.month).toBe('2026-08');
  expect(bandBefore.out).toBe(-7_460_000);
  expect(bandBefore.transferLegs).toBe(0);

  // Rendered, not merely attributed: grouped by dots, U+00A0 before ₫, never a
  // decimal digit, and no `+` on the positive total.
  const totalRendered = dashboard
    .locator('[data-dashboard-balances] [data-direction="inflow"]')
    .first();
  await expect(totalRendered).toHaveText(`184.141.000${NBSP}₫`);
  expect(await totalRendered.textContent()).not.toContain('+');

  await page.screenshot({ path: `${SHOTS}/wt-0004-2-dashboard-1280.png` });

  /* ---------------------------------------------------------------------
   * 3. Transfer money between two accounts.
   * ------------------------------------------------------------------ */
  step(3, 'transfer ₫500.000 from Vietcombank to Ví Momo');
  await page.locator('header a[href="/accounts"]').click();
  const accounts = page.locator('[data-view="accounts"][data-status="ready"]');
  await expect(accounts).toBeVisible();

  const spendingAllTimeBefore = await num(
    page.locator('[data-spending-total-minor]'),
    'data-spending-total-minor',
  );
  note(`all-time spending before: ${spendingAllTimeBefore}`);
  await page.screenshot({ path: `${SHOTS}/wt-0004-3-accounts-before-1280.png` });

  // Real key events, the measured 13-keystroke path (two of which are the
  // Vietnamese first-letter collision — `Ví Momo` and `Vietcombank` share `V`).
  let keys = 0;
  await page.keyboard.press('T');
  keys += 1;
  await expect(page.locator('#transfer-amount')).toBeFocused();
  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  keys += '500000'.length;
  await page.keyboard.press('Tab');
  keys += 1;
  await page.keyboard.press('v');
  await page.keyboard.press('v'); // cycle past `Ví Momo` to `Vietcombank`
  keys += 2;
  await page.keyboard.press('Tab');
  keys += 1;
  await page.keyboard.press('v'); // -> Ví Momo
  keys += 1;

  const form = page.locator('[data-transfer-entry]');
  await expect(form).toHaveAttribute('data-from', 'acc_vcb');
  await expect(form).toHaveAttribute('data-to', 'acc_momo');
  await page.keyboard.press('Enter');
  keys += 1;

  await expect(accounts).toHaveAttribute('data-transfer-leg-count', '2');
  note(`saved with ${keys} real keystrokes, no mouse — two legs, one transfer id`);

  const spendingAllTimeAfter = await num(
    page.locator('[data-spending-total-minor]'),
    'data-spending-total-minor',
  );
  note(`all-time spending after:  ${spendingAllTimeAfter}`);
  expect(spendingAllTimeAfter).toBe(spendingAllTimeBefore);
  await page.screenshot({ path: `${SHOTS}/wt-0004-4-transfer-saved-1280.png` });

  /* ---------------------------------------------------------------------
   * 4. Both balances moved — and spending did not.
   * ------------------------------------------------------------------ */
  step(4, 'back on the dashboard: both balances moved, spending held still');
  await page.locator('header a[href="/"]').click();
  await expect(dashboard).toBeVisible();

  const totalAfter = await num(dashboard, 'data-dashboard-total-minor');
  const vcbAfter = await balance(page, 'acc_vcb');
  const momoAfter = await balance(page, 'acc_momo');
  const bandAfter = await figures(page);

  console.log(
    `   BEFORE {vcb:${vcbBefore}, momo:${momoBefore}, total:${totalBefore}, monthOut:${bandBefore.out}, monthTxns:${bandBefore.txnCount}, legs:${bandBefore.transferLegs}}`,
  );
  console.log(
    `   AFTER  {vcb:${vcbAfter}, momo:${momoAfter}, total:${totalAfter}, monthOut:${bandAfter.out}, monthTxns:${bandAfter.txnCount}, legs:${bandAfter.transferLegs}}`,
  );

  // The money moved.
  expect(vcbAfter).toBe(vcbBefore - 500_000);
  expect(momoAfter).toBe(momoBefore + 500_000);
  // And it is the SAME money, so the total is untouched.
  expect(totalAfter).toBe(totalBefore);

  // And it was not spending. Not one figure on the month band moved except the
  // count of legs that were deliberately left out of all of them.
  expect(bandAfter.transferLegs).toBe(2);
  expect(bandAfter.out).toBe(bandBefore.out);
  expect(bandAfter.in).toBe(bandBefore.in);
  expect(bandAfter.net).toBe(bandBefore.net);
  expect(bandAfter.txnCount).toBe(bandBefore.txnCount);
  expect(bandAfter.uncategorized).toBe(bandBefore.uncategorized);
  note('data-month-transfer-legs 0 -> 2 is the ONLY figure that moved');

  // Both legs are stored `category_id: null` and neither reached the inbox.
  const inbox = await page
    .locator('header [data-uncategorized-count]')
    .getAttribute('data-uncategorized-count');
  expect(inbox).toBe('4');
  note(`header inbox badge still ${inbox} — a transfer leg is never offered for filing`);

  await page.screenshot({ path: `${SHOTS}/wt-0004-5-dashboard-after-1280.png` });

  /* ---------------------------------------------------------------------
   * 5. Spending by category — the transfer is absent.
   * ------------------------------------------------------------------ */
  step(5, 'open spending-by-category and look for the transfer');
  const slicesAfter = await spendingByCategory(page);
  console.log('   spending by category, August 2026:');
  for (const slice of slicesAfter) {
    console.log(`     ${slice.name.padEnd(18)} ${String(slice.minor).padStart(12)}`);
  }
  const sum = slicesAfter.reduce((t, s) => t + s.minor, 0);
  note(`segments sum ${sum} === data-month-out-minor ${bandAfter.out}`);

  // Identical, segment for segment, to the same list before the transfer.
  expect(slicesAfter).toEqual(slicesBefore);
  // Nothing anywhere near ₫500.000 appeared, in either sign.
  expect(slicesAfter.some((s) => Math.abs(s.minor) === 500_000)).toBe(false);
  // And the segments still reconcile exactly — no bucket, no rounding.
  expect(sum).toBe(bandAfter.out);
  expect(bandAfter.net).toBe(Number(bandAfter.in) + Number(bandAfter.out));

  await band(page).screenshot({ path: `${SHOTS}/wt-0004-6-spending-by-category-1280.png` });
  note('the transfer is absent from every segment; the bar still sums to the month');
});

/**
 * The measured entry path, re-measured after the route move.
 *
 * `design-system.md` §4 treats a keystroke added to this path as a regression
 * that needs the Owner. Moving the ledger to its own route could in principle
 * have cost one — it did not, and that is checked rather than assumed.
 */
test('quick entry is still 11 keystrokes with the ledger on its own route', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();

  // One click to the ledger — that is the cost of the move, and it is a click on
  // a nav that was always there, not a keystroke on the entry path.
  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();

  const before = Number(
    await page.locator('[data-view="ledger"] [data-result-count]').getAttribute('data-result-count'),
  );

  // The caret is in the amount box on arrival: starting an entry costs zero keys.
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
    String(before + 1),
  );
  console.log(`[evidence] quick entry, cold ledger -> saved row: ${keys} keystrokes`);
  expect(keys).toBe(11);
});
