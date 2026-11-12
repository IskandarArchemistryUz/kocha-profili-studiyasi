import { test, expect } from './fx';

/** 11.11 — meʼyorlar toʻplami, 1-bosqich: xorijda B (mintaqaviy) qoidalar oʻchiq («—»), generator ADG 3F-1 oraliqlari bilan; Toshkentda — avvalgidek */
async function proj(page: import('@playwright/test').Page, origin: [number, number], w: number) {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(o => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: o, carry: false }), origin);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.evaluate(() => Object.assign((window as any).__mr.gen, { typology: 'qatorlar', minF: 9, maxF: 12, setbackAuto: true }));
  await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 30000 });
  await page.mouse.move(w - 300, 300);   // «Variant taklif qil» maslahati yopilsin
}
for (const [w, dark] of [[1024, true], [1440, false]] as const) test(`Parij va Toshkent — ${w} ${dark ? 'dark' : 'light'}`, async ({ page }) => {
  test.setTimeout(150_000);
  await proj(page, [2.3522, 48.8566], w);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('#genNotes')).toContainText('xalqaro andoza');
  await expect(page.locator('#genNotes')).toContainText('orasi 24 m');
  await expect(page.locator('#genNotes')).not.toContainText('79-band');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/toplam_parij_hajm_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  await page.waitForFunction(() => document.querySelector<HTMLElement>('.rrow[data-rule="density-84"] [data-s]')?.dataset.s !== 'na', null, { timeout: 30000 });   // hisob tugadi
  await page.mouse.move(w / 2, 40);
  await expect(page.locator('#regAbroad')).toContainText('ADG 3F-1');
  await expect(page.locator('.rrow[data-rule=school] [data-s=na]')).toBeVisible();
  await expect(page.locator('.rrow[data-rule=spacing-79] [data-s=na]')).toBeVisible();
  await expect(page.locator('#regSeg [data-f=fail]')).toContainText('· 0');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/toplam_parij_reyestr_${w}${dark ? 'd' : 'l'}.png` });
  await proj(page, [69.2797, 41.3111], w);
  await expect(page.locator('#genNotes')).not.toContainText('xalqaro andoza');
  await expect(page.locator('#genNotes')).toContainText('79-band');
  await page.click('#kMore');
  await expect(page.locator('#regAbroad')).toHaveCount(0);
  await expect(page.locator('.rrow[data-rule=school] [data-s=na]')).toHaveCount(0);
});
