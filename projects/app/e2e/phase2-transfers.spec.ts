import { expect, test, type Page } from '@playwright/test';

/**
 * Hub ticket 0004 phase 2 — transfers between accounts.
 *
 * **The point of this file is the exclusion, not the form.** Moving ₫500.000
 * from a bank account to Momo is the same money in a different place; if the
 * product does not model that, every spending total is inflated by every
 * transfer the Owner makes. So the headline test states the claim as numbers:
 * both balances before and after, and a spending total before and after that is
 * IDENTICAL.
 *
 * The model under test is the provisional **linked pair** — two rows sharing a
 * `transfer_id` — and the specs check the consequences of that choice as much as
 * the feature: the pair is created together, deleted together, restored
 * together, and kept out of the triage inbox that its `category_id: null` would
 * otherwise put it in.
 *
 * One page load per test. `page.goto` re-seeds the prototype and signs out; the
 * nav links are client-side and keep the session.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** U+00A0 sits before ₫ in `Intl` output. Attribute comparisons do not forgive it. */
const NBSP = ' ';

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

const attr = async (page: Page, selector: string, name: string): Promise<number> =>
  Number(await page.locator(selector).getAttribute(name));

test('a transfer moves both balances and does not change spending — keyboard only', async ({
  page,
}) => {
  await signIn(page);
  const view = await openAccounts(page);

  // ---- BEFORE -------------------------------------------------------------
  const before = {
    vcb: await attr(page, '[data-account-id="acc_vcb"]', 'data-balance-minor'),
    momo: await attr(page, '[data-account-id="acc_momo"]', 'data-balance-minor'),
    total: Number(await view.getAttribute('data-total-balance-minor')),
    spending: await attr(page, '[data-spending-total-minor]', 'data-spending-total-minor'),
    spendingRows: await attr(page, '[data-spending-total-minor]', 'data-spending-count'),
    uncategorized: await attr(page, 'header [data-uncategorized-count]', 'data-uncategorized-count'),
  };
  console.log('[evidence] BEFORE', JSON.stringify(before));

  // ---- the transfer, with real key events, counted ------------------------
  let keys = 0;
  const press = async (key: string): Promise<void> => {
    await page.keyboard.press(key);
    keys += 1;
  };

  // `T` puts the caret in the amount box from anywhere on the screen — the same
  // affordance the ledger's `N` provides.
  await press('T');
  await expect(page.locator('#transfer-amount')).toBeFocused();

  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  keys += '500000'.length;

  // First-letter matching on a native `<select>` — the keyboard model the design
  // system chose over a Radix listbox precisely so this works. `Ví Momo` and
  // `Vietcombank` collide on `V` (the same Vietnamese collision the triage
  // screen documents for `Cà phê` / `Chợ & siêu thị`), so the source costs a
  // second `v` to cycle past the first match; the destination costs one.
  await press('Tab'); // -> source
  await press('v'); // "Ví Momo"
  await press('v'); // cycles -> "Vietcombank"
  await press('Tab'); // -> destination
  await press('v'); // "Ví Momo"

  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute('data-from', 'acc_vcb');
  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute('data-to', 'acc_momo');
  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute('data-amount-minor', '500000');
  await expect(page.locator('[data-transfer-entry]')).toHaveAttribute(
    'data-amount-preview',
    `500.000${NBSP}₫`,
  );
  await page.screenshot({ path: `${SHOTS}/transfer-entry-1280.png`, fullPage: true });

  await press('Enter');
  console.log(`[evidence] transfer entry, cold accounts screen -> saved: ${keys} keystrokes`);

  // ---- AFTER --------------------------------------------------------------
  await expect(view).toHaveAttribute('data-transfer-leg-count', '2');
  const after = {
    vcb: await attr(page, '[data-account-id="acc_vcb"]', 'data-balance-minor'),
    momo: await attr(page, '[data-account-id="acc_momo"]', 'data-balance-minor'),
    total: Number(await view.getAttribute('data-total-balance-minor')),
    spending: await attr(page, '[data-spending-total-minor]', 'data-spending-total-minor'),
    spendingRows: await attr(page, '[data-spending-total-minor]', 'data-spending-count'),
    uncategorized: await attr(page, 'header [data-uncategorized-count]', 'data-uncategorized-count'),
  };
  console.log('[evidence] AFTER ', JSON.stringify(after));

  // Both balances moved, by exactly the amount, in opposite directions.
  expect(before.vcb - after.vcb).toBe(500_000);
  expect(after.momo - before.momo).toBe(500_000);
  // The money did not leave the system.
  expect(after.total).toBe(before.total);
  // AND THE POINT: spending did not move. Not the total, not the row count.
  expect(after.spending).toBe(before.spending);
  expect(after.spendingRows).toBe(before.spendingRows);
  // Neither leg went to the triage inbox, though both are stored uncategorised.
  expect(after.uncategorized).toBe(before.uncategorized);

  await expect(page.locator('[data-undo-kind="transferred"]')).toBeVisible();
  console.log(
    `[evidence] notice = "${await page.locator('[data-undo-message]').innerText()}"`,
  );
  await page.screenshot({ path: `${SHOTS}/accounts-after-transfer-1280.png`, fullPage: true });

  // Undo removes the transfer — both legs — and every number returns.
  await page.locator('[data-action="undo"]').click();
  await expect(view).toHaveAttribute('data-transfer-leg-count', '0');
  expect(await attr(page, '[data-account-id="acc_vcb"]', 'data-balance-minor')).toBe(before.vcb);
  expect(await attr(page, '[data-account-id="acc_momo"]', 'data-balance-minor')).toBe(before.momo);
  console.log('[evidence] undo restored both balances exactly');
});

test('the ledger renders a transfer as movement, and triage never offers it', async ({ page }) => {
  await signIn(page);
  await openAccounts(page);

  await page.locator('#transfer-amount').focus();
  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  await page.locator('#transfer-from').selectOption('acc_vcb');
  await page.locator('#transfer-to').selectOption('acc_momo');
  await page.locator('#transfer-description').pressSequentially('Nap vi', { delay: 15 });
  await page.locator('[data-action="save-transfer"]').click();
  await expect(page.locator('[data-view="accounts"]')).toHaveAttribute(
    'data-transfer-leg-count',
    '2',
  );

  await page.locator('header a[href="/ledger"]').click();
  const ledger = page.locator('[data-view="ledger"][data-status="ready"]');
  await expect(ledger).toBeVisible();

  // Two rows, one transfer id, one negative and one positive.
  const legs = page.locator('[data-transaction-list] li[data-transfer-id="tfr_001"]');
  await expect(legs).toHaveCount(2);
  const directions = await legs.locator('[data-direction]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-direction')),
  );
  expect(directions.sort()).toEqual(['inflow', 'outflow']);

  // Movement, not a category: the row names both ends where a category would be.
  const movements = await legs.locator('[data-transfer-movement]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-transfer-movement')),
  );
  console.log(`[evidence] ledger rows read: ${movements.join(' | ')}`);
  expect(new Set(movements)).toEqual(new Set(['Vietcombank → Ví Momo']));

  // …and the sign colour still comes from the sign alone (design-system §3.3):
  // the outgoing leg is an outflow, the incoming one an inflow. Movement is said
  // by the row, never by recolouring the number.
  const outgoing = legs.filter({ has: page.locator('[data-direction="outflow"]') });
  await expect(outgoing.locator('[data-direction]')).toHaveText(`-500.000${NBSP}₫`);
  await page.locator('li[data-transfer-id="tfr_001"]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/ledger-with-transfer-1280.png` });

  // A transfer leg does not open the row editor: the two legs have to agree, and
  // an editor that changes one of them puts the ledger out of balance.
  const control = legs.first().locator('[data-row-control]');
  await expect(control).toHaveAttribute('data-action', 'transfer-row');
  await control.click();
  await expect(page.locator('[data-transaction-list]')).toHaveAttribute('data-editing-id', '');

  // Both legs are stored uncategorised, and neither is in the inbox.
  await page.locator('header a[href="/triage"]').click();
  const triage = page.locator('[data-view="triage"][data-status="ready"]');
  await expect(triage).toBeVisible();
  await expect(triage).toHaveAttribute('data-inbox-count', '4');
  await expect(
    page.locator('[data-triage-list] [data-transaction-id="txn_057"]'),
  ).toHaveCount(0);
  console.log('[evidence] inbox still holds 4 rows; neither transfer leg is offered');
});

test('deleting one leg deletes the pair, and undo restores both', async ({ page }) => {
  await signIn(page);
  const view = await openAccounts(page);

  const before = {
    vcb: await attr(page, '[data-account-id="acc_vcb"]', 'data-balance-minor'),
    momo: await attr(page, '[data-account-id="acc_momo"]', 'data-balance-minor'),
  };

  await page.locator('#transfer-amount').focus();
  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  await page.locator('#transfer-from').selectOption('acc_vcb');
  await page.locator('#transfer-to').selectOption('acc_momo');
  await page.locator('[data-action="save-transfer"]').click();
  await expect(view).toHaveAttribute('data-transfer-leg-count', '2');

  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();

  // Press Delete on ONE leg.
  const legs = page.locator('[data-transaction-list] li[data-transfer-id="tfr_001"]');
  await expect(legs).toHaveCount(2);
  await legs.first().locator('[data-row-control]').focus();
  await page.keyboard.press('Delete');

  // Both are gone — half a transfer is not a smaller transfer, it is a wrong
  // balance — and the undo bar says so rather than naming the one row pressed.
  await expect(legs).toHaveCount(0);
  const message = await page.locator('[data-undo-message]').innerText();
  console.log(`[evidence] undo bar after deleting one leg: "${message}"`);
  expect(message).toContain('cả hai vế');

  await page.locator('header a[href="/accounts"]').click();
  await expect(view).toHaveAttribute('data-transfer-leg-count', '0');
  expect(await attr(page, '[data-account-id="acc_vcb"]', 'data-balance-minor')).toBe(before.vcb);
  expect(await attr(page, '[data-account-id="acc_momo"]', 'data-balance-minor')).toBe(before.momo);
  console.log('[evidence] deleting one leg reverted BOTH balances');
});

test('a transfer into the same account is refused with a reason', async ({ page }) => {
  await signIn(page);
  await openAccounts(page);

  await page.locator('#transfer-amount').focus();
  await page.locator('#transfer-amount').pressSequentially('500000', { delay: 15 });
  await page.locator('#transfer-from').selectOption('acc_vcb');
  await page.locator('#transfer-to').selectOption('acc_vcb');
  await page.locator('[data-action="save-transfer"]').click();

  const form = page.locator('[data-transfer-entry]');
  await expect(form).toHaveAttribute('data-error-fields', 'to_account_id');
  await expect(page.locator('[data-view="accounts"]')).toHaveAttribute(
    'data-transfer-leg-count',
    '0',
  );
  console.log(`[evidence] refused: "${await page.locator('#transfer-status').innerText()}"`);

  // Zero moves nothing, and is refused too — zero is a real amount in this
  // product (a fully refunded ride), but not a real transfer.
  await page.locator('#transfer-to').selectOption('acc_momo');
  await page.locator('#transfer-amount').focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.locator('#transfer-amount').pressSequentially('0', { delay: 15 });
  await page.locator('[data-action="save-transfer"]').click();
  await expect(form).toHaveAttribute('data-error-fields', 'amount');
  await expect(page.locator('[data-view="accounts"]')).toHaveAttribute(
    'data-transfer-leg-count',
    '0',
  );
  console.log(`[evidence] refused: "${await page.locator('#transfer-status').innerText()}"`);
});
