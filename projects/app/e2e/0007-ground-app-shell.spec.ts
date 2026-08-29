import { expect, test, type Page } from '@playwright/test';

/**
 * Backlog 0007 — the gạch bông ground behind the signed-in app.
 *
 * What is demonstrated:
 *   1. the ground renders on every signed-in screen at `density="dense"`, which
 *      is a LIGHTER tone than the auth screens' `sparse`;
 *   2. it is still inert everywhere — `aria-hidden`, `focusable="false"`,
 *      `pointer-events: none`, nothing focusable added to any screen;
 *   3. **panels stay opaque**, read off computed style, so the tile cannot show
 *      through a row or a card and muddy the text (ticket step 4);
 *   4. the shell's root actually establishes a stacking context, which is what
 *      makes `-z-10` land in the right layer rather than under `bg-surface`.
 *
 * ONE `page.goto` per test, at `/login`, and every screen after that is reached
 * by clicking the nav: this prototype has no persistence, so a second `goto`
 * re-seeds the app and signs it out.
 */

const SHOTS = process.env.SHOT_DIR ?? 'e2e-shots';

/** The five signed-in screens, in nav order, with the link that reaches each. */
const SCREENS = [
  { view: 'dashboard', href: '/', shot: '0007-dashboard-1280x900.png' },
  { view: 'ledger', href: '/ledger', shot: '0007-ledger-1280x900.png' },
  { view: 'accounts', href: '/accounts', shot: '0007-accounts-1280x900.png' },
  { view: 'categories', href: '/categories', shot: '0007-categories-1280x900.png' },
  { view: 'triage', href: '/triage', shot: '0007-triage-1280x900.png' },
] as const;

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('[data-view="login"][data-status="ready"]')).toBeVisible();
  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();
}

test('the ground renders on every signed-in screen, lighter than on auth', async ({ page }) => {
  // The auth value first, so the two tones are compared in one run rather than
  // against a number remembered from another ticket.
  await page.goto('/login');
  const authTone = await page
    .locator('[data-decoration="gach-bong"]')
    .evaluate((el) => getComputedStyle(el).color);
  const authDensity = await page
    .locator('[data-decoration="gach-bong"]')
    .getAttribute('data-ground-density');
  console.log(`[evidence] /login ground: density=${authDensity} colour=${authTone}`);
  expect(authDensity).toBe('sparse');

  await page.locator('#login-email').press('Enter');
  await expect(page.locator('[data-view="dashboard"][data-status="ready"]')).toBeVisible();

  // The shell's root must establish a stacking context, or -z-10 escapes.
  const root = page.locator('[data-auth="authenticated"]');
  const rootStyle = await root.evaluate((el) => {
    const computed = getComputedStyle(el);
    return { position: computed.position, isolation: computed.isolation };
  });
  console.log(`[evidence] shell root: ${JSON.stringify(rootStyle)}`);
  expect(rootStyle.position).toBe('relative');
  expect(rootStyle.isolation).toBe('isolate');

  for (const screen of SCREENS) {
    await page.locator(`header a[href="${screen.href}"]`).click();
    await expect(page.locator(`[data-view="${screen.view}"][data-status="ready"]`)).toBeVisible();

    const ground = page.locator('[data-decoration="gach-bong"]');
    await expect(ground).toHaveCount(1);
    await expect(ground).toHaveAttribute('aria-hidden', 'true');
    await expect(ground).toHaveAttribute('focusable', 'false');
    await expect(ground).toHaveAttribute('data-ground-density', 'dense');

    const style = await ground.evaluate((el) => {
      const computed = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        colour: computed.color,
        position: computed.position,
        pointerEvents: computed.pointerEvents,
        zIndex: computed.zIndex,
        height: Math.round(box.height),
      };
    });
    // It sizes to the SCROLL height of the shell, not to the viewport — that is
    // the `absolute` decision, and on a long ledger it is visible in the number.
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(
      `[evidence] ${screen.view}: ${JSON.stringify(style)} docScrollHeight=${docHeight}`,
    );
    expect(style.pointerEvents).toBe('none');
    expect(style.position).toBe('absolute');
    expect(style.zIndex).toBe('-10');

    // Panels are opaque: the tile cannot show through and muddy text.
    const panel = page.locator('.panel').first();
    if (await panel.count()) {
      const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).not.toContain('rgba');
      expect(bg).not.toMatch(/\/\s*0?\.\d/);
      console.log(`[evidence] ${screen.view} panel background = ${bg} (opaque)`);
    }

    await page.screenshot({ path: `${SHOTS}/${screen.shot}` });
  }

  // The dense tone really is lighter than the auth tone, not just a different
  // string: compare the alpha the two utilities resolve to.
  await page.locator('header a[href="/ledger"]').click();
  const denseTone = await page
    .locator('[data-decoration="gach-bong"]')
    .evaluate((el) => getComputedStyle(el).color);
  const alpha = (colour: string) => Number(colour.match(/\/\s*([\d.]+)\)/)?.[1] ?? '1');
  console.log(`[evidence] auth "${authTone}" -> alpha ${alpha(authTone)}`);
  console.log(`[evidence] app  "${denseTone}" -> alpha ${alpha(denseTone)}`);
  expect(alpha(denseTone)).toBeLessThan(alpha(authTone));
});

test('the ground adds nothing focusable and does not intercept a click', async ({ page }) => {
  await signIn(page);
  await page.locator('header a[href="/ledger"]').click();
  await expect(page.locator('[data-view="ledger"][data-status="ready"]')).toBeVisible();

  // Nothing inside the decoration can be reached.
  expect(await page.locator('[data-decoration="gach-bong"] *[tabindex], [data-decoration="gach-bong"] a').count()).toBe(0);

  // The element under the middle of the page is content, never the ground: a
  // full-bleed layer that swallowed clicks would be invisible until it wasn't.
  const topmost = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return el?.closest('[data-decoration="gach-bong"]') ? 'THE GROUND' : (el?.tagName ?? 'none');
  });
  console.log(`[evidence] element at the centre of /ledger = ${topmost}`);
  expect(topmost).not.toBe('THE GROUND');

  // And the 11-keystroke entry path is still exactly where it was: the caret
  // starts in the amount box, so the ground cost nothing at the keyboard.
  await expect(page.locator('#entry-amount')).toBeFocused();
  console.log('[evidence] caret still starts in #entry-amount on the ledger');
});
