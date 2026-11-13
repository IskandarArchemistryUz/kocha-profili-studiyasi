import { test, expect } from './fx';

/* 13.11 (egasi): «master rejani kesib atrof bilan qanday koʻrinyapti» — Hajmlar → «Kesim va fasad» → chiziq → Varaqlar «Fasad» rejimi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kesim va fasad atrof bilan · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(180_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.setViewportSize({ width: w, height: 860 });
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const bld = (id: number, x: number, y: number, wd: number, dp: number, lv: number) => ({ type: 'way', id, tags: { building: 'apartments', 'building:levels': String(lv) }, geometry: [[x, y], [x + wd, y], [x + wd, y + dp], [x, y + dp], [x, y]].map(([a, b]) => ll(a, b)) });
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: [bld(101, -230, 60, 40, 14, 4), bld(102, 170, 70, 50, 14, 12), bld(103, -60, 140, 70, 14, 5), bld(104, 60, 150, 30, 30, 2)] } }));
  await context.route(/elevation-tiles|arcgisonline|openfreemap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText(/yoʻl|bino|Tayyor/, { timeout: 15000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=tor]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60_000 }).toBeGreaterThan(6);
  await expect(page.locator('#secCard')).toBeVisible();
  await page.click('#secAdd');
  // gʻarbdan sharqqa, uchastkadan 120 m tashqariga chiqib (koʻrinadigan tomon — chapda, ya'ni shimol)
  await page.evaluate(() => { const ed = (window as any).__mr; ed.tool.click([-270, 15]); ed.tool.click([270, 15]); });
  await expect(page.locator('#secCard [data-sec]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.sections?.length ?? 0)).toBe(1);
  if (process.env.GX_SHOTS && !dark) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/siluet_sahna_${w}l.png` }); }
  await page.click('#gxOpen'); await page.click('#frOpen');
  await expect(page.locator('.sh-list')).toContainText('1–1');
  await page.click('[data-mode=siluet]');
  const v = page.locator('#gxView');
  await expect(v.locator('[data-sil="loyiha"], [data-sil="loyiha-kesim"]').first()).toBeAttached({ timeout: 20_000 });
  await expect(v.locator('[data-sil="atrof"]').first()).toBeAttached();
  await expect(v.locator('[data-sil-site]').first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/siluet_varaq_${w}${dark ? 'd' : 'l'}.png` }); }
  if (process.env.GX_SHOTS && !dark) await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/siluet_varaq_svg.png`, scale: 'device' });
  // 13.11: uslub tanlovi — 6 ta; «Rangli fasad» — derazalar, kesim yoʻq; «Fasad + kesim» — ikkala lenta
  await expect(page.locator('#shSilStyle [data-silstyle]')).toHaveCount(6);
  await page.click('#shSilStyle [data-silstyle=rangli]');
  await expect(v.locator('[data-sil="deraza"]').first()).toBeAttached();
  await expect(v.locator('[data-sil="loyiha-kesim"]')).toHaveCount(0);
  await page.click('#shSilStyle [data-silstyle=juft]');
  await expect(v.locator('[data-sil="loyiha-kesim"]').first()).toBeAttached();
  await expect(v.locator('[data-sil="deraza"]').first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/siluet_uslub_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});
