import { test, expect } from './fx';

/** Kvartira ichki rejasi (31.10): albom «Reja» koʻrinishida xonalar (prixojaya, oshxona-mehmonxona, yotoqlar, hoʻl xonalar), ichki devorlar, eshiklar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`albomda kvartira ichki rejasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  const svg = page.locator('#albPlan svg');
  await expect(svg.locator('text', { hasText: 'dahliz' }).first()).toBeVisible();
  await expect(svg.locator('tspan', { hasText: 'oshxona-mehmonxona' }).first()).toBeAttached();
  expect(await svg.locator('text', { hasText: 'yotoqxona' }).count()).toBeGreaterThan(0);
  // hoʻl xonalar kafel bilan, eski «S» belgisi yoʻq (ichki rejali kvartiralarda)
  expect(await svg.locator('path[fill="url(#tile)"]').count()).toBeGreaterThan(2);
  // mebel (31.10): unitaz va boshqa jihozlar; «Mebel» oʻchirilsa — yoʻq; «Oq-qora» — kvartiralar oq
  expect(await svg.locator('ellipse').count()).toBeGreaterThan(2);
  await page.waitForTimeout(900);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albFurn'); await expect(svg.locator('ellipse')).toHaveCount(0);
  await page.click('#albMono');
  expect(await page.locator('#albPlan svg path[data-apt]').first().getAttribute('fill')).toBe('#ffffff');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_mono_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albFurn'); await page.click('#albMono');
  // bino koʻndalang kesimi (31.10): qavatlar, tush payti quyosh nurlari
  await page.click('[data-view=kesim]');
  await expect(page.locator('#albPlan svg text', { hasText: 'koʻndalang kesim' })).toBeAttached();
  await expect(page.locator('#albPlan svg text', { hasText: '22.12' })).toBeAttached();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kesim_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('[data-view=reja]');
});
