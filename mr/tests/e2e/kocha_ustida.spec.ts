import { test, expect } from './fx';

/** Koʻcha bino ustiga siljitilsa (qoʻlda chizilgan bino): reyestrda «Bino koʻcha qizil chiziqlari ichida» — mos emas, sahnada qizil boʻlak, bino panelida «Koʻchadan chiqarish» binoni koridordan tashqariga suradi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`bino koʻcha koridorida — ogohlantirish va chiqarish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // koʻcha y = 0; qoʻlda bino y 12..24 (koridor 7,5 m — tegmaydi)
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'addStreet', axis: [G(-100, 0), G(100, 0)], profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addBuilding', id: 'qolda', footprint: [G(-20, 12), G(20, 12), G(20, 24), G(-20, 24)], floors: 4 }); });
  await page.click('[data-step=hajm]');
  const ov = () => page.evaluate(() => (window as any).__mr.last?.d.streetOverlap ?? []);
  await expect.poll(async () => (await ov()).length).toBe(0);
  // koʻchani bino ustiga surish (oʻq y = 14 ga) → kesishma
  await page.evaluate(() => { const ed = (window as any).__mr, s = ed.store.doc.streets[0], o = ed.store.doc.origin; ed.store.dispatch({ type: 'updateStreet', id: s.id, patch: { axis: s.axis.map((p: number[]) => [p[0], o[1] + 14 / 111132]) } }); });
  await expect.poll(async () => (await ov()).length, { timeout: 15_000 }).toBe(1);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ustida_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=street-overlap]');
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await expect(rule).toContainText('1');
  await page.click('.drawer .ib, .drawer [aria-label=Yopish]').catch(() => {});
  // binoni tanlab «Koʻchadan chiqarish»
  await page.evaluate(() => { const ed = (window as any).__mr; ed.sel = 'qolda'; ed.scene.select('qolda'); ed.renderPanel(); });
  await expect(page.locator('#ovNote')).toBeVisible();
  await page.click('#ovPush');
  await expect.poll(async () => (await ov()).length, { timeout: 15_000 }).toBe(0);
  const y = await page.evaluate(() => { const d = (window as any).__mr.store.doc; const b = d.buildings.find((x: any) => x.id === 'qolda'); return Math.min(...b.footprint.map((p: number[]) => (p[1] - d.origin[1]) * 111132)); });
  expect(y).toBeGreaterThan(14 + 7.5);   // koridor (mahalla-15: 15 m) tashqarisida
});
