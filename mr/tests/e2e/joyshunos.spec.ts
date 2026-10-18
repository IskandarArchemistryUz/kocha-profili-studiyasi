import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Joyshunos (eski sahifalar, ds2 qobigʻi): GIS tahlil, Shamol, Joylashtirish, Hudud bahosi — ekotizim sarlavhasi, ichki menyu, tungi rejim */
const ROOT = resolve(process.cwd(), '..'), PORT = 4193;
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


const PAGES: [string, string][] = [['gis', 'GIS tahlil'], ['shamol', 'Shamol'], ['posadka', 'Joylashtirish'], ['ai', 'Hudud bahosi']];
for (const [f, name] of PAGES) {
  test(`joyshunos · ${f}: sarlavha, ichki menyu, tungi rejim`, async ({ page }) => {
    // xarita kutubxonalari CI da yuklanmaydi — tekshiruv faqat qobiq va koʻrinish
    await page.route(/fonts\.g|cdnjs|jsdelivr|unpkg|openstreetmap|arcgis|overpass|open-meteo|carto|maptiler/, r => r.abort());
    await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto(`http://127.0.0.1:${PORT}/${f}.html`);
    await expect(page.locator('header.eko .eko-svc a.on')).toHaveText(/Joyshunos/);
    await expect(page.locator('header.eko .eko-svc a')).toHaveCount(5);
    await expect(page.locator('.joy-nav a')).toHaveCount(4);
    await expect(page.locator('.joy-nav a.on')).toHaveText(name);
    await expect(page.locator('.joy-nav a.on')).toHaveAttribute('href', `${f}.html`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // panel tungi rejimda qorongʻi (eski oq fon qolmagan)
    const bg = await page.locator('aside').first().evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).not.toBe('rgb(255, 255, 255)');
    // eski logotip va «ARCHEMISTRY» yozuvi asboblar qatorida yoʻq
    await expect(page.locator('header.jbar .brand')).toHaveCount(0);
    const ap = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox],input[type=range]')].map(e => getComputedStyle(e).appearance));
    expect(ap.every(a => a === 'none')).toBe(true);
  });
}
