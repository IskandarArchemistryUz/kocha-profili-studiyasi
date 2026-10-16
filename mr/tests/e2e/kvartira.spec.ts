import { test, expect } from '@playwright/test';

test('kvartiralar: miks, deraza insolyatsiyasi, fasad belgilari, reyestr', async ({ page }) => {
  const shots = process.env.GX_SHOTS;
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#stylePop');
  await expect(page.locator('[data-style=albom]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-style=rangli]'); await expect(page.locator('[data-style=albom]')).toHaveAttribute('aria-pressed', 'false');
  await page.click('[data-style=albom]'); await page.click('#stylePop');
  await expect(page.locator('.pop')).toHaveCount(0);
  await page.click('[data-step=fasad]');
  await expect(page.locator('#facCheck')).toContainText('1:');
  await page.click('[data-fac=panorama]');
  await expect(page.locator('#facCheck')).toContainText('mos emas');   // panorama — yorugʻlik 1:4,5 dan koʻp
  await page.click('[data-fac=klassik]');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('kvartira');
  const n0 = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));
  expect(n0).toBeGreaterThan(50);
  // faqat 1 xonali → kvartiralar koʻpayadi
  for (const [i, v] of [[1, '100'], [2, '0'], [3, '0'], [4, '0']] as const) { await page.locator(`[data-mix="${i}"]`).fill(v); await page.locator(`[data-mix="${i}"]`).dispatchEvent('change'); }
  const n1 = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));
  expect(n1).toBeGreaterThan(n0);
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
  await page.click('#aptGo');
  await expect(page.locator('#aptSt')).toContainText('kvartira mos', { timeout: 90000 });
  await page.click('[data-am=west]');
  await expect(page.locator('#aptSt')).toContainText('gʻarb qoidasi');
  // 3D kvartiralar: turi / insolyatsiya; oʻlcham; qavat slideri
  if (shots) await page.screenshot({ path: `${shots}/apt_tur.png` });
  await page.click('[data-a3d=insol]');
  await expect(page.locator('[data-a3d=insol]')).toHaveAttribute('aria-pressed', 'true');
  if (shots) await page.screenshot({ path: `${shots}/apt_insol.png` });
  const nM = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));   // shu miksda M
  await page.click('[data-size=L]');
  await expect(page.locator('[data-size=L]')).toHaveAttribute('aria-pressed', 'true');
  const nL = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));
  expect(nL).toBeLessThanOrEqual(nM);   // L — kattaroq kvartiralar
  await page.click('[data-size=M]');
  // seksiya rejasi: SVG koʻrinadi, yuklab olinadi
  await expect(page.locator('#planBox svg')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#planSvg')]);
  expect(dl.suggestedFilename()).toMatch(/seksiya.*\.svg$/);
  if (shots) await dl.saveAs(`${shots}/reja.svg`);
  // reja qoidalari: har kvartiraga koridordan kirish — mos
  await expect(page.locator('#planChecks [data-check=mop] .chip')).toHaveText('mos');
  await expect(page.locator('#planChecks [data-check=win] .chip')).toHaveText('mos');
  await expect(page.locator('#planChecks [data-check=stairs]')).toContainText('5.13');
  await page.locator('#planChecks').scrollIntoViewIfNeeded();
  if (shots) await page.screenshot({ path: `${shots}/apt_reja.png` });
  await page.locator('#aptFloor').fill('3'); await page.locator('#aptFloor').dispatchEvent('input');
  if (shots) await page.screenshot({ path: `${shots}/apt_qavat.png` });
  await page.locator('#aptFloor').evaluate(e => { const i = e as HTMLInputElement; i.value = i.max; i.dispatchEvent(new Event('input')); });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=insol-apartments]')).toContainText('8.3–8.5');
  await expect(page.locator('.drawer [data-rule=west-apartments]')).toContainText('9.2');
  await expect(page.locator('.drawer [data-rule=plan-access]')).toContainText('koridor');
  await expect(page.locator('.drawer [data-rule=plan-stairs]')).toContainText('5.13');
  await expect(page.locator('.drawer [data-rule=school]')).toContainText('stat.uz');
});
