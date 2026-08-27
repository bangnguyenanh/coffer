import { expect, test, type Page } from '@playwright/test';

/**
 * Hub ticket 0003 phase 5 — the uncategorised triage inbox.
 *
 * What is being demonstrated, in the order it matters:
 *
 *   1. **the header count is a destination now**, not a scoreboard;
 *   2. **one keystroke per row** clears the inbox one row at a time — no `Tab`,
 *      no arrow, no `<select>` round trip;
 *   3. **two keystrokes clear any N** (`A` then a digit), which is the "in a
 *      batch" the ticket asks for, measured at a volume higher than the
 *      fixtures ship with;
 *   4. **it is undoable** — the previous `category_id` of every affected row
 *      comes back exactly;
 *   5. the cleared inbox is a terminal state carrying `data-status="ready"`.
 *
 * Everything runs on ONE page load per test. This prototype has no persistence:
 * a reload re-seeds the data AND signs out, so `page.goto` is a way to start
 * over, never a way to reach a state.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
}

/** Add an uncategorised row through quick entry, with real keystrokes. */
async function quickAdd(page: Page, amount: string, description: string): Promise<void> {
  const box = page.locator('#entry-amount');
  await box.focus();
  await box.pressSequentially(amount, { delay: 15 });
  await page.keyboard.press('Tab');
  await page.locator('#entry-description').pressSequentially(description, { delay: 15 });
  await page.keyboard.press('Enter');
}

test('the header badge is a link to the inbox, and the count is live', async ({ page }) => {
  await signIn(page);

  const badge = page.locator('header [data-uncategorized-count]');
  await expect(badge).toHaveAttribute('data-uncategorized-count', '4');
  expect(await badge.evaluate((el) => el.tagName)).toBe('A');
  console.log(`[evidence] header badge is <${await badge.evaluate((el) => el.tagName)}> href=${await badge.getAttribute('href')}`);

  await badge.click();
  const view = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute('data-inbox-count', '4');
  await expect(page.locator('[data-triage-list] [role="option"]')).toHaveCount(4);

  // The list took focus on arrival: triaging costs zero clicks to start.
  await expect(page.locator('[data-triage-list]')).toBeFocused();
  await expect(view).toHaveAttribute('data-cursor-index', '0');

  await page.screenshot({ path: `${SHOTS}/triage-1280.png`, fullPage: true });
  await page.locator('[data-category-legend]').screenshot({
    path: `${SHOTS}/triage-legend-1280.png`,
  });
});

test('one keystroke per row clears the inbox, and the cursor never has to be moved', async ({
  page,
}) => {
  await signIn(page);
  await page.locator('header [data-uncategorized-count]').click();
  const view = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(view).toBeVisible();

  const start = Number(await view.getAttribute('data-inbox-count'));
  expect(start).toBe(4);

  // `1` is the first category in name order. Assigning removes the row from the
  // inbox, so the next row falls under the cursor by itself — the cursor is
  // never moved, and no Tab is ever pressed.
  let keystrokes = 0;
  for (let remaining = start; remaining > 0; remaining -= 1) {
    const cursorId = await view.getAttribute('data-cursor-id');
    await page.keyboard.press(String((keystrokes % 4) + 1));
    keystrokes += 1;
    await expect(view).toHaveAttribute('data-inbox-count', String(remaining - 1));
    console.log(`[evidence] key ${keystrokes} assigned ${cursorId}; remaining ${remaining - 1}`);
  }

  console.log(`[evidence] keystrokes to clear ${start} rows, one at a time = ${keystrokes}`);
  expect(keystrokes).toBe(start);

  // Terminal state, and it says ready — a poll that only accepts the populated
  // screen would hang here forever.
  await expect(view).toHaveAttribute('data-status', 'ready');
  await expect(view).toHaveAttribute('data-inbox-count', '0');
  await expect(page.locator('[data-triage-empty]')).toBeVisible();
  console.log(`[evidence] empty state = "${await page.locator('[data-triage-empty]').innerText()}"`);
  await page.screenshot({ path: `${SHOTS}/triage-cleared-1280.png` });

  // The header count followed, with nothing telling it to.
  await expect(page.locator('header [data-uncategorized-count]')).toHaveAttribute(
    'data-uncategorized-count',
    '0',
  );
});

test('A then a digit clears a whole batch — two keystrokes for any N', async ({ page }) => {
  await signIn(page);

  // The fixtures ship FOUR uncategorised rows. The phase-4 agent's finding is
  // that real volume is much higher, because skipping the category is faster
  // than choosing it — so the batch is measured at a volume the fixtures do not
  // carry, built the way a user would build it: through quick entry.
  const added = 8;
  for (let i = 0; i < added; i += 1) {
    await quickAdd(page, String((i + 1) * 1000), `Chi phi ${i + 1}`);
  }
  await expect(page.locator('header [data-uncategorized-count]')).toHaveAttribute(
    'data-uncategorized-count',
    String(4 + added),
  );

  await page.locator('header [data-uncategorized-count]').click();
  const view = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(view).toBeVisible();
  const total = Number(await view.getAttribute('data-inbox-count'));
  expect(total).toBe(4 + added);
  console.log(`[evidence] inbox volume for the batch measurement = ${total} rows`);

  let keystrokes = 0;
  await page.keyboard.press('a');
  keystrokes += 1;
  await expect(view).toHaveAttribute('data-selected-count', String(total));
  console.log(`[evidence] after "A": data-selected-count = ${await view.getAttribute('data-selected-count')}`);

  await page.keyboard.press('2');
  keystrokes += 1;

  console.log(`[evidence] keystrokes to clear ${total} rows in one batch = ${keystrokes}`);
  expect(keystrokes).toBe(2);
  await expect(view).toHaveAttribute('data-inbox-count', '0');
  await expect(page.locator('[data-triage-empty]')).toBeVisible();

  // Undo restores every one of them, to `null`, not to some default category.
  const bar = page.locator('[data-undo-bar][data-undo-kind="assigned"]');
  await expect(bar).toBeVisible();
  console.log(`[evidence] undo bar = "${await bar.locator('[data-undo-message]').innerText()}"`);
  await bar.locator('[data-action="undo"]').click();

  await expect(view).toHaveAttribute('data-inbox-count', String(total));
  await expect(page.locator('[data-triage-list] [role="option"]')).toHaveCount(total);
  console.log(`[evidence] after undo: ${await view.getAttribute('data-inbox-count')} rows back in the inbox`);
});

test('Shift+Arrow selects a range and one digit assigns exactly that range', async ({ page }) => {
  await signIn(page);
  await page.locator('header [data-uncategorized-count]').click();
  const view = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute('data-inbox-count', '4');

  // Cursor on row 0; extend down two rows -> rows 0,1,2 selected.
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(view).toHaveAttribute('data-selected-count', '3');
  const selectedIds = await page
    .locator('[data-triage-list] [data-selected="true"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-transaction-id')));
  console.log(`[evidence] Shift+ArrowDown x2 selected ${selectedIds.length}: ${selectedIds.join(', ')}`);

  await page.keyboard.press('3');
  await expect(view).toHaveAttribute('data-inbox-count', '1');
  await expect(view).toHaveAttribute('data-selected-count', '0');
  console.log(`[evidence] one digit assigned the 3-row range; 1 row left in the inbox`);

  // The untouched row is the one that was NOT in the range.
  const left = await page
    .locator('[data-triage-list] [role="option"]')
    .first()
    .getAttribute('data-transaction-id');
  expect(selectedIds).not.toContain(left);
  console.log(`[evidence] the row still uncategorised is ${left}, which was outside the range`);
});

test('a triaged row leaves the inbox and shows its category on the ledger', async ({ page }) => {
  await signIn(page);
  await page.locator('header [data-uncategorized-count]').click();
  const view = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(view).toBeVisible();

  const id = (await view.getAttribute('data-cursor-id')) as string;
  const amountBefore = await page
    .locator(`[data-triage-list] [data-transaction-id="${id}"] [data-direction]`)
    .innerText();

  // `5` is the fifth category in name order.
  const legendName = await page.locator('[data-assign-key="5"]').innerText();
  await page.keyboard.press('5');
  await expect(page.locator(`[data-triage-list] [data-transaction-id="${id}"]`)).toHaveCount(0);

  // Back on the ledger: same row, same amount, no longer "Chưa phân loại".
  await page.locator('nav a[href="/"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
  const row = page.locator(`[data-transaction-id="${id}"]`);
  await expect(row).toHaveCount(1);
  const rowText = await row.innerText();
  console.log(`[evidence] ${id} assigned to "${legendName.replace(/\s+/g, ' ').trim()}"; ledger row now reads "${rowText.replace(/\n/g, ' | ')}"`);
  expect(rowText).not.toContain('Chưa phân loại');
  expect(await row.locator('[data-direction]').innerText()).toBe(amountBefore);
  console.log(`[evidence] amount unchanged across the assignment: "${amountBefore}"`);
});
