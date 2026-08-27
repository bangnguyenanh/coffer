import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Hub ticket 0004 phase 3 — categories, flat, CRUD.
 *
 * **The point of this file is the DELETE, not the form.** A category is a label
 * somebody put on a row afterwards; the row is the thing that actually happened.
 * So the headline test states the claim as numbers: deleting a category in use
 * moves its rows to uncategorised, the ledger's row count does not change by
 * one, and the rows land in the triage inbox where they can be re-filed.
 *
 * The second claim is about ORDER, and it is the one the ticket asked to have
 * said out loud. A category's swatch and its triage digit are both derived from
 * its POSITION in the name-ordered list — nothing stores either — so a create, a
 * rename and a delete all RE-ORDER them. These specs drive that and print the
 * before/after table rather than asserting a claim about the source.
 *
 * One page load per test. `page.goto` re-seeds the prototype and signs it out;
 * the header nav links are client-side and keep the session.
 *
 * Every text box is driven with `pressSequentially` — REAL key events. That is
 * bug 0001's lesson: injection delivers one atomic state change and structurally
 * cannot surface a race.
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

async function openCategories(page: Page): Promise<Locator> {
  await page.locator('header a[href="/categories"]').click();
  const view = page.locator('[data-view="categories"][data-status="ready"]');
  await expect(view).toBeVisible();
  return view;
}

/** The whole list as a reviewer reads it: name -> position, digit key, swatch. */
interface Placement {
  readonly name: string;
  readonly index: number;
  readonly key: string;
  readonly swatch: string;
}

async function placements(page: Page): Promise<readonly Placement[]> {
  return page.$$eval('[data-view="categories"] [data-category-id]', (nodes) =>
    nodes.map((node) => ({
      name: node.getAttribute('data-category-name') ?? '',
      index: Number(node.getAttribute('data-category-index')),
      key: node.getAttribute('data-category-key') ?? '',
      swatch: node.querySelector('[data-category-swatch]')?.getAttribute('data-category-swatch') ?? '',
    })),
  );
}

function printTable(label: string, rows: readonly Placement[]): void {
  console.log(`[evidence] ${label}`);
  for (const row of rows) {
    console.log(
      `  ${String(row.index).padStart(2)}  key ${(row.key === '' ? '—' : row.key).padEnd(2)}  ${row.swatch.padEnd(14)}  ${row.name}`,
    );
  }
}

const inboxCount = (page: Page): Promise<number> =>
  page
    .locator('header [data-uncategorized-count]')
    .getAttribute('data-uncategorized-count')
    .then(Number);

/* -------------------------------------------------------------------------
 * 1. The claim that matters: a delete keeps every transaction.
 * ---------------------------------------------------------------------- */

test('deleting a category in use reassigns its transactions — it never deletes them', async ({
  page,
}) => {
  await signIn(page);

  // The ledger's unfiltered row count is the number that must NOT move: it is
  // the whole ledger, and a cascade delete would take a bite out of it.
  const ledgerRows = Number(
    await page.locator('[data-view="ledger"] [data-result-count]').getAttribute('data-result-count'),
  );
  const inboxBefore = await inboxCount(page);

  const view = await openCategories(page);
  const target = page.locator('[data-category-id="cat_grocery"]');
  const usage = Number(await target.getAttribute('data-category-usage'));
  const categoriesBefore = Number(await view.getAttribute('data-category-count'));

  console.log(
    `[evidence] BEFORE {ledgerRows:${ledgerRows}, inbox:${inboxBefore}, categories:${categoriesBefore}, "Chợ & siêu thị" holds:${usage}}`,
  );
  expect(usage).toBeGreaterThan(0);

  await page.screenshot({ path: `${SHOTS}/categories-1280.png`, fullPage: true });

  await target.locator('[data-action="remove-category"]').click();

  // The undo bar arrives with the caret already on it — there is no confirmation
  // dialog anywhere on this surface (design-system.md §3.9).
  const bar = page.locator('[data-undo-bar][data-undo-kind="removed"]');
  await expect(bar).toBeVisible();
  await expect(bar.locator('[data-action="undo"]')).toBeFocused();
  await expect(view).toHaveAttribute('data-reassigned-count', String(usage));
  await expect(view).toHaveAttribute('data-category-count', String(categoriesBefore - 1));
  await expect(page.locator('[data-category-id="cat_grocery"]')).toHaveCount(0);

  // THE POINT: the rows moved, they did not die.
  const inboxAfter = await inboxCount(page);
  console.log(
    `[evidence] AFTER  {inbox:${inboxBefore} -> ${inboxAfter} (+${inboxAfter - inboxBefore}), categories:${categoriesBefore} -> ${categoriesBefore - 1}}`,
  );
  expect(inboxAfter - inboxBefore).toBe(usage);
  await page.screenshot({ path: `${SHOTS}/categories-delete-reassigns-1280.png`, fullPage: true });

  // The reassigned rows are in the inbox, ready to be re-filed.
  await page.locator('header a[href="/triage"]').click();
  const triage = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(triage).toBeVisible();
  await expect(triage).toHaveAttribute('data-inbox-count', String(inboxAfter));

  // And the ledger still holds every row it held before.
  await page.locator('header a[href="/ledger"]').click();
  const ledger = page.locator('[data-view="ledger"][data-status="ready"]');
  await expect(ledger).toBeVisible();
  await expect(ledger.locator('[data-result-count]')).toHaveAttribute(
    'data-result-count',
    String(ledgerRows),
  );
  console.log(`[evidence] ledger rows unchanged: ${ledgerRows}`);
});

test('undo puts the category back and re-files exactly the rows that moved', async ({ page }) => {
  await signIn(page);
  const inboxBefore = await inboxCount(page);
  const view = await openCategories(page);

  const target = page.locator('[data-category-id="cat_bills"]');
  const usage = Number(await target.getAttribute('data-category-usage'));
  const before = await placements(page);

  await target.locator('[data-action="remove-category"]').click();
  await expect(page.locator('[data-category-id="cat_bills"]')).toHaveCount(0);
  expect(await inboxCount(page)).toBe(inboxBefore + usage);

  // One `Enter` — the caret is already on `Hoàn tác`.
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-category-id="cat_bills"]')).toHaveCount(1);
  await expect(page.locator('[data-category-id="cat_bills"]')).toHaveAttribute(
    'data-category-usage',
    String(usage),
  );
  expect(await inboxCount(page)).toBe(inboxBefore);
  await expect(view).toHaveAttribute('data-category-count', String(before.length));

  // Exact, not approximate: the same id, the same position, the same key, the
  // same swatch — the list is name-ordered, so a restored name lands where it left.
  expect(await placements(page)).toEqual(before);
  console.log(`[evidence] undo restored cat_bills with its ${usage} rows and its place in the order`);
});

/* -------------------------------------------------------------------------
 * 2. What a create and a rename do to a colour and to a digit key.
 * ---------------------------------------------------------------------- */

test('creating a category re-orders the list, and with it every swatch and digit key', async ({
  page,
}) => {
  await signIn(page);
  await openCategories(page);

  const before = await placements(page);
  printTable('categories BEFORE create', before);

  await page.locator('[data-action="add-category"]').click();
  const field = page.locator('#category-new-name');
  await expect(field).toBeFocused();
  // REAL key events, one at a time.
  await field.pressSequentially('Bảo hiểm', { delay: 15 });
  await expect(field).toHaveValue('Bảo hiểm');
  await page.keyboard.press('Enter');

  const after = await placements(page);
  printTable('categories AFTER create "Bảo hiểm"', after);

  expect(after.length).toBe(before.length + 1);
  const created = after.find((row) => row.name === 'Bảo hiểm');
  expect(created).toBeDefined();
  // It sorted into place by name rather than onto the end.
  expect(created?.index).toBeLessThan(after.length - 1);

  const moved = before.filter((row) => {
    const now = after.find((candidate) => candidate.name === row.name);
    return now !== undefined && (now.key !== row.key || now.swatch !== row.swatch);
  });
  console.log(
    `[evidence] one create moved ${moved.length} of ${before.length} existing categories to a different digit key and/or swatch:`,
  );
  for (const row of moved) {
    const now = after.find((candidate) => candidate.name === row.name);
    console.log(
      `  ${row.name.padEnd(16)} key ${row.key} -> ${now?.key === '' ? '—' : now?.key}   ${row.swatch} -> ${now?.swatch}`,
    );
  }
  expect(moved.length).toBeGreaterThan(0);
});

test('renaming a category moves it, its swatch and its digit key', async ({ page }) => {
  await signIn(page);
  await openCategories(page);

  const before = await placements(page);
  const targetBefore = before.find((row) => row.name === 'Ăn uống');
  expect(targetBefore).toBeDefined();

  await page.locator('[data-category-id="cat_food"] [data-action="edit-category"]').click();
  const field = page.locator('#category-cat_food-name');
  await expect(field).toBeFocused();
  // `ControlOrMeta+a`, never `Control+a`: on macOS `Control+a` is line-start, so
  // a "cleared" field silently becomes an appended one.
  await field.press('ControlOrMeta+a');
  await field.pressSequentially('Đồ ăn', { delay: 15 });
  await expect(field).toHaveValue('Đồ ăn');
  await page.keyboard.press('Enter');

  const after = await placements(page);
  printTable('categories AFTER rename "Ăn uống" -> "Đồ ăn"', after);

  const targetAfter = after.find((row) => row.name === 'Đồ ăn');
  expect(targetAfter).toBeDefined();
  expect(after.length).toBe(before.length);
  console.log(
    `[evidence] the renamed category: index ${targetBefore?.index} -> ${targetAfter?.index}, key ${targetBefore?.key} -> ${targetAfter?.key}, swatch ${targetBefore?.swatch} -> ${targetAfter?.swatch}`,
  );
  expect(targetAfter?.index).not.toBe(targetBefore?.index);

  // The digit legend on the triage screen reads the SAME ordering, so the key
  // shown there moved with it — one ordering, two readings, no drift.
  await page.locator('header a[href="/triage"]').click();
  await expect(page.locator('[data-view="triage"][data-status="ready"]')).toBeVisible();
  await expect(page.locator('[data-assign-category="cat_food"]')).toHaveAttribute(
    'data-assign-key',
    targetAfter?.key ?? '',
  );
  console.log(
    `[evidence] triage legend agrees: cat_food is now key ${targetAfter?.key} on both screens`,
  );
});

/* -------------------------------------------------------------------------
 * 3. The form refuses rather than coerces.
 * ---------------------------------------------------------------------- */

test('a blank name and a duplicate name are both refused, with a reason', async ({ page }) => {
  await signIn(page);
  const view = await openCategories(page);
  const count = await view.getAttribute('data-category-count');

  await page.locator('[data-action="add-category"]').click();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-category-error]')).toBeVisible();
  await expect(page.locator('[data-category-error]')).toHaveText('Đặt tên cho danh mục.');
  await expect(view).toHaveAttribute('data-category-count', count ?? '');

  const field = page.locator('#category-new-name');
  await field.pressSequentially('cà phê', { delay: 15 });
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-category-error]')).toHaveText('Đã có danh mục trùng tên.');
  await expect(view).toHaveAttribute('data-category-count', count ?? '');
  console.log('[evidence] blank refused, and "cà phê" refused against "Cà phê" — nothing created');

  // Escape backs out; the list is untouched.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-category-form]')).toHaveCount(0);
  await expect(view).toHaveAttribute('data-category-count', count ?? '');
});
