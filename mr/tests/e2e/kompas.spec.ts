import { test, expect } from './fx';

/** Egasi (30.10): koʻcha toʻri taklif qilinganda insolyatsiya avtomat hisobga olinsin — kompas va «Mos burchak» tugmasi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`insolyatsiya kompasi: toʻr burchagi — mos burchak qoʻllanadi, 4/4 fasad (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
    await page.setViewportSize({ width: w, height: 820 }); if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    // sharq–gʻarb choʻzilgan uchastka: avto burchak 0° — shimoliy fasad quyoshsiz
    await page.click('[data-step=uchastka]'); await page.fill('#rw', '400'); await page.fill('#rh', '300'); await page.click('#rectSite');
    await page.click('[data-step=kocha]'); if (await page.locator('[data-ktab=tor]').count()) await page.click('[data-ktab=tor]');
    await expect(page.locator('#insolCompass')).toBeVisible();
    await expect(page.locator('#insolCompass .chip')).toContainText('3 / 4');
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kompas_0${dark ? '_dark' : ''}.png` });
    await page.click('#gridBest');
    await expect(page.locator('#insolCompass .chip')).toContainText('4 / 4');
    await expect(page.locator('#gridBest')).toHaveCount(0);
    await expect(page.locator('#gridAngV')).toContainText('45°');
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kompas_45${dark ? '_dark' : ''}.png` });
    await page.click('#gridApply');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.streets.length)).toBeGreaterThan(2);
    // koʻchalar 45° ga burilgan
    const angs = await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); return m.store.doc.streets.filter((st: any) => st.gen === 'grid').map((st: any) => { const s = st.axis, a = s[0], b = s[s.length - 1], q = ((Math.atan2((b[1] - a[1]) * 111132, (b[0] - a[0]) * mx) * 180 / Math.PI) % 90 + 90) % 90; return Math.min(q, 90 - q); }) as number[]; });
    expect(angs.length).toBeGreaterThan(2); for (const q of angs) expect(q).toBeCloseTo(45, 0);
  });
}
