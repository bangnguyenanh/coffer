import { expect, test, type Page } from '@playwright/test';

/**
 * **Bug 0001 — the ledger filter drops keystrokes. This file is the fix bar.**
 *
 * `management/bugs/0001-ledger-filter-drops-keystrokes.md` asks for exactly
 * three things, and each is a test below:
 *
 *  1. real keystrokes into `#filter-q` with **no loss**, at every speed,
 *  2. a **control input in the same run** proving the key events were landing,
 *  3. the diacritic fold still finding `Cà phê` from `ca phe` — 9 fixture rows —
 *     plus the fourth observation's addition: `pho ga` must survive being typed
 *     *as text with a space in it* and must still match (1 fixture row).
 *
 * ## Rules this file is built on, and why
 *
 * - **Real key events only** (`pressSequentially` / `keyboard.press`). Setting a
 *   value delivers one atomic state change and structurally cannot surface a
 *   race — that is precisely how bug 0001 survived three verification passes.
 *   The one place `fill('')` appears is *clearing between measurements*, which is
 *   setup rather than the measurement; `ControlOrMeta+a` + Delete would run the
 *   clear through the very path under test and confound it.
 * - **One page load per test.** This prototype has no persistence, so
 *   `page.goto` re-seeds the fixtures and signs the session out. Every move
 *   between screens is a client-side nav click.
 * - **`#entry-description` is the control**: a plain `useState` box on the same
 *   screen, in the same run, fed the same key events. A run whose control comes
 *   back short is a harness failure and none of its filter numbers mean anything.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** 10 chars, matching nothing in the fixtures — the loss is what is measured. */
const SAMPLE = 'zzzzzzzzzz';

/** Fixture facts this ticket must not move. */
const FIXTURE_ROWS = 56;
const FIXTURE_UNCATEGORIZED = 4;
const CA_PHE_ROWS = 9;
const PHO_GA_ROWS = 1;
/** `van phong` folds to contain `pho` — so a lost space widens the match to 3. */
const PHO_ROWS = 3;

async function signInAndOpenLedger(page: Page) {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  // The prototype account is prefilled; one Enter, nothing typed.
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();
  await page.locator('header a[href="/ledger"]').click();
  const ledger = page.locator('[data-view="ledger"][data-status="ready"]');
  await expect(ledger).toBeVisible();
  return ledger;
}

function countOf(ledger: ReturnType<Page['locator']>): Promise<string | null> {
  return ledger.locator('[data-result-count]').getAttribute('data-result-count');
}

test('bug 0001 (a) — the race: 10 real keystrokes per speed, filter vs control, one run', async ({
  page,
}) => {
  const ledger = await signInAndOpenLedger(page);

  // Fixtures unchanged, stated before anything is typed.
  expect(await countOf(ledger)).toBe(String(FIXTURE_ROWS));
  await expect(page.locator('header [data-uncategorized-count]')).toHaveAttribute(
    'data-uncategorized-count',
    String(FIXTURE_UNCATEGORIZED),
  );

  const filter = page.locator('#filter-q');
  const control = page.locator('#entry-description');
  const table: string[] = [];

  // 0ms is the worst case the diagnosis measured (total loss); 120ms is the
  // speed at which even the deterministic defect used to show.
  for (const delay of [0, 5, 15, 40, 120]) {
    await filter.fill('');
    await control.fill('');
    await expect(filter).toHaveValue('');

    await filter.click();
    await filter.pressSequentially(SAMPLE, { delay });
    const filterGot = await filter.inputValue();

    await control.click();
    await control.pressSequentially(SAMPLE, { delay });
    const controlGot = await control.inputValue();

    table.push(
      `  ${String(delay).padStart(3)}ms/char   filter ${String(filterGot.length).padStart(2)}/10 "${filterGot}"   control ${String(controlGot.length).padStart(2)}/10 "${controlGot}"`,
    );

    // The control first: if it is short, this run measured the harness.
    expect(controlGot, `control lost keystrokes at ${delay}ms/char — harness failure`).toBe(SAMPLE);
    expect(filterGot, `#filter-q lost keystrokes at ${delay}ms/char`).toBe(SAMPLE);
  }

  console.log('\n[bug 0001 a] 10 real keystrokes per box, per speed:');
  for (const line of table) console.log(line);

  // And the box is not merely displaying them: the query reached the matcher.
  await expect(ledger).toHaveAttribute('data-filter-query', `q=${SAMPLE}`);
  expect(await countOf(ledger)).toBe('0');
  console.log(`[bug 0001 a] "${SAMPLE}" -> 0 rows, data-filter-query="q=${SAMPLE}"`);
});

test('bug 0001 (a) — the dead theory: typing after the reset button is no different', async ({
  page,
}) => {
  // The ticket's history blamed the reset button. The diagnosis says the trigger
  // is typing RATE. This types at the fastest rate there is, before and after a
  // reset, and reports both.
  await signInAndOpenLedger(page);
  const filter = page.locator('#filter-q');

  await filter.click();
  await filter.pressSequentially(SAMPLE, { delay: 0 });
  const beforeReset = await filter.inputValue();

  await page.locator('[data-filter-reset]').click();
  await expect(filter).toHaveValue('');

  await filter.click();
  await filter.pressSequentially(SAMPLE, { delay: 0 });
  const afterReset = await filter.inputValue();

  console.log(
    `[bug 0001 a] 0ms/char, before reset "${beforeReset}" (${beforeReset.length}/10) · after reset "${afterReset}" (${afterReset.length}/10)`,
  );
  expect(beforeReset).toBe(SAMPLE);
  expect(afterReset).toBe(SAMPLE);
});

test('bug 0001 (b) — a space survives, and the space changes the match', async ({ page }) => {
  const ledger = await signInAndOpenLedger(page);
  const filter = page.locator('#filter-q');
  const control = page.locator('#entry-description');

  const SPACED = 'pho ga';
  const results: string[] = [];
  const controls: string[] = [];

  for (const delay of [0, 20, 120, 120, 120]) {
    await filter.fill('');
    await control.fill('');
    await filter.click();
    await filter.pressSequentially(SPACED, { delay });
    const got = await filter.inputValue();
    results.push(`${delay}ms:"${got}"`);

    await control.click();
    await control.pressSequentially(SPACED, { delay });
    controls.push(`${delay}ms:"${await control.inputValue()}"`);

    expect(await control.inputValue(), 'control lost the space — harness failure').toBe(SPACED);
    expect(got, `#filter-q mangled "${SPACED}" at ${delay}ms/char`).toBe(SPACED);
  }

  console.log(`\n[bug 0001 b] "${SPACED}" into #filter-q          -> ${results.join('  ')}`);
  console.log(`[bug 0001 b] "${SPACED}" into #entry-description  -> ${controls.join('  ')}`);

  // The space is not decoration: it narrows the match. `van phong` folds to
  // contain `pho`, so a swallowed space would read 3 rows instead of 1.
  await expect(ledger).toHaveAttribute('data-filter-query', 'q=pho+ga');
  expect(await countOf(ledger)).toBe(String(PHO_GA_ROWS));
  await expect(page.locator('[data-transaction-id]')).toHaveCount(PHO_GA_ROWS);
  await expect(page.locator('[data-transaction-id]').first()).toContainText('Phở gà');
  await page.screenshot({ path: `${SHOTS}/bug-0001-pho-ga-1280x900.png` });

  // Drop the ` ga` with real keystrokes and the match widens back to 3 — proof
  // the matcher is reading the whole typed string, space included. (The caret is
  // in the CONTROL box after the loop above; put it back, at the end.)
  await filter.click();
  await filter.press('End');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(filter).toHaveValue('pho');
  expect(await countOf(ledger)).toBe(String(PHO_ROWS));
  console.log(`[bug 0001 b] "pho ga" -> ${PHO_GA_ROWS} row · backspaced to "pho" -> ${PHO_ROWS} rows`);
});

test('bug 0001 — the fold survives the fix: "ca phe" typed at speed finds 9', async ({ page }) => {
  const ledger = await signInAndOpenLedger(page);
  const filter = page.locator('#filter-q');

  // Typed as real keystrokes, at the fastest rate, WITH the space that used to
  // be impossible to type. Two of the ticket's requirements in one string.
  await filter.click();
  await filter.pressSequentially('ca phe', { delay: 0 });
  await expect(filter).toHaveValue('ca phe');
  await expect(ledger).toHaveAttribute('data-filter-query', 'q=ca+phe');
  expect(await countOf(ledger)).toBe(String(CA_PHE_ROWS));
  await expect(page.locator('[data-transaction-id]')).toHaveCount(CA_PHE_ROWS);
  console.log(`\n[bug 0001] "ca phe" typed at 0ms/char -> ${CA_PHE_ROWS} rows (Cà phê), fold intact`);
  await page.screenshot({ path: `${SHOTS}/bug-0001-ca-phe-1280x900.png` });
});

test('bug 0001 — the other four controls: five filters set back to back, none clobbered', async ({
  page,
}) => {
  // `from`, `to`, `account_id` and `category_id` shared the same stale-base
  // derivation as `q`; they are just low-frequency enough that a lost event was
  // never noticed. Set all five as fast as the driver allows and check that the
  // fifth write did not compute from a base missing the first four.
  const ledger = await signInAndOpenLedger(page);

  await page.locator('#filter-from').fill('2026-07-01');
  await page.locator('#filter-to').fill('2026-07-31');
  await page.locator('#filter-account').selectOption({ index: 1 });
  await page.locator('#filter-category').selectOption('none');
  await page.locator('#filter-q').click();
  await page.locator('#filter-q').pressSequentially('a', { delay: 0 });

  const query = await ledger.getAttribute('data-filter-query');
  console.log(`\n[bug 0001] five filters set back to back -> data-filter-query="${query}"`);
  const params = new URLSearchParams(query ?? '');
  for (const key of ['from', 'to', 'account_id', 'category_id', 'q']) {
    expect(params.get(key), `${key} was clobbered by a later write`).not.toBeNull();
  }
  expect(params.get('from')).toBe('2026-07-01');
  expect(params.get('to')).toBe('2026-07-31');
  expect(params.get('category_id')).toBe('none');
  expect(params.get('q')).toBe('a');

  // The controls still SHOW what was set — the round trip did not eat one.
  await expect(page.locator('#filter-from')).toHaveValue('2026-07-01');
  await expect(page.locator('#filter-to')).toHaveValue('2026-07-31');
  await expect(page.locator('#filter-category')).toHaveValue('none');
  await expect(page.locator('#filter-q')).toHaveValue('a');
  await page.screenshot({ path: `${SHOTS}/bug-0001-five-filters-1280x900.png` });
});

test('bug 0001 — a filtered ledger is still linkable, and quick entry is still 11 keystrokes', async ({
  page,
}) => {
  // What the fix must NOT have cost.
  const ledger = await signInAndOpenLedger(page);
  const filter = page.locator('#filter-q');
  await filter.click();
  await filter.pressSequentially('ca phe', { delay: 0 });
  expect(await countOf(ledger)).toBe(String(CA_PHE_ROWS));

  // (1) The address bar still mirrors exactly what is being matched — the reason
  // filters were put in the URL, and it is still true after the fix.
  expect(new URL(page.url()).search).toBe('?q=ca+phe');
  console.log(`\n[bug 0001] address bar after typing: ${new URL(page.url()).search}`);

  // (2) The URL still SEEDS the filters. Checked by leaving the ledger and
  // coming back through history — a client-side popstate, not `page.goto`,
  // which on this prototype would re-seed the data and sign the session out.
  await page.locator('header a[href="/triage"]').click();
  await expect(page.locator('[data-view="triage"][data-status="ready"]')).toBeVisible();
  await page.goBack();
  await expect(ledger).toBeVisible();
  await expect(filter).toHaveValue('ca phe');
  expect(await countOf(ledger)).toBe(String(CA_PHE_ROWS));
  console.log(
    `[bug 0001] back to ${new URL(page.url()).search} -> box "ca phe", ${CA_PHE_ROWS} rows: the URL still seeds the filters`,
  );

  // (3) The measured entry path, re-measured on this same page load.
  const amount = page.locator('#entry-amount');
  await amount.click();
  await page.keyboard.press('ControlOrMeta+a');
  let keys = 0;
  await amount.pressSequentially('30000', { delay: 20 });
  keys += 5;
  await page.keyboard.press('Tab');
  keys += 1;
  const description = page.locator('#entry-description');
  await expect(description).toBeFocused();
  await description.pressSequentially('Cafe', { delay: 20 });
  keys += 4;
  await page.keyboard.press('Enter');
  keys += 1;
  const savedId = await page.locator('[data-quick-entry]').getAttribute('data-saved-id');
  expect(savedId).not.toBe('');
  expect(keys).toBe(11);
  console.log(`[bug 0001] quick entry: ${keys} keystrokes, saved ${savedId}`);
});
