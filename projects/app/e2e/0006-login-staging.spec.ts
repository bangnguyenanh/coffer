import { expect, test } from '@playwright/test';

/**
 * Backlog 0006 — observed behaviour for the login screen's staging.
 *
 * What is being demonstrated, in the order the ticket asks for it:
 *   0. the `Coffer` wordmark is the anchor of the frame — read off computed
 *      style, not eyeballed off the screenshot;
 *   1. `/login` renders at 1280x900 with the gạch bông ground and the receipt;
 *   2. the receipt's amounts come from `lib/money.ts` and its total is the SUM
 *      of its four lines, in integer minor units;
 *   3. the receipt drops out entirely below the split's breakpoint;
 *   4. `/signup` still renders — same ground, no receipt;
 *   5. **the form is untouched**: `data-view` / `data-status` survive, the
 *      keyboard path through the fields is what it was, and a wrong password
 *      still renders the error ON the form.
 *
 * The U+00A0 in the expected amounts is deliberate: `Intl.NumberFormat('vi-VN')`
 * emits a non-breaking space before `₫`, so asserting a plain space would fail
 * against CORRECT output.
 *
 * Every test starts with its own `page.goto('/login')` and never navigates
 * again: this prototype has no persistence, so a second `goto` re-seeds the app
 * and signs it out.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** The ticket's four lines, and the total they must sum to. */
const LINES = [
  { key: 'coffee', amountMinor: -45_000, text: '-45.000 ₫' },
  { key: 'market', amountMinor: -320_000, text: '-320.000 ₫' },
  { key: 'rent', amountMinor: -1_200_000, text: '-1.200.000 ₫' },
  { key: 'salary', amountMinor: 18_000_000, text: '18.000.000 ₫' },
] as const;

const TOTAL_MINOR = LINES.reduce((sum, line) => sum + line.amountMinor, 0);

/**
 * The wordmark, measured on both screens: `AuthScreen` owns it, so sign up
 * inherits the same treatment and that is intended (backlog 0006 step 3).
 *
 * `font-weight: 700` is asserted rather than "as heavy as possible": Be Vietnam
 * Pro is REQUESTED at 400;500;600;700 in `src/index.css`, so 700 is the heaviest
 * real face the stack has and anything above it would be a synthesised faux
 * weight.
 */
async function measureWordmark(page: import('@playwright/test').Page, view: string) {
  const wordmark = page.locator('[data-wordmark]');
  await expect(wordmark).toHaveText('Coffer');
  const style = await wordmark.evaluate((el) => {
    const computed = getComputedStyle(el);
    return {
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      letterSpacing: computed.letterSpacing,
      color: computed.color,
    };
  });
  console.log(`[evidence] ${view} wordmark: ${JSON.stringify(style)}`);
  expect(Number.parseFloat(style.fontSize)).toBeGreaterThanOrEqual(40);
  expect(Number.parseFloat(style.fontSize)).toBeLessThanOrEqual(48);
  expect(style.fontWeight).toBe('700');
  // Still the brand ochre token, not a new colour: --brand is oklch(0.48 0.1 68).
  expect(style.color).toContain('oklch(0.48 0.1 68)');
  return style;
}

test('login renders the gạch bông ground and the receipt at 1280x900', async ({ page }) => {
  await page.goto('/login');
  const view = page.locator('[data-view="login"][data-status="ready"]');
  await expect(view).toBeVisible();

  await measureWordmark(page, '/login');

  // The tagline is deliberately NOT paired under it — see AuthScreen's note.
  await expect(page.locator('[data-view="login"]')).not.toContainText('Sổ chi tiêu cá nhân');

  // The ground is present, behind everything, and inert.
  const ground = page.locator('[data-decoration="gach-bong"]');
  await expect(ground).toBeVisible();
  await expect(ground).toHaveAttribute('aria-hidden', 'true');
  console.log(
    `[evidence] gạch bông ground: pointer-events=${await ground.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    )} colour=${await ground.evaluate((el) => getComputedStyle(el).color)}`,
  );

  const receipt = page.locator('[data-auth-receipt="login"]');
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute('aria-hidden', 'true');
  console.log(
    `[evidence] receipt: pointer-events=${await receipt.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    )} font=${await receipt.evaluate((el) => getComputedStyle(el).fontFamily)} ` +
      `mask=${(await receipt.evaluate((el) => getComputedStyle(el).maskImage)).slice(0, 40)}…`,
  );

  // Nothing focusable inside it: the form's keyboard path cannot be lengthened
  // by a decoration.
  const focusables = await receipt.locator('a, button, input, select, textarea, [tabindex]').count();
  expect(focusables).toBe(0);
  console.log(`[evidence] focusable elements inside the receipt = ${focusables}`);

  // Four lines, each an integer in minor units, each rendered by money.ts.
  for (const line of LINES) {
    const row = receipt.locator(`[data-receipt-line="${line.key}"]`);
    await expect(row).toHaveAttribute('data-receipt-amount-minor', String(line.amountMinor));
    const rendered = await row.locator('[data-direction]').innerText();
    expect(rendered).toBe(line.text);
    const direction = await row.locator('[data-direction]').getAttribute('data-direction');
    expect(direction).toBe(line.amountMinor < 0 ? 'outflow' : 'inflow');
    console.log(`[evidence] ${line.key}: ${line.amountMinor} -> "${rendered}" (${direction})`);
  }

  // The total is the SUM, not a typed figure.
  const total = receipt.locator('[data-receipt-total-minor]');
  await expect(total).toHaveAttribute('data-receipt-total-minor', String(TOTAL_MINOR));
  const totalText = await total.locator('[data-direction]').innerText();
  expect(totalText).toBe('16.435.000 ₫');
  console.log(`[evidence] total: ${TOTAL_MINOR} -> "${totalText}"`);

  // No `+` on the positive amounts, receipt included (design system §3.4).
  const plus = (await receipt.locator('[data-direction]').allInnerTexts()).filter((t) =>
    t.trim().startsWith('+'),
  );
  expect(plus).toEqual([]);

  await page.screenshot({ path: `${SHOTS}/0006-login-1280x900.png` });
});

test('the receipt drops out at a narrow viewport and the card is unchanged', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();

  const receipt = page.locator('[data-auth-receipt="login"]');
  const cardWide = await page.locator('[data-view="login"] .panel').boundingBox();

  // No navigation — only the viewport changes, so the app is not re-seeded.
  await page.setViewportSize({ width: 480, height: 900 });
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await expect(receipt).toBeHidden();
  console.log(
    `[evidence] at 480px: display=${await receipt.evaluate((el) => getComputedStyle(el).display)}, ` +
      `receipt hidden = ${await receipt.isHidden()}`,
  );

  // The ground still covers the narrow page.
  await expect(page.locator('[data-decoration="gach-bong"]')).toBeVisible();

  // The form is still the full-width card it always was — it is not the thing
  // that shrank; the receipt is.
  const cardNarrow = await page.locator('[data-view="login"] .panel').boundingBox();
  console.log(
    `[evidence] card width 1280 -> ${cardWide?.width}px, 480 -> ${cardNarrow?.width}px ` +
      `(480 - 2*24px page padding = 432)`,
  );
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/0006-login-narrow-480x900.png` });
});

test('signup renders with the ground and without the receipt', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.locator('[data-view="signup"][data-status="ready"]')).toBeVisible();
  await expect(page.locator('[data-decoration="gach-bong"]')).toBeVisible();
  await expect(page.locator('[data-auth-receipt]')).toHaveCount(0);
  // `AuthScreen` owns the wordmark, so sign up inherits it — intended.
  await measureWordmark(page, '/signup');
  console.log('[evidence] /signup: ground present, receipt count = 0, three fields render');
  await expect(page.locator('#signup-email')).toBeVisible();
  await expect(page.locator('#signup-password')).toBeVisible();
  await expect(page.locator('#signup-confirm')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/0006-signup-1280x900.png` });
});

test('a wrong password still renders the error on the form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();

  // Real key events, and `ControlOrMeta+a` because `Control+a` is line-start on
  // macOS — a "cleared" field would silently become an appended one.
  const password = page.locator('#login-password');
  await password.click();
  await password.press('ControlOrMeta+a');
  await password.pressSequentially('khong-dung-dau', { delay: 30 });
  await page.keyboard.press('Enter');

  const error = page.locator('[data-auth-error="invalid_credentials"]');
  await expect(error).toBeVisible();
  console.log(`[evidence] wrong password -> rendered error "${await error.innerText()}"`);

  // Still on the login screen: rejected, not navigated.
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();

  // And the tab order through the form is untouched by the staging.
  await page.locator('#login-email').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#login-password')).toBeFocused();
  console.log('[evidence] email -> Tab -> password: the form keyboard path is unchanged');

  await page.screenshot({ path: `${SHOTS}/0006-login-wrong-password-1280x900.png` });
});
