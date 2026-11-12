import { test, expect } from './fx';

/** 12.11 — meʼyorlar toʻplami, 3-bosqich, 2-band: roʻyxatda daraja belgilari, «Koʻrib chiqish» va «Oʻchiq» saralashi, oʻchiq qoidani tahlil sifatida yoqish */
async function proj(page: import('@playwright/test').Page, origin: [number, number], w: number) {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 760 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(o => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: o, carry: false }), origin);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30_000 }).toBeGreaterThan(0);
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'setSettings', patch: { siteCond: { hMax: 300, src: 'Brif' } } }));
  await page.click('#kMore');
  await page.waitForFunction(() => document.querySelector<HTMLElement>('.rrow[data-rule="density-84"] [data-s]')?.dataset.s !== 'na', null, { timeout: 30000 });
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`reyestr darajalari · ${w}${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  // Parij — xalqaro andoza: Shart / Tavsiya / Oʻchiq
  await proj(page, [2.3522, 48.8566], w);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('#regSetChips')).toContainText('Xalqaro andoza');
  await expect(page.locator('#regSetChips')).toContainText('Uchastka shartlari · 1');
  await expect(page.locator('.rrow[data-rule=site-h] [data-lvl=shart]')).toBeVisible();
  await expect(page.locator('.rrow[data-rule=fire-56] [data-lvl=tavsiya]')).toBeVisible();
  await expect(page.locator('.rrow[data-rule=school] [data-lvl=ochiq]')).toBeVisible();
  await expect(page.locator('#regSeg [data-f]')).toHaveCount(4);
  await page.click('#regSeg [data-f=off]');
  await expect(page.locator('.regw .rrow [data-lvl=tavsiya]')).toHaveCount(0);
  const nOff = await page.locator('.regw .rrow').count(); expect(nOff).toBeGreaterThan(10);
  // maktab oʻrinlari — tahlil sifatida yoqish: «—» oʻrniga baho, «mos emas» emas
  await expect(page.locator('.rrow[data-rule=school] [data-s]')).toHaveAttribute('data-s', 'na');
  await page.click('#an-school');
  await expect(page.locator('.rrow[data-rule=school] [data-s]')).not.toHaveAttribute('data-s', 'na');
  await expect(page.locator('.rrow[data-rule=school] [data-s]')).not.toHaveAttribute('data-s', 'fail');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.normOn)).toEqual(['school']);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/reyestr_daraja_parij_${w}${dark ? 'd' : 'l'}.png` });
  // Toshkent — Majburiy, «Oʻchiq» saralashi yoʻq
  await proj(page, [69.2797, 41.3111], w);
  await expect(page.locator('.rrow[data-rule=fire-56] [data-lvl=majburiy]')).toBeVisible();
  await expect(page.locator('#regSeg [data-f=off]')).toHaveCount(0);
  await page.click('#regSeg [data-f=review]');
  for (const s of await page.locator('.regw .rrow [data-s]').evaluateAll(es => es.map(e => (e as HTMLElement).dataset.s))) expect(s).toBe('review');
  await page.click('#regSwitch');
  await expect(page.locator('#normBox')).toBeVisible();
});
