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
    await expect(page.locator('#gridMore > summary')).toContainText('45°');   // 04.11 (A): burilish — «Qoʻshimcha» ichida, qiymati yigʻiq satrda
    await expect(page.locator('#gridAngV')).toContainText('45°');
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kompas_45${dark ? '_dark' : ''}.png` });
    await page.click('#gridApply');
    await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.streets.length)).toBeGreaterThan(2);
    // koʻchalar 45° ga burilgan
    const angs = await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); return m.store.doc.streets.filter((st: any) => st.gen === 'grid').map((st: any) => { const s = st.axis, a = s[0], b = s[s.length - 1], q = ((Math.atan2((b[1] - a[1]) * 111132, (b[0] - a[0]) * mx) * 180 / Math.PI) % 90 + 90) % 90; return Math.min(q, 90 - q); }) as number[]; });
    expect(angs.length).toBeGreaterThan(2); for (const q of angs) expect(q).toBeCloseTo(45, 0);
  });
}

/** 04.11 (egasi: interfeysni soddalashtirish, A): Koʻchalar → Toʻr — «Toʻrni qoʻllash» kompasdan keyin darhol; burilish, profillar, perimetr «Qoʻshimcha» ichida */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻcha toʻri paneli A · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '400'); await page.fill('#rh', '300'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); if (await page.locator('[data-ktab=tor]').count()) await page.click('[data-ktab=tor]');
  await expect(page.locator('#gridMore')).not.toHaveAttribute('open', '');
  for (const q of ['#gridAng', '#gridPerim', '#gridMain']) { await expect(page.locator(q)).toHaveCount(1); await expect(page.locator(q)).toBeHidden(); }
  await expect(page.locator('#insolCompass')).toBeVisible();
  expect(await page.evaluate(() => { const a = document.querySelector('#insolCompass')!, b = document.querySelector('#gridApply')!, c = document.querySelector('#gridMore')!; return !!(a.compareDocumentPosition(b) & 4) && !!(b.compareDocumentPosition(c) & 4); })).toBe(true);
  if (process.env.GX_SHOTS) { await page.locator('#gridApply').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/tor_a_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#gridPerim');
  await expect(page.locator('#gridMore')).toHaveAttribute('open', '');
  await expect(page.locator('#gridMore > summary')).toContainText('perimetr');
  await page.click('#gridApply');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.streets.length)).toBeGreaterThan(2);
});
