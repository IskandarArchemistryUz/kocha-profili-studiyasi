import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Bosh sahifa (repo ildizidagi index.html, maket «Sayt v2»): til, tungi rejim, jonli model, asboblar, Chizmadon havolasi */
const ROOT = resolve(process.cwd(), '..'), PORT = 4191;
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

test('bosh sahifa: jonli model, til, tungi rejim, barcha asboblar', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|nominatim/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await expect(page.locator('h1')).toContainText('Bir qavat qoʻshing');
  // jonli model: qavat qoʻshilsa aholi va maktab oʻsadi; zichlik > 400 — ogohlantirish
  const pop = async () => Number((await page.locator('#vPop').textContent())!.replace(/\D/g, ''));
  const p7 = await pop(); expect(p7).toBe(Math.round(27 * 7 * 3.54));
  await page.click('#flPlus'); expect(await pop()).toBeGreaterThan(p7);
  for (let i = 0; i < 6; i++) await page.click('#flPlus');
  await expect(page.locator('#kPop')).toHaveClass(/bad/);
  await expect(page.locator('#blds .bl')).toHaveCount(3);
  // asboblar: 5 karta, Chizmadon ilovaga, oʻtish davri roʻyxatida 14 eski sahifa
  await expect(page.locator('.tools .tool')).toHaveCount(5);
  await expect(page.locator('#tCh')).toHaveAttribute('href', 'app/#/chizmadon');
  await expect(page.locator('#tKs')).toHaveAttribute('href', 'app/kochasoz.html');
  await expect(page.locator('#allTools a')).toHaveCount(14);
  for (const a of await page.locator('#allTools a').all()) { const href = (await a.getAttribute('href'))!; expect(existsSync(join(ROOT, href))).toBe(true); }
  // til: en → sarlavha va tugma tarjima, kalit saqlanadi (ilova va eski sahifalar uchun)
  await page.click('#langBtn'); await page.click('#langMenu [data-lang=en]');
  await expect(page.locator('h1')).toContainText('Add a floor');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => [localStorage.getItem('mr-lang'), localStorage.getItem('kps_lang')])).toEqual(['en', 'en']);
  await page.click('footer [data-lang=ru]'); await expect(page.locator('#ctaTop')).toHaveText('Начать бесплатно');
  // tungi rejim
  const th0 = await page.locator('html').getAttribute('data-theme');
  await page.click('#themeBtn'); await expect(page.locator('html')).not.toHaveAttribute('data-theme', th0!);
  await page.reload(); await expect(page.locator('html')).not.toHaveAttribute('data-theme', th0!);
  await expect(page.locator('#plist .pempty')).toBeVisible();
  expect(errs).toEqual([]);
});
