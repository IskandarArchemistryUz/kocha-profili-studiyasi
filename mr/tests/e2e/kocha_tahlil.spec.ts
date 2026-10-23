import { test, expect, type Page } from './fx';
import { join } from 'node:path';

/** Joyshunos «Koʻcha tahlili» (A → B): sunʼiy shahar — sharq-gʻarb yoʻnalishidagi «Navoiy» koʻchasi, ikki tomonida binolar,
 *  har 100 m da kesishuvchi koʻchalar, daraxtlar, piyoda oʻtish joylari, bekat va doʻkonlar. Overpass soxtalashtiriladi. */
const FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const C = [69.2797, 41.3111], kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132;
const ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx });
let k = 1;
function city(): unknown[] {
  const el: unknown[] = [];
  el.push({ type: 'way', id: 900, tags: { highway: 'tertiary', name: 'Navoiy koʻchasi', lanes: '4' }, geometry: Array.from({ length: 15 }, (_, i) => ll(-700 + i * 100, 0)) });
  for (let i = -6; i <= 6; i++) el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [ll(i * 100, -400), ll(i * 100, 0), ll(i * 100, 400)] });
  for (let x = -690; x < 690; x += 50) for (const sg of [1, -1]) {
    if (x > 150 && x < 400 && sg === 1) continue;   // shimol tomonda boʻsh joy (fasad uzilishi)
    const y0 = sg * 18, y1 = sg * 40, lv = String(3 + ((x / 50) & 3) * 2);
    el.push({ type: 'way', id: k++, tags: { building: 'apartments', 'building:levels': lv }, geometry: [ll(x + 5, y0), ll(x + 45, y0), ll(x + 45, y1), ll(x + 5, y1), ll(x + 5, y0)] });
  }
  for (let x = -600; x < 0; x += 15) for (const sg of [1, -1]) el.push({ type: 'node', id: k++, ...ll(x, sg * 11), tags: { natural: 'tree' } });
  return el;
}
const extras = () => [
  { type: 'node', id: k++, ...ll(-300, 0), tags: { highway: 'crossing' } },
  { type: 'node', id: k++, ...ll(0, 0), tags: { highway: 'traffic_signals', crossing: 'traffic_signals' } },
  { type: 'node', id: k++, ...ll(-150, 9), tags: { highway: 'bus_stop', name: 'Navoiy' } },
  ...Array.from({ length: 8 }, (_, i) => ({ type: 'node', id: k++, ...ll(-500 + i * 40, 20), tags: { shop: 'convenience' } })),
  { type: 'way', id: 900, tags: { highway: 'tertiary', maxspeed: '60' } },
];
async function open(page: Page): Promise<void> {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs|nominatim/, r => r.abort());
  await page.route(/elevation-tiles-prod/, r => r.fulfill({ path: FIX, contentType: 'image/png' }));
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, async r => {
    const body = decodeURIComponent(r.request().postData() || '');
    const el = body.includes('node["shop"]') ? extras() : city();
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: el }) });
  });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('stInit')) { sessionStorage.setItem('stInit', '1'); localStorage.removeItem('joy-state'); localStorage.removeItem('joy-street'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./joyshunos.html');
}
const clickAt = async (page: Page, x: number, y: number) => {
  const p = await page.evaluate(([lon, lat]) => { const m = (window as any).joyMap; const q = m.project([lon, lat]); const r = m.getCanvas().getBoundingClientRect(); return [r.left + q.x, r.top + q.y]; }, [ll(x, y).lon, ll(x, y).lat]);
  await page.mouse.click(p[0], p[1]);
};

test('Koʻcha tahlili: A → B, modullar, lenta, xulosa manbalari, sanoq', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await open(page);
  await page.click('[data-an=kocha]');
  await expect(page.locator('#joyAn [data-an=kocha]')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForFunction(() => !!(window as any).joyMap?.getSource?.('joy-st-line'), null, { timeout: 30_000 });
  await page.evaluate(() => { const m = (window as any).joyMap; m.jumpTo({ center: [69.2797, 41.3111], zoom: 15.3 }); });
  await page.waitForTimeout(400);
  // sukut: koʻchani chizish
  await expect(page.locator('#stMode [data-smode=draw]')).toHaveAttribute('aria-pressed', 'true');
  await clickAt(page, -560, 3);
  await clickAt(page, 0, 2);
  await clickAt(page, 560, -3);
  await expect(page.locator('#stHow')).toContainText('3 nuqta');
  await page.keyboard.press('Enter');
  await expect(page.locator('#stHead .ttl')).toContainText('Navoiy koʻchasi', { timeout: 30_000 });
  await expect(page.locator('#stHead .chip').first()).toContainText('Tuman ahamiyatidagi magistral');
  await expect(page.locator('[data-card=tarmoq] .big')).toHaveText('11 chorraha');
  await expect(page.locator('[data-card=kesim] .big')).toContainText('/ 36');
  await expect(page.locator('[data-card=ramka] .big')).toHaveText(/Ochiq koʻcha|Moʻtadil oʻralgan|Koʻcha «xona»|Tor kanyon/);
  await expect(page.locator('#stSum li')).toHaveCount(6);
  await expect(page.locator('#stSec svg')).toBeVisible();
  await expect(page.locator('#stSec')).toContainText('binodan binogacha');
  await expect(page.locator('[data-card=soya] .big')).toContainText('soyada');
  await expect(page.locator('[data-card=xavf] .big')).toContainText('2 ta oʻtish joyi');
  await expect(page.locator('[data-card=xavf] .sub')).toContainText('12-band');
  await expect(page.locator('[data-card=faol] .big')).not.toHaveText('—');
  await expect(page.locator('#stFind li').first()).toBeVisible();
  expect(await page.locator('#stFind li em').allTextContents()).not.toContain('');
  // lenta
  await expect(page.locator('#joyStrip')).toBeVisible();
  expect(await page.locator('#joyStrip svg [data-i]').count()).toBeGreaterThan(40);
  // lentada ustiga olib borish — maslahat va kesim yangilanadi
  const box = (await page.locator('#joyStrip svg [data-i="5"] .hit').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await expect(page.locator('#stTip')).toContainText('100–120 m');
  await expect(page.locator('#stSecT')).toContainText('100–120 m');
  // xaritada koʻrsatkich almashinadi
  await page.click('[data-metric=soya]');
  await expect(page.locator('#joyLegend')).toContainText('14:00');
  // qoʻlda sanoq
  await page.locator('.joy-st-cnt summary').click();
  await page.fill('#stCntCar', '1200'); await page.locator('#stCntCar').blur();
  await page.fill('#stCntPed', '600'); await page.locator('#stCntPed').blur();
  await expect(page.locator('[data-card=sanoq] .big')).toHaveText('600 / 1200');
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/kocha-1440.png' });
  // tungi rejim va 1024 px
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/kocha-1024-dark.png' });
  // inglizcha: yangi matnlar tarjima qilingan
  await page.click('#langSw [data-lang=en]');
  await expect(page.locator('#stHead .t-small')).toHaveText('Street analysis · A → B');
  await expect(page.locator('[data-card=tarmoq] .big')).toHaveText('11 intersections');
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/kocha-en.png' });
  await page.click('#langSw [data-lang=uz]');
  // hudud tahliliga qaytish — pasport
  await page.click('[data-an=hudud]');
  await expect(page.locator('#joyStrip')).toBeHidden();
  await expect(page.locator('.joy-l').first()).toBeVisible();
  expect(errs).toEqual([]);
});
