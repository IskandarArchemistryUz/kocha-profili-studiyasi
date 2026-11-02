import { test, expect } from './fx';

/** Chizmadon tahlili (25.10, 5-bosqich): «Loyihadan» roʻyxatida bino kvartirografiyasi — bitta guruh */
test('Chizmadon «Loyihadan»: kvartirografiya materiallari bino boʻyicha guruhda', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const list = page.locator('#chMats');
  await expect(list).toBeVisible();
  const grp = list.locator('[data-grp]');
  expect(await grp.count()).toBeGreaterThan(0);
  // yopiq guruh — ichidagilar koʻrinmaydi; har guruh — 3 ta material
  await expect(list.locator('[data-mat^="p:aptnav:"]')).toHaveCount(0);
  const nGrp = await grp.count();
  expect(await list.locator('.li').count()).toBeLessThan(56);   // 02.11: tahlil materiallari — +4 xizmat radiusi, cheklovlar + yer balansi, yashil balans + jadval, insolyatsiya
  await grp.first().click();
  await expect(list.locator('.ch-sub')).toHaveCount(3);
  await expect(list.locator('.ch-sub[data-mat^="p:aptnav:"]')).toHaveCount(1);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_royxat_1440.png` });
  // guruh tugmasi bilan yoqish / oʻchirish — uchala material birga (02.11: bino turlarining 1-qavat va tipik qavati sukut boʻyicha yoqilgan)
  if (nGrp > 1) {
    const g2 = grp.nth(1), was = /\boff\b/.test((await g2.getAttribute('class')) ?? '');
    await g2.locator('.sw, button[role=switch]').first().click();
    if (was) await expect(g2).not.toHaveClass(/\boff\b/); else await expect(g2).toHaveClass(/\boff\b/);
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_royxat_dark.png` });
});
