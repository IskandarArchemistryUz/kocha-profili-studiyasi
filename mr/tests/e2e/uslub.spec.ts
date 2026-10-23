import { test, expect } from './fx';

test('uslublar, portlatilgan qatlamlar, kamera: obyektiv, koʻz sathi, 2 nuqta, kadr, saqlangan koʻrinish', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  await page.click('#stylePop');
  for (const st of ['arctic', 'funksiya', 'minimal']) {
    await page.click(`[data-style=${st}]`);
    await expect(page.locator(`[data-style=${st}]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#stylePop span')).not.toHaveText('Albom');
    if (shots) await page.screenshot({ path: `${shots}/st_${st}.png` });
  }
  await page.click('[data-style=arctic]');
  await page.check('#exOn');
  // 17-band: har qatlam (koʻchalar, kvartallar, binolar) tagida yer plitasi
  const plates = () => page.evaluate(() => (window as any).__mr.scene.explodeLabels.filter((o: any) => o.userData.explodePlate).length);
  expect(await plates()).toBe(3);
  if (shots) await page.screenshot({ path: `${shots}/st_exploded.png` });
  await page.uncheck('#exOn');
  expect(await plates()).toBe(0);
  await page.click('#stylePop');
  // kamera
  await page.click('#camPop');
  await page.click('[data-lens="24"]');
  await expect(page.locator('[data-lens="24"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#eyeLvl');
  await expect(page.locator('[data-view=persp]')).toHaveAttribute('aria-pressed', 'true');
  await page.check('#twoPt');
  await page.click('[data-frame="16:9"]');
  await expect(page.locator('#scene .frame')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/cam_eye.png` });
  await page.fill('#vName', 'Koʻcha koʻzi'); await page.click('#vSave');
  await expect(page.locator('.views')).toContainText('Koʻcha koʻzi');
  await expect(page.locator('.views')).toContainText('24 mm · 2 nuqta · 16:9');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#shotFrame')]);
  expect(dl.suggestedFilename()).toMatch(/_kadr\.png$/);
  await page.click('[data-frame=erkin]');
  await expect(page.locator('#scene .frame')).toHaveCount(0);
  // boshqa koʻrinishga oʻtib, saqlanganiga qaytish
  await page.click('#camPop');
  await page.click('[data-view=axo]');
  await page.click('#camPop');
  await page.click('[data-view-id]');
  await expect(page.locator('[data-view=persp]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#scene .frame')).toBeVisible();
  // undo — koʻrinish oʻchadi
  await page.click('#camPop');
  await page.keyboard.press('Control+z');
  await page.click('#camPop');
  await expect(page.locator('.pop')).toContainText('Hali yoʻq');
});
