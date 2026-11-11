import { test, expect } from './fx';

/** 11.11 — meʼyorlar toʻplami, 2-bosqich: 1-qadamda «4 · Meʼyorlar toʻplami» (cheklovlardan oldin), qoʻlda almashtirish va roʻyxat */
async function site(page: import('@playwright/test').Page, origin: [number, number], w: number) {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(o => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: o, carry: false }), origin);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.mouse.move(w - 300, 300);
}
for (const [w, dark] of [[1024, true], [1440, false]] as const) test(`Meʼyorlar toʻplami bloki — ${w} ${dark ? 'dark' : 'light'}`, async ({ page }) => {
  test.setTimeout(150_000);
  // Toshkent: sukut — ShNQ; tartib: 4 — toʻplam, 5 — cheklovlar
  await site(page, [69.2797, 41.3111], w);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('#secNorms b')).toHaveText('4');
  await expect(page.locator('#secLimits b')).toHaveText('5');
  await expect(page.locator('#normBox [data-norms=UZ]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#normCnt b').first()).toHaveText('54');
  await expect(page.locator('#normLocal')).toHaveCount(0);
  // taqqoslash uchun — xalqaro andoza
  await page.click('#normBox [data-norms=intl]');
  await expect(page.locator('#normBox [data-norms=intl]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#normCnt b')).toHaveText(['0', '32', '22']);
  await expect(page.locator('#normNote')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.normSet)).toBe('intl');
  await page.locator('#secNorms').scrollIntoViewIfNeeded();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/toplam_blok_toshkent_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#normReg');
  await expect(page.locator('#regAbroad')).toContainText('Taqqoslash');
  // qaytarish — joy boʻyicha (normSet yoʻq)
  await page.click('#normBox [data-norms=UZ]');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.normSet)).toBeUndefined();
  await expect(page.locator('#regAbroad')).toHaveCount(0);
  // Parij: sukut — xalqaro andoza, mahalliy toʻplam ulanmagan
  await site(page, [2.3522, 48.8566], w);
  await expect(page.locator('#normBox [data-norms=intl]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#normLocal')).toBeVisible();
  await expect(page.locator('#normBox [data-norms=UZ]')).toContainText('taqqoslash uchun');
  await page.locator('#secNorms').scrollIntoViewIfNeeded();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/toplam_blok_parij_${w}${dark ? 'd' : 'l'}.png` });
});
