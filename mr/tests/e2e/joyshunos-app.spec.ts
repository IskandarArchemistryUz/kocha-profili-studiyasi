import { test, expect, type Page, pickLang } from './fx';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
// akso sahnasi: shamol/transport animatsiyasi har kadrni qayta chizadi — dasturiy GPU da sekin; testlar «harakatni kamaytirish» rejimida
test.use({ reducedMotion: 'reduce' });

/** Joyshunos (app/joyshunos.html, «Joy-A» maketi): qatlamlar paneli, joy pasporti, radius, raqobatchilar turi, qidiruv, saqlanish.
 *  Tarmoq soxtalashtiriladi: relyef plitkasi — fixtures/terrarium.png, Overpass va Nominatim — sunʼiy javoblar. */
const ROOT = resolve(process.cwd(), '..'), FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const C = [69.2797, 41.3111];
let k = 1;
const ring = (n: number, R: number, tags: (i: number) => Record<string, string>) => Array.from({ length: n }, (_, i) => {
  const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / n);
  return { type: 'node', id: k++, lat: C[1] + r * Math.sin(a) / 111132, lon: C[0] + r * Math.cos(a) / (111320 * Math.cos(C[1] * Math.PI / 180)), tags: tags(i) };
});
/** Kontekst uchun sunʼiy shahar: kvartallar, binolar (qavatlar bilan), koʻchalar, park */
function city(): unknown[] {
  const kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132, ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx }), el: unknown[] = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { if (Math.abs(i) <= 1 && Math.abs(j) <= 1) continue; const x = i * 100 + 20, y = j * 100 + 20;
    el.push({ type: 'way', id: k++, tags: { building: 'apartments', 'building:levels': String(2 + ((i * 7 + j * 3) & 7)) }, geometry: [ll(x, y), ll(x + 40, y), ll(x + 40, y + 30), ll(x, y + 30), ll(x, y)] }); }
  for (let i = -6; i <= 6; i++) { el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [ll(i * 100, -650), ll(i * 100, 650)] }); el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [ll(-650, i * 100), ll(650, i * 100)] }); }
  el.push({ type: 'way', id: k++, tags: { leisure: 'park' }, geometry: [ll(-90, -90), ll(90, -90), ll(90, 90), ll(-90, 90), ll(-90, -90)] });
  return el;
}
/** Bir rangli 256×256 PNG (GIBS plitkasi oʻrnida) */
function pngSolid(r: number, g: number, b: number): Buffer {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t: string, d: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const W = 256, hdr = Buffer.alloc(13); hdr.writeUInt32BE(W, 0); hdr.writeUInt32BE(W, 4); hdr[8] = 8; hdr[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const o = y * (W * 4 + 1) + 1 + x * 4; raw[o] = r; raw[o + 1] = x < 140 ? g : 190; raw[o + 2] = b; raw[o + 3] = 255; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const CMAP = '<ColorMaps><ColorMap><Entries><ColorMapEntry rgb="64,64,64" transparent="true"/><ColorMapEntry rgb="255,190,0" transparent="false" value="[312.80,313.40)"/><ColorMapEntry rgb="255,127,0" transparent="false" value="[324.80,325.40)"/></Entries></ColorMap></ColorMaps>';
async function open(page: Page, errs: string[], hash = ''): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => { errs.push(`dialog: ${d.message()}`); void d.dismiss(); });
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|AJAXError|Failed to load|AbortError/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  await page.route(/fonts\.g|openfreemap|arcgis/, r => r.abort());
  await page.route(/gibs\.earthdata\.nasa\.gov/, r => r.request().url().endsWith('.xml') ? r.fulfill({ contentType: 'text/xml', body: CMAP }) : r.fulfill({ contentType: 'image/png', body: pngSolid(255, 127, 0) }));
  await page.route(/elevation-tiles-prod/, r => r.fulfill({ path: FIX, contentType: 'image/png' }));
  await page.route(/nominatim\.openstreetmap\.org\/reverse/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { road: 'Amir Temur shoh koʻchasi', house_number: '21' } }) }));
  await page.route(/nominatim\.openstreetmap\.org\/search/, r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, async r => {
    const body = decodeURIComponent(r.request().postData() || '');
    const el = body.includes('way["building"]') ? city() : body.includes('"amenity"="cafe"') ? ring(9, 950, () => ({ amenity: 'cafe' })) : body.includes('pharmacy"]') ? ring(3, 900, () => ({ amenity: 'pharmacy' }))
      : [...ring(12, 1800, i => ({ amenity: ['school', 'kindergarten', 'pharmacy', 'clinic'][i % 4] })), ...ring(10, 1500, () => ({ highway: 'bus_stop' })), ...(city() as { tags: Record<string, string> }[]).filter(e => e.tags.highway)];
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: el }) });
  });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto(`./joyshunos.html${hash}`);
}

test('joy pasporti: qatlamlar, kartalar, radius, raqobatchilar, saqlanish', async ({ page }) => {
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('.eko .svc a.on')).toHaveText(/Joyshunos/);
  await expect(page.locator('.joy-l')).toHaveCount(12);
  await expect(page.locator('.joy-l .switch')).toHaveCount(10);
  await expect(page.locator('.joy-l em.soon')).toHaveCount(2);
  // pasport: manzil, relyef, shamol, xizmatlar, raqobatchilar
  await expect(page.locator('.joy-card.head .ttl')).toContainText('Amir Temur shoh koʻchasi, 21');
  await expect(page.locator('[data-card=relyef] .big')).toHaveText(/\d+–\d+ m/);
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—');
  await expect(page.locator('[data-card=shamol] .sub')).toContainText('Stansiya');
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/\d+ obyekt/);
  await expect(page.locator('[data-card=xizmat] .joy-norm li')).toHaveCount(4);
  await expect(page.locator('[data-card=raqobat] .big')).toHaveText(/^\d+ ta$/);
  // A2: piyoda yetish, odamlar oqimi (beta), shovqin (beta)
  for (const id of ['piyoda', 'oqim', 'shovqin']) await page.locator(`[data-layer=${id}] .switch`).click();
  await expect(page.locator('[data-card=piyoda] .big')).toHaveText(/ga · 15 daqiqa/, { timeout: 20_000 });
  await expect(page.locator('[data-card=piyoda] .joy-norm li')).toHaveCount(5);
  await expect(page.locator('[data-card=oqim] .big')).toHaveText(/^(Past|Oʻrtacha|Yuqori)$/, { timeout: 20_000 });
  await expect(page.locator('[data-card=shovqin] .big')).toHaveText(/dB\(A\)/, { timeout: 20_000 });
  await expect(page.locator('[data-card=oqim] .chip.beta')).toBeVisible();
  // raqobatchilar turi — oʻz menyusi (brauzerning select emas)
  await page.locator('.joy-cat').click();
  await page.locator('.joy-menu button', { hasText: 'Dorixona' }).click();
  await expect(page.locator('.joy-cat')).toHaveText('Dorixona');
  await expect(page.locator('[data-card=raqobat] .big')).toHaveText(/^\d+ ta$/);
  // radius: 15 daqiqa (1250 m) ham bor
  await expect(page.locator('.joy-card.head .seg button')).toHaveCount(4);
  await expect(page.locator('.joy-card.head .seg button', { hasText: '1250 m' })).toBeVisible();
  // xarita uslubi: 7 ta palitra
  await page.locator('#palBtn').click();
  await expect(page.locator('.joy-base .joy-pal button[data-pal]')).toHaveCount(10);   // +Qum, Oq maket, Koʻk chizma (27.10)
  await page.locator('.joy-base .joy-pal button[data-pal=line]').click();
  await expect(page.locator('#palBtn')).toContainText('Chizma');
  // radius
  await page.locator('.joy-card.head .seg button', { hasText: '800 m' }).click();
  await expect(page.locator('.joy-card.head .ttl')).toContainText('800 m');
  // qatlamni oʻchirish — karta yoʻqoladi, qayta yuklanganda saqlanadi
  await page.locator('[data-layer=shamol] .switch').click();
  await expect(page.locator('[data-card=shamol]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-layer=shamol] .switch')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.joy-card.head .seg button[aria-pressed=true]')).toHaveText('800 m');
  // qidiruv: koordinata (tarmoqsiz)
  await page.locator('#joyQ').fill('41.3200, 69.2500');
  await page.locator('#joyQ').press('Enter');
  await page.locator('.joy-res button').first().click();
  await expect(page.locator('.joy-card.head .chip.mono')).toHaveText('41.32000, 69.25000');
  // eski toʻliq asboblar havolalari mavjud
  await page.locator('.joy-old summary').click();
  for (const a of await page.locator('.joy-old a').all()) expect(existsSync(join(ROOT, 'app', (await a.getAttribute('href'))!))).toBe(true);
  expect(errs).toEqual([]);
});

test('tungi rejim va til: panel qorongʻi, inglizcha matn', async ({ page }) => {
  const errs: string[] = [];
  await page.addInitScript(() => { localStorage.setItem('mr-theme', 'dark'); });
  await open(page, errs);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.locator('.joy-card.head').evaluate(e => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
  await pickLang(page, 'en');
  await expect(page.locator('.joy-card.head .t-small').first()).toHaveText('Site passport');
  await expect(page.locator('[data-layer=relyef] .nm')).toHaveText('Terrain');
  await pickLang(page, 'uz');
  expect(errs).toEqual([]);
});

test('aksonometriya: sahna, izohlar, vaqt, portlatish, qatlam tartibi, PNG', async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; await open(page, errs, '#/axo');
  await expect(page.locator('#joyMode [data-mode=axo]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.joy-axo canvas')).toBeVisible();
  // sahna qurildi: binolar va pinlar
  await expect.poll(() => page.evaluate(() => { const a = (window as unknown as { joyAxo?: { groups: Map<string, { children: unknown[] }> } }).joyAxo; return a ? a.groups.get('binolar')!.children.length : 0; }), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(page.locator('.joy-notes')).toContainText('21 iyun');
  await expect(page.locator('.axo-hour').first()).toBeAttached();
  // vaqt: klaviatura bilan soat oʻzgaradi, kun — 21 dekabr
  const t0 = await page.locator('#axTm').textContent();
  await page.locator('.joy-time .range').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#axTm')).not.toHaveText(t0!);
  await page.locator('.joy-time .seg button', { hasText: '21 dekabr' }).click();
  await expect(page.locator('.joy-notes')).toContainText('21 dekabr');
  // shamol: 3 yoʻnalish izohda (animatsiyali strelkalar)
  await expect(page.locator('.joy-notes')).toContainText('Shamol 1:');
  // 3D uslub: Master rejadagi 5 uslub + xarita palitrasi
  await expect(page.locator('.joy-sty button')).toHaveCount(6);
  await page.locator('.joy-sty [data-sty=rangli]').click();
  await expect(page.locator('.joy-sty [data-sty=rangli]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.joy-sty [data-sty=palitra]').click();
  await page.locator('.joy-axl .joy-pal button[data-pal=fig]').click();
  await expect(page.locator('.joy-axl .joy-pal button[data-pal=fig]')).toHaveAttribute('aria-selected', 'true');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy-fig.png` });
  await page.locator('.joy-sty [data-sty=albom]').click();
  // portlatilgan rejim: quyosh va shamol yashiriladi → 5 ta raqamli izoh
  await page.locator('.joy-axl .seg button', { hasText: 'Yoyilgan' }).click();
  await expect(page.locator('.axo-side:not([hidden])')).toHaveCount(5);
  await expect(page.locator('.joy-axlist li[data-ax=quyosh] small')).toBeVisible();
  // qatlam tartibi: birinchisini yuqoriga
  const first = await page.locator('.joy-axlist li').first().getAttribute('data-ax');
  await page.locator('.joy-axlist li').first().locator('.mv', { hasText: '↑' }).click();
  await expect(page.locator('.joy-axlist li').nth(1)).toHaveAttribute('data-ax', first!);
  // qatlamni yashirish
  await page.locator('.joy-axlist li[data-ax=binolar] .check').click();
  await expect(page.locator('.axo-side:not([hidden])')).toHaveCount(4);
  // koʻrinish: reja
  await page.locator('.joy-axl .seg.vw button', { hasText: 'Reja' }).click();
  await expect(page.locator('.joy-axl .seg.vw button', { hasText: 'Reja' })).toHaveAttribute('aria-pressed', 'true');
  // PNG 4K
  const dl = page.waitForEvent('download');
  await page.locator('#axPng').click();
  expect((await dl).suggestedFilename()).toMatch(/^joyshunos-.*\.png$/);
  // xaritaga qaytish; holat saqlanadi
  await page.locator('#joyMode [data-mode=map]').click();
  await expect(page.locator('.joy-lp')).toBeVisible();
  await page.goto('./joyshunos.html#/axo');
  await expect(page.locator('.joy-axl .seg button', { hasText: 'Yoyilgan' })).toHaveAttribute('aria-pressed', 'true');
  expect(errs).toEqual([]);
});

test('B2: lineyka, uchastka (1-qadamdan), aksonometriyada quyoshni sudrash, model, SVG (qatlamli) va massing eksporti', async ({ page }) => {
  test.setTimeout(180_000);
  const errs: string[] = [];
  await page.addInitScript(() => { try { localStorage.setItem('kps_site', JSON.stringify({ ring: [[41.3105, 69.279], [41.3105, 69.2805], [41.3118, 69.2805], [41.3118, 69.279]] })); } catch { /* */ } });
  await open(page, errs);
  // lineyka: ikki nuqta + Enter
  await page.locator('#tRuler').click();
  await page.mouse.click(620, 420); await page.mouse.click(820, 430); await page.keyboard.press('Enter');
  await expect(page.locator('#joyMeasure')).toContainText(/Uzunlik: [\d\s ]+ m/);
  // uchastka — 1-qadamdan
  await page.locator('#tSiteK').click();
  await expect(page.locator('.joy-card.head .chip.site')).toContainText('ga');
  // aksonometriya
  await page.locator('#joyMode [data-mode=axo]').click();
  await expect.poll(() => page.evaluate(() => { const a = (window as unknown as { joyAxo?: { siteRing(): unknown } }).joyAxo; return a ? !!a.siteRing() : false; }), { timeout: 40_000 }).toBe(true);
  // quyoshni sudrash → vaqt oʻzgaradi
  const t0 = (await page.locator('#axTm').textContent())!;
  const sun = await page.evaluate(() => { const a = (window as unknown as { joyAxo: { sunMarks: { position: { clone(): { y: number; project(c: unknown): { x: number; y: number } } } }[]; groups: Map<string, { position: { y: number } }>; ortho: unknown; renderer: { domElement: HTMLCanvasElement } } }).joyAxo;
    const v = a.sunMarks[0].position.clone(); v.y += a.groups.get('quyosh')!.position.y; const p = v.project(a.ortho); const r = a.renderer.domElement.getBoundingClientRect(); return [(p.x + 1) / 2 * r.width + r.left, (1 - p.y) / 2 * r.height + r.top]; });
  await page.mouse.move(sun[0], sun[1]); await page.mouse.down(); await page.mouse.move(sun[0] - 120, sun[1] - 30, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('#axTm')).not.toHaveText(t0);
  // model (OBJ)
  const fc = page.waitForEvent('filechooser'); await page.locator('#axModel').click(); await (await fc).setFiles(join(process.cwd(), 'tests/e2e/fixtures/kub.obj'));
  await expect.poll(() => page.evaluate(() => (window as unknown as { joyAxo: { hasModel(): boolean } }).joyAxo.hasModel()), { timeout: 30_000 }).toBe(true);
  // SVG (Illustrator qatlamlari)
  await page.locator('#axExp').click();
  let dl = page.waitForEvent('download'); await page.locator('#exSvgL').click();
  const svgPath = await (await dl).path(); const txt = readFileSync(svgPath!, 'utf8');
  expect(txt).toContain('inkscape:groupmode="layer"'); expect((txt.match(/data-name="0\d /g) ?? []).length).toBeGreaterThanOrEqual(5);
  // massing GLB
  await page.locator('#axExp').click();
  dl = page.waitForEvent('download'); await page.locator('#exGlb').click();
  expect((await dl).suggestedFilename()).toMatch(/\.glb$/);
  // Render studiyasiga — joriy aksonometriya kadri asos rasm boʻladi
  await page.locator('#axExp').click();
  await page.locator('#exRen').click();
  await expect(page).toHaveURL(/render\.html/, { timeout: 30_000 });
  await expect(page.locator('.ren-base .fr')).toHaveText('Joyshunos');
  await expect(page.locator('#subj button[aria-pressed=true]')).toHaveText('Aksonometriya');
  expect(errs).toEqual([]);
});

test('A3: issiqlik oroli (MODIS, beta) va quyosh/soya xaritada', async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = [];
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const id of ['issiqlik', 'quyosh']) await page.locator(`[data-layer=${id}] .switch`).click();
  await expect(page.locator('[data-card=issiqlik] .big')).toHaveText(/°C/, { timeout: 30_000 });
  await expect(page.locator('[data-card=issiqlik] .chip.beta')).toBeVisible();
  await expect(page.locator('[data-card=issiqlik] .sub')).toContainText('8 kunlik kompozit');
  await expect(page.locator('[data-card=quyosh] .big')).toHaveText(/soat$/, { timeout: 60_000 });
  // kun: 22 mart — SanQvaN meʼyori satri chiqadi; soat stepper
  await page.locator('[data-card=quyosh] .seg button', { hasText: '22 mart' }).click();
  await expect(page.locator('[data-card=quyosh] .sub')).toContainText('SanQvaN 0331-16', { timeout: 60_000 });
  const h0 = await page.locator('#sunHour').textContent();
  await page.locator('[data-card=quyosh] .joy-step button').last().click();
  await expect(page.locator('#sunHour')).not.toHaveText(h0!);
  await expect(page.locator('.joy-legend')).toContainText('Quyoshli soatlar');
  await expect(page.locator('.joy-legend')).toContainText('Yer yuzasi harorati');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/joy-a3.png' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/joy-a3-dark.png' });
  expect(errs).toEqual([]);
});

test('C: joy pasporti hisoboti — SVG (qatlamli), PDF va Chizmadonga', async ({ page, context }) => {
  test.setTimeout(180_000);
  const errs: string[] = [];
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-layer=piyoda] .switch').click();
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/obyekt/, { timeout: 30_000 });
  await expect(page.locator('[data-card=piyoda] .big')).toHaveText(/ga · 15/, { timeout: 30_000 });
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—', { timeout: 30_000 });
  await page.waitForTimeout(7500);   // sinovda fon plitkalari yoʻq — oddiy fon bilan davom etadi
  const dl = page.waitForEvent('download');
  await page.locator('#repSvg').click();
  const d = await dl; expect(d.suggestedFilename()).toMatch(/^joy-pasporti-.*\.svg$/);
  const svg = readFileSync((await d.path())!, 'utf8');
  for (const s of ['inkscape:label="01 Xarita"', 'inkscape:label="03 Pasport"', 'inkscape:label="09 Shtamp"', '<image', 'Xizmatlar', 'Piyoda yetish', 'Joy pasporti'.toUpperCase(), 'ShNQ 2.07.01-23']) expect(svg).toContain(s);
  const v = await context.newPage(); await v.setViewportSize({ width: 1588, height: 1123 });
  await v.setContent(`<body style="margin:0;background:#888">${svg.replace(/width="420mm" height="297mm"/, 'width="1588" height="1123"')}</body>`);
  await v.screenshot({ path: 'test-results/joy-c-sheet.png' }); await v.close();
  // PDF
  const dp = page.waitForEvent('download', { timeout: 60_000 });
  await page.locator('#repPdf').click();
  expect((await dp).suggestedFilename()).toMatch(/\.pdf$/);
  // Chizmadonga
  await page.locator('#repChz').click();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 30_000 });
  await expect(page.locator('.gx.ch')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/joy-c-chz.png' });
  expect(errs).toEqual([]);
});
