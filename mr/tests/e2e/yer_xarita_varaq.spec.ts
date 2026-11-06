import { test, expect } from './fx';

/** 06.11 (egasi: «mana bu analizlar nega varaqlarga bormaydi?»): «Qatlamlar → Yer sathi xaritasi» tahlillari —
 *  yuza qizishi, suv bosish xavfi (HAND), namlik (TWI) — Varaqlar namunasi va Chizmadon materiali; relyef yoʻq holat ham */
const setup = async (page: import('@playwright/test').Page, w: number, dark: boolean, terrain: boolean) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(0);
  if (terrain) await page.evaluate(() => {   // relyef toʻri: janubi-gʻarbga qiya, oʻrtada soy (pastlik)
    const ed = (window as any).__mr, n = 81, step = 10, r = (n - 1) / 2 * step, h = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -r + i * step, y = -r + j * step; h[j * n + i] = 420 + 0.02 * x + 0.015 * y + 6 * (1 - Math.exp(-((x - 40) ** 2) / 8000)); }
    ed.ctxMgr.current = { fetched: 1, osm: { roads: [], buildings: [], green: [], water: [], waterways: [], rails: [], trees: [] }, terrain: { n, step, radius: r, center: ed.store.doc.origin, h, min: 400, max: 450 } };
  });
};
const openSheet = async (page: import('@playwright/test').Page, re: RegExp) => {
  const idx = await page.evaluate(s => [...document.querySelectorAll('[data-sheet]')].findIndex(e => new RegExp(s).test(e.textContent ?? '')), re.source);
  expect(idx).toBeGreaterThanOrEqual(0); await page.locator('[data-sheet]').nth(idx).click();
};

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`yer sathi xaritalari varaqda · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await setup(page, w, dark, true);
  // yuza qizishi — Qatlamlar panelida hisoblanadi, keyin varaqqa
  await page.click('#layPop'); await page.click('[data-map=issiq]');
  await expect(page.locator('.maplegend')).toContainText('Uchastka: oʻrtacha', { timeout: 60000 });
  await page.click('#layPop');
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const view = page.locator('#gxView svg'), tag = `${w}${dark ? 'd' : 'l'}`;
  await openSheet(page, /Yuza qizishi/);
  await expect(view.locator('#Yuza_qizishi')).toBeAttached();
  await expect(page.locator('#gxView')).toContainText('°C');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/varaq_issiq_${tag}.png` }); }
  await openSheet(page, /Suv bosish xavfi/);
  await expect(view.locator('#Suv_bosish_HAND')).toBeAttached();
  await expect(page.locator('#gxView')).toContainText('yuqori');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/varaq_hand_${tag}.png` }); }
  await openSheet(page, /Namlik \(TWI\)/);
  await expect(page.locator('#gxView')).toContainText('TWI');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/varaq_twi_${tag}.png` }); }
  await page.keyboard.press('Escape');
});

test('yer sathi xaritalari — relyef yoʻq, qizish hisoblanmagan: varaqda izoh', async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page, 1440, false, false);
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  await openSheet(page, /Suv bosish xavfi/);
  await expect(page.locator('#gxView svg')).toContainText('Relyef yuklanmagan');
  await openSheet(page, /Yuza qizishi/);
  await expect(page.locator('#gxView svg')).toContainText('Yuza qizishi hisoblanmagan');
  await page.keyboard.press('Escape');
});

test('HAND legendasi rus tilida (Qatlamlar va varaq)', async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => { try { localStorage.setItem('mr-lang', 'ru'); localStorage.setItem('kps_lang', 'ru'); } catch { /* */ } });
  await setup(page, 1440, false, true);
  await page.click('#layPop'); await page.click('[data-map=hand]');
  await expect(page.locator('.maplegend')).toContainText('высокий', { timeout: 30000 });
  await expect(page.locator('.maplegend')).not.toContainText('yuqori');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/hand_ru_qatlam.png` });
  await page.click('#layPop');
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  await openSheet(page, /HAND/);
  await expect(page.locator('#gxView svg')).toContainText('высокий');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/varaq_hand_ru.png` }); }
  await page.keyboard.press('Escape');
});
