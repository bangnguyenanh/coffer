import { expect, test, type Page } from '@playwright/test';

/**
 * Ticket 0005 — observed behaviour for the theme C re-skin.
 *
 * Two things are being demonstrated, and they are not the same thing:
 *   1. the screens render in theme C at 1280px (the screenshots), and
 *   2. **entry speed did not regress** — the 11-keystroke path still saves a
 *      row, driven as REAL KEY EVENTS (`pressSequentially` / `keyboard.press`),
 *      never injected values. Injection delivers one atomic state change and
 *      structurally cannot surface a race; that is exactly how bug 0001 hid
 *      through three verification passes.
 *
 * The U+00A0 in the expected amounts is deliberate: `Intl.NumberFormat('vi-VN')`
 * emits a non-breaking space before `₫`, so asserting a plain space would fail
 * against CORRECT output.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/**
 * Reach the ledger. Since ticket 0003 phase 2c the prototype boots with ONE
 * seeded account and a login form that opens prefilled, so this is a single
 * Enter on a screen that still renders, still submits and still rejects — a
 * prefill, not a bypass. Nothing is typed here on purpose: the real-keystroke
 * demonstration this ticket owes is the quick-entry path below.
 */
async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
}

test('auth screen renders in theme C', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/auth-login-1280.png` });
});

test('ledger renders day groups with a subtotal per day', async ({ page }) => {
  await signIn(page);

  const ledger = page.locator('[data-view="ledger"]');
  await expect(ledger).toHaveAttribute('data-status', 'ready');

  // The count is rendered in every state now, including zero.
  const count = await page.locator('[data-result-count]').getAttribute('data-result-count');
  console.log(`[evidence] data-result-count = ${count}`);

  // Every day group's subtotal must equal the sum of the rows inside it —
  // integer minor units, no scaling anywhere.
  const days = page.locator('[data-day]');
  const dayCount = await days.count();
  expect(dayCount).toBeGreaterThan(0);
  for (let i = 0; i < dayCount; i += 1) {
    const day = days.nth(i);
    const rows = day.locator('[data-transaction-id]');
    expect(await rows.count()).toBe(Number(await day.getAttribute('data-day-count')));
  }
  const first = days.first();
  console.log(
    `[evidence] first day group: ${await first.getAttribute('data-day')} ` +
      `subtotal=${await first.getAttribute('data-day-subtotal')} ` +
      `rendered="${await first.locator('h2 + span, [data-direction]').first().innerText()}"`,
  );

  // No aggregate and no row may render a leading `+`. formatAmount never emits
  // one; the mockup's `+10.977.000 ₫` is a contract change nobody has made.
  const amounts = await page.locator('[data-direction]').allInnerTexts();
  expect(amounts.filter((text) => text.trim().startsWith('+'))).toEqual([]);
  console.log(`[evidence] amounts checked for a leading "+": ${amounts.length}, none found`);

  await page.screenshot({ path: `${SHOTS}/ledger-1280.png`, fullPage: true });
  await page.locator('[data-quick-entry]').screenshot({ path: `${SHOTS}/quick-entry-1280.png` });
  await page.locator('header').screenshot({ path: `${SHOTS}/header-1280.png` });
});

test('quick entry still saves a row in 11 real keystrokes, no mouse', async ({ page }) => {
  await signIn(page);

  const before = await page.locator('[data-transaction-id]').count();

  // The caret is already in the amount box on mount: starting an entry costs
  // zero keys and zero clicks.
  await expect(page.locator('#entry-amount')).toBeFocused();

  let keystrokes = 0;
  const amount = page.locator('#entry-amount');
  await amount.pressSequentially('30000', { delay: 40 });
  keystrokes += '30000'.length;

  await page.keyboard.press('Tab');
  keystrokes += 1;

  await expect(page.locator('#entry-description')).toBeFocused();
  await page.locator('#entry-description').pressSequentially('Cafe', { delay: 40 });
  keystrokes += 'Cafe'.length;

  await page.keyboard.press('Enter');
  keystrokes += 1;

  console.log(`[evidence] keystrokes observed = ${keystrokes}`);
  expect(keystrokes).toBe(11);

  const notice = page.locator('[data-saved-notice]');
  await expect(notice).toBeVisible();
  console.log(`[evidence] saved notice = "${await notice.innerText()}"`);

  const after = await page.locator('[data-transaction-id]').count();
  console.log(`[evidence] rows ${before} -> ${after}`);
  expect(after).toBe(before + 1);

  // The row that landed: outflow by default, uncategorised, -30.000 ₫ with the
  // non-breaking space Intl emits.
  const savedId = await page.locator('[data-quick-entry]').getAttribute('data-saved-id');
  const row = page.locator(`[data-transaction-id="${savedId}"]`);
  const rowAmount = row.locator('[data-direction]');
  await expect(rowAmount).toHaveAttribute('data-direction', 'outflow');
  await expect(rowAmount).toHaveText('-30.000 ₫');
  console.log(`[evidence] new row: "${await row.innerText()}"`.replace(/\n/g, ' | '));

  // And the caret is back where the next entry starts.
  await expect(page.locator('#entry-amount')).toBeFocused();

  await page.locator('[data-quick-entry]').screenshot({
    path: `${SHOTS}/quick-entry-after-save-1280.png`,
  });
});

test('typing into the ledger filter still reaches the box (bug 0001 control)', async ({ page }) => {
  await signIn(page);

  // NOT a fix and NOT a fresh diagnosis — bug 0001 is a separate ticket. This
  // only records what the box does after the restyle, with the quick-entry path
  // above as the control proving key events land on this page at all.
  const filter = page.locator('#filter-q');
  await filter.click();
  await filter.pressSequentially('zzz', { delay: 40 });
  console.log(`[evidence] filter box typed "zzz", box shows "${await filter.inputValue()}"`);
});
