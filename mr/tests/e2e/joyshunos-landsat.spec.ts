import { test, expect, type Page, joyClick } from './fx';
import { deflateSync } from 'node:zlib';

/** Issiqlik oroli: Toshkentda Landsat (100 m, lst-data branchi), qamrovdan tashqarida yoki xatoda — MODIS (GIBS).
 *  Tarmoq soxtalashtiriladi: Landsat indeksi va toʻri sunʼiy (gʻarbi (markaz) 40 °C, 69,3° dan sharqi 44 °C), GIBS — bir rangli plitka. */
const IX = { hudud: 'toshkent', bbox: [69.1, 41.15, 69.5, 41.45], nx: 400, ny: 300, qadam: 0.001, piksel_m: 100, yillar: { '2025': { fayl: 'toshkent_2025.bin', N: 21, sahna: 42, qamrov: 1 } } };
function bin(): Buffer {
  const b = Buffer.alloc(IX.nx * IX.ny * 2);
  for (let r = 0; r < IX.ny; r++) for (let c = 0; c < IX.nx; c++) b.writeUInt16LE(Math.round(((c < 200 ? 40 : 44) + 50) * 100), (r * IX.nx + c) * 2);
  return b;
}
const CMAP = '<ColorMaps><ColorMap><Entries><ColorMapEntry rgb="255,127,0" transparent="false" value="[324.80,325.40)"/></Entries></ColorMap></ColorMaps>';
/** Bir rangli 8×8 PNG (255,127,0) — GIBS plitkasi oʻrnida */
function png(): Buffer {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t: string, d: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
  const W = 8, hdr = Buffer.alloc(13); hdr.writeUInt32BE(W, 0); hdr.writeUInt32BE(W, 4); hdr[8] = 8; hdr[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) raw.set([255, 127, 0, 255], y * (W * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PNG = png();

async function open(page: Page, errs: string[], landsat: boolean): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|AJAXError|Failed to load|AbortError/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  await page.route(/fonts\.g|openfreemap|arcgis|elevation-tiles-prod|overpass|kumi\.systems|mail\.ru|private\.coffee/, r => r.abort());
  await page.route(/nominatim\.openstreetmap\.org/, r => r.fulfill({ contentType: 'application/json', body: r.request().url().includes('reverse') ? JSON.stringify({ address: { road: 'Amir Temur shoh koʻchasi', house_number: '21' } }) : '[]' }));
  await page.route(/gibs\.earthdata\.nasa\.gov/, r => r.request().url().endsWith('.xml') ? r.fulfill({ contentType: 'text/xml', body: CMAP }) : r.fulfill({ contentType: 'image/png', body: PNG }));
  await page.route(/raw\.githubusercontent\.com\/.*\/lst-data\//, r => !landsat ? r.abort()
    : r.request().url().endsWith('_index.json') ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(IX), headers: { 'access-control-allow-origin': '*' } })
      : r.fulfill({ contentType: 'application/octet-stream', body: bin(), headers: { 'access-control-allow-origin': '*' } }));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./joyshunos.html');
}

test('issiqlik: Toshkentda Landsat 100 m', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errs: string[] = []; await open(page, errs, true);
  await joyClick(page, 'issiqlik', '.switch');
  const card = page.locator('[data-card=issiqlik]');
  await expect(card.locator('.big')).toHaveText(/°C/, { timeout: 60_000 });
  await expect(card).toContainText('USGS Landsat');
  await expect(card).toContainText('Landsat 8/9');
  await expect(card).toContainText('21');
  await expect(card.locator('.big')).toHaveText(/40,0/);
  if (process.env.GX_SHOTS) { await joyClick(page, 'issiqlik', '.lt'); await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_landsat.png` }); }
  expect(errs).toEqual([]);
});

test('issiqlik: Landsat yoʻq — MODIS ga qaytadi', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  const errs: string[] = []; await open(page, errs, false);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await joyClick(page, 'issiqlik', '.switch');
  const card = page.locator('[data-card=issiqlik]');
  await expect(card.locator('.big')).toHaveText(/°C/, { timeout: 60_000 });
  await expect(card).toContainText('NASA GIBS');
  await expect(card).toContainText('MODIS');
  if (process.env.GX_SHOTS) { await joyClick(page, 'issiqlik', '.lt'); await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_modis_tungi.png` }); }
  expect(errs).toEqual([]);
});
