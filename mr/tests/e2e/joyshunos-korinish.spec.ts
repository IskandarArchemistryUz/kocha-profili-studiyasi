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


/** Qatlam koʻrinishi (27.10): faqat faol kartada yigʻiq «Koʻrinish»; uslub, intensivlik, rang shkalasi; xaritada izochiziqlar va strelkalar. */
const openView = async (page: Page) => { await expect(page.locator('.jv-btn')).toHaveCount(1); if ((await page.locator('.jv-btn').getAttribute('aria-expanded')) !== 'true') await page.locator('.jv-btn').click(); await expect(page.locator('.jv-body')).toHaveCount(1); };
const vis = (page: Page, id: string) => page.evaluate(i => { const m = (window as any).joyMap; return m?.getLayoutProperty && m.getLayer(i) ? m.getLayoutProperty(i, 'visibility') : null; }, id);
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qatlam koʻrinishi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; await open(page, errs);
  await page.setViewportSize({ width: w, height: 900 });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('[data-card=relyef] .big')).toHaveText(/m/, { timeout: 30_000 });
  await joyClick(page, 'relyef', '.lt');
  await expect(page.locator('.jv-btn')).toHaveCount(1);
  // 27.10 (prototip): «Koʻrinish» sukut boʻyicha ochiq; yopilsa — eslab qolinadi
  await expect(page.locator('.jv-body')).toHaveCount(1);
  await page.locator('.jv-btn').click(); await expect(page.locator('.jv-body')).toHaveCount(0);
  await page.locator('.jv-btn').click(); await expect(page.locator('.jv-body')).toHaveCount(1);
  await expect(page.locator('.jv-st button', { hasText: 'Topo chiziqlar' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => vis(page, 'joy-topo')).toBe('visible');
  await page.locator('.jv-st button', { hasText: 'Faqat soya' }).click();
  await expect.poll(() => vis(page, 'joy-topo')).toBe('none');
  await page.locator('.jv-st button', { hasText: 'Gipsometriya' }).click();
  await expect.poll(() => vis(page, 'joy-gips')).toBe('visible');
  await page.locator('.jv-st button', { hasText: 'Faqat soya' }).click();
  await expect.poll(() => vis(page, 'joy-gips')).toBe('none');
  const sl = page.locator('.jv-sl'); await sl.focus(); await page.keyboard.press('ArrowRight');
  await expect(sl).toHaveAttribute('aria-valuenow', '65');
  // nishab — relyef kartasida
  await joyClick(page, 'nishab', '.switch');
  await page.locator('.jv-st button', { hasText: 'Strelkalar bilan' }).click();
  await expect.poll(() => vis(page, 'joy-arr')).toBe('visible');
  // shovqin — konturlar va rang shkalasi
  await joyClick(page, 'shovqin', '.switch');
  await expect(page.locator('[data-card=shovqin] .big')).toHaveText(/dB/, { timeout: 30_000 });
  await page.locator('.jv-st button', { hasText: 'Konturlar' }).click();
  await expect.poll(() => vis(page, 'joy-iso')).toBe('visible');
  await page.locator('.jv-pal').nth(1).click();
  await expect(page.locator('.jv-pal').nth(1)).toHaveAttribute('aria-pressed', 'true');
  // saqlanadi
  await page.reload();
  await expect(page.locator('[data-card=shovqin] .big')).toHaveText(/dB/, { timeout: 30_000 });
  await expect.poll(() => vis(page, 'joy-iso')).toBe('visible');
  expect(errs).toEqual([]);
});
test('shamol oqim chiziqlari planda', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—', { timeout: 30_000 });
  await joyClick(page, 'shamol', '.lt');
  await expect.poll(() => page.evaluate(() => (window as any).joyMap.getSource('joy-wind')?._data?.features?.length ?? 0), { timeout: 60_000 }).toBeGreaterThan(20);
  await expect.poll(() => vis(page, 'joy-wind')).toBe('visible');
  await openView(page);
  await page.locator('.jv-st button', { hasText: 'Faqat shamol guli' }).click();
  await expect.poll(() => vis(page, 'joy-wind')).toBe('none');
  expect(errs).toEqual([]);
});
test('xizmatlar ikonka rejimi', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/obyekt/, { timeout: 30_000 });
  await joyClick(page, 'xizmat', '.lt');
  await expect.poll(() => vis(page, 'joy-poi-i')).toBe('visible');
  await openView(page);
  await page.locator('.jv-st button', { hasText: 'Nuqtalar' }).click();
  await expect.poll(() => vis(page, 'joy-poi-i')).toBe('none');
  if (process.env.SHOT) { await page.locator('.jv-st button', { hasText: 'Ikonkalar' }).click(); await page.waitForTimeout(800); await page.screenshot({ path: process.env.SHOT }); }
  expect(errs).toEqual([]);
});
test('piyoda: persona boʻyicha yetish', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/obyekt/, { timeout: 30_000 });
  await joyClick(page, 'piyoda', '.switch');
  await expect(page.locator('[data-card=piyoda] .big')).toHaveText(/ga · 15 daqiqa/, { timeout: 30_000 });
  const sub = page.locator('[data-card=piyoda] .sub'), ten = async () => parseFloat(/10 daqiqa: ([\d,]+) ga/.exec((await sub.textContent())!)![1].replace(',', '.'));
  const a = await ten();
  await openView(page);
  await page.locator('.jv-st button', { hasText: 'Qariya' }).click();
  await expect(page.locator('[data-card=piyoda] .src')).toContainText('qariya', { timeout: 30_000 });
  expect(await ten()).toBeLessThanOrEqual(a);
  await expect(page.locator('[data-card=piyoda] .src')).toContainText('qariya');
  expect(errs).toEqual([]);
});

/** Xarita uslubi (prototip «Joyshunos qatlam uslublari»): yangi palitralar, ranglarni qoʻlda, uchastka uslubi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`xarita uslubi: ranglar va uchastka · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
  const errs: string[] = []; await open(page, errs);
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForFunction(() => { const m = (window as any).joyMap; return !!m?.getLayer?.('joy-site'); }, null, { timeout: 30_000 });
  const paint = (l: string, k: string) => page.evaluate(([l, k]) => { const m = (window as any).joyMap; return m.getLayer(l) ? m.getPaintProperty(l, k) : null; }, [l, k]);
  await page.click('#palBtn');
  await page.click('[data-pal=qum]');
  await expect.poll(() => paint('bg', 'background-color')).toBe('#efe6d6');
  await page.click('#palBtn');
  await page.click('[data-ct=bld]'); await page.click('.joy-sw[data-sw="#c0643a"]');
  await expect.poll(() => paint('bld', 'fill-color')).toBe('#c0643a');
  await page.click('[data-site-st=yashil]');
  await expect.poll(() => paint('joy-site-f', 'fill-color')).toBe('#9fdc7c');
  await page.click('[data-site-st=shtrix]');
  await expect.poll(() => page.evaluate(() => (window as any).joyMap.getLayoutProperty('joy-site-h', 'visibility'))).toBe('visible');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_fon_${w}${dark ? '_dark' : ''}.png` });
  // qayta yuklansa ham saqlanadi
  await page.reload(); await page.waitForFunction(() => !!(window as any).joyMap?.getLayer?.('joy-site'), null, { timeout: 30_000 });
  await expect.poll(() => paint('bld', 'fill-color')).toBe('#c0643a');
  await page.click('#palBtn'); await page.click('#palReset');
  await expect.poll(() => paint('bld', 'fill-color')).toBe('#e3d4bb');
  expect(errs).toEqual([]);
});

/** 2-bosqich: xizmatlar qamrovi, raqobatchilar zichligi */
test('xizmat qamrovi va raqobatchilar zichligi', async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/obyekt/, { timeout: 30_000 });
  await joyClick(page, 'xizmat', '.lt'); await openView(page);
  await page.locator('.jv-st button', { hasText: 'Qamrov radiusi' }).click();
  await expect.poll(() => vis(page, 'joy-cov-f')).toBe('visible');
  await expect.poll(() => page.evaluate(() => ((window as any).joyMap.getSource('joy-cov')._data?.features ?? (window as any).joyMap.getSource('joy-cov').serialize().data.features).length)).toBeGreaterThan(0);
  await joyClick(page, 'raqobat', '.lt'); await openView(page);
  await page.locator('.jv-st button', { hasText: 'Zichlik' }).click();
  await expect.poll(() => vis(page, 'joy-comp-hm')).toBe('visible');
  await expect.poll(() => vis(page, 'joy-cov-f')).toBe('visible');   // boshqa qatlam uslubi saqlanadi
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_qamrov.png` });
  await page.locator('.jv-st button', { hasText: 'Nuqtalar' }).click();
  await expect.poll(() => vis(page, 'joy-comp-hm')).toBe('none');
  expect(errs).toEqual([]);
});

/** Issiqlik oroli — geksagon uslubi */
test('issiqlik: geksagon', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errs: string[] = []; await open(page, errs);
  await joyClick(page, 'issiqlik', '.switch');
  await expect(page.locator('[data-card=issiqlik] .big')).toHaveText(/°C/, { timeout: 60_000 });
  await joyClick(page, 'issiqlik', '.lt'); await openView(page);
  await page.locator('.jv-st button', { hasText: 'Geksagon' }).click();
  await expect(page.locator('.jv-st button', { hasText: 'Geksagon' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => vis(page, 'joy-heat')).toBe('visible');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_geks.png` }); }
  expect(errs).toEqual([]);
});
