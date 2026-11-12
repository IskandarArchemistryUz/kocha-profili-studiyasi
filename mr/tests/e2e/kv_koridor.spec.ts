import { test, expect } from './fx';

/**
 * c79 (11.11, egasi: «koridor eni juda tor»): ShNQ 2.08.01-24, 40-band — qavat rejasida har kvartira dahliz / yoʻlak sof eni jadvali;
 * qator bosilsa kvartira tanlanadi va uning paneli haqiqiy en va talabni koʻrsatadi. Qizil — faqat meʼyordan kam boʻlsa.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kvartira yoʻlaklari eni · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  // 12.11 (egasi): bu maʼlumot faqat ichki tekshiruv rejimida
  await page.addInitScript(() => { try { localStorage.setItem('mr-dev', '1'); } catch { /* */ } });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  const tbl = page.locator('#albPass40');
  await expect(tbl).toBeVisible();
  await expect(tbl).toContainText('40-band');
  const rows = tbl.locator('[data-apt40]');
  expect(await rows.count()).toBeGreaterThan(0);
  // meʼyordan kam (qizil) yoʻlak yoʻq
  await expect(tbl.locator('.p40[data-s=fail]')).toHaveCount(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/kvkoridor_${w}${dark ? 'd' : 'l'}.png` }); }
  // 3 xonali kvartira qatorini tanlash → panelda dahliz / yoʻlak eni va talab
  const r3 = rows.filter({ hasText: /^3x/ }).first();
  await (await r3.count() ? r3 : rows.first()).click();
  const box = page.locator('#albIn40');
  await expect(box).toBeVisible();
  await expect(box.locator('[data-p40=dahliz]')).toContainText('1,4');
  await expect(box.locator('[data-p40=live]')).toContainText('1,1');
  await expect(box.locator('[data-p40=aux]')).toContainText('0,9');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await box.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${process.env.GX_SHOTS}/kvkoridor_panel_${w}${dark ? 'd' : 'l'}.png` }); }
});
