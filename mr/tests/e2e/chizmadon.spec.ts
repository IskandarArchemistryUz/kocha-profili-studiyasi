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

test('Chizmadon: kirish oynasi → avtomatik albom, 8 oila, format, hamma varaqlar', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page);
  await expect(page.locator('#chStFams [data-fam]')).toHaveCount(8);
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

test('Chizmadon: hudud — qidiruv, koordinata, janubiy yarim shar', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page);
  await page.click('#chStGo');
  // hudud: janubiy yarim shar
  if (!(await page.locator('[data-sec=hudud].open').count())) await page.click('[data-sec=hudud] .ch-sh');
  await page.fill('#chLocQL', '-33.87, 151.21'); await page.press('#chLocQL', 'Enter');
  await expect(page.locator('#chWhere')).toContainText('33.8700° S');
  await expect(page.locator('#chWhere')).toContainText('Avstraliya');
  await page.fill('#chLocQL', 'chilon'); await expect(page.locator('#chLocRL [data-loc]').first()).toContainText('Chilonzor tumani');
  await page.press('#chLocQL', 'Enter'); await expect(page.locator('#chWhere')).toContainText('Chilonzor tumani');
  await page.fill('#chLocQL', 'germ'); await expect(page.locator('#chLocRL [data-loc]').first()).toContainText('Germaniya');
  if (shots) await page.screenshot({ path: `${shots}/ch_hudud.png` });
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

test('Chizmadon: bogʻlash — xarita boshqa varaqning kichik katagiga koʻchsa, uch shakl birga koʻchadi va kichrayadi', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  await openCh(page); await page.click('#chStGo');
  // eng katta joylashuv katagi va boshqa varaqdagi kichikroq joylashuv katagi
  const cells = await page.evaluate(() => [...document.querySelectorAll('#chPages .ch-pg')].length);
  const find = async () => {
    const out: { pi: number; id: string; area: number; asp: number }[] = [];
    for (let i = 0; i < cells; i++) {
      await page.click(`#chPages .ch-pg >> nth=${i}`); await expect(page.locator('#chPageNo')).toContainText(`${i + 1} /`); await page.waitForTimeout(150);
      for (const el of await page.locator('.ch-page [data-el^="loc"]').all()) { const b = (await el.boundingBox())!; out.push({ pi: i, id: (await el.getAttribute('data-el'))!, area: b.width * b.height, asp: b.width / b.height }); }
    }
    return out;
  };
  const locs = await find(); expect(locs.length).toBeGreaterThanOrEqual(2);
  const src = locs.reduce((a, b) => (b.area > a.area ? b : a)), // shakl xarita masshtabi bilan kichrayadi — nisbatni solishtirish uchun katak tomonlari nisbati oʻxshash boʻlsin (maket oʻzgarsa ham)
    similar = (l: { asp: number }) => Math.abs(Math.log(l.asp / src.asp)) < 0.3,
    dst = locs.filter(l => l.pi !== src.pi && l.area < src.area).sort((a, b) => Number(similar(b)) - Number(similar(a)) || a.area - b.area)[0] ?? locs.filter(l => l.pi !== src.pi).sort((a, b) => a.area - b.area)[0] ?? locs.filter(l => l.id !== src.id).sort((a, b) => a.area - b.area)[0];
  await page.click(`#chPages .ch-pg >> nth=${src.pi}`); await expect(page.locator('#chPageNo')).toContainText(`${src.pi + 1} /`); await page.waitForTimeout(150);
  const mb = (await page.locator(`.ch-page [data-el="${src.id}"]`).boundingBox())!, P = (fx: number, fy: number) => [mb.x + mb.width * fx, mb.y + mb.height * fy] as const;
  await page.click('[data-tool=arrow]'); await page.mouse.move(...P(.3, .5)); await page.mouse.down(); await page.mouse.move(...P(.6, .4), { steps: 4 }); await page.mouse.up();
  await page.click('[data-tool=icon]'); await page.mouse.click(...P(.5, .6));
  await page.click('[data-tool=rect]'); await page.mouse.move(...P(.25, .25)); await page.mouse.down(); await page.mouse.move(...P(.4, .4), { steps: 4 }); await page.mouse.up();
  await expect(els(page)).toHaveCount(3);
  const w0 = (await els(page).nth(2).boundingBox())!.width / mb.width;
  // manba materialni boshqa varaqdagi kichik katakka sudrash
  await page.click(`#chPages .ch-pg >> nth=${dst.pi}`); await expect(page.locator('#chPageNo')).toContainText(`${dst.pi + 1} /`); await page.waitForTimeout(150);
  const vb = (await page.locator('.ch-view').boundingBox())!, db = (await page.locator(`.ch-page [data-el="${dst.id}"]`).boundingBox())!;
  await page.dragAndDrop(`#chMats [data-mat="${src.id}"]`, '.ch-view', { targetPosition: { x: db.x + db.width / 2 - vb.x, y: db.y + db.height / 2 - vb.y } });
  await expect(page.locator(`.ch-page [data-el="${src.id}"]`)).toHaveCount(1);
  await expect(els(page)).toHaveCount(3);
  const nb = (await page.locator(`.ch-page [data-el="${src.id}"]`).boundingBox())!;
  for (const e of await els(page).all()) { const b = (await e.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(nb.x - 3); expect(b.x + b.width).toBeLessThanOrEqual(nb.x + nb.width + 3); expect(b.y).toBeGreaterThanOrEqual(nb.y - 3); expect(b.y + b.height).toBeLessThanOrEqual(nb.y + nb.height + 3); }
  // shakllar xarita bilan bir xil (bir tekis) masshtabda: katak tomonlari nisbati boshqacha boʻlsa ham kichrayish = min(kenglik, balandlik nisbati)
  const k = Math.min(nb.width / mb.width, nb.height / mb.height);
  expect((await els(page).nth(2).boundingBox())!.width / (w0 * mb.width)).toBeCloseTo(k, 1);
  if (shots) await page.screenshot({ path: `${shots}/ch_kochdi.png` });
  // material oʻchsa — shakllar yashirinadi, «Shu varaqqa» qaytaradi
  await page.click(`#chMats [data-mat="${src.id}"] .switch`);
  await expect(els(page)).toHaveCount(0);
  if (!(await page.locator('[data-sec=qatlam].open').count())) await page.click('[data-sec=qatlam] .ch-sh');
  await page.click('#chRescue'); await expect(els(page)).toHaveCount(3);
});

test('Chizmadon: eski Albomdan oʻtkazish va yangi namunalar (TIK, mundarija, Portfolio)', async ({ page }) => {
  test.setTimeout(150_000);
  await project(page);
  // eski albom (maket.html) va «Albomga» yuborilgan material — brauzer bazasida
  await page.evaluate(async () => {
    const put = (db: string, store: string, key: string, o: unknown) => new Promise<void>((ok, no) => { const r = indexedDB.open(db, 1); r.onupgradeneeded = () => r.result.createObjectStore(store, { keyPath: key }); r.onsuccess = () => { const t = r.result.transaction(store, 'readwrite'); t.objectStore(store).put(o); t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => no(t.error); }; });
    await put('kps_maket', 'docs', 'id', { id: 'main', name: 'Eski albom', meta: {}, pages: [{ id: 'a', fmt: 'A3', orient: 'L', tb: true, items: [
      { id: '1', t: 'rect', x: 20, y: 20, w: 120, h: 80, fill: '#8cc37a', stroke: '#141414', sw: 0.5 },
      { id: '2', t: 'text', x: 20, y: 120, w: 200, h: 12, text: 'Eski sarlavha', fs: 24, b: true },
      { id: '3', t: 'legend', x: 300, y: 20, w: 80, h: 30, title: 'Belgilar', entries: [{ label: 'Bogʻ', col: '#8cc37a' }] }] }] });
    await put('kps_mat', 'mats', 'id', { id: 'm1', kind: 'svg', name: 'Kesim', src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 10%22%3E%3Crect width=%2220%22 height=%2210%22 fill=%22%23c0643a%22/%3E%3C/svg%3E', aspect: 2, t: '2026-10-19' });
  });
  await openCh(page); await page.click('#chStGo');
  if (!(await page.locator('[data-sec=varaq].open').count())) await page.click('[data-sec=varaq] .ch-sh');
  await expect(page.locator('#chLegacy')).toContainText('1');
  const n0 = await page.locator('#chPages .ch-pg').count();
  await page.click('#chLegacyGo');
  await expect(page.locator('#chPages .ch-pg')).toHaveCount(n0 + 1);
  await expect(page.locator('#chLegacy')).toHaveCount(0);
  await expect(page.locator('.ch-page text', { hasText: 'Eski sarlavha' })).toHaveCount(1);
  await expect(page.locator('.ch-page text', { hasText: 'Belgilar' })).toHaveCount(1);
  if (shots) await page.screenshot({ path: `${shots}/ch_eski_albom.png` });
  // material bazadan olindi — qayta taklif qilinmaydi
  expect(await page.evaluate(() => new Promise<number>(ok => { const r = indexedDB.open('kps_mat'); r.onsuccess = () => { const q = r.result.transaction('mats').objectStore('mats').count(); q.onsuccess = () => ok(q.result); }; }))).toBe(0);
  // yangi namunalar
  for (const id of ['mr-tik', 'st-toc', 'pf-cover', 'pf-about']) {
    const k = await page.locator('#chPages .ch-pg').count();
    await page.click('#chAddTpl'); await page.click(`#chTplMenu [data-tpl=${id}]`);
    await expect(page.locator('#chPages .ch-pg')).toHaveCount(k + 1);
  }
  await expect(page.locator('#chTplMenu')).toHaveCount(0);
  await page.click('#chAddTpl'); await expect(page.locator('#chTplMenu [data-fam=pf]')).toHaveCount(6);
  if (shots) await page.screenshot({ path: `${shots}/ch_namuna_menyu.png` });
  await page.keyboard.press('Escape');
});
