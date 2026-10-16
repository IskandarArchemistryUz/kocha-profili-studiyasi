import { test, expect } from '@playwright/test';

test('chap paneldagi bino muharriri, deraza/balkon turlari, tomlar, xarita boshqaruvi, reyestr, koʻcha kesimi', async ({ page }) => {
  test.setTimeout(150_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  // binoni bosish — chap panel muharrirga aylanadi, oʻngda panel yoʻq
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!;
  await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32);
  await expect(page.locator('.panel[data-mode=bino]')).toBeVisible();
  await expect(page.locator('.insp')).toHaveCount(0);
  // keyingi bino (sarlavhadagi strelka)
  const t0 = await page.locator('.panel header h2').textContent() + '|' + await page.locator('.ihead .num').textContent();
  await page.click('[aria-label="Keyingi bino"]');
  await expect.poll(async () => await page.locator('.panel header h2').textContent() + '|' + await page.locator('.ihead .num').textContent()).not.toBe(t0);
  await page.click('[aria-label="Oldingi bino"]');
  // fasad va tom — 8-qadamda, tanlangan bino uchun
  await page.click('#iToFasad');
  await expect(page.locator('[data-look=sel]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-row=win]'); await page.click('[data-win=ravoq]'); await expect(page.locator('[data-win=ravoq]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-row=bal]'); await page.click('[data-bal=ochiq]'); await expect(page.locator('[data-bal=ochiq]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-row=roof]'); await page.click('[data-roof=bir]');
  if (shots) { await page.screenshot({ path: `${shots}/iz_bino.png` }); await page.keyboard.press('f'); await page.click('[data-view=persp]'); await page.waitForTimeout(400); await page.screenshot({ path: `${shots}/iz_bino_yaqin.png` }); await page.click('[data-view=axo]'); }
  await page.click('[data-step=hajm]');
  await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32);
  await expect(page.locator('.panel[data-mode=bino]')).toBeVisible();
  // qadamga qaytish
  await page.click('#iBack');
  await expect(page.locator('.panel')).toHaveAttribute('data-mode', 'step');
  await expect(page.locator('.panel h2')).toHaveText('Hajmlar');
  // fasad qadamida: barcha binolarga lodjiya
  await page.click('[data-step=fasad]'); await page.click('[data-look=all]');
  await page.click('[data-row=bal]'); await page.click('[data-bal=lodjiya]');
  await expect(page.locator('[data-bal=lodjiya]')).toHaveAttribute('aria-pressed', 'true');
  if (shots) await page.screenshot({ path: `${shots}/iz_lodjiya.png` });
  // xarita boshqaruvi (oʻng pastda): fon va uslub
  await page.click('#stylePop');
  await expect(page.locator('#baseSw [data-base=maket]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#baseSw [data-base=sputnik]')).toBeEnabled();   // atrof yuklanmagan boʻlsa ham — fon xaritasi sunʼiy yoʻldoshda
  if (shots) await page.screenshot({ path: `${shots}/iz_xarita.png` });
  await page.click('#stylePop');
  // meʼyoriy reyestr — kartalar, gorizontal skrollsiz
  await page.click('#kMore');
  await expect(page.locator('.drawer .rrow').first()).toBeVisible();
  const ov = await page.locator('.drawer').evaluate(e => e.scrollWidth - e.clientWidth);
  expect(ov).toBeLessThanOrEqual(1);
  await page.click('#regSeg button:last-child');
  if (shots) await page.screenshot({ path: `${shots}/iz_reyestr.png` });
  await page.click('#kMore');
  // koʻcha kesimi — katta koʻrinish
  await page.click('[data-step=kocha]');
  await expect(page.locator('#secBig svg path').first()).toBeAttached();
  await page.click('#secBig');
  await expect(page.locator('.drawer .secsvg svg')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/iz_kesim.png` });
});
