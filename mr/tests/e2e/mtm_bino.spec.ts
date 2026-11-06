import { test, expect } from './fx';

/** 06.11 (c62, egasi: «bogʻchada boʻsh yer gʻalati turibdi»): MTM — yaxlit bino, guruh maydonchalari soyabon bilan, sport, xoʻjalik */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`MTM binosi va uchastkasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'mtm' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#mtmRules')).toContainText('543-band');
  await expect(page.locator('#mtmRules')).toContainText('QMQ 2.01.03-19');
  // binosiz MTM uchastkasi — maydonchalar chizilmaydi (avval boʻsh yerda maydonchalar turardi)
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.playKit) n++; }); return n; })).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}/mtm_bosh_${tag}.png` });
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 15_000 }).toBeGreaterThan(0);
  // yaxlit bino: qismlar ≤ 6 (avval 19 ta alohida quti)
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeLessThanOrEqual(6);
  await expect(page.locator('#genNotes')).toContainText('Guruhlar: 12');
  if (shots) await page.screenshot({ path: `${shots}/mtm_reja_${tag}.png` });
  await page.click('[data-view=axo]');
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.canopy) n++; }); return n; }), { timeout: 15_000 }).toBeGreaterThan(11);
  await page.waitForTimeout(500);
  if (shots) await page.screenshot({ path: `${shots}/mtm_akso_${tag}.png` });
  // meʼyorlar roʻyxati: «MTM uchastkasi va binosi» — 543-band, qavat, guruh maydonchalari
  await page.click('#kMore');
  const r = page.locator('.drawer [data-rule="mtm-plot"]');
  await r.locator('button.li').click();
  await r.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await expect(r).toContainText('543');
  await expect(r).toContainText('ANDOZA');
  if (shots) await page.screenshot({ path: `${shots}/mtm_meyor_${tag}.png` });
});
