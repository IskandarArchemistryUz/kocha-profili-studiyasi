import { test, expect } from './fx';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Yershunos · shahar tizimlari (27.11, taxminiy gravitatsiya modeli): har birlik tizimga tushadi, zanjir sikl hosil qilmaydi,
 *  markaz — shahar; qatlam faqat «Shahar tizimlari» tanlanganda koʻrinadi; tuman kartasida blok; tarjimasiz matn qolmaydi. */
const ROOT = resolve(process.cwd(), '..'), PORT = 4197;
let srv: Server;
test.beforeAll(async () => {
  srv = createServer((q, s) => {
    let p = join(ROOT, decodeURIComponent((q.url ?? '/').split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { s.statusCode = 404; s.end(''); return; }
    const ext = p.split('.').pop()!;
    s.setHeader('content-type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', geojson: 'application/json', png: 'image/png' } as Record<string, string>)[ext] ?? 'application/octet-stream');
    s.end(readFileSync(p));
  });
  await new Promise<void>(r => srv.listen(PORT, '127.0.0.1', () => r()));
});
test.afterAll(() => { srv?.close(); });

for (const lang of ['uz', 'ru'] as const) {
  test(`Yershunos · shahar tizimlari (${lang})`, async ({ page }) => {
    test.setTimeout(120_000);
    const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(l => { try { localStorage.setItem('mr-lang', l); } catch { /* */ } }, lang);
    await page.route(/fonts\.g|nominatim|api\.archemistry/, r => r.abort());
    await page.route(/unpkg\.com/, r => r.fulfill({ path: join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.js'), contentType: 'text/javascript' }));
    await page.goto(`http://127.0.0.1:${PORT}/app/yershunos/`);
    await expect(page.locator('#uzd .big')).toBeVisible({ timeout: 60_000 });

    // model: hamma birlik tizimda, sikl yoʻq, markaz — shahar, Toshkent tumanlari Toshkent tizimida
    const m = await page.evaluate(() => {
      const r = (window as any).YSA.hisob(), U = r.U, names = Object.keys(U);
      return { units: names.length, total: (window as any).YSA._.uz().features.length, systems: r.L.length,
        headsCity: r.L.every((s: any) => s.h.sh), chainsOk: r.N.every((a: any) => a.z.length < 20 && a.z[a.z.length - 1] === a.h),
        tk: names.filter(n => (window as any).YSA._.uz().features.find((f: any) => f.properties.n === n).properties.v === 'Toshkent shahri').every(n => U[n].h.n === 'Toshkent shahri'),
        baxmal: U['Baxmal tumani'].h.n };
    });
    expect(m.units).toBe(m.total); expect(m.headsCity).toBe(true); expect(m.chainsOk).toBe(true); expect(m.tk).toBe(true);
    expect(m.systems).toBeGreaterThanOrEqual(8); expect(m.systems).toBeLessThanOrEqual(25);

    // qatlam faqat shu koʻrsatkichda
    const vis = () => page.evaluate(() => (window as any).YSA._.vis());
    expect(await vis()).toBe('none');
    await page.click('#uzb button[data-u=al]');
    await expect(page.locator('#uzb button[data-u=al]')).toHaveClass(/on/);
    expect(await vis()).toBe('visible');
    await expect(page.locator('#uzl [data-al]')).toHaveCount(m.systems);
    await expect(page.locator('#uzth')).toHaveText(lang === 'uz' ? 'Tizimlararo aloqalar' : 'Связи между системами');
    await expect(page.locator('#uzi')).toContainText(lang === 'uz' ? 'TAXMINIY' : 'ОРИЕНТИРОВОЧНО');
    await expect(page.locator('#kpibar')).toContainText(lang === 'uz' ? 'Shahar tizimlari' : 'Городские системы');
    await page.locator('#uzl [data-al]').first().click();
    // tuman kartasi
    await page.evaluate(() => (window as any).uzPick('Baxmal tumani', false));
    await expect(page.locator('#uzd')).toContainText(lang === 'uz' ? 'Shahar tizimi (taxminiy)' : 'Городская система (ориентировочно)');
    await page.evaluate(() => (window as any).uzPick('Chilonzor tumani', false));
    await expect(page.locator('#uzd')).toContainText(lang === 'uz' ? 'Toshkent tizimi markazida' : 'в центре Ташкентской системы');
    // boshqa koʻrsatkich — qatlam yashirinadi, rang qaytadi
    await page.click('#uzb button[data-u=o]');
    expect(await vis()).toBe('none');
    await page.click('#uzb button[data-u=al]');
    // boshqa rejim — yashirinadi
    await page.click('#rejim button[data-v=iqlim]');
    await expect.poll(vis).toBe('none');
    expect(await page.evaluate(() => Object.keys((window as any).T.yoq))).toEqual([]);
    expect(errs).toEqual([]);
  });
}
