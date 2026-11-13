import { test, expect } from './fx';

/** 13.11 (kanvas «Shaxmatka va insolyatsiya varaqlari», egasi tasdiqladi): Varaqlar → «Shaxmatka» — bino va loyiha */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`shaxmatka varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-mode=shaxmatka]');
  const v = page.locator('#gxView');
  // bino: qavat × seksiya toʻri, tarkib jadvali, tipik qavat rejasi
  await expect(v.locator('[data-shx="kv"]').first()).toBeAttached({ timeout: 20_000 });
  await expect(v).toContainText(/SEKSIYA/);
  await expect(v).toContainText(/(KVARTIRALAR|XONADONLAR) TARKIBI/);
  await expect(v).toContainText('m²');
  await expect(page.locator('#shShxCell [data-cell]')).toHaveCount(3);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/shaxmatka_bino_${w}${dark ? 'd' : 'l'}.png` }); }
  if (process.env.GX_SHOTS && !dark) await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/shaxmatka_bino_svg.png`, scale: 'device' });
  // ixcham — maydon yozuvi yoʻq
  await page.click('#shShxCell [data-cell=ixcham]');
  await expect(v.locator('[data-shx="kv"]').first()).toBeAttached();
  await expect(v.locator('svg').first()).not.toContainText(' m²43');
  // loyiha
  await page.click('#shShxScope [data-scope=loyiha]');
  await expect(v.locator('[data-shx="mini"]').first()).toBeAttached();
  await expect(v).toContainText('LOYIHA TARKIBI');
  await expect(v).toContainText('MIKS');
  await expect(page.locator('#shShxCell')).toHaveCount(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/shaxmatka_loyiha_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});
