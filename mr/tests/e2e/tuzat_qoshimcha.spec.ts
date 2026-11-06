import { test, expect, type Page } from './fx';

/** 06.11 (c58): «Tuzat» tugmalari — hovli-79-3, seismic-height, spacing-79, redline-79: oldin «mos emas» → tuzatish → «mos emas» emas */
async function proj(page: Page, w: number, h: number) {
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]'); await page.fill('#rw', String(w)); await page.fill('#rh', String(h)); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 60000 });
}
const st = (page: Page, id: string) => page.evaluate(i => { const r = (window as any).__mr.allRules().find((x: any) => x.id === i); return r ? `${r.status}|${r.fix?.id ?? ''}` : 'none'; }, id);
const ev = (page: Page, id: string) => page.evaluate(i => { const m = (window as any).__mr, r = m.evalRule(i, m.store.doc); return r ? `${r.status}|${r.fix?.id ?? ''}` : 'none'; }, id);
const fix = (page: Page, id: string) => page.evaluate(i => (window as any).__mr.applyFix(i), id);
const floors = (page: Page) => page.evaluate(() => (window as any).__mr.store.doc.buildings.length);

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qoʻshimcha «Tuzat» tugmalari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: w, height: 900 });
  await proj(page, 120, 100);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const n0 = await floors(page);
  // 1) yopiq hovli (3-izoh)
  await expect.poll(() => st(page, 'hovli-79-3'), { timeout: 20000 }).toBe('fail|hovli-floors');
  // UI: reyestrda qator ochiladi va tugma bosiladi
  await page.click('#kMore'); const row = page.locator('.drawer .rrow', { hasText: 'Yopiq ichki hovli' }).first();
  await row.scrollIntoViewIfNeeded(); await row.click();
  await expect(page.locator('#fix-hovli-79-3')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tuzat_hovli_oldin_${w}${dark ? 'd' : 'l'}.png` });
  await page.locator('#fix-hovli-79-3').click();
  await expect.poll(() => st(page, 'hovli-79-3'), { timeout: 20000 }).not.toMatch(/^fail/);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/tuzat_hovli_keyin_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(await floors(page)).toBe(n0);   // binolar oʻchirilmaydi
  // 2) seysmik balandlik: bitta binoni 40 qavat qilamiz
  await page.evaluate(() => { const m = (window as any).__mr, b = m.store.doc.buildings.find((x: any) => x.floors > 3); m.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: 40 } }); });
  await expect.poll(() => st(page, 'seismic-height'), { timeout: 20000 }).toBe('fail|seismic-floors');
  await fix(page, 'seismic-floors');
  await expect.poll(() => st(page, 'seismic-height'), { timeout: 20000 }).not.toMatch(/^fail/);
  expect(await floors(page)).toBe(n0);
});

test('binolar orasi (spacing-79) va qizil chiziqdan surish (redline-79)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await proj(page, 160, 140);
  // binolar orasi: hovlidagi binolarni 25 qavat qilamiz — uzun tarzlar orasi yetmaydi (79-band, 2-jadval)
  const sp = await page.evaluate(() => { const m = (window as any).__mr; for (const b of m.store.doc.buildings.filter((x: any) => x.floors > 3)) m.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: 25 } }); return m.evalRule('spacing-79', m.store.doc); });
  expect(`${sp.status}|${sp.fix?.id ?? ''}`).toBe('fail|spacing-floors');
  await fix(page, 'spacing-floors');
  const sp2 = await page.evaluate(() => { const m = (window as any).__mr; return m.evalRule('spacing-79', m.store.doc).status; });
  expect(sp2).not.toBe('fail');
  // eng janubiy bino ostidan koʻcha: qizil chiziq binodan 1 m da (talab H × 0,25 ≥ 2,5 m)
  const moved = await page.evaluate(() => {
    const m = (window as any).__mr, bs = m.store.doc.buildings.filter((b: any) => b.floors >= 3);
    const lo = (b: any) => Math.min(...b.footprint.map((p: number[]) => p[1])), b = bs.reduce((a: any, x: any) => (lo(x) < lo(a) ? x : a));
    const lat = lo(b), kx = 1 / (111320 * Math.cos(lat * Math.PI / 180)), ky = 1 / 110540;
    const x0 = Math.min(...b.footprint.map((p: number[]) => p[0])) - 30 * kx, x1 = Math.max(...b.footprint.map((p: number[]) => p[0])) + 30 * kx, y = lat - 8.5 * ky;
    m.store.dispatch({ type: 'addStreet', axis: [[x0, y], [x1, y]], profile: 'mahalla-15' });
    return m.evalRule('redline-79', m.store.doc)?.status === 'fail';
  });
  expect(moved).toBe(true);
  expect(await ev(page, 'redline-79')).toBe('fail|redline-move');
  await fix(page, 'redline-move');
  expect(await ev(page, 'redline-79')).not.toMatch(/^fail/);
});
