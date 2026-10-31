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
  for (const typ of ['yakka', 'taunhaus', 'juft', 'hovli', 'klaster'] as const) {
    await page.click(`[data-typ=${typ}]`);
    // past qavatli: qavat 1–3 (ShNQ 2.07.01-23, 2-band), seksiya parametrlari yoʻq, chiziq boʻylab qator shu yerda
    await expect(page.locator('#lowFl')).toBeVisible(); await expect(page.locator('#gDepth')).toHaveCount(0); await expect(page.locator('#lowDraw')).toBeVisible();
    await page.click('#genGo');
    const n = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot).length);
    expect(n).toBeGreaterThan(typ === 'taunhaus' ? 25 : typ === 'klaster' ? 12 : 8);
    // uchastka ≥ 200 m² (74-band), yakka ≥ 400 (75-band)
    const minA = await page.evaluate(() => { const B = (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot); const R = 6371008.8, k = Math.PI / 180;
      return Math.min(...B.map((b: any) => { const p = b.gen.plot, lat0 = p[0][1] * k; let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length]; s += (a[0] * k * Math.cos(lat0) * R) * (c[1] * k * R) - (c[0] * k * Math.cos(lat0) * R) * (a[1] * k * R); } return Math.abs(s / 2); })); });
    expect(minA).toBeGreaterThan(typ === 'yakka' || typ === 'hovli' ? 390 : typ === 'klaster' ? 220 : 195);
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
  await page.click('[data-typ=taunhaus]'); await page.click('#lowSide [data-v="0"]');
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


/** 31.10 (egasi): koʻcha oʻqi ustiga chizilganda ham uylar qoʻyiladi (chekinish avtomatik), avtomatik uylar almashtiriladi; turar joy kvartaliga ofis tipologiyasi oʻchiq */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qator koʻcha oʻqi boʻylab va parselga mos tipologiya · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, d = mr.store.doc, [lng, lat] = d.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180);
    mr.store.dispatch({ type: 'addStreet', axis: [[lng - 120 * kx, lat], [lng + 120 * kx, lat]], profile: 'mahalla-15' });
  });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('[data-typ=ofis_plita]')).toHaveCount(0); await expect(page.locator('[data-typ=yakka]')).toBeEnabled();   // turar joy kvartalida jamoat guruhi yoʻq
  await page.click('[data-typ=yakka]'); await page.click('#genGo');
  const g0 = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen && !b.gen.grp.startsWith('qator_')).length);
  expect(g0).toBeGreaterThan(4);
  await page.click('[data-typ=taunhaus]'); await page.click('#lowSide [data-v="0"]');
  await page.click('#lowDraw');
  const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); };
  await at(-10, 0); await at(100, 0); await page.keyboard.press('Enter');   // 1024 px da chap panel ostiga tushmasin
  await page.waitForTimeout(400);
  const res = await page.evaluate(() => { const B = (window as any).__mr.store.doc.buildings; return { q: B.filter((b: any) => b.gen?.grp?.startsWith('qator_')).length, g: B.filter((b: any) => b.gen && !b.gen.grp.startsWith('qator_')).length }; });
  expect(res.q).toBeGreaterThan(6);
  expect(res.g).toBeLessThan(g0);   // ustiga tushgan avtomatik uylar olib tashlandi
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/past_okoch_${w}${dark ? 'd' : 'l'}.png` });
});
