import { test, expect, type Page, type BrowserContext } from './fx';

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

/** yigʻiq boʻlimni ochish (CI da atrof yuklanadi — ikkinchi darajali tugmalar «Atrof sozlamalari» / «Boshqa usullar» ichida) */
async function more(page: Page, id: 'ctxMore' | 'siteMore') {
  const d = page.locator(`#${id}`); await d.waitFor();
  if ((await d.getAttribute('open')) === null) await page.click(`#${id} > summary`);
  await expect(d).toHaveAttribute('open', '');
}
/** qidiruv: panel qayta chizilsa (atrof yuklanib boʻldi) natija yoʻqolishi mumkin — qayta yuboriladi */
async function search(page: Page, q: string) {
  await expect.poll(async () => { if (await page.locator('.res .it').count()) return true; await page.fill('#q', q); await page.press('#q', 'Enter'); await page.waitForTimeout(400); return (await page.locator('.res .it').count()) > 0; }, { timeout: 20_000 }).toBe(true);
}
async function newProject(page: Page) {
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('.panel h2')).toHaveText('Joy va uchastka');
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
  await page.click('[data-step=uchastka]');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 10000 });
  expect(hits.overpass).toBeLessThanOrEqual(5);                           // bir yuklash = oʻz serverimiz + 4 ochiq server parallel; ikkinchi marta tarmoqqa chiqilmadi
});

test('manzil qidiruvi: uchastka bilan koʻchirish', async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  await newProject(page);
  await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await page.click('[data-step=uchastka]');
  await search(page, 'Chilonzor');
  await page.locator('.res .it').first().click();
  await page.click('#mvCarry');
  await expect(page.locator('#orig')).toHaveText('41.28560, 69.20340');
  await expect(page.locator('#kSite b')).toHaveText('1,20');               // uchastka shakli saqlandi
});

test('koordinata bilan qidiruv tarmoqsiz ishlaydi', async ({ page }) => {
  await newProject(page);
  await search(page, '41.3, 69.25');
  await page.locator('.res .it').first().click();
  await expect(page.locator('#orig')).toHaveText('41.30000, 69.25000');
});

test('tanlangan radius tugmasi belgilanadi', async ({ page }) => {
  await newProject(page);
  await expect(page.locator('[aria-label=Radius] button', { hasText: '500 m' })).toHaveAttribute('aria-pressed', 'true');
  await page.click('[aria-label=Radius] button:has-text("750 m")');
  await expect(page.locator('[aria-label=Radius] button', { hasText: '750 m' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[aria-label=Radius] button', { hasText: '500 m' })).toHaveAttribute('aria-pressed', 'false');
  // 1,5 va 1,8 km
  await expect(page.locator('[aria-label=Radius] button')).toHaveCount(9);
  await page.click('[aria-label=Radius] button:has-text("1,8 km")');
  await expect(page.locator('[aria-label=Radius] button', { hasText: '1,8 km' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.context.radius)).toBe(1800);
  // 2,5 / 3 / 4 km (egasi, 25.10: Qorashina shaharchasi sigʻmaydi) — tugmalar ikki qatorda, panel chetidan chiqmaydi
  await page.click('[aria-label=Radius] button:has-text("4 km")');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.context.radius)).toBe(4000);
  await expect(page.locator('[aria-label=Radius] button', { hasText: '4 km' })).toHaveAttribute('aria-pressed', 'true');   // panel qayta chizilib boʻlsin
  // atrof yuklangach radius «Atrof sozlamalari» ichida — ochiq boʻlsin (CI da tarmoq bor)
  if (await page.locator('#ctxMore').count() && (await page.locator('#ctxMore').getAttribute('open')) === null && !(await page.locator('[aria-label=Radius]').isVisible())) await page.click('#ctxMore > summary');
  await expect(page.locator('[aria-label=Radius]')).toBeVisible();
  const seg = (await page.locator('[aria-label=Radius]').boundingBox())!, last = (await page.locator('[aria-label=Radius] button', { hasText: '4 km' }).boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(seg.x + seg.width + 1);
  // uchastka oʻlcham bilan — 4000 m gacha
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '4000'); await page.fill('#rh', '3500'); await page.click('#rectSite');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.site.rings[0].length)).toBe(4);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) { await page.click('[data-step=uchastka]'); await page.screenshot({ path: `${process.env.GX_SHOTS}/radius_4km_dark.png` }); }
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
  await page.click('[data-ktab=prof]'); await page.click('[data-prof=tuman-40]');
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

test('chegara: uchastka fayldan (DXF, UTM 42N) va atrof chegara ichida (KML)', async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  await newProject(page);
  // uchastka: 200 × 150 m, UTM 42N metrlarda — avtomatik aniqlanadi
  await page.click('[data-step=uchastka]');
  const E = 523400, N = 4572500, pts = [[E, N], [E + 200, N], [E + 200, N + 150], [E, N + 150]];
  const dxf = ['0', 'SECTION', '2', 'ENTITIES', '0', 'LWPOLYLINE', '8', 'chegara', '90', '4', '70', '1', ...pts.flatMap(p => ['10', String(p[0]), '20', String(p[1])]), '0', 'ENDSEC', '0', 'EOF'].join('\n');
  await more(page, 'siteMore'); let fc = page.waitForEvent('filechooser'); await page.click('#siteFile');
  await (await fc).setFiles({ name: 'uchastka.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#kSite b')).toHaveText(/^(2,9\d|3,0\d)$/);
  await expect(page.locator('.toast').last()).toContainText('UTM 42N');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chegara_uchastka.png` });
  // uchastka joyida yangi loyiha: atrof chegara ichida — KML (WGS84)
  await page.click('[aria-label="Uchastkani oʻchirish"]');
  await page.click('[data-step=uchastka]');
  const ring = [ll(-100, -100), ll(400, -100), ll(400, 300), ll(-100, 300), ll(-100, -100)];
  const kml = `<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${ring.map(p => `${p.lon},${p.lat},0`).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`;
  await more(page, 'ctxMore'); fc = page.waitForEvent('filechooser'); await page.click('#areaFile');
  await (await fc).setFiles({ name: 'hudud.kml', mimeType: 'application/vnd.google-earth.kml+xml', buffer: Buffer.from(kml) });
  await expect(page.locator('#areaSt')).toContainText(/(19,9|20,0) ga/);
  await expect(page.locator('#ctxSt')).toBeVisible({ timeout: 15000 });
  const n = Number((await page.locator('#ctxSt b').textContent())!.replace(/\D/g, ''));
  expect(n).toBeGreaterThan(4); expect(n).toBeLessThan(24);                  // chegaradan tashqaridagilar qirqildi
  await expect(page.locator('[aria-label=Radius] button[aria-pressed=true]')).toHaveCount(0);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chegara_hudud.png` });
  if (process.env.GX_SHOTS) {   // 1024 px va tungi rejim
    await page.setViewportSize({ width: 1024, height: 768 }); await page.click('[aria-label="Tungi rejim"]');
    await page.screenshot({ path: `${process.env.GX_SHOTS}/chegara_hudud_1024_dark.png` });
    await page.click('[data-step=uchastka]'); await page.screenshot({ path: `${process.env.GX_SHOTS}/chegara_uchastka_1024_dark.png` });
    await page.click('[data-step=uchastka]');
  }
  // radius tugmasi — chegara olib tashlanadi
  await page.click('[aria-label=Radius] button:has-text("500 m")');
  await expect(page.locator('#areaSt')).toHaveCount(0);
});

test('chegara: dunyoning istalgan joyi — Parij fayli qabul qilinadi, loyiha markazi koʻchadi; nomaʼlum metrlar — rad', async ({ page }) => {
  await newProject(page);
  const gj = JSON.stringify({ type: 'Polygon', coordinates: [[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.85]]] });
  await more(page, 'ctxMore'); const fc = page.waitForEvent('filechooser'); await page.click('#areaFile');
  await (await fc).setFiles({ name: 'paris.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(gj) });
  await expect(page.locator('.toast').last()).toContainText('WGS84');
  await expect(page.locator('#areaSt')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.origin[0])).toBeCloseTo(2.357, 2);
  // Parijda stat.uz paneli — Toshkent raqamlari oʻrniga izoh
  await expect(page.locator('#demoAbroad')).toBeVisible(); await expect(page.locator('#district')).toHaveCount(0);
  // zona yozilmagan metrlar, loyiha markazidan uzoq — aniqlanmadi
  const bad = JSON.stringify({ type: 'Polygon', coordinates: [[[100, 100], [300, 100], [300, 300], [100, 100]]] });
  await more(page, 'ctxMore'); const fc2 = page.waitForEvent('filechooser'); await page.click('#areaFile');
  await (await fc2).setFiles({ name: 'bad.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(bad) });
  await expect(page.locator('.toast').last()).toContainText('aniqlanmadi');
});

test('Overture Maps: OSM da yoʻq bino qoʻshiladi, manba koʻrsatiladi (32-band)', async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  const ring = (x: number, y: number) => [[ll(x - 15, y - 10), ll(x + 15, y - 10), ll(x + 15, y + 10), ll(x - 15, y + 10)].map(p => [p.lon, p.lat])];
  let asked = 0;
  await page.route(/\/data\/overture\/buildings/, r => { asked++; return r.fulfill({ json: { release: '2026-10-21.0', buildings: [
    { rings: ring(0, 0), h: null, f: 5 },          // markaziy kvartal — OSM da boʻsh
    { rings: ring(150, 150), h: 40, f: null },     // OSM binosi bilan bir joyda (balandligi OSM da bor) — qoʻshilmaydi
  ] } }); });
  await newProject(page);
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('25 bino', { timeout: 15000 });
  await expect(page.locator('#ctxOv')).toContainText('+1 bino');
  await expect(page.locator('.attr .ovt')).toBeVisible();
  expect(asked).toBeGreaterThan(0);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/overture_dark.png` });
});

/** 1-qadam «Kirish va yoʻllar»: har tutash yoʻl uchun kirish holati (ShNQ 2.07.06-24, 1-ilova) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kirish va yoʻllar: magistral — chorraha/yon yoʻl, turar joy koʻchasi — toʻgʻridan-toʻgʻri · ${w}${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  await mockNet(context, { overpass: 0 });
  await page.setViewportSize({ width: w, height: 900 });
  if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
  await newProject(page);
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('24 bino', { timeout: 15000 });
  await page.click('#pickBlock');
  const box = (await page.locator('#scene canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#accessBox [data-accv=warn]')).toHaveCount(1);
  await expect(page.locator('#accessBox [data-accv=ok]').first()).toContainText('Toʻgʻridan-toʻgʻri kirish mumkin');
  await expect(page.locator('#accWarn')).toHaveCount(0);
  if (process.env.GX_SHOTS) { await page.locator('#accessBox').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${process.env.GX_SHOTS}/kirish_yol_${w}${dark ? '_dark' : ''}.png` }); }
});
