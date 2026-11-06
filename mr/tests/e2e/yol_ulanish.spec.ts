import { test, expect } from './fx';

/** 06.11 (egasi skrinshotlari): loyiha koʻchalari bir-biriga va mavjud koʻchaga tugun orqali ulanadi — bordyur yoylari (ShNQ 2.07.06-24,
 *  108-band), trotuar burchakda aylanadi; qizil chiziq ogʻizni yopmaydi, burchagi yoy bilan; varaqlarda faqat uchastka ichida */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  el.push({ type: 'way', id: id++, tags: { highway: 'primary', lanes: '4' }, geometry: [g(-118, -300), g(-118, 300)] });          // gʻarbda magistral
  el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-300, 92), g(300, 92)] });                        // shimolda mahalliy
  el.push({ type: 'way', id: id++, tags: { highway: 'service' }, geometry: [g(-30, -130), g(130, -20)] });                          // janubi-sharqda xizmat yoʻli (uchastka chetidan)
  return { elements: el };
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻchalar tuguni va mavjud yoʻlga ulanish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:arcgisonline|terrain|amazonaws|elevation|openfreemap|tile|cartocdn|openstreetmap\.org))/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '170'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    // 1: magistraldan (uchi trotuarda, yoʻl oʻqigacha yetmagan) sharqqa; 2: shimoldagi yoʻldan 1-koʻchaning qizil chizigʻigacha (burilish bilan);
    // 3: 1-koʻchani oʻrtasidan kesib, uchastkadan tashqariga — xizmat yoʻlini kesib oʻtadi
    ed.store.dispatch({ type: 'addStreet', axis: [[-108, 0], [30, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[60, 85], [40, 30], [30, 7.5]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[-50, 70], [-20, -60], [10, -120]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=kocha]');
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.isMesh && o.geometry?.attributes?.position?.count > 0) n++; }); return n; })).toBeGreaterThan(5);
  const sh = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  if (sh) {
    for (const [nm, x, y, r] of [['umumiy', 0, 0, 150], ['magistral', -100, 0, 35], ['tugun', 25, 5, 35], ['xizmat', 0, -95, 40]] as const) {
      await page.evaluate(([x, y, r]) => (window as any).__mr.scene.frameView(x, y, r), [x, y, r]); await page.waitForTimeout(700);
      await page.screenshot({ path: `${sh}/yol_${nm}_${tag}.png` });
    }
  }
  // genplan varagʻi: koʻchalar va qizil chiziqlar uchastka bilan kesilgan
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Qizil_chiziqlar')).toBeAttached();
  await expect(view.locator('clipPath#ichki')).toBeAttached();
  expect(await view.locator('#Qizil_chiziqlar [clip-path="url(#ichki)"]').count()).toBe(1);
  expect(await view.locator('#Loyiha_kochalari [clip-path="url(#ichki)"]').count()).toBe(1);
  if (sh) { await page.waitForTimeout(1200); await page.screenshot({ path: `${sh}/yol_varaq_${tag}.png` }); }
});
