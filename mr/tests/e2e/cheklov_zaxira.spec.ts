import { test, expect, rectSite } from './fx';

/** 04.11 (Murad Buildings sinovi, 8-band): cheklovlar soʻrovi (Overpass) javob bermasa — xarita qatlamidan (atrof konteksti) zaxira aniqlash */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Overpass javob bermasa — kontekstdan sanoat va suv · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(150_000);
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const sq = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
  await context.route(/interpreter/, async r => {
    const body = decodeURIComponent(r.request().postData() ?? '');
    if (body.includes('"power"')) return r.fulfill({ status: 504, body: '' });   // cheklovlar soʻrovi — javob yoʻq
    return r.fulfill({ json: { elements: [
      { type: 'way', id: 1, tags: { building: 'industrial' }, geometry: sq(260, -60, 360, 60) },
      { type: 'way', id: 2, tags: { building: 'yes' }, geometry: sq(-400, 260, -300, 340) },
      { type: 'way', id: 3, tags: { waterway: 'canal', name: 'Boʻzsuv' }, geometry: [ll(-500, -260), ll(500, -260)] },
    ] } });
  });
  await context.route(/elevation-tiles|arcgisonline|openfreemap/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await rectSite(page, 400, 400);
  await expect(page.locator('#limOsmMsg')).toContainText('Xarita qatlamidan', { timeout: 60000 });
  await expect(page.locator('#limOsmMsg')).toContainText('2');
  const kinds = await page.evaluate(() => ((window as any).__mr.store.doc.limits ?? []).map((l: any) => l.kind).sort());
  expect(kinds).toEqual(['sanoat', 'suv']);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/zaxira_${w}${dark ? 'd' : 'l'}.png` }); }
});
