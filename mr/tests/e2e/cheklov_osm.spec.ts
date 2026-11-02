import { test, expect, rectSite } from './fx';

/**
 * Cheklovlar 4-bosqichi (02.11, egasi: «OSM da maʼlumot boʻlsa — mavjud yer foydalanishi va ELU tayanchlari bilan yuklansin»):
 * atrof OSM dan yuklangan va uchastka chizilganda cheklovlar oʻzi aniqlanadi; qayta bosilganda takrorlanmaydi.
 */
test('OSM dan cheklovlar: qabriston, 110 kV ELU tayanchlari bilan, bogʻ', async ({ page, context }) => {
  test.setTimeout(120_000);
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const sq = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
  let limQ = 0;
  await context.route(/interpreter/, async r => {
    const body = decodeURIComponent(r.request().postData() ?? '');
    if (body.includes('"power"')) { limQ++; return r.fulfill({ json: { elements: [
      { type: 'way', id: 101, tags: { landuse: 'cemetery', name: 'Eski qabriston' }, geometry: sq(-60, -60, -20, -20) },
      { type: 'way', id: 102, tags: { power: 'line', voltage: '110000' }, geometry: [ll(-400, 120), ll(0, 120), ll(400, 120)] },
      { type: 'node', id: 201, tags: { power: 'tower' }, lat: ll(-150, 120).lat, lon: ll(-150, 120).lon },
      { type: 'node', id: 202, tags: { power: 'tower' }, lat: ll(150, 120).lat, lon: ll(150, 120).lon },
      { type: 'way', id: 103, tags: { landuse: 'orchard' }, geometry: sq(40, -80, 90, -40) },
    ] } }); }
    return r.fulfill({ json: { elements: [{ type: 'way', id: 1, tags: { building: 'yes' }, geometry: sq(300, 300, 312, 312) }] } });
  });
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await rectSite(page, 400, 400);
  await expect(page.locator('[data-lim]')).toHaveCount(3, { timeout: 15000 });
  await expect(page.locator('#limOsmMsg')).toContainText('3');
  const rows = page.locator('[data-lim]');
  await expect(rows.filter({ hasText: 'Eski qabriston' })).toContainText('100 m · IV');
  await expect(rows.filter({ hasText: '110 kV' })).toContainText('2 tayanch');
  await expect(rows.filter({ hasText: '110 kV' })).toContainText('OSM');
  await expect(rows.filter({ hasText: 'Bogʻ' })).toContainText('Buziladi');
  // sahnada tayanchlar
  expect(await page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.poles) n++; }); return n; })).toBe(1);
  // qayta bosish — takrorlanmaydi
  await page.click('#limOsm');
  await expect(page.locator('#limOsmMsg')).toContainText(/topilmadi/);
  await expect(page.locator('[data-lim]')).toHaveCount(3);
  expect(limQ).toBeGreaterThan(1);   // overpass() zaxira serverlarga parallel soʻraydi — soni aniq emas
  await page.locator('#limOsmMsg').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/cheklov_osm.png` });
});
