import { test, expect } from './fx';

/** 05.11 (egasi): «Liniya bilan seksiyalarni ulangan holda chizsa boʻlsin» — oʻq chiziladi, seksiyalar umumiy devor bilan ulanadi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`chiziq boʻylab ulangan seksiyalar (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
    await page.setViewportSize({ width: w, height: 800 }); if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
      m.store.dispatch({ type: 'setSite', rings: [[[-100, -80], [100, -80], [100, 80], [-100, 80]].map(G)] });
    });
    await page.click('[data-step=hajm]');
    await page.click('#drawStrip');
    await expect(page.locator('#stripDepth')).toHaveValue('15');
    await expect(page.locator('#drawStrip')).toHaveClass(/btn-primary/);
    const toScreen = async (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as Promise<{ x: number; y: number }>;
    const bb = (await page.locator('#scene canvas').boundingBox())!;
    // L-chiziq: (-60,-40) → klaviaturadan 60 m sharqqa → (0,-40) dan 50 m shimolga
    const s0 = await toScreen(-60, -40), sE = await toScreen(-20, -40);
    await page.mouse.click(bb.x + s0.x, bb.y + s0.y);
    await page.mouse.move(bb.x + sE.x, bb.y + sE.y);
    await page.keyboard.type('60<0'); await page.keyboard.press('Enter');
    await page.keyboard.type('50<90'); await page.keyboard.press('Enter');
    { const c = await toScreen(30, 10); await page.mouse.move(bb.x + c.x, bb.y + c.y); }   // oldindan koʻrish: kursor tomon yana bir segment
    await page.waitForTimeout(200);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chiziq_seksiya_chizish_${w}${dark ? 'd' : 'l'}.png` });
    await page.keyboard.press('Enter');
    // 60 m — 2 boʻlak (seksiya uzunligi 30), 50 m — 2 boʻlak
    await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(4);
    const shared = await page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180);
      const R = m.store.doc.buildings.map((b: any) => b.footprint.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]));
      const near = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05;
      const sh = (a: number[][], b: number[][]) => a.some((p, i) => { const q = a[(i + 1) % a.length]; return b.some((x, j) => { const y = b[(j + 1) % b.length]; return (near(p, x) && near(q, y)) || (near(p, y) && near(q, x)); }); });
      let n = 0; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (sh(R[i], R[j])) n++;
      return n;
    });
    expect(shared).toBe(3);   // zanjir: 4 seksiya — 3 umumiy devor
    // spacing qoidasi umumiy devorli seksiyalarni juft sifatida koʻrmaydi
    expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(4);
    await page.waitForTimeout(300);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chiziq_seksiya_${w}${dark ? 'd' : 'l'}.png` });
  });
}
