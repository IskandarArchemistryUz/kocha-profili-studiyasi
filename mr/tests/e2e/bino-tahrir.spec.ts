import { test, expect } from './fx';

/** Bino tahriri: siljitish/burish ketma-ket ishlaydi; oʻrtadagi nuqta devorni parallel suradi (yangi burchak — Alt bilan) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`bino tahriri: siljitish, burish va devorni itarish (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    const shots = process.env.GX_SHOTS;
    await page.setViewportSize({ width: w, height: 820 }); if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
      m.store.dispatch({ type: 'setSite', rings: [[[-80, -60], [80, -60], [80, 60], [-80, 60]].map(G)] });
      m.store.dispatch({ type: 'addBuilding', id: 'bt1', footprint: [[-15, -6], [15, -6], [15, 6], [-15, 6]].map(G), floors: 5 });
    });
    if (dark) await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('[data-step=hajm]');
    await page.evaluate(() => { const m = (window as any).__mr; m.sel = 'bt1'; m.scene.select('bt1'); m.renderAll(); });
    await expect(page.locator('.btools')).toBeVisible();
    // asboblar paneli chap panel ostida qolmaydi
    const [pb, tb] = await Promise.all([page.locator('.panel').boundingBox(), page.locator('.btools').boundingBox()]);
    expect(tb!.x).toBeGreaterThanOrEqual(pb!.x + pb!.width);
    const fp = () => page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), b = m.store.doc.buildings.find((x: any) => x.id === 'bt1');
      return b.footprint.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]) as number[][];
    });
    const cen = (r: number[][]) => [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length];
    // ikki marta sharqqa — ikkalasi ham ishlaydi (avval ikkinchisi «qotib» qolardi)
    await page.click('[aria-label="Sharqqa 1 m"]'); await page.click('[aria-label="Sharqqa 1 m"]');
    expect(cen(await fp())[0]).toBeCloseTo(2, 1);
    // burish — siljigan joyida aylanadi (eski joyga qaytmaydi)
    await page.click('#rotL');
    const r1 = await fp(), c1 = cen(r1);
    expect(c1[0]).toBeCloseTo(2, 1); expect(c1[1]).toBeCloseTo(0, 1);
    expect(Math.abs(r1[1][1] - r1[0][1])).toBeGreaterThan(1);   // haqiqatan burildi
    await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
    expect(cen(await fp())[0]).toBeCloseTo(0, 1);
    // oʻrtadagi nuqta (janubiy devor oʻrtasi) — devor parallel suriladi, burchaklar soni oʻzgarmaydi
    const scr = (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + 0.8), [x, y]);
    const a = await scr(0, -6), b = await scr(0, -12);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
    const r2 = await fp();
    expect(r2.length).toBe(4);
    expect(r2[0][1]).toBeLessThan(-9); expect(r2[1][1]).toBeLessThan(-9);   // ikkala burchak birga
    expect(Math.abs(r2[0][1] - r2[1][1])).toBeLessThan(0.01);               // devor parallel
    expect(r2[0][0]).toBeCloseTo(-15, 1); expect(r2[2][1]).toBeCloseTo(6, 1);
    // qulf — sichqoncha bilan tahrir oʻchadi (faqat tanlash)
    await page.click('#iLock');
    await expect(page.locator('#iLock')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dragHint')).toContainText('qulflangan');
    if (shots) await page.screenshot({ path: `${shots}/bino_tahrir_${w}${dark ? '_dark' : ''}.png` });
    await page.click('#iLock');
    await expect(page.locator('#iLock')).toHaveAttribute('aria-pressed', 'false');
  });
}
