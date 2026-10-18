import { test, expect, type Page } from './fx';

/** Koʻchasoz (app/kochasoz.html): kanvas maketlari A, B, C, E, Grafika, Varaq — rejimlar, kesim tahriri, saqlash, A→B, Varaq→Chizmadon */
const errs: string[] = [];
async function open(page: Page, hash: string, q = ''): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto(`./kochasoz.html${q}#/${hash}`);
  await expect(page.locator('.ws')).toBeVisible();
}
const blk = (page: Page) => page.locator('.ws-b .blk');

test.beforeEach(() => { errs.length = 0; });

test('B kesim: zona tanlash, eni, qoʻshish, saqlanadi; rejimlar va tekshiruv', async ({ page }) => {
  await open(page, 'b');
  await expect(page.locator('.eko .svc a.on')).toHaveText(/Koʻchasoz/);
  await expect(page.locator('.ws-b .mtab[aria-pressed=true]')).toContainText('Kesim');
  const n0 = await blk(page).count(); expect(n0).toBeGreaterThan(8);
  await expect(page.locator('.ws-b .chk').first()).toBeVisible();
  // 3-zonani tanlab, enini oshirish
  await blk(page).nth(2).click();
  await expect(blk(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
  const w0 = (await blk(page).nth(2).locator('.w').textContent())!.trim();
  await page.getByRole('button', { name: 'Enini oshirish' }).click();
  await expect(blk(page).nth(2).locator('.w')).not.toHaveText(w0);
  // zona qoʻshish (Velo)
  await page.locator('.ws-b .chipb', { hasText: '+ Velo' }).click();
  await expect(blk(page)).toHaveCount(n0 + 1);
  // koʻrinish: Reja
  await page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Reja' }).click();
  await expect(page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Reja' })).toHaveAttribute('aria-pressed', 'true');
  // qayta yuklash — saqlangan
  await page.waitForTimeout(400);
  await page.reload(); await expect(page.locator('.ws-b')).toBeVisible();
  await expect(blk(page)).toHaveCount(n0 + 1);
  // tayyor kesim: Mahalla
  await page.locator('.ws-b .tpl', { hasText: 'Mahalla koʻchasi' }).click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Mahalla koʻchasi');
  // muhandislik tarmoqlari — avto joylash
  await page.locator('.ws-b aside').last().getByRole('button', { name: 'Avto joylash' }).click();
  await expect(page.locator('.ws-b .ub').first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('saytda: faqat Kesim (Kesim, Reja koʻrinishlari) va Varaq; qolganlari «Tez orada», Grafika yashirin', async ({ page }) => {
  await open(page, 'c');
  await expect(page).toHaveURL(/#\/b$/);                                   // tayyor boʻlmagan rejim → B
  await expect(page.locator('.ws-b .mtab[aria-disabled=true]')).toHaveCount(3);
  await expect(page.locator('.ws-b .mtab', { hasText: 'Mikromodel' })).toHaveCount(0);       // butunlay yashirin
  await expect(page.locator('.ws-b .mtab', { hasText: 'Chorraha' }).locator('em.soon')).toHaveText('Tez orada');
  await page.locator('.ws-b .mtab', { hasText: 'Chorraha' }).click({ force: true });   // aria-disabled — bosilsa ham oʻtmaydi
  await expect(page).toHaveURL(/#\/b$/);
  await expect(page.locator('.ws-b main .seg').first().locator('button')).toHaveText(['Kesim', 'Reja']);
  await expect(page.locator('#ksGrafika')).toHaveCount(0);
  await expect(page.locator('#ksVaraq')).toBeVisible();
  // zona chegarasini pastki qatorda sudrash: qoʻshni zona hisobidan, umumiy kenglik oʻzgarmaydi
  const w = () => page.evaluate(() => (window as any).__ks.m.inst.state.els.map((e: [string, number]) => e[1]));
  const w0 = await w(), sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;
  const hb = (await page.locator('.ws-b .ks-sh').nth(1).boundingBox())!;
  await page.mouse.move(hb.x + 6, hb.y + 20); await page.mouse.down(); await page.mouse.move(hb.x + 40, hb.y + 20, { steps: 4 }); await page.mouse.up();
  const w1 = await w(); expect(w1[1]).toBeGreaterThan(w0[1]); expect(w1[2]).toBeLessThan(w0[2]); expect(sum(w1)).toBe(sum(w0));
  // tarmoq: avto joylash, sudrash → meʼyor javobi chiqadi
  await page.locator('.ws-b .tb', { hasText: 'Avto joylash' }).click();
  const ub = (await page.locator('.ws-b .ub').first().boundingBox())!;
  await page.mouse.move(ub.x + 8, ub.y + 8); await page.mouse.down(); await page.mouse.move(ub.x + 60, ub.y + 8, { steps: 4 }); await page.mouse.up();
  await expect(page.locator('.ws-b .ks-ufb')).toHaveText(/^[✓✕]/);
  // bino qavati chizmada: + tugmasi
  await page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Kesim' }).click();
  const bL = await page.evaluate(() => (window as any).__ks.m.inst.state.bL);
  await page.locator('.ws-b .ks-bb').nth(1).click();
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.bL)).toBe(bL + 1);
  // tayyor kesimlar: Master reja profillari guruhi
  await page.locator('.ws-b .ks-dd').click();
  await page.locator('.ws-b .ks-menu button', { hasText: 'Asosiy' }).click();
  await expect(page.locator('.ws-b .ks-menu')).toHaveCount(0);
  await page.locator('.ws-b .tpl', { hasText: 'Mahalla koʻchasi' }).click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Mahalla koʻchasi');
  // «Tayyor kesimlar» boʻlimi yigʻiladi
  await page.locator('.ws-b .ks-acc').click();
  await expect(page.locator('.ws-b .tpl')).toHaveCount(0);
  await page.locator('.ws-b .ks-acc').click();
  await expect(page.locator('.ws-b .tpl').first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('beta: A tarmoq → B, C chorraha, E mikromodel, Grafika, Varaq', async ({ page }) => {
  await open(page, 'a', '?beta');
  await expect(page.locator('.ws-a .mtab[aria-pressed=true]')).toContainText('Tarmoq');
  await page.locator('.ws-a .mtab', { hasText: 'Chorraha' }).click();
  await expect(page.locator('.ws-c')).toBeVisible();
  await expect(page.locator('.ws-c .chk').first()).toBeVisible();
  await page.locator('.ws-c .mtab', { hasText: 'Mikromodel' }).click();
  await expect(page.locator('.ws-e')).toBeVisible();
  await page.locator('#ksGrafika').click();
  await expect(page.locator('.ws-grafika svg path').first()).toBeAttached();
  await page.locator('#ksVaraq').click();
  await expect(page.locator('.ws-varaq svg[role=img]')).toBeVisible();
  // A: koʻchani tanlab, «Kesimini ochish (B)» — B mos tayyor kesim bilan ochiladi
  await page.goto('./kochasoz.html#/a'); await expect(page.locator('.ws-a')).toBeVisible();
  await page.evaluate(() => { const k = (window as any).__ks; k.m.inst.setState({ sel: 0 }); });   // «Shahar magistrali A» (sh2 → Avtobus koridori)
  await page.locator('.ws-a a[href="#/b"]').click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Avtobus koridori');
  expect(errs).toEqual([]);
});

test('Varaq: SVG yuklab olish va Chizmadonga yuborish', async ({ page }) => {
  await open(page, 'varaq');
  const dl = page.waitForEvent('download');
  await page.locator('.ws-varaq button', { hasText: /^SVG$/ }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.svg$/);
  await page.locator('.ws-varaq .btn-primary').click();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 20_000 });
  await expect(page.locator('.gx.ch')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();
  expect(errs).toEqual([]);
});

test('til va tungi rejim', async ({ page }) => {
  await open(page, 'b');
  await page.locator('#langSw [data-lang=en]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => [localStorage.getItem('mr-lang'), localStorage.getItem('kps_lang')])).toEqual(['en', 'en']);
  await page.locator('#themeBtn').click();
  const t = await page.locator('html').getAttribute('data-theme');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', t!);
  expect(errs).toEqual([]);
});

test('Master reja koʻchasi → «Koʻchasozda ochish» → B kesim shu profil bilan', async ({ page }) => {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await expect(page.locator('#stKs')).toBeVisible();
  const name = (await page.locator('[data-sid] .k').first().textContent())!.replace(/^\d+\.\s*/, '').split(' · ')[0];
  await page.click('#stKs');
  await expect(page).toHaveURL(/kochasoz\.html#\/b$/);
  await expect(page.locator('.ws-b aside').first()).toContainText(name);
  expect(errs).toEqual([]);
});
