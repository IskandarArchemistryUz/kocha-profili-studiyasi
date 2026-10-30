import { test, expect } from './fx';

/** Egasi (30.10, video): burilgan uchastkada koʻchaga parallel bino qoʻyib boʻlmasdi — «Oʻq boʻylab»: fasad chizigʻi + chuqurlik */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`oʻq boʻylab bino: burchak qirraga yopishadi, chuqurlik paneldan va klaviaturadan (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
    await page.setViewportSize({ width: w, height: 800 }); if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    // 30° ga burilgan uchastka 160 × 100 m
    await page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
      const a = Math.PI / 6, R = (x: number, y: number) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
      m.store.dispatch({ type: 'setSite', rings: [[R(-80, -50), R(80, -50), R(80, 50), R(-80, 50)].map(G)] });
    });
    await page.click('[data-step=hajm]');
    await page.click('#drawAxis');
    await expect(page.locator('#dimBox')).toBeVisible();
    await expect(page.locator('#axisDepth')).toHaveValue('15');
    // sahnada: uchastkaning pastki qirrasi yonida boshlanadi, oxiri ~27° ga — 30° ga yopishishi kerak; keyin chuqurlik paneldan 18
    const toScreen = async (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as Promise<{ x: number; y: number }>;
    const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
    const a = Math.PI / 6, R = (x: number, y: number) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const p0 = R(-40, -44), p1 = [p0[0] + 40 * Math.cos(27 * Math.PI / 180), p0[1] + 40 * Math.sin(27 * Math.PI / 180)];
    const s0 = await toScreen(p0[0], p0[1]), s1 = await toScreen(p1[0], p1[1]);
    await page.mouse.click(bb.x + s0.x, bb.y + s0.y);
    await page.mouse.move(bb.x + s1.x, bb.y + s1.y);
    await expect(page.locator('.hint')).toContainText('30°');
    await page.mouse.click(bb.x + s1.x, bb.y + s1.y);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/oq_chiziq${dark ? '_dark' : ''}.png` });
    await page.fill('#axisDepth', '18'); await page.click('#axisPut');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(1);
    const fp = () => page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), b = m.store.doc.buildings.at(-1);
      return b.footprint.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]) as number[][];
    });
    const r = await fp(), L = (i: number) => Math.hypot(r[(i + 1) % 4][0] - r[i][0], r[(i + 1) % 4][1] - r[i][1]);
    const sides = [L(0), L(1), L(2), L(3)].sort((x, y) => x - y);
    expect(sides[0]).toBeCloseTo(18, 0); expect(sides[3]).toBeCloseTo(40, 0);
    const ang = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]) * 180 / Math.PI;
    expect([30, 120, 210, -60, -150].some(q => Math.abs(ang - q) < 1.5)).toBe(true);   // qirraga parallel yoki tik
    // asbob qoladi — keyingi bino klaviaturadan: boshi, «32x15», Enter
    await expect(page.locator('#drawAxis')).toHaveClass(/btn-primary/);
    const q0 = R(10, 20), s2 = await toScreen(q0[0], q0[1]), s3 = await toScreen(q0[0] + 30, q0[1] + 5);
    await page.mouse.click(bb.x + s2.x, bb.y + s2.y); await page.mouse.move(bb.x + s3.x, bb.y + s3.y);
    await page.keyboard.type('32x15'); await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(2);
    const r2 = await fp(), L2 = (i: number) => Math.hypot(r2[(i + 1) % 4][0] - r2[i][0], r2[(i + 1) % 4][1] - r2[i][1]);
    const s2s = [L2(0), L2(1), L2(2), L2(3)].sort((x, y) => x - y);
    expect(s2s[0]).toBeCloseTo(15, 0); expect(s2s[3]).toBeCloseTo(32, 0);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/oq_bino${dark ? '_dark' : ''}.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('#drawAxis')).not.toHaveClass(/btn-primary/);
  });
}
