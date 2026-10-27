import { test, expect, type Page } from './fx';

async function newSite(page: Page, w: number, h: number) {
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', String(w)); await page.fill('#rh', String(h));
  await page.click('#rectSite');
}
const overlaps = (page: Page) => page.evaluate(() => {
  const d = (window as any).__mr.store.doc; return { grps: [...new Set(d.buildings.filter((b: any) => b.gen).map((b: any) => b.gen.grp))], parcels: d.parcels.map((p: any) => p.id) };
});

// Kvartal parsellarga boʻlingach qayta generatsiya: eski (kvartal boʻyicha) binolar qolib, yangilari ustiga qurilmasin
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qayta generatsiyada binolar ustma-ust tushmaydi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 860 });
  await newSite(page, 300, 200);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(async () => (await overlaps(page)).grps.length).toBe(1);
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="0"]').click();
  await page.locator('#pSize').fill('1'); await page.click('[data-grid=ns]'); await page.click('#pSplit');
  await expect(page.locator('[data-block]')).toHaveCount(6);
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  const o = await overlaps(page);
  expect(o.grps.length).toBeGreaterThan(0);
  expect(o.grps.every(g => o.parcels.includes(g))).toBe(true);   // kvartal darajasidagi eski guruh qolmadi
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=spacing-79]');
  await expect(rule).toBeVisible();
  await expect(rule).not.toContainText('Ustma-ust');
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/kes_${w}${dark ? 'd' : 'l'}.png` });
});
