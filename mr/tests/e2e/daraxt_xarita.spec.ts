import { test, expect } from './fx';

/** 12.11 (eski navbat, 7-band): «Daraxtlar xaritasi» varagʻi — mavjud daraxtlar (inventarizatsiya CSV) loyiha bilan solishtiriladi, yangi ekiladiganlar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`daraxtlar xaritasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60_000 }).toBeGreaterThan(2);
  // inventarizatsiya: uchastka boʻylab 12 m panjarada daraxtlar (CSV fayl orqali)
  const csv = await page.evaluate(() => {
    const o = (window as any).__mr.store.doc.origin, k = [1 / (111320 * Math.cos(o[1] * Math.PI / 180)), 1 / 111132], rows = ['lon,lat,tur'];
    for (let x = -100; x <= 100; x += 12) for (let y = -80; y <= 80; y += 12) rows.push(`${(o[0] + x * k[0]).toFixed(7)},${(o[1] + y * k[1]).toFixed(7)},chinor`);
    return rows.join('\n');
  });
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-kind=daraxt]');
  await page.setInputFiles('#trInvFile', { name: 'daraxtlar.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const v = page.locator('#gxView');
  await expect(v.locator('#Mavjud_kesiladi circle').first()).toBeAttached({ timeout: 20_000 });
  await expect(v).toContainText('Daraxtlar balansi');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.treeInv.length)).toBeGreaterThan(100);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/daraxt_${w}${dark ? 'd' : 'l'}.png` }); if (!dark) await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/daraxt_svg.png` }); }
  expect(errs).toEqual([]);
});
