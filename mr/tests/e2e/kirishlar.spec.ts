import { test, expect } from './fx';

/** Genplanda hovliga kirishlar: arka, binolar oraligʻi, podyezd (1440 px va 1024 px tungi) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`hovliga kirishlar genplanda (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: 860 });
    if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await expect(page).toHaveURL(/#\/p\/p_/); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); ed.store.dispatch({ type: 'setSite', rings: [[[0, 0], [200, 0], [200, 150], [0, 150]].map(p => [o[0] + p[0] / mx, o[1] + p[1] / 111132])] }); });
    await page.click('[data-step=hajm]'); await page.click('#genAll');
    await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 30000 });
    const kinds = await page.evaluate(() => { const k: string[] = []; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData.entries) k.push(o.userData.entries); }); return k.sort(); });
    expect(kinds).toContain('podyezd');
    expect(kinds.some(k => k === 'arka' || k === 'oraliq')).toBe(true);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kirishlar_${w}${dark ? '_dark' : ''}.png` });
  });
}
