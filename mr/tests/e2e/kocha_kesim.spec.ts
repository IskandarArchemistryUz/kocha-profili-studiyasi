import { test, expect } from './fx';

/**
 * 12.11 (eski navbat, 4-band, 2-qism; maket «Master reja ↔ Koʻchasoz»): koʻcha tanlanadi → «Kesim chizigʻini qoʻyish» → koʻcha ustini bosish →
 * sahnada A–A belgisi; Varaqlarda «Koʻcha profili A–A» (binolar balandligi Master rejadan).
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻcha kesimi A–A va varaq · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60_000 }).toBeGreaterThan(8);
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await page.click('#cutAdd');
  // sahnada koʻcha oʻrtasini bosish (ClickTool) — koʻcha oʻqining oʻrta nuqtasi
  await page.evaluate(() => {
    const ed = (window as any).__mr, d = ed.store.doc, st = d.streets.find((s: any) => s.id === ed.selStreet), o = d.origin;
    const k = [111320 * Math.cos(o[1] * Math.PI / 180), 111132], L = (p: number[]) => [(p[0] - o[0]) * k[0], (p[1] - o[1]) * k[1]];
    const a = L(st.axis[0]), b = L(st.axis[st.axis.length - 1]);
    ed.tool.click([(a[0] + b[0]) / 2 + 1, (a[1] + b[1]) / 2 + 1]);
  });
  await expect(page.locator('#cutCard [data-cut]')).toHaveCount(1);
  await expect(page.locator('#cutCard')).toContainText('A–A');
  if (process.env.GX_SHOTS && !dark) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/kesim_sahna_${w}l.png` }); }
  await page.click('#gxOpen'); await page.click('#frOpen');
  // yangi kesim varaqlar roʻyxatiga oʻzi qoʻshilgan (oxirida)
  await expect(page.locator('.sh-list')).toContainText('A–A');
  await page.click('[data-mode=kesim]');
  const v = page.locator('#gxView');
  await expect(v.locator('[data-cut-part]').first()).toBeAttached({ timeout: 20_000 });
  await expect(v).toContainText('qizil chiziqlar orasi');
  await expect(v.locator('[data-cut-bld]').first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/kesim_varaq_${w}${dark ? 'd' : 'l'}.png` }); }
  if (process.env.GX_SHOTS && !dark) { await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/kesim_varaq_svg.png`, scale: 'device' }); }
  expect(errs).toEqual([]);
});
