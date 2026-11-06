import { test, expect, rectSite } from './fx';

/**
 * 07.11 (c70, egasi: «benzin quyish va metan/propan shoxobchalari SMZ chiqmaydi, yana turli zonalar qolib ketgan»): OSM dan SMZ obyektlari —
 * yoqilgʻi quyish (fuel:* teglari, SanQvaN 0103-25 1-ilova 414 / 491–494), avtovokzal (308), TP (ShNQ 2.07.01-23, 257);
 * oʻlcham nomaʼlum — eng ehtiyotkor qator + «koʻrib chiqish»; panelda guruh va qator tanlanadi.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`SMZ obyektlari: AYoQSh, AGZS, avtovokzal, TP · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(150_000);
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const sq = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
  await context.route(/interpreter/, async r => {
    const body = decodeURIComponent(r.request().postData() ?? '');
    if (body.includes('"power"')) return r.fulfill({ json: { elements: [
      { type: 'node', id: 501, tags: { amenity: 'fuel', 'fuel:lpg': 'yes', name: 'Propan AGZS' }, ...ll(230, 0) },
      { type: 'node', id: 502, tags: { amenity: 'fuel', 'fuel:cng': 'yes', name: 'Metan' }, ...ll(-250, 40) },
      { type: 'way', id: 503, tags: { amenity: 'bus_station', name: 'Avtovokzal' }, geometry: sq(-60, 260, 40, 320) },
      { type: 'node', id: 504, tags: { power: 'substation', voltage: '10000' }, ...ll(0, -150) },
    ] } });
    return r.fulfill({ json: { elements: [{ type: 'way', id: 1, tags: { building: 'yes' }, geometry: sq(500, 500, 512, 512) }] } });
  });
  await context.route(/elevation-tiles|arcgisonline|openfreemap|cartocdn|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await rectSite(page, 400, 400);
  await expect(page.locator('[data-lim]')).toHaveCount(4, { timeout: 15000 });
  await expect(page.locator('#limOsmObj')).toContainText('SanQvaN 0103-25');
  const rows = page.locator('[data-lim]');
  await expect(rows.filter({ hasText: 'Propan AGZS' })).toContainText('50 m · V');
  await expect(rows.filter({ hasText: 'Metan' })).toContainText('100 m · IV');      // 492 sharti nomaʼlum — eng ehtiyotkor 414
  await expect(rows.filter({ hasText: 'Avtovokzal' })).toContainText('300 m · III');
  await expect(rows.filter({ hasText: 'TP yoki taqsimlash punkti' })).toContainText('10 m');
  // metan: OSM taxmini — ogohlantirish, 492 qatorini tanlash → 50 m, norma
  await rows.filter({ hasText: 'Metan' }).click();
  await expect(page.locator('[data-objguess]')).toBeVisible();
  await expect(page.locator('#limObjG [data-objg=yoqilgi]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-objfire]')).toContainText('SHNQ 2.09.20-08');
  if (process.env.GX_SHOTS) { await page.locator('#limObjR').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/smz_audit_osm_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#limObjR [data-obj=agtksh_492]');
  await expect(page.locator('#limObjR [data-obj=agtksh_492]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-objguess]')).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Metan' })).toContainText('50 m · V');
  const ref = page.locator('[data-limref]').first();
  await expect(ref).toContainText('1-ilova, 5-sinf, 492');
  await expect(ref).toContainText('norma');
  // qoʻlda: «SMZ obyekti» — oqova suv tozalash, quvvat ustuni (4-ilova)
  await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'addLimit', limit: { id: 'oq', kind: 'obyekt', status: 'saqlanadi', src: 'qolda', obj: 'oqova_mb', rings: [[[-150, -150], [-120, -150], [-120, -120], [-150, -120]].map(g)] } }); m.pickLimit('oq'); m.renderPanel(); });
  await expect(page.locator('[data-lim=oq] .v')).toContainText('500 m');
  await page.click('#limObjQ [data-objq="2"]');
  await expect(page.locator('[data-lim=oq] .v')).toContainText('200 m');
  if (process.env.GX_SHOTS) { await page.locator('#limObjQ').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/smz_audit_oqova_${w}${dark ? 'd' : 'l'}.png` }); }
});
