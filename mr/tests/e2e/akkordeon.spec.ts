import { test, expect } from './fx';

/** 11.11 — 1-qadam yigʻiladigan boʻlimlari (kanvas «Me'yorlar to'plami — interfeys maketi», 5–6-doskalar). Umumiy sozlama «mr-acc»=0 — bu test yoqadi */
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem('mr-acc', '1'); } catch { /* */ } }); });
for (const [w, dark] of [[1024, true], [1440, false]] as const) test(`1-qadam: bitta boʻlim ochiq, xulosalar — ${w} ${dark ? 'dark' : 'light'}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  // yangi loyiha: 1 — ochiq, 3–5 — qulf
  await expect(page.locator('#secJoy')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#secSiteBody')).toBeHidden();
  await expect(page.locator('#secNorms')).toBeDisabled();
  // 2 ni ochish — 1 yigʻiladi
  await page.locator('#secSite').click();
  await expect(page.locator('#secSite')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#secJoyBody')).toBeHidden();
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  // uchastka chizilgach: 2 — ✓ va xulosa, 4 — ochiq, 3–5 qulfdan chiqadi
  await page.evaluate(() => { (window as any).__mr.editor ? null : null; });
  await expect(page.locator('#secSite .acc-s')).toContainText('2,24 ga');
  await expect(page.locator('#secNorms')).toBeEnabled();
  await page.locator('#secNorms').click();
  await expect(page.locator('#normBox')).toBeVisible();
  await expect(page.locator('#secNorms .acc-s')).toContainText('Oʻzbekiston · ShNQ');
  await expect(page.locator('#uchAcc .acc.open')).toHaveCount(1);
  await page.mouse.move(w - 300, 300);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/akkordeon_${w}${dark ? 'd' : 'l'}.png` });
  // klaviatura: Enter — yigʻish
  await page.locator('#secNorms').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#uchAcc .acc.open')).toHaveCount(0);
  // cheklovlar boʻlimi ham ochiladi
  await page.locator('#secLimits').click();
  await expect(page.locator('#limBox')).toBeVisible();
});
