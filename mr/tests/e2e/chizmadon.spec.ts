import { test, expect, type Page } from './fx';

/** Chizmadon (CH-Yagona): muharrir, panellar, kutubxona, tekshiruv, albom, eksport, Varaqlardan xarita */
async function project(page: Page): Promise<void> {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
}
const els = (page: Page) => page.locator('.ch-page [data-id]');

test('Chizmadon: chizish, bekor qilish, kutubxona, tekshiruv, panellar', async ({ page }) => {
  test.setTimeout(150_000);
  const shots = process.env.GX_SHOTS;
  await project(page);
  await page.click('#chOpen');
  await expect(page.locator('.gx.ch')).toBeVisible();
  await expect(page.locator('.ch-tools [data-tool]')).toHaveCount(14);
  const v = (await page.locator('.ch-stage').boundingBox())!, P = (fx: number, fy: number) => [v.x + v.width * fx, v.y + v.height * fy] as const;
  // zona (4 nuqta + Enter), yoʻnalish oʻqi, belgi, toʻrtburchak, matn
  await page.click('[data-tool=zone]'); for (const [a, b] of [[.4, .35], [.5, .3], [.55, .45], [.45, .55]]) await page.mouse.click(...P(a, b)); await page.keyboard.press('Enter');
  await expect(els(page)).toHaveCount(1);
  await page.keyboard.press('f'); for (const [a, b] of [[.3, .7], [.5, .5], [.7, .3]]) await page.mouse.click(...P(a, b)); await page.keyboard.press('Enter');
  await expect(page.locator('#chElT')).toContainText('Asosiy oqim');
  await page.click('#chBand [aria-pressed=false] >> nth=0');
  await page.click('[data-tool=icon]'); await page.mouse.click(...P(.6, .65));
  await page.click('[data-tool=rect]'); await page.mouse.move(...P(.1, .1)); await page.mouse.down(); await page.mouse.move(...P(.2, .2), { steps: 4 }); await page.mouse.up();
  await page.click('[data-tool=text]'); await page.mouse.click(...P(.12, .85)); await page.keyboard.type('Harakat va yashil karkas');
  await expect(page.locator('.ch-page text')).toContainText(['Harakat va yashil karkas']);
  await expect(els(page)).toHaveCount(5);
  // bekor qilish / qaytarish
  await page.locator('.ch-view').focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+z'); await expect(page.locator('.ch-page text')).toContainText(['Matn']);   // avval matn tahriri
  await page.keyboard.press('Control+z'); await expect(els(page)).toHaveCount(4);
  await page.keyboard.press('Control+Shift+z'); await page.keyboard.press('Control+Shift+z'); await expect(els(page)).toHaveCount(5);
  await expect(page.locator('.ch-page text')).toContainText(['Harakat va yashil karkas']);
  // tanlash, nusxa, oʻchirish
  await page.mouse.click(...P(.15, .15)); await expect(page.locator('#chElT')).toContainText('Toʻrtburchak');
  await page.keyboard.press('Control+d'); await expect(els(page)).toHaveCount(6);
  await page.keyboard.press('Delete'); await expect(els(page)).toHaveCount(5);
  // tekshiruv: 7 band, legenda tuzatish
  await page.click('[data-rtab=tekshiruv]');
  await expect(page.locator('#chChecks [data-check]')).toHaveCount(7);
  const fix4 = page.locator('[data-fix="4"]'); if (await fix4.count()) { await fix4.click(); await expect(page.locator('#chChecks [data-check="4"] .chip')).toHaveClass(/ok/); }
  await page.click('#chGray'); await expect(page.locator('.ch-gray')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/ch_muharrir.png` });
  // kutubxona
  await page.click('[data-ltab=kutubxona]');
  await page.click('[data-lib=daraxt]'); await expect(page.locator('[data-tree]')).toHaveCount(12);
  await page.click('[data-lib=belgi]'); expect(await page.locator('[data-icon]').count()).toBeGreaterThanOrEqual(45);
  await page.click('[data-lib=yol]'); await expect(page.locator('[data-mob]')).toHaveCount(8);
  await page.click('[data-lib=rang]'); await expect(page.locator('[data-pal]')).toHaveCount(8);
  // panellar: Tab — ikkalasi yigʻiladi, tasmadan suzib ochiladi, Esc — yopiladi
  await page.locator('.ch-view').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('.ch-strip-l')).toBeVisible(); await expect(page.locator('.ch-left')).toBeHidden();
  await page.click('.ch-strip-l [data-strip=qatlam]'); await expect(page.locator('.ch-left.float')).toBeVisible(); await expect(page.locator('#chLayers .ch-layer')).toHaveCount(3);
  await page.keyboard.press('Escape'); await expect(page.locator('.ch-left')).toBeHidden();
  if (shots) await page.screenshot({ path: `${shots}/ch_yigiq.png` });
  await page.keyboard.press('Tab');
  // yopish → qayta ochish: albom loyiha bilan saqlangan
  const total = await els(page).count();
  await page.click('#chBack'); await expect(page.locator('.gx.ch')).toHaveCount(0);
  await page.click('#chOpen'); await expect(els(page)).toHaveCount(total);
});

test('Chizmadon: albom (24 namuna), PDF, Varaqlardan xarita oynasi', async ({ page }) => {
  test.setTimeout(150_000);
  const shots = process.env.GX_SHOTS;
  await project(page);
  // Varaqlar → Chizmadonga: xarita oynasi masshtab bilan
  await page.click('#gxOpen'); await page.click('#frOpen'); await expect(page.locator('.gx.sh')).toBeVisible();
  await expect(page.locator('#shToCh')).toBeEnabled(); await page.click('#shToCh');
  await expect(page.locator('.gx.ch')).toBeVisible(); await expect(page.locator('.gx.sh')).toHaveCount(0);
  await expect(page.locator('.ch-page [data-id] svg')).toHaveCount(1);
  await page.click('[data-ltab=varaq]'); await expect(page.locator('#chInbox .li')).toHaveCount(1);
  await expect(page.locator('#chMapScale')).not.toHaveValue('');
  // albom
  await page.click('[data-cmode=albom]');
  let n = 0; for (const g of await page.locator('.ch-chips [data-tg]').all()) { await g.click(); n += await page.locator('#chTpls [data-tpl]').count(); }
  expect(n).toBe(24);
  await page.click('.ch-chips [data-tg] >> nth=0');
  const before = await page.locator('#chGridPages .ch-card').count();
  await page.click('[data-tpl=mr-tik]'); await expect(page.locator('#chGridPages .ch-card')).toHaveCount(before + 1);
  await page.click('[data-tpl=mr-bosh]'); await expect(page.locator('#chGridPages .ch-card')).toHaveCount(before + 2);
  if (shots) await page.screenshot({ path: `${shots}/ch_albom.png` });
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await page.click('#chAPdf');
  expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);
  // ikki marta bosish — muharrirga
  await page.dblclick('#chGridPages .ch-card >> nth=-1');
  await expect(page.locator('[data-cmode=muharrir]')).toHaveAttribute('aria-pressed', 'true');
  const dl2 = page.waitForEvent('download');
  await page.click('#chDl'); await page.click('#chExSvg');
  expect((await dl2).suggestedFilename()).toMatch(/\.svg$/);
});

test('bosh sahifadan: #/chizmadon — oxirgi loyiha Chizmadon bilan ochiladi', async ({ page }) => {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./#/chizmadon');
  await expect(page.locator('.gx.ch')).toBeVisible();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/);
});
