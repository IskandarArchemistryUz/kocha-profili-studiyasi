import { test, expect, rectSite } from './fx';

/**
 * Chuqurlik tartibi (02.11, egasi: «piyoda masofalarni yoqqanda chiziqlar binolarning ustiga chiqib ketmoqda»):
 * tahlil qatlami (piyoda tarmogʻi xaritasi) yerda yotadi va bino uni toʻsadi — tom markazida tasma rangi koʻrinmaydi,
 * bino tashqarisida koʻrinadi.
 */
for (const view of ['plan', 'axo'] as const) test(`piyoda tarmogʻi binolar ortida · ${view}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await rectSite(page, 300, 300);
  const c = await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), my = 111132, r = ed.store.doc.site.rings[0];
    const cx = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, cy = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length;
    const lx = (cx - o[0]) * mx, ly = (cy - o[1]) * my, g = (x: number, y: number) => [o[0] + (lx + x) / mx, o[1] + (ly + y) / my];
    ed.store.dispatch({ type: 'setSettings', patch: { yards: false } });   // daraxt tojlari tasmani toʻsmasin (bu toʻgʻri xatti-harakat)
    ed.store.dispatch({ type: 'addBuilding', footprint: [g(-30, -15), g(30, -15), g(30, 15), g(-30, 15)], floors: 12, nonRes: 0, use: 'ofis' });
    return [lx, ly];
  });
  await page.evaluate(([v]) => (window as any).__mr.setView?.(v) ?? (window as any).__mr.scene.setView(v), [view]);
  await page.waitForTimeout(600);
  await page.evaluate(([x, y]) => { const sc = (window as any).__mr.scene; sc.setNetMap([{ a: [x - 260, y], b: [x + 260, y], color: 0xff0000 }]); }, c);
  await page.waitForTimeout(500);
  const bb = (await page.locator('#scene canvas').boundingBox())!;
  const at = async (x: number, y: number, z: number) => page.evaluate(([x, y, z]) => (window as any).__mr.scene.toScreen(x, y, z), [x, y, z]) as Promise<{ x: number; y: number }>;
  const roof = await at(c[0], c[1], 12 * 3.3 + 0.5), out = await at(c[0] + 210, c[1], 2.5), yard = await at(c[0] + 90, c[1], 2.5);   // uchastkadan tashqarida va kvartal ichida
  const px = async (p: { x: number; y: number }) => {
    const buf = await page.screenshot({ clip: { x: bb.x + p.x - 1, y: bb.y + p.y - 1, width: 3, height: 3 } });
    return page.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const cv = document.createElement('canvas'); cv.width = 3; cv.height = 3; const x = cv.getContext('2d')!; x.drawImage(im, 0, 0); return [...x.getImageData(1, 1, 1, 1).data.slice(0, 3)]; }, buf.toString('base64'));
  };
  const red = (c: number[]) => c[0] > 180 && c[1] < 90 && c[2] < 90;
  expect(red(await px(out))).toBe(true);    // bino tashqarisida — tasma koʻrinadi
  expect(red(await px(yard))).toBe(true);   // kvartal toʻldirmasi ustida ham koʻrinadi (rejada ham)
  expect(red(await px(roof))).toBe(false);  // tom ustida — bino toʻsadi
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chuqurlik_${view}.png` });
});
