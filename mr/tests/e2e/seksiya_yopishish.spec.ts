import { test, expect } from './fx';

/** 05.11 (egasi): seksiya yaqin olib borilsa yopishadi; devor tortilganda oʻlcham yozuvi; raqam + Enter — aniq oʻlcham */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`seksiya: yopishish va aniq oʻlcham (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    const shots = process.env.GX_SHOTS;
    await page.setViewportSize({ width: w, height: 820 }); if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await expect(page).toHaveURL(/#\/p\/p_/); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.evaluate(() => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
      m.store.dispatch({ type: 'setSite', rings: [[[-80, -60], [100, -60], [100, 60], [-80, 60]].map(G)] });
      m.store.dispatch({ type: 'addBuilding', id: 'sa', footprint: [[-15, -6], [15, -6], [15, 6], [-15, 6]].map(G), floors: 5 });
      m.store.dispatch({ type: 'addBuilding', id: 'sb', footprint: [[16.2, -5.4], [46.2, -5.4], [46.2, 6.6], [16.2, 6.6]].map(G), floors: 5 });
    });
    if (dark) await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('[data-step=hajm]');
    const fp = (id: string) => page.evaluate((id) => {
      const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), b = m.store.doc.buildings.find((x: any) => x.id === id);
      return b.footprint.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]) as number[][];
    }, id);
    const scr = (x: number, y: number, dz = 0.8) => page.evaluate(([x, y, dz]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + dz), [x, y, dz]);
    const roof = await page.evaluate(() => { const m = (window as any).__mr, b = m.store.doc.buildings.find((x: any) => x.id === 'sb'); return b.floors * m.store.doc.settings.floorHeight - 1; });
    // 1) sb tomidan tortib 0,7 m chapga — 0,5 m oraliq qoladi, lekin umumiy devorga yopishadi va burchaklar tekislanadi
    await page.evaluate(() => { const m = (window as any).__mr; m.sel = 'sb'; m.scene.select('sb'); m.renderAll(); });
    const a = await scr(40, 3, roof), b = await scr(39.3, 3, roof);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 });
    await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.dragText ?? '')).toContain('yopishdi');
    if (shots) await page.screenshot({ path: `${shots}/yopishish_${w}${dark ? '_dark' : ''}.png` });
    await page.mouse.up();
    const r = await fp('sb'), xs = r.map(p => p[0]), ys = r.map(p => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(15, 1);            // umumiy devor
    expect(Math.min(...ys)).toBeCloseTo(-6, 1);            // burchak tekislandi
    // 2) sa shimoliy devori (oʻrtadagi nuqta) tortiladi — yozuvda oʻlcham; «18» Enter — chuqurlik aynan 18 m
    await page.evaluate(() => { const m = (window as any).__mr; m.sel = 'sa'; m.scene.select('sa'); m.renderAll(); });
    const c = await scr(0, 6), d = await scr(0, 9);
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(d.x, d.y, { steps: 6 });
    await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.dragText ?? '')).toMatch(/12,0 → 1\d,\d m \(\+/);
    await page.keyboard.type('18');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.dragText ?? '')).toContain('18 m — Enter');
    if (shots) await page.screenshot({ path: `${shots}/olcham_${w}${dark ? '_dark' : ''}.png` });
    await page.keyboard.press('Enter');
    await page.mouse.move(d.x, d.y + 40, { steps: 3 }); await page.mouse.up();   // Enter dan keyin sichqoncha oʻzgartirmaydi
    const s = await fp('sa'), sy = s.map(p => p[1]);
    expect(Math.max(...sy) - Math.min(...sy)).toBeCloseTo(18, 1);
    // tortgandan keyin ham: «20» Enter — shu devor
    await page.keyboard.type('20'); await page.keyboard.press('Enter');
    await expect.poll(async () => { const q = (await fp('sa')).map(p => p[1]); return Math.max(...q) - Math.min(...q); }).toBeCloseTo(20, 1);
    await expect(page.locator('#dragHint')).toContainText('Enter');
    // Esc — yozuv yopiladi, bino tanlovda qoladi
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.dragText)).toBeNull();
    expect(await page.evaluate(() => (window as any).__mr.sel)).toBe('sa');
  });
}
