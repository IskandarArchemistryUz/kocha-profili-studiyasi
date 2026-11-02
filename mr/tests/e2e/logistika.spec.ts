import { test, expect } from './fx';

/** 02.11 (egasi: «logistika markazi hududi yoʻqku»): ishlab chiqarish funksiyalari, logistika turlari, ombor bloki, ShNQ 146/147/174 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`logistika zonasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '400'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  // funksiyalar katalogida yangi guruh
  for (const u of ['logistika', 'sanoat', 'kommunal', 'transport', 'mamuriy']) await expect(page.locator(`[data-use=${u}]`)).toBeVisible();
  await page.click('[data-use=logistika]');
  await expect(page.locator('#logiType [data-logi]')).toHaveCount(7);
  await page.click('[data-logi=yoqilgi]');
  await expect(page.locator('#prodSzz')).toContainText('100');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.zones[0].sub)).toBe('yoqilgi');
  // generator: ombor bloki, 1 qavat
  await page.click('[data-step=hajm]');
  await expect(page.locator('#typoPick summary')).toContainText('Ombor bloki');   // ishlab chiqarish zonasida yagona tipologiya
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 10000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.every((b: any) => b.floors === 1 && b.use === 'logistika'))).toBe(true);
  // reyestr: 174 — magistral koʻcha / temir yoʻl yoʻq → koʻrib chiqish
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=logi-174] [data-s=review]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=prod-146]')).toBeVisible();
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/logistika_${w}${dark ? 'd' : 'l'}.png` });
});

/** 02.11 (2): tur boʻyicha generator — dok darvozalar, apron va tirkamalar (yuk hovlisi), SMZ sahnada, qavat sozlamalari oʻrniga izoh */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`logistika generatori · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '360'); await page.fill('#rh', '240'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.click('[data-use=logistika]');
  await page.click('[data-logi=tarqatish]');
  await page.click('[data-step=hajm]');
  await expect(page.locator('#omborInfo')).toContainText('1 qavat, katta oraliq');
  await expect(page.locator('#gMax')).toHaveCount(0);
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 10000 }).toBe(1);
  const st = await page.evaluate(() => { const d = (window as any).__mr.store.doc, b = d.buildings[0], g = d.garages[0];
    return { docks: b.docks?.[0]?.n ?? 0, truck: g?.truck === true, trailers: g?.stalls?.length ?? 0, apron: g?.aisles?.length ?? 0 }; });
  expect(st.docks).toBeGreaterThan(20);
  expect(st.truck).toBe(true);
  expect(st.trailers).toBeGreaterThan(10);
  expect(st.apron).toBe(1);
  await expect(page.locator('#genNotes')).toContainText('dok darvoza');
  // sahnada: dok darvozalar va ishlab chiqarish SMZ konturi
  expect(await page.evaluate(() => { const s = (window as any).__mr.scene; let d = 0, z = 0; s.world.traverse((o: any) => { if (o.userData.docks) d++; if (o.userData.prodSzz) z++; }); return [d, z]; })).toEqual([1, 1]);
  await page.evaluate(() => { const s = (window as any).__mr.scene; s.setView('axo'); s.frameDoc((window as any).__mr.store.doc); });
  await page.waitForTimeout(600);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/logigen_${w}${dark ? 'd' : 'l'}.png` });
});

/** yuk terminali: temir yoʻl tomonda shoxobcha (sahnada rels va shpallar), doklar avtomobil tomonda */
test('yuk terminali — temir yoʻl shoxobchasi', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '360'); await page.fill('#rh', '240'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.click('[data-use=logistika]'); await page.click('[data-logi=terminal]');
  // temir yoʻl uchastkaning shimolida, sharq–gʻarb
  await page.evaluate(() => { const ed = (window as any).__mr, my = 111132, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), r = ed.store.doc.site.rings[0];
    const ys = r.map((p: number[]) => p[1]), xs = r.map((p: number[]) => p[0]), y = Math.max(...ys) + 12 / my, x0 = Math.min(...xs) - 60 / mx, x1 = Math.max(...xs) + 60 / mx;
    ed.store.dispatch({ type: 'addLimit', limit: { id: 't1', kind: 'temiryol', status: 'saqlanadi', src: 'qolda', rings: [[[x0, y - 3 / my], [x1, y - 3 / my], [x1, y + 3 / my], [x0, y + 3 / my]]] } }); });
  await page.click('[data-step=hajm]'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.garages[0]?.spur?.length ?? 0), { timeout: 10000 }).toBe(2);
  const r = await page.evaluate(() => { const d = (window as any).__mr.store.doc, b = d.buildings[0], s = d.garages[0].spur, e = b.docks[0].edge, f = b.footprint;
    const yb = f.map((p: number[]) => p[1]), ye = (f[e][1] + f[(e + 1) % 4][1]) / 2;
    return { spurN: s[0][1] > Math.max(...yb), dockS: Math.abs(ye - Math.min(...yb)) < 1e-6, flat: Math.abs(s[0][1] - s[1][1]) < 1e-7 }; });
  expect(r).toEqual({ spurN: true, dockS: true, flat: true });
  expect(await page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData.spur) n++; }); return n; })).toBe(1);
});
