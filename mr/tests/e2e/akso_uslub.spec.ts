import { test, expect } from './fx';

/** 06.11 (akso uslublari 2-bosqich, claude/aksonometriya-uslublar-tahlil.md): 4 — qavatlilik, 5 — loyiha va kontekst, 6 — saqlanadi/buziladi; legenda — faqat bor toifalar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Grafika akso — uslublar 4–6 · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(4);
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('#shMode [data-mode=akso]');
  const sfx = `${w}${dark ? 'd' : 'l'}`;
  await expect(page.locator('[data-alook=oq]')).toBeVisible();
  await expect(page.locator('[data-axo-legend]')).toHaveCount(0);   // oq maket — legenda yoʻq
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/akso_oldin_${sfx}.png` }); }
  for (const k of ['qavatlilik', 'kontekst', 'demontaj']) {
    await page.click(`[data-alook=${k}]`);
    await expect(page.locator(`[data-alook=${k}]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-axo-legend]').first()).toBeAttached({ timeout: 30_000 });
    if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/akso_${k}_${sfx}.png` }); }
  }
  // sahna ish holatiga qaytadi — uslub faqat chizmada
  expect(await page.evaluate(() => (window as any).__mr.scene.paint)).toBeNull();
});
