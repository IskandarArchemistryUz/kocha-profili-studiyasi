import { test, expect } from './fx';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Sinov va eski sahifalar oddiy tashrif buyuruvchidan yashirin (js/sinov.js), egasiga ochiq; hech biri oʻchirilmagan */
const ROOT = resolve(process.cwd(), '..'), PORT = 4193;
const OLD = ['studio', 'gis', 'shamol', 'ai', 'bino', 'posadka', 'data', 'muharrir', 'masterreja', 'loyiha'];
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
const U = (p: string) => `http://127.0.0.1:${PORT}/${p}`;

test('tashrif buyuruvchi: «Barcha asboblar» yoʻq, eski sahifalar bosh sahifaga qaytaradi; eski loyiha zaxirasi ochiq', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { sessionStorage.setItem('wm-test', '1'); localStorage.removeItem('kps_owner'); });
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:fonts\.g|nominatim|unpkg|cdnjs|jsdelivr|tile|arcgis))/, r => r.abort());
  await page.goto(U('haqida.html'));
  await expect(page.locator('#hammasi')).toBeHidden();
  await expect(page.locator('footer a[href$="#hammasi"]')).toBeHidden();
  for (const p of OLD) {
    expect(existsSync(join(ROOT, p + '.html')), p).toBe(true);   // fayl joyida (oʻchirilmagan)
    await page.goto(U(p + '.html'), { waitUntil: 'commit' }); await page.waitForURL(u => !u.pathname.endsWith(p + '.html'), { timeout: 5000 });
  }
  await page.goto(U('loyiha.html?backup=1'), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
  expect(new URL(page.url()).pathname).toBe('/loyiha.html');
});

test('egasi: «Barcha asboblar» va eski sahifalar ochiq', async ({ page }) => {
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:fonts\.g|nominatim|unpkg|cdnjs|jsdelivr|tile|arcgis))/, r => r.abort());
  await page.goto(U('haqida.html'));
  await expect(page.locator('#hammasi')).toBeVisible();
  await expect(page.locator('#allTools a')).toHaveCount(13);
  await page.goto(U('gis.html'), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
  expect(new URL(page.url()).pathname).toBe('/gis.html');
});
