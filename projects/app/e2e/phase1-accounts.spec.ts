import { expect, test, type Page } from '@playwright/test';

/**
 * Hub ticket 0004 phase 1 — accounts.
 *
 * What is being demonstrated:
 *
 *   1. **every balance is DERIVED** — opening balance plus that account's rows,
 *      checked against arithmetic done in the spec rather than against a number
 *      the app also produced;
 *   2. the account detail page's balance **agrees with the list's**, because
 *      both derive it and neither stores it;
 *   3. creating an account is typed, with real key events, and its balance is
 *      right the moment it exists;
 *   4. **archive, never delete** — an archived account leaves the entry picker
 *      and keeps every row, and undo puts it back.
 *
 * Everything runs on ONE page load per test. This prototype has no persistence:
 * `page.goto` re-seeds the data AND signs out, so it is a way to start over,
 * never a way to reach a state. Navigation between screens goes through the nav
 * links, which are client-side and keep the session.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** Opening balances as they stand in `src/data/accounts.json`. */
const OPENING = {
  acc_cash: 3_500_000,
  acc_vcb: 1_320_000_000,
  acc_momo: 2_000_000,
  acc_tpb_savings: 60_000_000,
} as const;

/** What the fixture rows sum to, per account. Derived independently below too. */
const ROW_SUMS = {
  acc_cash: -2_350_000,
  acc_vcb: -1_197_779_000,
  acc_momo: -1_230_000,
  acc_tpb_savings: 0,
} as const;

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

async function openAccounts(page: Page) {
  await page.locator('header a[href="/accounts"]').click();
  const view = page.locator('[data-view="accounts"][data-status="ready"]');
  await expect(view).toBeVisible();
  return view;
}

function balanceOf(page: Page, accountId: string) {
  return page.locator(`[data-account-id="${accountId}"]`);
}

test('every balance on the list is derived from opening balance + rows', async ({ page }) => {
  await signIn(page);
  const view = await openAccounts(page);

  await expect(view).toHaveAttribute('data-active-account-count', '4');
  await expect(view).toHaveAttribute('data-archived-account-count', '0');

  let expectedTotal = 0;
  for (const [id, opening] of Object.entries(OPENING)) {
    const expected = opening + ROW_SUMS[id as keyof typeof ROW_SUMS];
    expectedTotal += expected;
    const row = balanceOf(page, id);
    await expect(row).toHaveAttribute('data-balance-minor', String(expected));
    console.log(
      `[evidence] ${id}: opening ${opening} + rows ${ROW_SUMS[id as keyof typeof ROW_SUMS]} = ${expected} · rendered "${await row.locator('[data-direction]').innerText()}"`,
    );
  }

  await expect(view).toHaveAttribute('data-total-balance-minor', String(expectedTotal));
  console.log(`[evidence] total across accounts = ${expectedTotal}`);

  // The account with no rows is the one that proves nothing is stored: its
  // balance is exactly its opening balance, with no row to have produced it.
  await expect(balanceOf(page, 'acc_tpb_savings')).toHaveAttribute(
    'data-account-txn-count',
    '0',
  );
  await expect(balanceOf(page, 'acc_tpb_savings')).toHaveAttribute(
    'data-balance-minor',
    String(OPENING.acc_tpb_savings),
  );

  await page.screenshot({ path: `${SHOTS}/accounts-1280.png`, fullPage: true });
});

test('an account detail page carries its own ledger, and agrees with the list', async ({
  page,
}) => {
  await signIn(page);
  await openAccounts(page);

  const listBalance = await balanceOf(page, 'acc_vcb').getAttribute('data-balance-minor');
  const listCount = await balanceOf(page, 'acc_vcb').getAttribute('data-account-txn-count');

  await balanceOf(page, 'acc_vcb').locator('[data-action="open-account"]').click();
  const detail = page.locator('[data-view="account-detail"][data-status="ready"]');
  await expect(detail).toBeVisible();

  await expect(detail).toHaveAttribute('data-account-id', 'acc_vcb');
  await expect(detail).toHaveAttribute('data-balance-minor', listBalance ?? '');
  await expect(detail).toHaveAttribute('data-result-count', listCount ?? '');
  await expect(detail).toHaveAttribute(
    'data-opening-balance-minor',
    String(OPENING.acc_vcb),
  );
  console.log(
    `[evidence] acc_vcb detail: opening ${OPENING.acc_vcb}, balance ${listBalance}, ${listCount} rows — same numbers as the list`,
  );

  // Every row on this page belongs to this account, and nothing else does.
  const rows = page.locator('[data-transaction-list] [data-transaction-id]');
  await expect(rows).toHaveCount(Number(listCount));

  await page.screenshot({ path: `${SHOTS}/account-detail-1280.png`, fullPage: true });

  // The empty-per-account path is a different nothing from an empty ledger.
  await page.locator('[data-action="back-to-accounts"]').click();
  await expect(page.locator('[data-view="accounts"][data-status="ready"]')).toBeVisible();
  await balanceOf(page, 'acc_tpb_savings').locator('[data-action="open-account"]').click();
  await expect(detail).toHaveAttribute('data-account-id', 'acc_tpb_savings');
  await expect(detail).toHaveAttribute('data-result-count', '0');
  await expect(page.locator('[data-account-ledger-empty]')).toBeVisible();
  console.log(
    `[evidence] empty account state = "${await page.locator('[data-account-ledger-empty]').innerText()}"`,
  );
});

test('an account is created by typing, and its balance is derived at once', async ({ page }) => {
  await signIn(page);
  const view = await openAccounts(page);

  const before = Number(await view.getAttribute('data-total-balance-minor'));

  await page.locator('[data-action="add-account"]').click();
  // Real key events, not `fill`: injection delivers one atomic state change and
  // structurally cannot surface a race (bug 0001's lesson).
  await page.locator('#account-new-name').pressSequentially('Techcombank', { delay: 15 });
  await page.locator('#account-new-opening').pressSequentially('12.500.000', { delay: 15 });
  await page.keyboard.press('Enter');

  await expect(view).toHaveAttribute('data-active-account-count', '5');
  const created = page.locator('[data-account-id="acc_005"]');
  await expect(created).toHaveAttribute('data-balance-minor', '12500000');
  await expect(created).toHaveAttribute('data-account-txn-count', '0');
  await expect(view).toHaveAttribute('data-total-balance-minor', String(before + 12_500_000));
  console.log(
    `[evidence] typed "12.500.000" -> stored 12500000; total ${before} -> ${before + 12_500_000}`,
  );

  // The dot is a THOUSANDS separator here. A decimal is refused with a reason,
  // never rounded — the same rule quick entry enforces, through the same module.
  await page.locator('[data-action="add-account"]').click();
  await page.locator('#account-new-name').pressSequentially('Sai', { delay: 15 });
  await page.locator('#account-new-opening').pressSequentially('12,5', { delay: 15 });
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-account-form]')).toHaveAttribute(
    'data-error-fields',
    'opening',
  );
  await expect(view).toHaveAttribute('data-active-account-count', '5');
  console.log(
    `[evidence] "12,5" refused: "${await page.locator('[data-account-form-error]').innerText()}"`,
  );
});

test('archiving keeps every row and leaves the entry picker; undo puts it back', async ({
  page,
}) => {
  await signIn(page);
  const view = await openAccounts(page);

  const rowsBefore = await balanceOf(page, 'acc_momo').getAttribute('data-account-txn-count');
  const balanceBefore = await balanceOf(page, 'acc_momo').getAttribute('data-balance-minor');

  await balanceOf(page, 'acc_momo').locator('[data-action="archive-account"]').click();

  await expect(view).toHaveAttribute('data-active-account-count', '3');
  await expect(view).toHaveAttribute('data-archived-account-count', '1');
  const archivedRow = page.locator('[data-archived-accounts] [data-account-id="acc_momo"]');
  await expect(archivedRow).toHaveAttribute('data-archived', 'true');
  // Nothing was lost: same rows, same balance, just put away.
  await expect(archivedRow).toHaveAttribute('data-account-txn-count', rowsBefore ?? '');
  await expect(archivedRow).toHaveAttribute('data-balance-minor', balanceBefore ?? '');
  console.log(
    `[evidence] archived acc_momo: kept ${rowsBefore} rows and balance ${balanceBefore}`,
  );
  await page.screenshot({ path: `${SHOTS}/accounts-archived-1280.png`, fullPage: true });

  // …and it is gone from the picker quick entry offers. Client-side navigation,
  // so the session survives — a `goto` here would re-seed and prove nothing.
  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();
  const options = await page.locator('#entry-account option').allInnerTexts();
  expect(options).not.toContain('Ví Momo');
  console.log(`[evidence] quick-entry account picker now offers: ${options.join(', ')}`);

  // The ledger still names it on the rows it owns — archiving is not erasure.
  await expect(
    page.locator('[data-transaction-list]').getByText('Ví Momo').first(),
  ).toBeVisible();

  await page.locator('header a[href="/accounts"]').click();
  await expect(view).toBeVisible();
  await page
    .locator('[data-archived-accounts] [data-account-id="acc_momo"] [data-action="unarchive-account"]')
    .click();
  await expect(view).toHaveAttribute('data-active-account-count', '4');
  await expect(view).toHaveAttribute('data-archived-account-count', '0');
  await expect(balanceOf(page, 'acc_momo')).toHaveAttribute(
    'data-balance-minor',
    balanceBefore ?? '',
  );
  console.log('[evidence] un-archived acc_momo; balance unchanged');
});
