import { test, expect } from './fx';

/** 06.11 (c68): ShNQ 2.07.01-23 joriy tahrir — 86-band 30 % (01/2-15), 474-band (umumiy 25 % va Toshkent daraxtlari, 01/2-3), 49¹-band (01/2-14) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ShNQ 2.07.01-23 joriy tahrir · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'ofis' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 15_000 }).toBeGreaterThan(0);
  // yashil qadami: KPI meʼyori 30 %
  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenKpi')).toContainText('≥ 30 %');
  if (shots) await page.screenshot({ path: `${shots}/yashil_${tag}.png` });
  // meʼyorlar roʻyxati
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=green-86]')).toContainText('01/2-15');
  await expect(page.locator('.drawer [data-rule=green-474]')).toContainText('474-band, 1-xatboshi');
  const t = page.locator('.drawer [data-rule="trees-474"]');
  await expect(t).toContainText('01/2-3');
  await t.locator('button.li').click();
  await t.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await expect(t).toContainText('buta');
  if (shots) await page.screenshot({ path: `${shots}/meyor_474_${tag}.png` });
  await page.keyboard.press('Escape');
  // shamol: 49¹-band izohi
  await page.click('[data-step=quyosh]');
  const how = page.locator('details.how').filter({ hasText: 'Lattice Boltzmann' });
  await how.locator('summary').click();
  await expect(page.locator('#wind491')).toContainText('49¹-band');
  await page.locator('#wind491').scrollIntoViewIfNeeded();
  if (shots) await page.screenshot({ path: `${shots}/shamol_491_${tag}.png` });
});
