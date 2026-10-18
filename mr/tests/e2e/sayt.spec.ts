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

test('batafsil (v4): jonli model, ekotizim, til, tungi rejim, eski boʻlimlar', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|nominatim/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/haqida.html`);
  await expect(page.locator('h1')).toContainText('Master reja');
  // jonli model: 7 qavat — 267 xonadon, 946 kishi, maktab 157 (5-ilova), avtoturargoh 267 (xonadonga 1)
  const num = async (id: string) => Number((await page.locator(id).textContent())!.replace(/\D/g, ''));
  expect(await num('#vPop')).toBe(946); expect(await num('#vSch')).toBe(157); expect(await num('#vPk')).toBe(267);
  await expect(page.locator('#vFlats')).toHaveText('267 xonadon');
  await expect(page.locator('#sDens')).toHaveClass(/ok/);
  await page.click('#flPlus'); expect(await num('#vPop')).toBeGreaterThan(946);
  await page.click('#flSeg [data-fl="12"]'); await expect(page.locator('#fl')).toHaveValue('12');
  await expect(page.locator('#flSeg [data-fl="12"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#kPop')).toHaveClass(/bad/); await expect(page.locator('#sDens')).toHaveClass(/bad/);
  await expect(page.locator('#blds .bl')).toHaveCount(3);
  // menyu va ekotizim: 5 xizmat kartasi, Render — beta
  for (const h of ['app/', 'app/kochasoz.html', 'app/joyshunos.html', 'app/render.html', 'dizaynkod.html', 'app/#/chizmadon', 'narxlar.html'])
    await expect(page.locator(`header nav a[href="${h}"]`)).toHaveCount(1);
  await expect(page.locator('a.stretch[href="app/render.html"]')).toHaveCount(1);
  // eski boʻlimlar saqlangan (Qoida 0): loyihalar va 14 eski sahifa
  await expect(page.locator('#allTools a')).toHaveCount(14);
  for (const a of await page.locator('#allTools a').all()) { const href = (await a.getAttribute('href'))!; expect(existsSync(join(ROOT, href))).toBe(true); }
  for (const a of await page.locator('a[href]').all()) { const h = (await a.getAttribute('href'))!; expect(h).not.toBe('#'); }
  // til: en → sarlavha, raqamlar va menyu tarjima, kalit saqlanadi
  await page.click('#langBtn'); await page.click('#langMenu [data-lang=en]');
  await expect(page.locator('h1')).toContainText('every figure');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('header nav a[href="narxlar.html"]')).toHaveText('Pricing');
  expect(await page.evaluate(() => [localStorage.getItem('mr-lang'), localStorage.getItem('kps_lang')])).toEqual(['en', 'en']);
  await page.click('footer [data-lang=ru]'); await expect(page.locator('#ctaTop')).toHaveText('Открыть');
  await page.click('footer [data-lang=uz]'); await expect(page.locator('h1')).toContainText('har raqami');
  // tungi rejim
  const th0 = await page.locator('html').getAttribute('data-theme');
  await page.click('#themeBtn'); await expect(page.locator('html')).not.toHaveAttribute('data-theme', th0!);
  await page.reload(); await expect(page.locator('html')).not.toHaveAttribute('data-theme', th0!);
  await expect(page.locator('#plist .pempty')).toBeVisible();
  expect(errs).toEqual([]);
});

test('narxlar batafsil: hisoblagich, maydon koeffitsiyenti, valyuta, til', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/narxlar-batafsil.html`);
  // andoza: «Qoʻmitaga topshirish» (12+8+3+5 = 28) × 1,5 = 42
  await expect(page.locator('#cTot')).toHaveText('42');
  await expect(page.locator('[data-pre="kom"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-k="2"]'); await expect(page.locator('#cTot')).toHaveText('56');
  await page.click('[data-k="1"]'); await expect(page.locator('#cTot')).toHaveText('28');
  await page.click('[data-it="png"]'); await expect(page.locator('#cTot')).toHaveText('29');
  await expect(page.locator('[data-pre="kom"]')).toHaveAttribute('aria-pressed', 'false');
  await page.click('[data-pre="all"]'); await expect(page.locator('#cTot')).toHaveText('49');
  await expect(page.locator('#cSum')).toContainText(/162\s000/);
  // koeffitsiyent faqat MR fayllariga: (12+8+3+5+10) × 2 + (10+1) = 87
  await page.click('[data-k="2"]'); await expect(page.locator('#cTot')).toHaveText('87');
  await expect(page.locator('#cFormula')).toContainText('38 × 2');
  await page.click('[data-cur="usd"]'); await expect(page.locator('[data-usd="$10"]')).toHaveText('$10');
  await page.click('#langBtn'); await page.click('#langMenu [data-lang=ru]');
  await expect(page.locator('h1')).toContainText('бесплатно');
  await expect(page.locator('#cSum')).toContainText('сум');
  await expect(page.locator('.draft')).toBeVisible();
  expect(errs).toEqual([]);
});

test('bosh sahifa · minimal: xizmatlar, Boshlash, fikr, til, tungi rejim', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|goatcounter|gc\.zgo/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await expect(page.locator('h1')).toContainText('meʼyor bilan');
  await expect(page.locator('#ctaNew')).toHaveAttribute('href', 'app/#/yangi');
  const hrefs = await page.locator('nav.dots a.d').evaluateAll(a => a.map(x => x.getAttribute('href')));
  expect(hrefs).toEqual(['app/kochasoz.html', 'app/joyshunos.html', 'app/#/chizmadon', 'dizaynkod.html', 'app/render.html']);
  for (const a of await page.locator('a[href]').all()) expect(await a.getAttribute('href')).not.toBe('#');
  for (const h of ['haqida.html', 'narxlar.html', 'haqida.html#hammasi', 'app/']) await expect(page.locator(`footer a[href="${h}"]`)).toHaveCount(1);
  // beta tugmasi va sariq qator chiqmaydi — sahifaning oʻz «Fikr» tugmasi bor
  await expect(page.locator('#kbBtn')).toBeHidden(); await expect(page.locator('#kbBar')).toHaveCount(0);
  await page.locator('.fab').hover(); await page.click('[data-fb="Xato topdim"]');
  await expect(page.locator('[data-fb="Xato topdim"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#fbBeta'); await expect(page.locator('#kbPn')).toBeVisible();
  // til va tungi rejim
  await page.click('#langBtn'); await page.click('#langMenu [data-lang=ru]');
  await expect(page.locator('h1')).toContainText('по нормам'); await expect(page.locator('#ctaNew')).toHaveText('Начать');
  const th0 = await page.locator('html').getAttribute('data-theme');
  await page.click('#themeBtn'); await expect(page.locator('html')).not.toHaveAttribute('data-theme', th0!);
  // avvalgi versiya loyihalari — eslatma
  await page.evaluate(() => localStorage.setItem('kps_projects', JSON.stringify({ active: null, list: [{ id: 'a', name: 'X', t: 1 }] })));
  await page.reload(); await expect(page.locator('#oldNote')).toBeVisible();
  await expect(page.locator('#oldNote a')).toHaveAttribute('href', 'haqida.html#loyihalar');
  expect(errs).toEqual([]);
});

test('narxlar · minimal: tariflar, Pro yillik, valyuta, batafsil havola', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g|goatcounter|gc\.zgo/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/narxlar.html`);
  await expect(page.locator('.mpc')).toHaveCount(4);
  await expect(page.locator('#proP')).toHaveText(/149\s000/);
  await page.click('[data-per="y"]'); await expect(page.locator('#proP')).toHaveText(/119\s200/);
  await expect(page.locator('#proY')).toContainText(/1\s430\s400/);
  await page.click('[data-cur="usd"]'); await expect(page.locator('[data-usd="$10"]').first()).toHaveText('$10');
  await expect(page.locator('#proP')).toHaveText('$12');
  await expect(page.locator('.mb[disabled]')).toHaveCount(2);
  await expect(page.locator('a.more')).toHaveAttribute('href', 'narxlar-batafsil.html');
  await expect(page.locator('.draft')).toBeVisible();
  expect(errs).toEqual([]);
});
