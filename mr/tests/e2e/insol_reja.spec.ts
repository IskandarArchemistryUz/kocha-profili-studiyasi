import { test, expect } from './fx';

/** V5: qavat albomida «Insolyatsiya» koʻrinishi — kvartiralar holat rangida, derazalarda soat, quyosh dogʻi, «Mos emas» roʻyxati; «Oʻlchamlar» koʻrinishi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qavat rejasida insolyatsiya (V5) · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  // hisobsiz ochilsa — albomning oʻzidan hisoblash
  await page.click('#planEditBtn');
  await page.click('#albView [data-view=insol]');
  await expect(page.locator('#albInsolNone')).toBeVisible();
  await page.click('#albInsolGo');
  await expect(page.locator('#albInsolKpi')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('#albInsolReq')).toContainText('94–95');
  const n = await page.locator('#albPlan [data-win]').count(); expect(n).toBeGreaterThan(4);
  // real dogʻ: 12:00 da janub/sharq derazalari orqali; soat oʻzgarsa qayta chiziladi; 7:00 da (quyosh past) dogʻlar kam
  expect(await page.locator('#albPlan [data-sunpatch] path').count()).toBeGreaterThan(0);
  await expect(page.locator('#albSunPos')).toContainText('balandlik');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/v5_${w}${dark ? 'd' : 'l'}.png` });
  const n12 = await page.locator('#albPlan [data-sunpatch] path').count();
  await page.locator('#albHour').evaluate(e => { const i = e as HTMLInputElement; i.value = '7'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); });
  await expect(page.locator('#albHourLbl')).toHaveText('7:00');
  expect(await page.locator('#albPlan [data-sunpatch] path').count()).toBeLessThan(n12 + 1);
  // 31.10: kunni tanlab tezlashtirilgan animatsiya — 22.06, quyosh chiqishidan; soat oldinga yuradi, dogʻ qayta chiziladi
  await page.click('#albDate [data-date="06-22"]');
  await expect(page.locator('#albAnimNote')).toBeVisible();
  await page.click('#albPlay');
  const t0 = await page.locator('#albHourLbl').textContent();
  await page.waitForTimeout(1300);
  const t1 = await page.locator('#albHourLbl').textContent();
  expect(t1).not.toBe(t0);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/v5_anim_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albPlay');   // toʻxtatish
  await page.click('#albDate [data-date="03-22"]');
  // hamma koʻr boʻlmagan deraza belgilangan (oshxona ham)
  const nMods = await page.evaluate(() => { const A = (window as any).__mr.apt; const pl = A.plans[0]; return pl ? pl.layout.mods.filter((m: any) => !m.blind).length : -1; });
  const nWin = await page.locator('#albPlan [data-win]').count();
  if (nMods > 0) expect(nWin).toBe(nMods);
  // tahrir asboblari insolyatsiya koʻrinishida yoʻq
  await expect(page.locator('#albMerge')).toHaveCount(0);
  const bad = page.locator('#albInsolBad [data-apt-row]');
  if (await bad.count()) { await bad.first().click(); await expect(bad.first()).toHaveAttribute('aria-pressed', 'true'); }
  // qavat almashtirilsa ham koʻrinish saqlanadi
  await page.click('#albPrev'); await expect(page.locator('#albView [data-view=insol]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#albView [data-view=olcham]');
  await expect(page.locator('#albInsolKpi')).toHaveCount(0);
  await expect(page.locator('#albPlan svg text', { hasText: '3,25' }).first()).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/v5_dims_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albView [data-view=reja]');
  await page.click('#albClose');
  // «Kvartiralar» panelidan toʻgʻridan-toʻgʻri
  await page.click('#aptInsolPlan');
  await expect(page.locator('#albView [data-view=insol]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#albInsolKpi')).toBeVisible();
});
