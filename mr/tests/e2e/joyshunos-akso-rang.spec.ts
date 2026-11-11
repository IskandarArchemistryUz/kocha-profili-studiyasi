import { test, expect, type Page } from './fx';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
// akso sahnasi: shamol/transport animatsiyasi har kadrni qayta chizadi — dasturiy GPU da sekin; testlar «harakatni kamaytirish» rejimida
test.use({ reducedMotion: 'reduce' });

/** E4a: aksonometriya uslubi «Tungi» va «Ranglar» bloki (asosiy obyekt, tahlil 1/2, atrof). Tarmoq soxtalashtiriladi (shahar-uchastka testidagi kabi). */
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


const SPd = process.env.SHOT_DIR;
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`akso uslubi va ranglar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  const errs: string[] = []; await open(page, errs, '#/axo');
  await page.setViewportSize({ width: w, height: 860 });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(() => page.evaluate(() => { const a = (window as any).joyAxo; return a ? a.groups.get('binolar').children.length : 0; }), { timeout: 90_000 }).toBeGreaterThan(0);
  // uchastka (asosiy obyekt rangi shunda koʻrinadi)
  await page.evaluate(() => { const a = (window as any).joyAxo, c = [69.2797, 41.3111]; a.inp.site = [[c[0] - 0.0011, c[1] - 0.0005], [c[0] + 0.0008, c[1] - 0.0008], [c[0] + 0.0011, c[1] + 0.0006], [c[0] - 0.0007, c[1] + 0.0009]]; a.setData(a.inp); });
  // «Tungi» uslub
  const tungi = page.locator('.joy-sty button[data-sty="tungi"]');
  await expect(tungi).toContainText('Tungi');
  await tungi.click();
  await expect(tungi).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => { const a = (window as any).joyAxo; return a.inp.style + ':' + a.inp.dark; }), { timeout: 30_000 }).toBe('tungi:true');
  // «Ranglar» — sukut boʻyicha yopiq
  const hd = page.locator('#axCols .hd');
  await expect(hd).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#axCols .grp')).toHaveCount(0);
  await hd.click();
  await expect(page.locator('#axCols .grp')).toHaveCount(4);
  await expect(page.locator('#axColReset')).toBeDisabled();
  // asosiy obyekt → koʻk; tahlil 1 → sariq
  await page.locator('#axCols .grp[data-col="main"] .joy-sw[data-sw="#3a7bd5"]').click();
  await expect(page.locator('#axCols .grp[data-col="main"] .joy-sw[data-sw="#3a7bd5"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#axCols .grp[data-col="a1"] .joy-sw[data-sw="#f2c94c"]').click();
  await expect(hd).toContainText('2 ta oʻzgartirilgan');
  const siteCol = () => page.evaluate(() => { const a = (window as any).joyAxo, c = [69.2797, 41.3111], s = new Set<string>(); if (!a.inp.site) { a.inp.site = [[c[0] - 0.0011, c[1] - 0.0005], [c[0] + 0.0008, c[1] - 0.0008], [c[0] + 0.0011, c[1] + 0.0006], [c[0] - 0.0007, c[1] + 0.0009]]; a.setData(a.inp); } a.groups.get('relyef').traverse((o: any) => { if (o.parent?.userData.site && o.material?.color) s.add(o.material.color.getHexString()); }); return [...s].join(','); });
  await expect.poll(siteCol, { timeout: 30_000 }).toContain('3a7bd5');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('joy-axo') || '{}').col)).toEqual({ main: '#3a7bd5', a1: '#f2c94c' });
  if (SPd) await page.screenshot({ path: `${SPd}/akso_rang_${w}${dark ? 'd' : 'l'}.png` });
  // uslub ranglariga qaytarish
  await page.locator('#axColReset').click();
  await expect(hd).toContainText('uslub ranglari');
  await expect.poll(siteCol, { timeout: 30_000 }).not.toContain('3a7bd5');
  // boshqa uslubga qaytish
  await page.locator('.joy-sty button[data-sty="albom"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).joyAxo.inp.style), { timeout: 30_000 }).toBe('albom');
  expect(errs).toEqual([]);
});
