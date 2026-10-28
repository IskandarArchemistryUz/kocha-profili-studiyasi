import { test, expect, type Page, joyRep } from './fx';
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


/** Albom, hisobot va plakat (26.10): oyna, uch hujjat turi, PDF yuklanadi; Chizmadonga — barcha varaqlar navbatga tushadi. */
const OUT = process.env.SHOT_DIR;
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`albom oynasi va PDF · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  const errs: string[] = []; await open(page, errs);
  await page.setViewportSize({ width: w, height: 900 });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/\d+ obyekt/, { timeout: 30_000 });
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—', { timeout: 30_000 });
  await joyRep(page, 'albOpen');
  await expect(page.locator('#albDlg')).toBeVisible();
  await expect(page.locator('#albDlg .alb-k')).toHaveCount(3);
  if (OUT) await page.screenshot({ path: `${OUT}/alb_dlg_${w}${dark ? 'd' : 'l'}.png` });
  for (const [k, th] of (dark ? [['albom', 'Qora'], ['plakat', 'Qora']] : [['hisobot', 'Oq']]) as [string, string][]) {
    if (!(await page.locator('#albDlg').isVisible())) await joyRep(page, 'albOpen');
    await page.locator(`#albDlg [data-k=${k}]`).click();
    await page.locator('#albTheme button', { hasText: th }).click();
    const dl = page.waitForEvent('download', { timeout: 120_000 });
    await page.locator('#albPdf').click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(new RegExp(`^joy-${k}-.*\\.pdf$`));
    if (OUT) await d.saveAs(`${OUT}/alb_${k}_${th}.pdf`);
    await expect(page.locator('#repBtn')).toBeEnabled({ timeout: 30_000 });
  }
  // holat tiklandi: yoqilgan qatlamlar oʻzgarmadi
  await expect(page.locator('[data-layer=xizmat] .switch.on, [data-layer=xizmat] .switch[aria-checked=true]')).toHaveCount(1);
  expect(errs).toEqual([]);
});
test('albom → Chizmadonga: barcha varaqlar navbatda', async ({ page }) => {
  test.setTimeout(180_000);
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/\d+ obyekt/, { timeout: 30_000 });
  await page.route('**/*', r => (r.request().isNavigationRequest() && !r.request().url().includes('joyshunos') ? r.fulfill({ contentType: 'text/html', body: '<html><body>chz</body></html>' }) : r.fallback()));
  await joyRep(page, 'albOpen');
  await page.locator('#albDlg [data-k=hisobot]').click();
  await page.locator('#albChz').click();
  await page.waitForURL(/chizmadon/, { timeout: 120_000 });
  const more = await page.evaluate(() => { const v = localStorage.getItem('ks-chz-inbox'); return v ? (JSON.parse(v).more?.length ?? -1) : null; });
  expect(more).toBeGreaterThan(1);
  expect(errs).toEqual([]);
});
