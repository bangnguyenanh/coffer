import { expect, test, type Page } from '@playwright/test';

/**
 * Hub ticket 0003 phase 4 — the edit / delete half.
 *
 * Three claims, and each one is driven rather than asserted about the source:
 *
 *   1. **an edit is parsed by the entry rules** — a decimal separator is refused
 *      WITH A REASON and nothing is stored, exactly as in quick entry;
 *   2. **the ledger keeps its place** — after a save the edited row is still at
 *      the same viewport offset, including when the edit re-sorts it into a
 *      different day group;
 *   3. **delete is undoable from the keyboard** — `Delete` on a row removes it,
 *      the caret lands on `Hoàn tác`, and one `Enter` puts the row back in the
 *      slot it left.
 *
 * Every text box this ticket added is driven with `pressSequentially` /
 * `keyboard.press` — REAL key events. Injection delivers one atomic state change
 * and structurally cannot surface a race; that is how bug 0001 hid through three
 * verification passes. The one exception is `<input type="date">`, which is
 * filled: its typed input is segmented and locale-dependent, and it is not a
 * free-text box where the race lives. Called out here rather than glossed.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.locator('#login-email').press('Enter');
  // Ticket 0004 phase 5 moved the landing route: a sign-in now lands on the
  // DASHBOARD and the ledger is `/ledger`, one client-side click away. A `goto`
  // would re-seed the prototype and sign it out, so the nav link is the way.
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();
  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
}

/** A row's distance from the top of the viewport, read straight off the DOM. */
function rowTop(page: Page, id: string): Promise<number | null> {
  return page.evaluate((rowId) => {
    const element = document.querySelector(`[data-transaction-id="${rowId}"]`);
    return element === null ? null : element.getBoundingClientRect().top;
  }, id);
}

test('a row opens for editing from the keyboard alone, and Tab cost is one stop per row', async ({
  page,
}) => {
  await signIn(page);

  // NOTE: everything below stays on ONE page load on purpose. This prototype has
  // no persistence — a `goto` re-seeds the app AND signs it out — so a URL is not
  // a way to reach a state here, only a way to start over.
  const firstRow = page.locator('[data-transaction-id]').first();
  const firstId = (await firstRow.getAttribute('data-transaction-id')) as string;
  const firstButton = firstRow.locator('[data-action="edit-transaction"]');

  // Tab from the amount box (where the caret starts) until the first row has
  // focus: that count is the whole fixed overhead — quick entry plus filters.
  let tabs = 0;
  for (let i = 0; i < 40; i += 1) {
    if (await firstButton.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
    tabs += 1;
  }
  await expect(firstButton).toBeFocused();
  console.log(`[evidence] Tab presses from the amount box to the FIRST row: ${tabs}`);

  // And exactly one more Tab reaches the second row: one stop per row, not two.
  await page.keyboard.press('Tab');
  const secondId = await page.evaluate(
    () => document.activeElement?.closest('[data-transaction-id]')?.getAttribute('data-transaction-id') ?? null,
  );
  const expectedSecond = await page.locator('[data-transaction-id]').nth(1).getAttribute('data-transaction-id');
  console.log(`[evidence] one Tab from row ${firstId} lands on ${secondId} (row 2 is ${expectedSecond})`);
  expect(secondId).toBe(expectedSecond);

  // Reach a specific row deep in the list. `.focus()` is what those Tabs would
  // do — it moves focus, it does not inject a value.
  const rowButton = page.locator('[data-transaction-id="txn_033"] [data-action="edit-transaction"]');
  await rowButton.focus();
  await expect(rowButton).toBeFocused();

  // One key opens it. No mouse anywhere in this path.
  await page.keyboard.press('Enter');
  const editor = page.locator('[data-row-editor][data-editing-id="txn_033"]');
  await expect(editor).toBeVisible();
  await expect(page.locator('#edit-txn_033-amount')).toBeFocused();

  // It opened on the value the ledger was showing, grouped and unsigned, with
  // the direction on the toggle rather than in the box.
  const opened = await page.locator('#edit-txn_033-amount').inputValue();
  console.log(`[evidence] editor opened with amount box = "${opened}"`);
  expect(opened).toBe('1.250.000.000');
  await expect(editor).toHaveAttribute('data-direction', 'outflow');
  await expect(editor).toHaveAttribute('data-amount-minor', '-1250000000');
  // `\u00a0` written out: `Intl.NumberFormat('vi-VN')` emits a NON-BREAKING
  // space before `₫`. `toHaveText` normalises whitespace and would hide this;
  // `toHaveAttribute` compares raw, so a plain space fails against CORRECT
  // output. This line is the difference between the two matchers, in one place.
  await expect(editor).toHaveAttribute('data-amount-preview', '-1.250.000.000\u00a0₫');

  await page.screenshot({ path: `${SHOTS}/row-editing-1280.png` });
  await editor.screenshot({ path: `${SHOTS}/row-editor-1280.png` });

  // Escape abandons the edit and hands the caret back to the row.
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(rowButton).toBeFocused();
});

test('editing rejects a decimal with a reason and stores nothing', async ({ page }) => {
  await signIn(page);

  await page.locator('[data-transaction-id="txn_033"] [data-action="edit-transaction"]').click();
  const editor = page.locator('[data-row-editor][data-editing-id="txn_033"]');
  await expect(editor).toBeVisible();

  const amount = page.locator('#edit-txn_033-amount');
  await amount.press('ControlOrMeta+a');
  await amount.press('Backspace');
  await amount.pressSequentially('30,5', { delay: 40 });
  expect(await amount.inputValue()).toBe('30,5');

  await page.keyboard.press('Enter');

  // Refused, named, and still open on what was typed — not rounded away.
  await expect(editor).toHaveAttribute('data-amount-error', 'DECIMAL_NOT_ALLOWED');
  const message = page.locator('[data-error-field="amount"]');
  await expect(message).toBeVisible();
  console.log(`[evidence] rejection rendered = "${await message.innerText()}"`);
  expect(await amount.inputValue()).toBe('30,5');

  // The stored row is untouched: cancel and read it back off the ledger.
  await page.keyboard.press('Escape');
  const rowAmount = page.locator('[data-transaction-id="txn_033"] [data-direction]');
  await expect(rowAmount).toHaveText('-1.250.000.000 ₫');
  console.log(`[evidence] row after the rejected edit = "${await rowAmount.innerText()}"`);

  // And no row anywhere rendered a coerced 30 / 31 / 305 / 3.050. Swept on the
  // same page load — a reload would re-seed and prove nothing about this edit.
  const texts = await page.locator('[data-direction]').allInnerTexts();
  const coerced = texts.filter((t) =>
    ['30 ₫', '-30 ₫', '31 ₫', '-31 ₫', '305 ₫', '-305 ₫', '3.050 ₫', '-3.050 ₫'].includes(
      t.trim(),
    ),
  );
  console.log(`[evidence] amounts swept for a coerced value: ${texts.length}, matches ${coerced.length}`);
  expect(coerced).toEqual([]);
});

test('a saved edit keeps the row where the reader was looking', async ({ page }) => {
  await signIn(page);

  // Scroll well down the ledger and pick a row sitting mid-viewport.
  await page.evaluate(() => window.scrollTo(0, 1800));
  const id = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-transaction-id]')];
    const hit = rows.find((r) => {
      const top = r.getBoundingClientRect().top;
      return top > 250 && top < 520;
    });
    return hit?.getAttribute('data-transaction-id') ?? null;
  });
  expect(id).not.toBeNull();
  const rowId = id as string;

  const topBefore = await rowTop(page, rowId);
  const dayBefore = await page
    .locator(`[data-transaction-id="${rowId}"]`)
    .getAttribute('data-occurred-on');
  console.log(`[evidence] editing ${rowId}, viewport top before = ${topBefore}, day = ${dayBefore}`);

  await page.locator(`[data-transaction-id="${rowId}"] [data-action="edit-transaction"]`).click();
  const editor = page.locator(`[data-row-editor][data-editing-id="${rowId}"]`);
  await expect(editor).toBeVisible();

  // Real keystrokes into the description, then a date change that re-sorts the
  // row into a different day group — the hardest case for keeping a place.
  const description = page.locator(`#edit-${rowId}-description`);
  await description.click();
  await description.press('ControlOrMeta+a');
  await description.press('Backspace');
  await description.pressSequentially('Sua mo ta', { delay: 40 });
  expect(await description.inputValue()).toBe('Sua mo ta');

  await page.locator(`#edit-${rowId}-date`).fill('2026-07-02');
  await page.keyboard.press('Enter');

  await expect(editor).toHaveCount(0);
  const row = page.locator(`[data-transaction-id="${rowId}"]`);
  await expect(row).toHaveAttribute('data-occurred-on', '2026-07-02');

  const topAfter = await rowTop(page, rowId);
  const shift = await page.locator('[data-transaction-list]').getAttribute('data-anchor-shift');
  console.log(
    `[evidence] viewport top after = ${topAfter} (before ${topBefore}); ` +
      `page corrected by data-anchor-shift = ${shift}px`,
  );
  // The row moved to a different day group and is still under the same eyes.
  expect(Math.abs((topAfter as number) - (topBefore as number))).toBeLessThanOrEqual(1);
  await expect(row.locator('span').first()).toBeVisible();
  console.log(`[evidence] row text after save = "${await row.innerText()}"`);
});

test('Delete removes a row and one Enter on the focused undo puts it back in place', async ({
  page,
}) => {
  await signIn(page);

  const before = await page.locator('[data-transaction-id]').count();

  // Reach a row from the keyboard, then delete it — no mouse.
  const rows = page.locator('[data-transaction-id]');
  const targetId = (await rows.nth(2).getAttribute('data-transaction-id')) as string;
  const neighbourBefore = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[data-transaction-id]')].map((r) =>
      r.getAttribute('data-transaction-id'),
    );
    return { index: 2, prev: all[1], next: all[3] };
  });

  const rowButton = page.locator(
    `[data-transaction-id="${targetId}"] [data-action="edit-transaction"]`,
  );
  await rowButton.focus();
  await expect(rowButton).toBeFocused();

  let keystrokes = 0;
  await page.keyboard.press('Delete');
  keystrokes += 1;

  const after = await page.locator('[data-transaction-id]').count();
  console.log(`[evidence] rows ${before} -> ${after} after one Delete on ${targetId}`);
  expect(after).toBe(before - 1);
  await expect(page.locator(`[data-transaction-id="${targetId}"]`)).toHaveCount(0);

  // No dialog, no confirmation — an undo bar, with the caret already on it.
  const bar = page.locator('[data-undo-bar][data-undo-kind="deleted"]');
  await expect(bar).toBeVisible();
  console.log(`[evidence] undo bar = "${await bar.locator('[data-undo-message]').innerText()}"`);
  await expect(page.locator('[data-undo-bar] [data-action="undo"]')).toBeFocused();
  expect(await page.locator('dialog, [role="dialog"], [role="alertdialog"]').count()).toBe(0);

  await page.screenshot({ path: `${SHOTS}/ledger-after-delete-1280.png` });

  await page.keyboard.press('Enter');
  keystrokes += 1;
  console.log(`[evidence] keystrokes to delete AND fully recover = ${keystrokes}`);
  expect(keystrokes).toBe(2);

  await expect(page.locator('[data-transaction-id]')).toHaveCount(before);
  await expect(bar).toHaveCount(0);

  // Back in the slot it left — same neighbours, not appended at the end.
  const neighbourAfter = await page.evaluate((id) => {
    const all = [...document.querySelectorAll('[data-transaction-id]')].map((r) =>
      r.getAttribute('data-transaction-id'),
    );
    const index = all.indexOf(id);
    return { index, prev: all[index - 1], next: all[index + 1] };
  }, targetId);
  console.log(
    `[evidence] ${targetId} restored at index ${neighbourAfter.index} ` +
      `(was ${neighbourBefore.index}); prev ${neighbourAfter.prev} / next ${neighbourAfter.next}`,
  );
  expect(neighbourAfter).toEqual(neighbourBefore);

  // And the caret came back with it.
  await expect(rowButton).toBeFocused();
});

test('quick entry still saves a row in 11 real keystrokes after the extraction', async ({
  page,
}) => {
  // The regression guard for phase 4's first half: `EntryFields` was pulled out
  // of `QuickEntry` so the row editor could be the same form. Same DOM order,
  // therefore the same tab order — re-measured here rather than assumed.
  await signIn(page);
  const before = await page.locator('[data-transaction-id]').count();
  await expect(page.locator('#entry-amount')).toBeFocused();

  let keystrokes = 0;
  await page.locator('#entry-amount').pressSequentially('30000', { delay: 40 });
  keystrokes += 5;
  await page.keyboard.press('Tab');
  keystrokes += 1;
  await expect(page.locator('#entry-description')).toBeFocused();
  await page.locator('#entry-description').pressSequentially('Cafe', { delay: 40 });
  keystrokes += 4;
  await page.keyboard.press('Enter');
  keystrokes += 1;

  console.log(`[evidence] quick-entry keystrokes observed = ${keystrokes}`);
  expect(keystrokes).toBe(11);
  expect(await page.locator('[data-transaction-id]').count()).toBe(before + 1);

  const savedId = await page.locator('[data-quick-entry]').getAttribute('data-saved-id');
  const rowAmount = page.locator(`[data-transaction-id="${savedId}"] [data-direction]`);
  await expect(rowAmount).toHaveAttribute('data-direction', 'outflow');
  await expect(rowAmount).toHaveText('-30.000 ₫');
  await expect(page.locator('#entry-amount')).toBeFocused();
  console.log(`[evidence] saved ${savedId} = "${await rowAmount.innerText()}", caret back in the amount box`);
});
