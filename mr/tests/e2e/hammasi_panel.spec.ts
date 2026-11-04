import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 3-band): «Hammasi» — sukut boʻyicha hamma dahalar paneldagi sozlamalar bilan qayta quriladi
 *  (avval tanlanmagan dahalar oʻz eski sozlamasi bilan qurilardi — «Qavat, eng koʻp» ni tushirib bosganda natija oʻzgarmasdi) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`«Hammasi» — panel sozlamalari bilan · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  const maxF = () => page.evaluate(() => Math.max(...(window as any).__mr.store.doc.buildings.filter((b: any) => b.gen && (b.use ?? 'turar') === 'turar').map((b: any) => b.floors)));
  await page.fill('#gMax', '14'); await page.press('#gMax', 'Tab');
  await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60000 }).toBeGreaterThan(10);
  expect(await maxF()).toBeGreaterThan(9);
  // panelda «eng koʻp» 9 — «Hammasi» hamma dahalarga qoʻllaydi
  await page.fill('#gMax', '9'); await page.press('#gMax', 'Tab');
  await expect(page.locator('#allOwn')).toHaveAttribute('aria-checked', 'false');
  await page.click('#genAll');
  await expect.poll(maxF, { timeout: 60000 }).toBeLessThanOrEqual(9);
  if (process.env.GX_SHOTS) { await page.locator('#allOwnRow').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/hammasi_${w}${dark ? 'd' : 'l'}.png` }); }
  // «har daha oʻz sozlamasi bilan» — oldingi xatti-harakat: tanlanmagan dahalar oxirgi sozlamasi (9) bilan qoladi, panel 14 boʻlsa ham
  await page.click('#allOwn'); await expect(page.locator('#allOwn')).toHaveAttribute('aria-checked', 'true');
  await page.fill('#gMax', '14'); await page.press('#gMax', 'Tab');
  await page.click('#genAll');
  const per = await page.evaluate(() => { const m = (window as any).__mr, sel = m.selBlock; const plan = m.plan(); return plan.blocks.length; });
  expect(per).toBeGreaterThan(1);
  expect(await page.evaluate(() => localStorage.getItem('mr-all-own'))).toBe('1');
});
