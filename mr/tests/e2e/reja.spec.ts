import { test, expect, type Page } from '@playwright/test';

async function newSite(page: Page, w = 120, h = 100) {
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', String(w)); await page.fill('#rh', String(h));
  await page.click('#rectSite');
}

test('koʻcha chiziladi → ikki kvartal → zona → yashil hisob', async ({ page }) => {
  await newSite(page);
  await page.click('[data-step=kocha]');
  await expect(page.locator('.panel h2')).toHaveText('Koʻchalar');
  await page.click('[data-ktab=prof]'); await page.click('[data-prof=turar-20]');
  await page.click('[data-ktab=chiz]'); await page.click('#drawStreet');                       // reja koʻrinishiga oʻtadi
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy - box.height * 0.36);
  await page.mouse.click(cx, cy + box.height * 0.36);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sid]')).toHaveCount(1);
  await expect(page.locator('[data-sid]')).toContainText('Turar joy koʻchasi · 20 m');
  await expect(page.locator('#stArea')).not.toContainText('0,00 ga');

  await page.click('[data-step=parsel]');
  await expect(page.locator('[data-block]')).toHaveCount(2);
  await page.locator('[data-block="1"]').click();
  await page.click('[data-use=yashil]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Park' })).toHaveCount(1);

  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenSt')).not.toContainText('Yashil kvartallar (park, skver)0 m²');

  await page.keyboard.press('Control+z');               // zona bekor
  await page.click('[data-step=parsel]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Park' })).toHaveCount(0);

  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await page.click('[data-step=kocha]');
  await expect(page.locator('[data-sid]')).toHaveCount(1);
});

test('uchastkadagi mavjud binolar: buzish va saqlash', async ({ page, context }) => {
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const el: unknown[] = []; let id = 1;
  for (const bx of [-150, 0, 150]) for (const by of [-150, 0, 150]) if (bx || by) el.push({ type: 'way', id: id++, tags: { building: 'yes' }, geometry: [ll(bx - 6, by - 5), ll(bx + 6, by - 5), ll(bx + 6, by + 5), ll(bx - 6, by + 5), ll(bx - 6, by - 5)] });
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: el } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('8 bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '400'); await page.fill('#rh', '400'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('8 bino');
  await expect(page.locator('#demo')).toContainText('buziladi 8');
  await page.click('#keepAll');
  await expect(page.locator('#demo')).toContainText('buziladi 0');
});

test('parsellar: boʻlish, funksiya (maktab), kesish, butun kvartal; reyestrda maktab va parkovka', async ({ page }) => {
  await newSite(page, 300, 200);
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="0"]').click();
  await page.locator('#pSize').fill('1');
  await page.click('[data-grid=ns]');
  await page.click('#pSplit');
  await expect(page.locator('[data-block]')).toHaveCount(6);
  await page.locator('[data-block="0"]').click();
  await page.click('[data-use=maktab]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Maktab' })).toHaveCount(1);
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=school]')).toContainText('oʻrin');
  await expect(page.locator('.drawer [data-rule=parking] .chip')).toHaveAttribute('data-s', 'fail');
  await page.click('#kMore');
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="1"]').click();
  await page.click('#pClear');
  await expect(page.locator('[data-block]')).toHaveCount(1);
  // boʻlish usullari: 4 variant koʻrinadi; perimetr — frontal parsellar + yadro
  await page.locator('[data-block="0"]').click();
  await expect(page.locator('[data-pvar]')).toHaveCount(4);
  await page.click('[data-pvar=perimetr]');
  await expect(page.locator('[data-pvar=perimetr]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#pSplit');
  const n = await page.locator('[data-block]').count();
  expect(n).toBeGreaterThanOrEqual(5);
});

test('koʻcha: ikki marta bosish va «Chizishni tugatish» chiziqni saqlaydi', async ({ page }) => {
  await newSite(page);
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await page.click('#drawStreet');
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // ikki marta bosish — tugatish (Chrome pointerup da e.detail = 0)
  await page.mouse.click(cx - box.width * 0.12, cy - box.height * 0.3);
  await page.mouse.dblclick(cx - box.width * 0.12, cy + box.height * 0.3);
  await expect(page.locator('[data-sid]')).toHaveCount(1);
  // tugma — chizilgan nuqtalar saqlanadi, asbob oʻchadi
  await page.mouse.click(cx + box.width * 0.12, cy - box.height * 0.3);
  await page.mouse.click(cx + box.width * 0.12, cy + box.height * 0.3);
  await page.click('#drawStreet');
  await expect(page.locator('[data-sid]')).toHaveCount(2);
  await expect(page.locator('#drawStreet')).toContainText('Koʻcha chizish');
});

test('koʻcha toʻri generatsiyasi: preset, variant, qoʻllash, olib tashlash', async ({ page }) => {
  await newSite(page, 420, 330);
  await page.click('[data-step=kocha]');
  await expect(page.locator('#gridBox')).toBeVisible();
  await page.click('[data-gpre=portlend]'); await page.click('[data-gvar="1"]'); await page.click('#gridApply');
  await expect(page.locator('#gridClear')).toBeVisible();
  const n = await page.evaluate(() => (window as any).__mr.store.doc.streets.filter((s: any) => s.gen === 'grid').length);
  expect(n).toBeGreaterThanOrEqual(6);
  expect(await page.evaluate(() => (window as any).__mr.plan().blocks.length)).toBeGreaterThanOrEqual(12);
  // har kvartalda yozuv (nomi, funksiyasi, maydoni); Qatlamlar → oʻchirilsa yoʻqoladi
  // yozuvlar yerga yotadi (4.1): har uchastkaga bitta; «Yoʻq» rejimida koʻrinmaydi; masshtab chipi koʻrinadi
  const labels = () => page.evaluate(() => { const ed = (window as any).__mr; return { n: ed.scene.world.children.filter((o: any) => o.userData.glab === 'block').length, vis: ed.scene.world.children.filter((o: any) => o.userData.glab === 'block' && o.children[0].visible).length, b: ed.plan().blocks.length }; });
  await expect.poll(async () => (await labels()).vis).toBeGreaterThan(0);
  const L = await labels(); expect(L.n).toBe(L.b);
  await expect(page.locator('#scaleChip')).toContainText('1:');
  await page.click('#layPop'); await page.click('[data-lmode=off]');
  await expect.poll(async () => (await labels()).vis).toBe(0);
  await page.click('[data-lmode=auto]'); await page.click('#layPop');
  await expect.poll(async () => (await labels()).vis).toBeGreaterThan(0);
  // qoʻlda chizilgan koʻcha qayta qoʻllashda qoladi
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); ed.store.dispatch({ type: 'addStreet', axis: [[o[0] - 50 / mx, o[1]], [o[0] + 50 / mx, o[1]]], profile: 'otish-8' }); });
  await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets.filter((s: any) => s.gen !== 'grid').length)).toBe(1);
  await page.click('#gridClear');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets.length)).toBe(1);
});
