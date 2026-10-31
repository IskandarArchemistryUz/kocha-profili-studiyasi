import { test, expect } from './fx';

/** 22:49 (egasi «ok»): qiya kvartalda seksiya uchlari chegaragacha — ponasimon kvartiralar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ponasimon kvartiralar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => {
    const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'setSite', rings: [[[-120, -50], [80, -50], [120, 50], [-80, 50]].map(G)] });
  });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('ponasimon');
  const n = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen && b.footprint.length !== 4).length);
  expect(n).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/pona_${w}${dark ? 'd' : 'l'}.png` });
  // kvartiralar qadami — ponasimon seksiyada ham kvartiralar
  await page.click('[data-step=kvartira]');
  await page.waitForTimeout(800);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/pona_kv_${w}${dark ? 'd' : 'l'}.png` });
});
