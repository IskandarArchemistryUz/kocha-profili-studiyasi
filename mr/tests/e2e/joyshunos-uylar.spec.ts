import { test, expect, type Page, joyClick } from './fx';
import { gzipSync } from 'node:zlib';

/** Uylar va aholi (13.11, egasi: «qolganlarga 50 m, menga cheksiz»): kadastr agregati — 50 m toʻr, ochiq tarmoq.
 *  Tarmoq soxtalashtiriladi: Toshkent markazi atrofida har katakda 25 kishi (100 kishi/ga), markaziy katakda 1 ta 1962 yilgi gʻisht uy. */
const DX = 0.0006, DY = 0.00045, NX = 600, NY = 578, W = 69.12, N = 41.42;
const IX = { bbox: [W, N - NY * DY, W + NX * DX, N], qadam: [DX, DY], nx: NX, ny: NY, sana: '2026-11-13' };
function bin(): Buffer {
  const n = NX * NY, a = new Uint16Array(4 * n); a.fill(25, 0, n);
  const c = [69.2797, 41.3111], i = Math.floor((c[0] - W) / DX), j = Math.floor((N - c[1]) / DY), o = j * NX + i;
  a[n + o] = 1; a[2 * n + o] = 1962; a[3 * n + o] = (4 << 8) | 5;
  return gzipSync(Buffer.from(a.buffer));
}
const BIN = bin();

async function open(page: Page, errs: string[]): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|AJAXError|Failed to load|AbortError/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  await page.route(/fonts\.g|openfreemap|arcgis|elevation-tiles-prod|overpass|kumi\.systems|mail\.ru|private\.coffee|lst-data|gibs/, r => r.abort());
  await page.route(/nominatim\.openstreetmap\.org/, r => r.fulfill({ contentType: 'application/json', body: r.request().url().includes('reverse') ? JSON.stringify({ address: { road: 'Amir Temur shoh koʻchasi', house_number: '21' } }) : '[]' }));
  await page.route(/raw\.githubusercontent\.com\/.*\/kadastr-agregat\//, r => r.request().url().endsWith('.json')
    ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(IX), headers: { 'access-control-allow-origin': '*' } })
    : r.fulfill({ contentType: 'application/octet-stream', body: BIN, headers: { 'access-control-allow-origin': '*' } }));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./joyshunos.html');
}

test('uylar va aholi: 50 m kadastr agregati, uch uslub, doira ichida', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const errs: string[] = []; await open(page, errs);
  await joyClick(page, 'uylar', '.switch');
  const card = page.locator('[data-card=uylar]');
  await expect(card.locator('.big')).toHaveText(/kishi/, { timeout: 60_000 });
  await expect(card).toContainText(/(99|100) kishi\/ga/);                // 25 kishi / ~0,25 ga
  await expect(card).toContainText('koʻp kvartirali uylar 1 ta');
  await expect(card).toContainText('50 m katakka umumlashtirilgan');
  await expect(page.locator('.joy-legend')).toContainText('Aholi zichligi, kishi/ga (50 m)');
  // rasm faqat doira ichida (standart 500 m)
  const r = await page.evaluate(async () => {
    const m = (window as unknown as { joyMap: { getSource: (id: string) => { coordinates: [number, number][]; url: string } } }).joyMap;
    for (let i = 0; i < 100; i++) { const s = m.getSource('joy-kad'); if (s?.coordinates && s.coordinates[0][0] > 1) break; await new Promise(f => setTimeout(f, 200)); }
    const s = m.getSource('joy-kad'), c = s.coordinates, lat = (c[0][1] + c[2][1]) / 2, w = (c[1][0] - c[0][0]) * 111_320 * Math.cos(lat * Math.PI / 180);
    const im = new Image(); im.src = s.url; await im.decode();
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const cx = cv.getContext('2d')!; cx.drawImage(im, 0, 0);
    const a = (x: number, y: number) => cx.getImageData(x, y, 1, 1).data[3], W2 = im.width;
    return { w, corner: Math.max(a(1, 1), a(W2 - 2, W2 - 2)), mid: a(W2 >> 1, W2 >> 1) };
  });
  expect(r.w).toBeGreaterThan(900); expect(r.w).toBeLessThan(1100); expect(r.corner).toBe(0); expect(r.mid).toBeGreaterThan(0);
  // uslublar: uylar yoshi, seysmik
  const jv = card.locator('.jv-btn'); if ((await jv.getAttribute('aria-expanded')) !== 'true') await jv.click();
  await page.locator('.jv-st button', { hasText: 'Uylar yoshi' }).click();
  await expect(card).toContainText('qurilgan yili medianasi 1962');
  await expect(page.locator('.joy-legend')).toContainText('1966 gacha');
  await page.locator('.jv-st button', { hasText: 'Seysmik eʼtibor' }).click();
  await expect(card).toContainText('A · 1966 gacha');
  await expect(card).toContainText('ekspertiza emas');
  expect(errs).toEqual([]);
});
