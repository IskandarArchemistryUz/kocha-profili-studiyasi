import { test, expect, type Page } from '@playwright/test';

/** Koʻchasoz (app/kochasoz.html): kanvas maketlari A, B, C, E, Grafika, Varaq — rejimlar, kesim tahriri, saqlash, A→B, Varaq→Chizmadon */
const errs: string[] = [];
async function open(page: Page, hash: string): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto(`./kochasoz.html#/${hash}`);
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
  // koʻrinish: Akso, Chizma
  await page.locator('.ws-b main .seg button').nth(2).click();
  await expect(page.locator('.ws-b main .seg button').nth(2)).toHaveAttribute('aria-pressed', 'true');
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

test('rejimlar: A tarmoq → B, C chorraha, E mikromodel, Grafika, Varaq', async ({ page }) => {
  await open(page, 'a');
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
