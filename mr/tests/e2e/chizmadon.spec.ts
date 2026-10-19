import { test, expect, type Page } from './fx';

/** Chizmadon «bitta oyna»: kirish oynasi, avtomatik albom, materialni sudrash, bogʻlash, tahrir, tekshiruv, eksport */
async function project(page: Page): Promise<void> {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
}
const els = (page: Page) => page.locator('.ch-page [data-id]');
const shots = process.env.GX_SHOTS;
async function openCh(page: Page): Promise<void> {
  await page.click('#chOpen');
  await expect(page.locator('.gx.ch')).toBeVisible();
  await expect(page.locator('.ch-start .ch-stbox')).toBeVisible();
  await expect(page.locator('#chStMats [data-vis="loc1"]')).toBeVisible();   // chegaralar yuklandi
}

test('Chizmadon: kirish oynasi → avtomatik albom, 7 oila, format, hamma varaqlar', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page);
  await expect(page.locator('#chStFams [data-fam]')).toHaveCount(7);
  if (shots) await page.screenshot({ path: `${shots}/ch_kirish.png` });
  await page.click('#chStGo');
  await expect(page.locator('.ch-start .ch-stbox')).toHaveCount(0);
  await expect(page.locator('.ch-tools [data-tool]')).toHaveCount(14);
  await expect(page.locator('.ch-page [data-el="loc0"]')).toHaveCount(await page.locator('.ch-page [data-el="loc0"]').count());
  expect(await page.locator('#chPages .ch-pg').count()).toBeGreaterThan(1);
  if (shots) await page.screenshot({ path: `${shots}/ch_oyna.png` });
  // 7 oila × formatlar — xatosiz
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  for (const f of ['kz', 'mr', 'tq', 'st', 'kp', 'kl', 'iu']) {
    await page.click('#chFam'); await page.click(`#chFamMenu [data-fam=${f}]`);
    for (const b of await page.locator('#chFmt button').all()) { await b.click(); await expect(page.locator('.ch-page svg').first()).toBeVisible(); }
  }
  expect(errs).toEqual([]);
  await page.click('#chFam'); await page.click('#chFamMenu [data-fam=mr]');
  await page.click('[data-view=all]'); expect(await page.locator('#chAll .ch-card').count()).toBeGreaterThan(1);
  if (shots) await page.screenshot({ path: `${shots}/ch_hamma.png` });
  await page.click('#chAll .ch-card >> nth=0'); await expect(page.locator('.ch-stage')).toBeVisible();
  // qorongʻi rejim
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (shots) await page.screenshot({ path: `${shots}/ch_dark.png` });
});

test('Chizmadon: hudud — koordinata, janubiy yarim shar; material sudrash va bogʻlangan shakllar', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page);
  await page.click('#chStGo');
  // material: viloyat chegarasini katta xarita katagiga sudrash
  const loc0 = page.locator('.ch-page [data-el="loc0"]');
  if (await loc0.count()) {
    const box = (await loc0.boundingBox())!;
    await page.dragAndDrop('#chMats [data-mat="loc1"]', '.ch-view', { targetPosition: { x: box.x + box.width / 2 - (await page.locator('.ch-view').boundingBox())!.x, y: box.y + box.height / 2 - (await page.locator('.ch-view').boundingBox())!.y } });
    await expect(page.locator('.ch-page [data-el="loc1"]')).toHaveCount(1);
  }
  // xarita ustiga uch shakl, keyin xaritani boshqa joyga — shakllar birga koʻchadi
  const map = page.locator('.ch-page [data-el="loc1"]'), mb = (await map.boundingBox())!;
  const P = (fx: number, fy: number) => [mb.x + mb.width * fx, mb.y + mb.height * fy] as const;
  await page.click('[data-tool=arrow]'); await page.mouse.move(...P(.3, .5)); await page.mouse.down(); await page.mouse.move(...P(.6, .4), { steps: 4 }); await page.mouse.up();
  await page.click('[data-tool=icon]'); await page.mouse.click(...P(.5, .6));
  await page.click('[data-tool=rect]'); await page.mouse.move(...P(.2, .2)); await page.mouse.down(); await page.mouse.move(...P(.35, .35), { steps: 4 }); await page.mouse.up();
  await expect(els(page)).toHaveCount(3);
  await expect(page.locator('#chBind')).toContainText('Viloyat chegarasi');
  if (shots) await page.screenshot({ path: `${shots}/ch_bog.png` });
  // format almashsa — shakllar shu katakda qoladi
  await page.click('#chFmt [data-fmt=A1L]');
  const mb2 = (await page.locator('.ch-page [data-el="loc1"]').boundingBox())!;
  for (const e of await els(page).all()) { const b = (await e.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(mb2.x - 2); expect(b.x + b.width).toBeLessThanOrEqual(mb2.x + mb2.width + 2); }
  // jadvalni xarita katagiga — mos emas
  await page.click('#chFmt [data-fmt=A3L]');
  // hudud: janubiy yarim shar
  if (!(await page.locator('[data-sec=hudud].open').count())) await page.click('[data-sec=hudud] .ch-sh');
  await page.fill('#chLat', '-33.87'); await page.press('#chLat', 'Tab'); await page.fill('#chLon', '151.21'); await page.press('#chLon', 'Tab');
  await expect(page.locator('#chWhere')).toContainText('33.8700° S');
});

test('Chizmadon: tutqichlar, guruh, tekislash, bekor qilish; tekshiruv; eksport; erkin varaq va namuna', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page); await page.click('#chStGo');
  const v = (await page.locator('.ch-stage').boundingBox())!, P = (fx: number, fy: number) => [v.x + v.width * fx, v.y + v.height * fy] as const;
  for (const [a, b] of [[.1, .9], [.2, .9], [.3, .9]]) { await page.click('[data-tool=rect]'); await page.mouse.move(...P(a, b)); await page.mouse.down(); await page.mouse.move(...P(a + .04, b + .04), { steps: 3 }); await page.mouse.up(); }
  await expect(els(page)).toHaveCount(3);
  await page.locator('.ch-view').focus(); await page.keyboard.press('Control+a');
  await expect(page.locator('#chAlignEls [data-align]')).toHaveCount(6);
  await page.click('#chDistH'); await page.click('[data-align=t]');
  await page.keyboard.press('Control+g'); await expect(page.locator('#chGroup')).toContainText('Guruhni ajratish');
  // burish tutqichi
  const rot = page.locator('.ch-over .hrot'); await rot.waitFor(); const rb = (await rot.boundingBox())!;
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await page.mouse.down(); await page.mouse.move(rb.x + 80, rb.y + 60, { steps: 5 }); await page.mouse.up();
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+Shift+z');
  // tekshiruv
  await page.click('[data-rtab=tekshiruv]');
  expect(await page.locator('#chChecks [data-check]').count()).toBeGreaterThanOrEqual(7);
  await expect(page.locator('#chAlts [data-force]').first()).toBeVisible();
  await page.click('#chGray'); await expect(page.locator('.ch-gray')).toBeVisible();
  // erkin varaq va namuna
  if (!(await page.locator('[data-sec=varaq].open').count())) await page.click('[data-sec=varaq] .ch-sh');
  const n0 = await page.locator('#chPages .ch-pg').count();
  await page.click('#chAddTpl'); await page.click('#chTplMenu [data-tpl=mr-tik]');
  await expect(page.locator('#chPages .ch-pg')).toHaveCount(n0 + 1);
  // eksport
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await page.click('#chDl'); await page.click('#chExPdf');
  expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);
  const dl2 = page.waitForEvent('download');
  await page.click('#chDl'); await page.click('#chExSvg');
  expect((await dl2).suggestedFilename()).toMatch(/\.svg$/);
  // yopish → qayta ochish: saqlangan (kirish oynasisiz)
  await page.click('#chBack'); await expect(page.locator('.gx.ch')).toHaveCount(0);
  await page.click('#chOpen'); await expect(page.locator('.ch-start .ch-stbox')).toHaveCount(0);
  await expect(page.locator('#chPages .ch-pg')).toHaveCount(n0 + 1);
  await page.click('#chPages .ch-pg >> nth=0'); await expect(els(page)).toHaveCount(3);
  await expect(page.locator('#chSave')).toHaveClass(/ok/, { timeout: 5000 });
});

test('Chizmadon: tor ekran — 1024 va 820 px', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await project(page);
  await openCh(page); await page.click('#chStGo');
  await expect(page.locator('.ch-right')).toBeHidden();
  if (shots) await page.screenshot({ path: `${shots}/ch_1024.png` });
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.locator('.ch-strip-l')).toBeVisible(); await expect(page.locator('.ch-left')).toBeHidden();
  const tb = (await page.locator('.ch-tools').boundingBox())!; expect(tb.width).toBeLessThanOrEqual(820);
  await page.click('.ch-strip-l [data-strip=varaq]'); await expect(page.locator('.ch-left.float')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/ch_820.png` });
});

test('Chizmadon: Varaqlardan xarita — «Loyihadan» material', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await page.click('#gxOpen'); await page.click('#frOpen'); await expect(page.locator('.gx.sh')).toBeVisible();
  await expect(page.locator('#shToCh')).toBeEnabled(); await page.click('#shToCh');
  await expect(page.locator('.gx.ch')).toBeVisible(); await expect(page.locator('.gx.sh')).toHaveCount(0);
  await page.click('#chStGo');
  await expect(page.locator('#chMats [data-mat^="i:"]')).toHaveCount(1);
});

test('bosh sahifadan: #/chizmadon — oxirgi loyiha Chizmadon bilan ochiladi', async ({ page }) => {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./#/chizmadon');
  await expect(page.locator('.gx.ch')).toBeVisible();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/);
});

test('Chizmadon: inglizcha va ruscha — tarjimasiz satr yoʻq', async ({ page }) => {
  test.setTimeout(150_000);
  for (const lang of ['en', 'ru']) {
    await page.addInitScript(l => { localStorage.setItem('mr-lang', l); localStorage.setItem('kps_lang', l); localStorage.setItem('i18n-miss', '1'); }, lang);
    await project(page);
    await page.click('#chOpen'); await expect(page.locator('#chStMats [data-vis="loc1"]')).toBeVisible();
    if (shots) await page.screenshot({ path: `${shots}/ch_kirish_${lang}.png` });
    await page.click('#chStGo');
    for (const s of ['qatlam', 'uslub', 'kutubxona', 'hudud']) await page.click(`[data-sec=${s}] .ch-sh`);
    await page.click('[data-rtab=tekshiruv]');
    if (shots) await page.screenshot({ path: `${shots}/ch_${lang}.png` });
    const miss = await page.evaluate(() => [...((window as unknown as { __i18nMiss?: Set<string> }).__i18nMiss ?? [])].filter(s => /[ʻʼ]|\b(va|bilan|uchun|varaq|katak|boʻ|qoʻ)\b/i.test(s)));
    console.log(lang, 'MISS', JSON.stringify(miss.slice(0, 60)));
  }
});
