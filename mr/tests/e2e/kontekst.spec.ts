import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/** Sinov shahri: markaz atrofida har 150 m da koʻcha (x, y = ±75, ±225, ±375), kvartallarda binolar, bitta park */
const O = [69.2797, 41.3111];
const kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
function city() {
  const el: unknown[] = []; let id = 1;
  for (const c of [-375, -225, -75, 75, 225, 375]) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [ll(c, -520), ll(c, 520)] });
    el.push({ type: 'way', id: id++, tags: { highway: c === 75 ? 'primary' : 'residential' }, geometry: [ll(-520, c), ll(520, c)] });
  }
  for (let bx = -300; bx <= 300; bx += 150) for (let by = -300; by <= 300; by += 150) {
    if (bx === 0 && by === 0) continue; // markaziy kvartal boʻsh — loyiha uchun
    el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': String(4 + ((bx + by) / 150 & 7)) }, geometry: [ll(bx - 30, by - 20), ll(bx + 30, by - 20), ll(bx + 30, by + 20), ll(bx - 30, by + 20), ll(bx - 30, by - 20)] });
  }
  el.push({ type: 'way', id: id++, tags: { leisure: 'park' }, geometry: [ll(130, 130), ll(170, 130), ll(170, 170), ll(130, 170), ll(130, 130)] });
  return { elements: el };
}

async function mockNet(ctx: BrowserContext, hits: { overpass: number }) {
  await ctx.route(/overpass|interpreter/, r => { if (decodeURIComponent(r.request().postData() || '').includes('highway')) hits.overpass++; return r.fulfill({ json: city() }); });
  await ctx.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await ctx.route(/openfreemap\.org/, r => r.fulfill({ status: 404, body: '' }));   // OFM zaxirasi testda yoʻq — Overpass (mock) sinaladi
  await ctx.route(/nominatim/, r => r.fulfill({ json: [{ lat: '41.2856', lon: '69.2034', name: 'Chilonzor', display_name: 'Chilonzor, Toshkent, Oʻzbekiston' }] }));
}

async function newProject(page: Page) {
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('.panel h2')).toHaveText('Hudud');
}

test('kontekst yuklanadi, kvartal bosib aniqlanadi, yangilanganda keshdan tiklanadi', async ({ page, context }) => {
  const hits = { overpass: 0 };
  await mockNet(context, hits);
  await newProject(page);
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 15000 });
  await expect(page.locator('.panel .warn')).toContainText('relyef');   // relyef/tasvir yuklanmadi — ochiq aytiladi
  await expect(page.locator('.attr')).toBeVisible();

  await page.click('[data-step=uchastka]');
  await page.click('#pickBlock');
  const box = (await page.locator('#scene canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  // 150 m qadam − koʻcha kengliklari (7 va 17 m) → taxminan 1,6–1,9 ga
  await expect(page.locator('#kSite b')).not.toHaveText('—');
  const ha = Number((await page.locator('#kSite b').textContent())!.replace(',', '.'));
  expect(ha).toBeGreaterThan(1.5); expect(ha).toBeLessThan(2.0);

  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await page.click('[data-step=hudud]');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 10000 });
  expect(hits.overpass).toBeLessThanOrEqual(4);                           // bir yuklash = 4 server parallel; ikkinchi marta tarmoqqa chiqilmadi
});

test('manzil qidiruvi: uchastka bilan koʻchirish', async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  await newProject(page);
  await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await page.click('[data-step=hudud]');
  await page.fill('#q', 'Chilonzor'); await page.press('#q', 'Enter');
  await page.locator('.res .it').first().click();
  await page.click('#mvCarry');
  await expect(page.locator('#orig')).toHaveText('41.28560, 69.20340');
  await expect(page.locator('#kSite b')).toHaveText('1,20');               // uchastka shakli saqlandi
});

test('koordinata bilan qidiruv tarmoqsiz ishlaydi', async ({ page }) => {
  await newProject(page);
  await page.fill('#q', '41.3, 69.25'); await page.press('#q', 'Enter');
  await page.locator('.res .it').first().click();
  await expect(page.locator('#orig')).toHaveText('41.30000, 69.25000');
});

test('tanlangan radius tugmasi belgilanadi', async ({ page }) => {
  await newProject(page);
  await expect(page.locator('.seg.full button', { hasText: '500 m' })).toHaveAttribute('aria-pressed', 'true');
  await page.click('.seg.full button:has-text("750 m")');
  await expect(page.locator('.seg.full button', { hasText: '750 m' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.seg.full button', { hasText: '500 m' })).toHaveAttribute('aria-pressed', 'false');
});

test('OSM serveri band boʻlsa — keshdagi nusxa ogohlantirish bilan', async ({ page, context }) => {
  test.setTimeout(60_000);
  const hits = { overpass: 0 };
  await mockNet(context, hits);
  await newProject(page);
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 15000 });
  await context.unroute(/overpass|interpreter/);
  await context.route(/overpass|interpreter/, r => r.fulfill({ status: 503, body: 'busy' }));
  await page.click('button:has-text("OSM dan yangilash")');
  await expect(page.locator('.ctxbadge')).toBeVisible();
  await expect(page.locator('#ctxStale')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('#ctxSt')).toContainText('24 bino');
});

/** Dunyo nuqtasi (mahalliy x, y) → ekran koordinatasi (sahna kamerasi orqali) */
async function screenOf(page: Page, x: number, y: number) {
  return page.evaluate(([x, y]) => {
    const sc = (window as any).__mr.scene, cam = sc.cam, c = sc.renderer.domElement.getBoundingClientRect();
    cam.updateMatrixWorld(); const V = cam.matrixWorldInverse.elements, P = cam.projectionMatrix.elements, w = [x, sc.H(x, y), -y, 1];
    const mul = (M: number[], v: number[]) => [0, 1, 2, 3].map(r => M[r] * v[0] + M[4 + r] * v[1] + M[8 + r] * v[2] + M[12 + r] * v[3]);
    const q = mul(P, mul(V, w));
    return { x: c.left + (q[0] / q[3] + 1) / 2 * c.width, y: c.top + (1 - q[1] / q[3]) / 2 * c.height };
  }, [x, y]);
}

test('mavjud OSM koʻchasini loyihaga olish: profil, meʼyor tekshiruvi, kontekstda yashiriladi', async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  await newProject(page);
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '300'); await page.click('#rectSite');
  await page.click('[data-step=kocha]');
  await page.click('[data-prof=tuman-40]');
  await page.click('[data-view=plan]');
  const p = await screenOf(page, 75, 20);                 // x=75 dagi koʻcha (residential)
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#osmPick')).toContainText('residential');
  await page.click('#adoptOsm');
  await expect(page.locator('[data-sid]')).toHaveCount(1);
  await expect(page.locator('#stNorm')).toContainText('Tuman ahamiyatidagi magistral');
  await expect(page.locator('#stNorm')).toContainText('Meʼyorga mos');
  await page.click('[data-step=parsel]');
  await expect(page.locator('[data-block]')).toHaveCount(2);
});
