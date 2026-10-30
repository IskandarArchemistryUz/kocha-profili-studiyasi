import { test, expect } from './fx';

/** Past qavatli uylar (31.10): yakka uylar va taunhauslar oʻz uchastkasida — panjara, bogʻ, daraxtlar; uylar soni va qaydlar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`past qavatli uylar uchastkalarda · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  for (const typ of ['yakka', 'taunhaus'] as const) {
    await page.click(`[data-typ=${typ}]`);
    await page.click('#genGo');
    const n = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot).length);
    expect(n).toBeGreaterThan(typ === 'yakka' ? 10 : 25);
    // uchastka ≥ 200 m² (74-band), yakka ≥ 400 (75-band)
    const minA = await page.evaluate(() => { const B = (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot); const R = 6371008.8, k = Math.PI / 180;
      return Math.min(...B.map((b: any) => { const p = b.gen.plot, lat0 = p[0][1] * k; let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length]; s += (a[0] * k * Math.cos(lat0) * R) * (c[1] * k * R) - (c[0] * k * Math.cos(lat0) * R) * (a[1] * k * R); } return Math.abs(s / 2); })); });
    expect(minA).toBeGreaterThan(typ === 'yakka' ? 390 : 195);
    await page.waitForTimeout(600);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/past_${typ}_${w}${dark ? 'd' : 'l'}.png` });
  }
});

test('past qavatli uylar: chiziq boʻylab qator (ikkala tomonga)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await page.locator('#lowRow summary').click();
  await page.click('#lowKind [data-v=taunhaus]'); await page.click('#lowSide [data-v="0"]');
  await page.fill('#lowOff', '6'); await page.locator('#lowOff').dispatchEvent('change');
  await page.click('#lowDraw');
  await expect(page.locator('#lowDraw')).toContainText('Chizishni tugatish');
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.click(cx - box.width * 0.08, cy);
  await page.mouse.click(cx + box.width * 0.28, cy);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/past_chiziq.png` });
  const n = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot && b.gen.grp.startsWith('qator_')).length);
  expect(n).toBeGreaterThan(10);
  // chiziqning ikki tomonida: uylar markazlari chiziqdan har ikki tomonda
  const sides = await page.evaluate(() => { const B = (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.grp?.startsWith('qator_')); const ys = B.map((b: any) => b.footprint.reduce((s: number, p: number[]) => s + p[1], 0) / b.footprint.length); const m = ys.reduce((a: number, b: number) => a + b, 0) / ys.length; return [ys.filter((y: number) => y > m).length, ys.filter((y: number) => y < m).length]; });
  expect(sides[0]).toBeGreaterThan(3); expect(sides[1]).toBeGreaterThan(3);
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(0);
});

