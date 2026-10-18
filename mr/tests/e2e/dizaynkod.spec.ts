import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Dizayn-kod (eski sahifalar, ds2 qobigʻi): ekotizim sarlavhasi, 5 qadam (Joy tipi → Peshlavha), til, tungi rejim, ds2 boshqaruvlari */
const ROOT = resolve(process.cwd(), '..'), PORT = 4192;
let srv: Server;
test.beforeAll(async () => {
  srv = createServer((q, s) => {
    let p = join(ROOT, decodeURIComponent((q.url ?? '/').split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { s.statusCode = 404; s.end(''); return; }
    const ext = p.split('.').pop()!;
    s.setHeader('content-type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml' } as Record<string, string>)[ext] ?? 'application/octet-stream');
    s.end(readFileSync(p));
  });
  await new Promise<void>(r => srv.listen(PORT, '127.0.0.1', () => r()));
});
test.afterAll(() => { srv?.close(); });

test('peshlavha studiyasi: sarlavha, qadamlar, tungi rejim, til', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|cdnjs|jsdelivr|unpkg|openstreetmap|arcgis|overpass/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/dizaynkod.html`);
  await expect(page.locator('header.eko .eko-svc a.on')).toHaveText(/Dizayn-kod/);
  await expect(page.locator('header.eko .eko-svc a')).toHaveCount(5);
  await expect(page.locator('#kpsLang button')).toHaveCount(3);
  const steps = page.locator('#steps li');
  await expect(steps).toHaveCount(5);
  await expect(steps.first().locator('a')).toHaveAttribute('href', 'dizaynkod-joy.html');
  await expect(page.locator('#card')).not.toBeEmpty();
  // brauzerning oʻz checkbox/range koʻrinishi yoʻq (ds2)
  const ap = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox],input[type=range]')].map(e => getComputedStyle(e).appearance));
  expect(ap.every(a => a === 'none')).toBe(true);
  // tungi rejim saqlanadi
  await page.click('#themeBtn');
  const t = await page.locator('html').getAttribute('data-theme');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', t!);
  // til: en — ikkala kalit
  await page.click('#kpsLang [data-lang=en]');
  await page.waitForLoadState('domcontentloaded');
  expect(await page.evaluate(() => [localStorage.getItem('kps_lang'), localStorage.getItem('mr-lang')])).toEqual(['en', 'en']);
  expect(errs).toEqual([]);
});

test('joy tipi: sarlavha va qadamlar, Peshlavhaga oʻtish', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|cdnjs|jsdelivr|unpkg|openstreetmap|arcgis|overpass/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/dizaynkod-joy.html`);
  await expect(page.locator('header.eko .eko-svc a.on')).toHaveText(/Dizayn-kod/);
  await expect(page.locator('.dkj-top .steps li')).toHaveCount(5);
  await expect(page.locator('.dkj-top .steps [aria-current=step]')).toContainText('Joy tipi');
  await page.locator('.dkj-top .steps a', { hasText: 'Peshlavha' }).click();
  await expect(page).toHaveURL(/dizaynkod\.html$/);
  expect(errs).toEqual([]);
});
