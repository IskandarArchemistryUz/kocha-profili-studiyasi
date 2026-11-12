import { test, expect, type Page } from './fx';

/**
 * 12.11 (eski navbat, 4-band; egasi maketni maʼqulladi): Master reja ichida Koʻchasoz oynasi.
 * Koʻcha tanlanadi → «Koʻchasozda tahrirlash» → oʻrtada Koʻchasoz B, oʻngda tekshiruv va qoʻllanadigan joy →
 * kesim oʻzgaradi → «Master rejaga qoʻllash» (shu profildagi barcha koʻchalar) → koʻchalar loyiha profiliga oʻtadi.
 */
async function setup(page: Page, w: number, dark: boolean): Promise<void> {
  await page.setViewportSize({ width: w, height: 860 });
  if (dark) await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await page.click('#stKs');
  await expect(page.locator('#ksWin')).toBeVisible();
  await expect.poll(() => !!page.frame({ url: /kochasoz\.html/ })).toBe(true);
  const f = page.frame({ url: /kochasoz\.html/ });
  await f!.waitForFunction(() => (window as any).__ks?.id === 'b');
  await expect(page.locator('#kswChk .ksw-r').first()).toBeVisible();
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Koʻchasoz oynasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await setup(page, w, dark);
  await expect(page.locator('#kswApply')).toBeEnabled();
  await expect(page.locator('#kswSt')).not.toContainText('qoʻllanmagan');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(1200); await page.screenshot({ path: `${process.env.GX_SHOTS}/ks_oyna_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});

test('Koʻchasozda oʻzgartirib Master rejaga qoʻllash — barcha koʻchalar, bekor qilish, Esc', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await setup(page, 1440, false);
  // Bekor qilish — hech narsa oʻzgarmaydi
  await page.click('#kswCancel');
  await expect(page.locator('#ksWin')).toHaveCount(0);
  await page.click('#stKs');
  await expect(page.locator('#ksWin')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#ksWin')).toHaveCount(0);
  await page.click('#stKs');
  await expect(page.locator('#kswChk .ksw-r').first()).toBeVisible();
  await expect.poll(() => !!page.frame({ url: /kochasoz\.html/ })).toBe(true);
  const f = page.frame({ url: /kochasoz\.html/ })!;
  await f.waitForFunction(() => (window as any).__ks?.id === 'b');
  // kesim: 2 m trotuar, ariq, 2 × 3,5 m harakat, 2 m trotuar = 14,2 m (asl 26 m dan farqli → «Jami» sariq)
  await f.evaluate(() => { const E = [['piy', 2, {}], ['ariq', 1.2, {}], ['qat', 3.5, {}], ['qat', 3.5, {}], ['yash', 2, { daraxt: true }], ['piy', 2, {}]]; (window as any).__ks.m.inst.setState({ els: E, rl: 14.2, sel: 0, selU: -1 }); });
  await expect(page.locator('#kswSt')).toContainText('qoʻllanmagan');
  await expect(page.locator('#kswChk')).toContainText('14,2');
  const n = Number((await page.locator('[data-scope=all]').textContent())!.match(/\((\d+)\)/)![1]);
  expect(n).toBeGreaterThan(1);
  await page.click('[data-scope=all]');
  await expect(page.locator('[data-scope=all]')).toHaveAttribute('aria-checked', 'true');
  await page.click('#kswApply');
  await expect(page.locator('#ksWin')).toHaveCount(0);
  await expect(page.locator('[data-sid] .k').first()).toContainText('14');
  // profil roʻyxatida «Loyiha (Koʻchasoz)» guruhi
  await page.click('[data-ktab=prof]');
  await expect(page.locator('[data-pgrp=loyiha]')).toBeVisible();
  // undo — bitta qadam
  await page.keyboard.press('Control+z');
  await page.click('[data-ktab=chiz]');
  await expect(page.locator('[data-sid] .k').first()).not.toContainText('· 14 m');
  expect(errs).toEqual([]);
});
