import { test, expect, type Page, joyClick } from './fx';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

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



/** Markazni koʻchirib qayta yuklash: holat ilova skriptlaridan OLDIN yoziladi — ilova kechikkan save() bilan eski markazni qaytarib yozolmaydi (13.11, CI poygasi) */
async function moveTo(page: Page, c: [number, number]): Promise<void> {
  await page.addInitScript(cc => { try { if (sessionStorage.getItem('joyMove') !== cc.join()) { sessionStorage.setItem('joyMove', cc.join()); const s = JSON.parse(localStorage.getItem('joy-state') || '{}'); s.c = cc; s.on ??= ['relyef', 'shamol', 'xizmat', 'raqobat']; localStorage.setItem('joy-state', JSON.stringify(s)); } } catch { /* */ } }, c);
  await page.reload();
}
/** Uy narxlari (28.10): uybor.uz eʼlonlari → soti (olti burchakli katak) boʻyicha median $/m²; kam eʼlonli katak — narxsiz (oq) */
const NARX = join(process.cwd(), 'tests/e2e/fixtures/narx_hex.json');
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`uy narxlari — soti · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  await page.route(/raw\.githubusercontent\.com\/.*toshkent_hex\.json/, r => r.fulfill({ path: NARX, contentType: 'application/json' }));
  await open(page, errs);
  await page.setViewportSize({ width: w, height: 900 });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await joyClick(page, 'narx', '.switch');
  const card = page.locator('[data-card=narx]');
  await expect(card).toBeVisible();
  await expect(card.locator('.sub')).toContainText('5 tadan kam', { timeout: 20_000 });   // Amir Temur — kam eʼlon
  await expect(page.locator('.joy-legend')).toContainText('Uy narxi, $/m²');
  await expect(page.locator('.joy-legend')).toContainText('maʼlumot yetarli emas');
  // narxli katak (Yunusobod janubi): median va oraliq
  await moveTo(page, [69.29507, 41.32561]);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(card.locator('.big')).toHaveText(/2.?832 \$\/m²/, { timeout: 20_000 });
  await expect(card.locator('.sub')).toContainText('64 ta eʼlon');
  await expect(card.locator('.sub')).toContainText('Toshkent medianasi');
  await joyClick(page, 'narx', '.switch'); await joyClick(page, 'narx', '.switch');   // qayta yoqilganda — shahar masshtabi
  await expect(card.locator('.big')).toHaveText(/\$\/m²/, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/joy-narx-${w}${dark ? '-tungi' : ''}.png` });
  expect(errs).toEqual([]);
});

/** 12.11: «Koʻrinish» — bitim (sotuv / ijara), turi, bozor (yangi bino / ikkilamchi). Ijara — $/m² oyiga; faylda yoʻq kategoriya — «Maʼlumot yoʻq» */
test('uy narxlari — ijara va yangi / ikkilamchi tanlovi', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  const d = JSON.parse(readFileSync(NARX, 'utf8')) as { kat: Record<string, Record<string, number[][]>>; shahar: Record<string, number[]> };
  const scale = (cs: number[][], f: number) => cs.map(c => (c[2] > 0 ? [c[0], c[1], c[2], ...c.slice(3).map(x => Math.round(x * f * 10) / 10)] : c));
  d.kat.ijara_kvartira = Object.fromEntries(Object.entries(d.kat.kvartira).map(([w, cs]) => [w, scale(cs, 1 / 160)]));
  d.kat.kvartira_yangi = Object.fromEntries(Object.entries(d.kat.kvartira).map(([w, cs]) => [w, scale(cs, 1.1)]));
  d.shahar.ijara_kvartira = [1900, 11.7, 9.9, 14.3];
  await page.route(/raw\.githubusercontent\.com\/.*toshkent_hex\.json/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(d) }));
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  await joyClick(page, 'narx', '.switch');
  const card = page.locator('[data-card=narx]');
  await expect(card.locator('.sub')).toContainText('5 tadan kam', { timeout: 20_000 });
  await moveTo(page, [69.29507, 41.32561]);
  await expect(card.locator('.big')).toHaveText(/2.?832 \$\/m²$/, { timeout: 20_000 });
  if ((await page.locator('.jv-btn').getAttribute('aria-expanded')) !== 'true') await page.locator('.jv-btn').click();
  const ax = (i: number, t: string) => page.locator(`.jv-st[data-axis="${i}"] button`, { hasText: t });
  await expect(ax(0, 'Sotuv')).toHaveAttribute('aria-pressed', 'true');
  // ijara: oyiga, kasr bilan
  await ax(0, 'Ijara').click();
  await expect(card.locator('.big')).toHaveText(/17,7 \$\/m²·oy/, { timeout: 10_000 });
  await expect(card.locator('.sub')).toContainText('$/m²·oy');
  await expect(card.locator('.sub')).toContainText('11,7');
  await expect(page.locator('.joy-legend')).toContainText('Ijara, $/m²·oy');
  // ijara + yangi bino — bu faylda yoʻq
  await ax(2, 'Yangi bino').click();
  await expect(card.locator('.big')).toHaveText('—');
  await expect(card.locator('.sub')).toContainText('Maʼlumot yoʻq');
  // sotuv + yangi bino
  await ax(0, 'Sotuv').click();
  await expect(card.locator('.big')).toHaveText(/3.?115 \$\/m²$/, { timeout: 10_000 });
  // tanlov saqlanadi
  await page.reload();
  await expect(card.locator('.big')).toHaveText(/3.?115 \$\/m²$/, { timeout: 20_000 });
  expect(errs).toEqual([]);
});

/** 13.11: Toshkentdan tashqarida — «Uy narxlari» oʻchiq, «Faqat Toshkent» belgisi; Toshkentga qaytganda yana yoqiladi */
test('faqat Toshkent qatlamlari qamrovdan tashqarida', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  await page.route(/raw\.githubusercontent\.com\/.*toshkent_hex\.json/, r => r.fulfill({ path: NARX, contentType: 'application/json' }));
  await open(page, errs);
  await joyClick(page, 'narx', '.switch');
  await expect(page.locator('[data-card=narx]')).toBeVisible();
  await moveTo(page, [66.9597, 39.6542]);   // Samarqand
  await expect(page.locator('[data-layer=narx] em.soon')).toHaveText('Faqat Toshkent');
  await expect(page.locator('[data-layer=narx] .switch')).toHaveCount(0);
  await expect(page.locator('[data-card=narx]')).toHaveCount(0);
  await expect(page.locator('[data-layer=xizmat] .switch')).toHaveCount(1);
  await moveTo(page, [69.29507, 41.32561]);
  await expect(page.locator('[data-layer=narx] .switch')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-card=narx] .big')).toHaveText(/\$\/m²/, { timeout: 20_000 });
  expect(errs).toEqual([]);
});

/** 13.11: Toshkentdan tashqarida «Uylar va aholi» — global GHS-POP (COG, HTTP Range); sinovda — sunʼiy 2×2 plitkali TIFF */
function ghsTiff(c: [number, number]): Buffer {
  const px = 3 / 3600, W = 1024, T = 512, ox = c[0] - 512 * px, oy = c[1] + 512 * px, tiles: Buffer[] = [];
  for (let k = 0; k < 4; k++) { const b = Buffer.alloc(T * T * 8); for (let p = 0; p < T * T; p++) b.writeDoubleLE(p % 7 === 0 ? 0 : 30 + (p % 50), p * 8); tiles.push(deflateSync(b)); }
  const tags: [number, number, number[]][] = [[256, 3, [W]], [257, 3, [W]], [258, 3, [64]], [259, 3, [8]], [322, 3, [T]], [323, 3, [T]], [324, 4, [0, 0, 0, 0]], [325, 4, tiles.map(t => t.length)], [339, 3, [3]], [33550, 12, [px, px, 0]], [33922, 12, [0, 0, 0, ox, oy, 0]]];
  const head = Buffer.alloc(8 + 2 + tags.length * 12 + 4 + 16 + 16 + 24 + 48); head.writeUInt16LE(0x4949, 0); head.writeUInt16LE(42, 2); head.writeUInt32LE(8, 4); head.writeUInt16LE(tags.length, 8);
  let ext = 8 + 2 + tags.length * 12 + 4; const tileOff: number[] = []; let o = head.length; for (const t of tiles) { tileOff.push(o); o += t.length; }
  tags.forEach(([tag, typ, v], k) => {
    const e = 10 + k * 12, vals = tag === 324 ? tileOff : v, s = typ === 3 ? 2 : typ === 4 ? 4 : 8; head.writeUInt16LE(tag, e); head.writeUInt16LE(typ, e + 2); head.writeUInt32LE(vals.length, e + 4);
    const put = (at: number) => vals.forEach((x, i) => typ === 3 ? head.writeUInt16LE(x, at + i * s) : typ === 4 ? head.writeUInt32LE(x, at + i * s) : head.writeDoubleLE(x, at + i * s));
    if (s * vals.length <= 4) put(e + 8); else { head.writeUInt32LE(ext, e + 8); put(ext); ext += s * vals.length; }
  });
  return Buffer.concat([head, ...tiles]);
}
test('aholi zichligi Toshkentdan tashqarida — GHS-POP', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [], SAM: [number, number] = [66.9597, 39.6542], tif = ghsTiff(SAM); let full = 0;
  await page.route(/jrc-ghsl\.s3/, r => { const m = /bytes=(\d+)-(\d+)/.exec(r.request().headers().range ?? ''); if (!m) { full++; return r.fulfill({ status: 200, body: tif }); } const a = +m[1], b = Math.min(+m[2], tif.length - 1); return r.fulfill({ status: 206, headers: { 'content-range': `bytes ${a}-${b}/${tif.length}`, 'access-control-allow-origin': '*' }, body: tif.subarray(a, b + 1) }); });
  await open(page, errs);
  await moveTo(page, SAM);
  await expect(page.locator('[data-layer=uylar] .switch')).toHaveCount(1);
  await joyClick(page, 'uylar', '.switch');
  const card = page.locator('[data-card=uylar]');
  await expect(card.locator('.big')).toHaveText(/kishi/, { timeout: 30_000 });
  await expect(card.locator('.sub')).toContainText('GHS-POP');
  await expect(card.locator('.sub')).toContainText(/Zichlik \d+ kishi\/ga/);
  await expect(page.locator('.joy-legend')).toContainText('GHS-POP, 90 m');
  await expect.poll(() => page.evaluate(() => (window as any).joyMap.getLayoutProperty('joy-kad', 'visibility'))).toBe('visible');
  await expect(page.locator('[data-layer=narx] em.soon')).toHaveText('Faqat Toshkent');
  expect(full).toBe(0);
  expect(errs).toEqual([]);
});

/** 13.11 (kanvas 7b): uy narxi — tungi plakat: toʻq kataklar, oltin chaqiriqlar (median, shahar medianasidan farq, eʼlonlar) */
test('uy narxi — tungi plakat', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  await page.route(/raw\.githubusercontent\.com\/.*toshkent_hex\.json/, r => r.fulfill({ path: NARX, contentType: 'application/json' }));
  await open(page, errs);
  await moveTo(page, [69.29507, 41.32561]);
  await joyClick(page, 'narx', '.switch');
  await expect(page.locator('[data-card=narx] .big')).toHaveText(/\$\/m²/, { timeout: 20_000 });
  if ((await page.locator('.jv-btn').getAttribute('aria-expanded')) !== 'true') await page.locator('.jv-btn').click();
  await page.locator('.jv-st[data-axis="3"] button', { hasText: 'Tungi plakat' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).joyMap.getLayoutProperty('joy-narx-t', 'visibility'))).toBe('visible');
  await expect.poll(() => page.evaluate(() => ((window as any).joyMap.getSource('joy-narx-t')._data?.features ?? []).map((f: any) => f.properties.t).join(' / '))).toMatch(/\$\/m²\n[+−]\d+ % · \d+ eʼlon/);
  expect(await page.evaluate(() => (window as any).joyMap.getPaintProperty('joy-narx-f', 'fill-color'))).toEqual(['get', 'ncol']);
  if (process.env.SHOT) { await page.waitForTimeout(1500); await page.screenshot({ path: process.env.SHOT }); }
  await page.locator('.jv-st[data-axis="3"] button', { hasText: 'Kataklar' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).joyMap.getLayoutProperty('joy-narx-t', 'visibility'))).toBe('none');
  expect(errs).toEqual([]);
});
