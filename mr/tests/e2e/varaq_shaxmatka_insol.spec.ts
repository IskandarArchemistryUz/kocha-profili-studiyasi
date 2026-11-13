import { test, expect } from './fx';

/** 13.11 (kanvas IN-01, IN-02): Shaxmatka → «Insolyatsiya» — hisob yoʻq boʻlsa — tugma; hisobdan keyin holat ranglari, deraza soatlari, mos emaslar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`shaxmatka insolyatsiya · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-mode=shaxmatka]');
  await page.click('#shShxMode [data-shxins=true]');
  const v = page.locator('#gxView');
  await expect(page.locator('#shShxRun')).toBeVisible();
  await expect(v).toContainText(/Hisob yoʻq/);
  await page.click('#shShxRun');
  await expect(v.locator('[data-shx="deraza"]').first()).toBeAttached({ timeout: 60_000 });
  await expect(page.locator('#shShxRun')).toHaveCount(0);
  await expect(v).toContainText('INSOLYATSIYA');
  await expect(v).toContainText(/\d+ %/);
  await expect(page.locator('[data-sheet][aria-selected=true]')).toContainText(/insolyatsiya/i);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/shaxmatka_insol_${w}${dark ? 'd' : 'l'}.png` }); }
  if (process.env.GX_SHOTS && !dark) await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/shaxmatka_insol_svg.png`, scale: 'device' });
  await page.click('#shShxScope [data-scope=loyiha]');
  await expect(v.locator('[data-shx="mini"]').first()).toBeAttached();
  await expect(v).toContainText('INSOLYATSIYA');
  expect(errs).toEqual([]);
});
