import { test, expect, type Page, joyRep } from './fx';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

/** 16.11 (egasi, 11 band): albom varaqlari — har qatlam ekrandagi uslubda, silliq rastr, faqat tahlil doirasi ichida,
 *  masofa halqalari, uchastka boʻlsa markaz nuqtasi yoʻq, xizmatlargacha piyoda yoʻl, tugma matnlari tavsifga tushmaydi, albomda koʻrinish tanlanadi.
 *  Tarmoq soxtalashtiriladi: Overpass — 110 m toʻrli sunʼiy shahar (chorrahada umumiy tugun) + diagonal prospekt, relyef — fixtures/terrarium.png. */
const FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const C = [69.2579, 41.2891];
let k = 1;
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
    const el = city2();
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: el }) });
  });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto(`./joyshunos.html?asosiy=1${hash}`);
}



function city2(): unknown[] {
  const kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132, ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx }), el: Record<string, unknown>[] = [];
  const N = 8, S0 = 110;
  for (let i = -N; i <= N; i++) { const line = (f: (t: number) => [number, number], cls: string) => { const g: unknown[] = []; for (let t = -N * 2; t <= N * 2; t++) { const [x, y] = f(t * S0 / 2); g.push(ll(x, y)); } el.push({ type: 'way', id: k++, tags: { highway: cls }, geometry: g }); };
    line(t => [i * S0, t], i % 4 === 0 ? 'secondary' : 'residential'); line(t => [t, i * S0], i % 4 === 0 ? 'primary' : 'residential'); }
  // diagonal prospekt
  { const g: unknown[] = []; for (let t = -12; t <= 12; t++) g.push(ll(t * S0, t * S0)); el.push({ type: 'way', id: k++, tags: { highway: 'primary' }, geometry: g }); }
  let sd = 3; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) {
    const x0 = i * S0, y0 = j * S0; if (Math.abs(x0 - y0) < S0 * 0.9 && rnd() < 0.5) continue;
    if (i === 1 && j === -2) { el.push({ type: 'way', id: k++, tags: { leisure: 'park' }, geometry: [ll(x0 + 10, y0 + 10), ll(x0 + 100, y0 + 10), ll(x0 + 100, y0 + 100), ll(x0 + 10, y0 + 100), ll(x0 + 10, y0 + 10)] }); continue; }
    const nb = 1 + Math.floor(rnd() * 3);
    for (let b = 0; b < nb; b++) { const w = 18 + rnd() * 50, h = 12 + rnd() * 30, x = x0 + 12 + rnd() * (S0 - 24 - w), y = y0 + 12 + rnd() * (S0 - 24 - h), lv = String(1 + Math.floor(rnd() * 12));
      el.push({ type: 'way', id: k++, tags: { building: 'apartments', 'building:levels': lv }, geometry: [ll(x, y), ll(x + w, y), ll(x + w, y + h), ll(x, y + h), ll(x, y)] }); }
  }
  const kinds: Record<string, string>[] = [{ amenity: 'school' }, { amenity: 'kindergarten' }, { amenity: 'clinic' }, { amenity: 'pharmacy' }, { shop: 'supermarket' }, { leisure: 'sports_centre' }, { highway: 'bus_stop' }, { amenity: 'cafe' }];
  for (let q = 0; q < 60; q++) el.push({ type: 'node', id: k++, ...ll((rnd() - 0.5) * 1700, (rnd() - 0.5) * 1700), tags: kinds[q % kinds.length] });
  return el;
}

const NARX = join(process.cwd(), 'tests/e2e/fixtures/narx_hex.json');
test('albom varaqlari: uslub tanlovi, doira, halqalar, piyoda yoʻli, toza tavsif', async ({ page }) => {
  test.setTimeout(300_000);
  const errs: string[] = [];
  await page.addInitScript(([c]) => { try { if (!sessionStorage.getItem('joyInit2')) { sessionStorage.setItem('joyInit2', '1'); sessionStorage.setItem('joyInit', '1'); localStorage.setItem('mr-lang', 'uz'); localStorage.removeItem('joy-albom'); const kx = 111320 * Math.cos(c[1] * Math.PI / 180), ky = 111132, g = (x: number, y: number) => [c[0] + x / kx, c[1] + y / ky];
    localStorage.setItem('joy-state', JSON.stringify({ c, r: 500, on: ['shamol', 'shovqin', 'quyosh', 'xizmat', 'piyoda', 'izovist', 'oqim'], cat: 'cafe', base: 'stil', site: [g(-160, 40), g(-60, 140), g(-10, 0), g(-120, -150)] })); } } catch { /* */ } }, [C]);
  await page.route(/raw\.githubusercontent\.com\/.*toshkent_hex\.json/, r => r.fulfill({ path: NARX, contentType: 'application/json' }));
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const id of ['xizmat', 'oqim', 'shovqin', 'izovist']) await expect(page.locator(`[data-card=${id}] .big`)).not.toHaveText(/^(—|…)?$/, { timeout: 90_000 });
  await expect(page.locator('[data-card=piyoda] .big')).toHaveText(/ga/, { timeout: 90_000 });
  await expect(page.locator('[data-card=quyosh] .big')).toHaveText(/soat/, { timeout: 90_000 });
  await joyRep(page, 'albOpen');
  await page.locator('#albDlg [data-k=albom]').click();
  // har qatlam uchun koʻrinish tanlovi; piyoda — sukut boʻyicha «Har koʻcha daqiqasi»
  await expect(page.locator('#albSt [data-l=piyoda]')).toBeVisible();
  await expect(page.locator('#albSt [data-l=izovist] select, #albSt [data-l=izovist] .seg')).toHaveCount(0);   // izovist — faqat yoqish/oʻchirish
  // bitta boʻlimdan ikki uslub (shamol: Tezlik + Oqim chiziqlari), boshqasi oʻchiq (odamlar oqimi)
  await page.locator('#albSt [data-l=shamol] [data-st=oqim]').click();
  await expect(page.locator('#albSt [data-l=shamol] [data-st=oqim]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#albSt [data-on=oqim]').click();
  if (process.env.ALB_DUMP) await page.screenshot({ path: `${process.env.ALB_DUMP}/dlg.png` });
  await expect(page.locator('#albSt [data-on=oqim]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#albSt [data-l=piyoda] select[data-ax="1"]')).toHaveValue('daqiqa');
  await page.evaluate(() => { (window as unknown as { __joyAlb: unknown }).__joyAlb = 1; });
  const dl = page.waitForEvent('download', { timeout: 240_000 });
  await page.locator('#albPdf').click();
  await dl;
  const pages = await page.evaluate(() => ((window as unknown as { __joyAlb: { name: string; svg: string }[] }).__joyAlb).map(p => ({ name: p.name, svg: p.svg })));
  const pg = (re: RegExp) => pages.find(p => re.test(p.name))!.svg;
  expect(pages.length).toBeGreaterThanOrEqual(6);
  expect(pages.filter(p => /Shamol/.test(p.name)).length).toBe(2);
  expect(pages.some(p => /Odamlar oqimi/.test(p.name))).toBe(false);
  for (const p of pages) {
    expect(p.svg, p.name).not.toMatch(/Koʻrish radiusi|Marshrutni chiz|bosing|>Yil\d/);   // tugma va tanlov matnlari tavsifga tushmaydi
    expect(p.svg, p.name).not.toMatch(/<circle[^>]*fill="#c0643a"/);                    // uchastka bor — markaz nuqtasi yoʻq
    expect(p.svg, p.name).toContain('>250 m<');                                         // masofa halqalari
    expect(p.svg, p.name).toMatch(/clip-path="url\(#rc\d+\)"/);                          // tahlil faqat doira ichida
  }
  expect(pg(/Xizmatlar/)).toMatch(/stroke-width="0\.55"/);                                // eng yaqin obyektgacha piyoda yoʻli
  expect(pg(/Piyoda/)).toContain('≥ 15 daq');
  expect(pg(/Shamol/)).toMatch(/<path d="M[^"]*Z" fill="#(16171a|ffffff)"/);              // yoʻnalish strelkasi uchi
  expect((pg(/Shamol/).match(/stroke="#ffffff"/g) ?? []).length).toBeGreaterThan(5);          // «Tezlik»: maydon ustida oq oqim izlari
  if (process.env.ALB_DUMP) { const fs = await import('node:fs'); pages.forEach((p, i) => fs.writeFileSync(`${process.env.ALB_DUMP}/p${String(i).padStart(2, '0')}.svg`, p.svg)); }
  expect((pg(/Shovqin/).match(/data:image\/png;base64,/g) ?? []).length).toBe(1);        // rasm bir marta (href takrorlanmaydi)
  expect(errs).toEqual([]);
});
