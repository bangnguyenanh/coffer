import { expect, test, type Page } from '@playwright/test';

/**
 * **Hub ticket 0003 phase 6 — the closing walkthrough of the core loop.**
 *
 * The ticket writes it out as one story, and this file is that story in order,
 * with a screenshot at every step:
 *
 *   > *log in, enter a transaction without a category, see it in the ledger
 *   > correctly formatted, correct its amount, find it by filter, then
 *   > categorize it from the triage inbox.*
 *
 * One test, one page load. This prototype has no persistence — `page.goto`
 * re-seeds the data and signs the session out — so a URL is not a way to reach a
 * state here, only a way to start over. Every move between screens is a
 * client-side nav click.
 *
 * **Every text box below is driven with real key events** (`pressSequentially` /
 * `keyboard.press`), never by setting a value. That is the rule bug 0001 was
 * born from: three verification passes injected values, injection delivers one
 * atomic state change, and a race structurally cannot show up under it. The one
 * exception is `<input type="date">`, which nothing here types into.
 *
 * ## Step 5 runs straight through bug 0001 — which is now FIXED
 *
 * **2026-08-27: bug 0001 is fixed and this file comes back clean.** It is kept
 * exactly as written, as the independent check: the spec that found the defect
 * now reports `"pho ga"` intact at every speed and ten of ten characters at
 * 0 ms/char, without a line of it changing. Its own fix bar lives in
 * `e2e/bug-0001-filter-keystrokes.spec.ts`, which asserts what this one reports.
 * The paragraphs below describe the defect as it stood; leave them.
 *
 * *"find it by filter"* means typing into `#filter-q`, which is where
 * [bug 0001](../../../management/bugs/0001-ledger-filter-drops-keystrokes.md)
 * lives. **Nothing here fixes it and nothing here touches `LedgerFilters`'s state
 * derivation** — this is a fourth independent observation, and the second test in
 * this file is a dedicated measurement across typing speeds with a control input
 * in the same run, which is what the bug's own fix bar asks for.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** `Intl` puts U+00A0 before ₫. `toHaveAttribute` does not forgive it. */
const NBSP = '\u00a0';

function step(n: number, what: string): void {
  console.log(`\n── STEP ${n} — ${what}`);
}
function note(line: string): void {
  console.log(`   ${line}`);
}

/** Tab from wherever the caret is until the first ledger row has focus. */
async function tabToFirstRow(page: Page): Promise<number> {
  const control = page.locator('[data-transaction-id] [data-row-control]').first();
  for (let i = 0; i < 40; i += 1) {
    if (await control.evaluate((el) => el === document.activeElement)) return i;
    await page.keyboard.press('Tab');
  }
  throw new Error('never reached the first ledger row by Tab');
}

test('0003 phase 6 walkthrough: enter without a category, correct it, find it, file it', async ({
  page,
}) => {
  /* ---------------------------------------------------------------------
   * 1. Log in.
   * ------------------------------------------------------------------ */
  step(1, 'log in');
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/wt-0003-1-login-1280.png` });

  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();
  note('one Enter, nothing typed — the landing screen is the dashboard (ticket 0004 phase 5)');

  await page.locator('header a[href="/ledger"]').click();
  const ledger = page.locator('[data-view="ledger"][data-status="ready"]');
  await expect(ledger).toBeVisible();

  const rowsBefore = Number(await ledger.locator('[data-result-count]').getAttribute('data-result-count'));
  const inboxBefore = Number(
    await page.locator('header [data-uncategorized-count]').getAttribute('data-uncategorized-count'),
  );
  note(`ledger: ${rowsBefore} rows · inbox badge: ${inboxBefore}`);
  await page.screenshot({ path: `${SHOTS}/wt-0003-2-ledger-1280.png` });

  /* ---------------------------------------------------------------------
   * 2. Enter a transaction WITHOUT a category.
   * ------------------------------------------------------------------ */
  step(2, 'enter a transaction, skipping the category');
  const amount = page.locator('#entry-amount');
  // Zero keys and zero clicks to start: the caret is already in the amount box.
  await expect(amount).toBeFocused();

  const DESCRIPTION = 'Pho ga trua';
  let keys = 0;
  await amount.pressSequentially('45000', { delay: 20 });
  keys += '45000'.length;
  await page.keyboard.press('Tab');
  keys += 1;
  const description = page.locator('#entry-description');
  await expect(description).toBeFocused();
  await description.pressSequentially(DESCRIPTION, { delay: 20 });
  keys += DESCRIPTION.length;

  // The control for bug 0001, established BEFORE the filter is ever touched:
  // every character sent to a plain `useState` text box in this session arrived.
  const typedDescription = await description.inputValue();
  note(`description: sent ${DESCRIPTION.length} chars, box holds ${typedDescription.length} — "${typedDescription}"`);
  expect(typedDescription).toBe(DESCRIPTION);

  // The category is skipped — that is the whole point of the triage inbox.
  await expect(page.locator('[data-quick-entry]')).toHaveAttribute('data-category-skipped', 'true');
  // The anti-100x affordance: what WOULD be stored, before it is.
  await expect(page.locator('[data-quick-entry]')).toHaveAttribute('data-amount-minor', '-45000');
  await expect(page.locator('[data-quick-entry]')).toHaveAttribute(
    'data-amount-preview',
    `-45.000${NBSP}₫`,
  );

  await page.keyboard.press('Enter');
  keys += 1;
  note(`saved with ${keys} real keystrokes, no mouse`);

  /* ---------------------------------------------------------------------
   * 3. See it in the ledger, correctly formatted.
   * ------------------------------------------------------------------ */
  step(3, 'see it in the ledger, correctly formatted');
  const savedId = await page.locator('[data-quick-entry]').getAttribute('data-saved-id');
  expect(savedId).not.toBe('');
  const row = page.locator(`[data-transaction-id="${savedId}"]`);
  const rowAmount = row.locator('[data-direction]').first();

  await expect(ledger.locator('[data-result-count]')).toHaveAttribute(
    'data-result-count',
    String(rowsBefore + 1),
  );
  // Thousands grouped with dots, U+00A0 before ₫, NO decimal digit, sign kept
  // and coloured by its own direction.
  await expect(rowAmount).toHaveText(`-45.000${NBSP}₫`);
  await expect(rowAmount).toHaveAttribute('data-direction', 'outflow');
  await expect(row).toContainText('Chưa phân loại');
  note(`rows ${rowsBefore} -> ${rowsBefore + 1}; new row id ${savedId}`);
  note(`row reads: "${(await row.innerText()).replace(/\n/g, ' | ')}"`);

  const inboxAfterEntry = Number(
    await page.locator('header [data-uncategorized-count]').getAttribute('data-uncategorized-count'),
  );
  note(`inbox badge ${inboxBefore} -> ${inboxAfterEntry}`);
  expect(inboxAfterEntry).toBe(inboxBefore + 1);

  // The caret is back where the next entry starts.
  await expect(amount).toBeFocused();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/wt-0003-3-entered-1280.png` });

  /* ---------------------------------------------------------------------
   * 4. Correct its amount.
   * ------------------------------------------------------------------ */
  step(4, 'correct the amount: 45.000 -> 65.000');
  // The row IS the control — one tab stop per row, `Enter` opens the editor.
  const tabs = await tabToFirstRow(page);
  const focusedId = await page.evaluate(
    () =>
      document.activeElement?.closest('[data-transaction-id]')?.getAttribute('data-transaction-id') ??
      null,
  );
  expect(focusedId).toBe(savedId);
  note(`${tabs} Tab presses from the amount box reach the new row (it is the most recent)`);

  await page.keyboard.press('Enter');
  const editor = page.locator(`[data-row-editor][data-editing-id="${savedId}"]`);
  await expect(editor).toBeVisible();
  const editAmount = page.locator(`#edit-${savedId}-amount`);
  await expect(editAmount).toBeFocused();
  note(`editor opened with 1 keystroke; amount box holds "${await editAmount.inputValue()}"`);

  // `ControlOrMeta+a`, never `Control+a` — on macOS the latter is "line start",
  // which silently turns a cleared field into an appended one.
  await page.keyboard.press('ControlOrMeta+a');
  await editAmount.pressSequentially('65000', { delay: 20 });
  await expect(editor).toHaveAttribute('data-amount-minor', '-65000');
  await expect(editor).toHaveAttribute('data-amount-preview', `-65.000${NBSP}₫`);
  await page.keyboard.press('Enter');

  await expect(editor).toHaveCount(0);
  await expect(rowAmount).toHaveText(`-65.000${NBSP}₫`);
  await expect(rowAmount).toHaveAttribute('data-direction', 'outflow');
  // The correction changed the amount and nothing else.
  await expect(row).toContainText(DESCRIPTION);
  await expect(row).toContainText('Chưa phân loại');
  await expect(ledger.locator('[data-result-count]')).toHaveAttribute(
    'data-result-count',
    String(rowsBefore + 1),
  );
  note(`corrected: -45.000 ₫ -> ${await rowAmount.textContent()} · still uncategorised, still ${rowsBefore + 1} rows`);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/wt-0003-4-corrected-1280.png` });

  /* ---------------------------------------------------------------------
   * 5. Find it by filter. THIS IS BUG 0001'S GROUND.
   * ------------------------------------------------------------------ */
  step(5, 'find it by filter — through #filter-q, where bug 0001 lives');
  const filter = page.locator('#filter-q');

  // ---- 5a. What the box does with a query that contains a SPACE. ----------
  //
  // Reported, never asserted away: this is an observation of a known open bug,
  // and the fix is a separate ticket. Nothing in this run touches
  // `LedgerFilters`'s state derivation.
  const SPACED = 'pho ga';
  await filter.click();
  await filter.pressSequentially(SPACED, { delay: 20 });
  const firstTry = await filter.inputValue();
  console.log(`   TYPED  ${SPACED.length} chars at 20ms/char: "${SPACED}"`);
  console.log(`   BOX    ${firstTry.length} chars: "${firstTry}"`);
  console.log(
    `   CONTROL (same run, same key events, plain useState box): ${typedDescription.length}/${DESCRIPTION.length} chars arrived`,
  );

  // Retyped SLOWLY, three more times. If the loss were only the suspected race
  // this would come out clean; whether it does is the interesting part.
  const retries: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    await filter.fill('');
    await filter.click();
    await filter.pressSequentially(SPACED, { delay: 120 });
    retries.push(await filter.inputValue());
  }
  console.log(`   RETYPED at 120ms/char x3 -> ${retries.map((r) => `"${r}"`).join(', ')}`);
  if (firstTry !== SPACED || retries.some((r) => r !== SPACED)) {
    console.log(
      `   >>> BUG 0001 REPRODUCED on #filter-q, and the control box lost nothing in the same run.`,
    );
  }

  // ---- 5b. Find the row. -------------------------------------------------
  //
  // A single-token query, which is what the ticket's step actually needs. It is
  // also the diacritic fold's own test: ASCII `trua` has to find `trưa`.
  const QUERY = 'trua';
  await filter.fill('');
  await filter.click();
  await filter.pressSequentially(QUERY, { delay: 20 });
  const landed = await filter.inputValue();
  note(`typed "${QUERY}" (${QUERY.length} chars) -> box holds "${landed}" (${landed.length} chars)`);
  expect(landed).toBe(QUERY);

  await expect(ledger).toHaveAttribute('data-filter-query', `q=${QUERY}`);
  const matched = Number(await ledger.locator('[data-result-count]').getAttribute('data-result-count'));
  const matchedText = await page.locator('[data-transaction-id]').allInnerTexts();
  note(`filter "${landed}" -> ${matched} rows`);
  for (const text of matchedText) note(`  · ${text.replace(/\n/g, ' | ')}`);

  // Three rows, and one of them is the row just entered and corrected.
  expect(matched).toBe(3);
  await expect(row).toBeVisible();
  await expect(row.locator('[data-direction]').first()).toHaveText(`-65.000${NBSP}₫`);
  note('diacritic fold intact: ASCII "trua" matched the fixtures\' "trưa"');
  await page.screenshot({ path: `${SHOTS}/wt-0003-5-filtered-1280.png`, fullPage: true });

  /* ---------------------------------------------------------------------
   * 6. Categorise it from the triage inbox.
   * ------------------------------------------------------------------ */
  step(6, 'categorise it from the triage inbox');
  await page.locator('header a[href="/triage"]').click();
  const triage = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(triage).toBeVisible();

  const inboxCount = Number(await triage.getAttribute('data-inbox-count'));
  note(`inbox holds ${inboxCount} rows; the list has focus on arrival — zero clicks to start`);
  // The new row is the most recent, so it is already under the cursor.
  await expect(triage).toHaveAttribute('data-cursor-id', savedId ?? '');

  const key = await page.locator('[data-assign-category="cat_food"]').getAttribute('data-assign-key');
  note(`"Ăn uống" is digit ${key} — a POSITION in the name-ordered list, not a stored field`);
  await page.keyboard.press(key ?? '1');

  await expect(triage).toHaveAttribute('data-inbox-count', String(inboxCount - 1));
  note(`one keystroke: inbox ${inboxCount} -> ${inboxCount - 1}`);
  await expect(page.locator('[data-transaction-id]', { hasText: DESCRIPTION })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/wt-0003-6-triaged-1280.png` });

  /* ---------------------------------------------------------------------
   * 7. And it is filed, on the ledger, with its corrected amount.
   * ------------------------------------------------------------------ */
  step(7, 'back on the ledger: filed, and the amount survived the round trip');
  await page.locator('header a[href="/ledger"]').click();
  await expect(ledger).toBeVisible();

  const finalRow = page.locator(`[data-transaction-id="${savedId}"]`);
  await expect(finalRow).toContainText('Ăn uống');
  await expect(finalRow).not.toContainText('Chưa phân loại');
  await expect(finalRow.locator('[data-direction]').first()).toHaveText(`-65.000${NBSP}₫`);
  note(`row reads: "${(await finalRow.innerText()).replace(/\n/g, ' | ')}"`);

  const inboxEnd = Number(
    await page.locator('header [data-uncategorized-count]').getAttribute('data-uncategorized-count'),
  );
  note(`inbox badge back to ${inboxEnd} — the loop closed`);
  expect(inboxEnd).toBe(inboxBefore);
  await finalRow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/wt-0003-7-categorised-1280.png` });
});

/**
 * **Bug 0001, observation four.** Not a fix, and not a diagnosis.
 *
 * Two earlier observers disagreed about the trigger — one said "only after
 * pressing the filter reset button", the PM saw it on the first typing instead —
 * and a third run could not reproduce it at all. So this measures rather than
 * concludes: the same string typed as real key events into `#filter-q` (router
 * state, the suspect) and into `#entry-description` (plain `useState`, the
 * control), at four typing speeds, in one run on one page load.
 *
 * The control is what the bug's own fix bar demands: a run whose control comes
 * back short proves keystrokes were not landing at all, and its filter numbers
 * are then a harness failure, not an app measurement.
 *
 * It asserts only the control. What the filter box did is REPORTED.
 */
test('bug 0001 — filter box vs a plain useState box, four typing speeds, one run', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();
  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();

  const filter = page.locator('#filter-q');
  const control = page.locator('#entry-description');
  const SAMPLE = 'zzzzzzzzzz'; // 10 chars, matches nothing in the fixtures
  const rows: string[] = [];

  for (const delay of [0, 5, 15, 40]) {
    // Cleared by injection ON PURPOSE: clearing is setup, not the measurement,
    // and `ControlOrMeta+a` + Delete would run through the very path under test.
    await filter.fill('');
    await control.fill('');
    await expect(filter).toHaveValue('');

    await filter.click();
    await filter.pressSequentially(SAMPLE, { delay });
    const filterGot = await filter.inputValue();

    await control.click();
    await control.pressSequentially(SAMPLE, { delay });
    const controlGot = await control.inputValue();

    rows.push(
      `  ${String(delay).padStart(2)}ms/char   filter ${String(filterGot.length).padStart(2)}/10 "${filterGot}"   control ${String(controlGot.length).padStart(2)}/10 "${controlGot}"`,
    );
    // The control is the only assertion: if it is short, nothing in this run is
    // an app measurement.
    expect(controlGot).toBe(SAMPLE);
  }

  console.log('\n[bug 0001] sent 10 real keystrokes per box, per speed:');
  for (const line of rows) console.log(line);

  /* ---- A SECOND, DIFFERENT signature: a space is lost deterministically. ---
   *
   * The suspected cause on the bug ticket is a race over async router state, and
   * the table above is consistent with one — it disappears above ~15ms/char. But
   * a query containing a SPACE loses that space at EVERY speed, including speeds
   * where ten consecutive characters arrive intact. A deterministic loss is not a
   * race, so this is reported as its own observation rather than folded into the
   * one above.
   */
  const SPACED = 'a b';
  const spacedResults: string[] = [];
  const controlResults: string[] = [];
  for (const delay of [40, 120]) {
    await filter.fill('');
    await control.fill('');
    await filter.click();
    await filter.pressSequentially(SPACED, { delay });
    spacedResults.push(`${delay}ms:"${await filter.inputValue()}"`);
    await control.click();
    await control.pressSequentially(SPACED, { delay });
    controlResults.push(`${delay}ms:"${await control.inputValue()}"`);
  }
  console.log(`[bug 0001] typed "a b" (3 chars incl. a space) into #filter-q     -> ${spacedResults.join('  ')}`);
  console.log(`[bug 0001] typed "a b" into #entry-description (control)          -> ${controlResults.join('  ')}`);
  // Only the control is asserted. What the filter did is the report.
  for (const result of controlResults) expect(result).toContain('"a b"');

  /* ---- The fix bar's other requirement: the diacritic fold still works. ----
   *
   * Typed, not injected, at 40ms/char — a speed the table above showed clean in
   * this same run, so a short box here would be an app finding and not a race.
   */
  await filter.fill('');
  await filter.click();
  await filter.pressSequentially('phe', { delay: 40 });
  const needle = await filter.inputValue();
  const matched = Number(
    await page.locator('[data-view="ledger"] [data-result-count]').getAttribute('data-result-count'),
  );
  console.log(`[bug 0001] "phe" typed at 40ms/char -> box "${needle}", ${matched} rows matched`);
  expect(needle).toBe('phe');
  // The nine `Cà phê` rows the fixtures carry, found by an ASCII query.
  expect(matched).toBe(9);
  console.log('[bug 0001] diacritic fold intact: 9 rows, the fixture count');

  await page.screenshot({ path: `${SHOTS}/bug-0001-observation-1280.png` });
});
