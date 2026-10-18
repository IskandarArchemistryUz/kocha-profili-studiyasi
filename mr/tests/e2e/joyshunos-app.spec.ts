import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Joyshunos (app/joyshunos.html, «Joy-A» maketi): qatlamlar paneli, joy pasporti, radius, raqobatchilar turi, qidiruv, saqlanish.
 *  Tarmoq soxtalashtiriladi: relyef plitkasi — fixtures/terrarium.png, Overpass va Nominatim — sunʼiy javoblar. */
const ROOT = resolve(process.cwd(), '..'), FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const C = [69.2797, 41.3111];
let k = 1;
const ring = (n: number, R: number, tags: (i: number) => Record<string, string>) => Array.from({ length: n }, (_, i) => {
  const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / n);
  return { type: 'node', id: k++, lat: C[1] + r * Math.sin(a) / 111132, lon: C[0] + r * Math.cos(a) / (111320 * Math.cos(C[1] * Math.PI / 180)), tags: tags(i) };
});
async function open(page: Page, errs: string[]): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|openfreemap|arcgis/, r => r.abort());
  await page.route(/elevation-tiles-prod/, r => r.fulfill({ path: FIX, contentType: 'image/png' }));
  await page.route(/nominatim\.openstreetmap\.org\/reverse/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { road: 'Amir Temur shoh koʻchasi', house_number: '21' } }) }));
  await page.route(/nominatim\.openstreetmap\.org\/search/, r => r.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, async r => {
    const body = decodeURIComponent(r.request().postData() || '');
    const el = body.includes('"amenity"="cafe"') ? ring(9, 950, () => ({ amenity: 'cafe' })) : body.includes('pharmacy"]') ? ring(3, 900, () => ({ amenity: 'pharmacy' }))
      : [...ring(12, 1800, i => ({ amenity: ['school', 'kindergarten', 'pharmacy', 'clinic'][i % 4] })), ...ring(10, 1500, () => ({ highway: 'bus_stop' }))];
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: el }) });
  });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./joyshunos.html');
}

test('joy pasporti: qatlamlar, kartalar, radius, raqobatchilar, saqlanish', async ({ page }) => {
  const errs: string[] = []; await open(page, errs);
  await expect(page.locator('.eko .svc a.on')).toHaveText(/Joyshunos/);
  await expect(page.locator('.joy-l')).toHaveCount(12);
  await expect(page.locator('.joy-l .switch')).toHaveCount(5);
  await expect(page.locator('.joy-l em.soon')).toHaveCount(7);
  // pasport: manzil, relyef, shamol, xizmatlar, raqobatchilar
  await expect(page.locator('.joy-card.head .ttl')).toContainText('Amir Temur shoh koʻchasi, 21');
  await expect(page.locator('[data-card=relyef] .big')).toHaveText(/\d+–\d+ m/);
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—');
  await expect(page.locator('[data-card=shamol] .sub')).toContainText('Stansiya');
  await expect(page.locator('[data-card=xizmat] .big')).toHaveText(/\d+ obyekt/);
  await expect(page.locator('[data-card=xizmat] .joy-norm li')).toHaveCount(4);
  await expect(page.locator('[data-card=raqobat] .big')).toHaveText(/^\d+ ta$/);
  // raqobatchilar turi — oʻz menyusi (brauzerning select emas)
  await page.locator('.joy-cat').click();
  await page.locator('.joy-menu button', { hasText: 'Dorixona' }).click();
  await expect(page.locator('.joy-cat')).toHaveText('Dorixona');
  await expect(page.locator('[data-card=raqobat] .big')).toHaveText(/^\d+ ta$/);
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
  await page.locator('#langSw [data-lang=en]').click();
  await expect(page.locator('.joy-card.head .t-small').first()).toHaveText('Site passport');
  await expect(page.locator('[data-layer=relyef] .nm')).toHaveText('Terrain');
  await page.locator('#langSw [data-lang=uz]').click();
  expect(errs).toEqual([]);
});
