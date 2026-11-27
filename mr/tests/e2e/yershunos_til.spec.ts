import { test, expect } from './fx';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Yershunos · tillar (27.11): interfeys uz / en / ru — lugʻatda topilmagan matn qolmaydi, son yozuvi tilga mos */
const ROOT = resolve(process.cwd(), '..'), PORT = 4197;
let srv: Server;
test.beforeAll(async () => {
  srv = createServer((q, s) => {
    let p = join(ROOT, decodeURIComponent((q.url ?? '/').split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { s.statusCode = 404; s.end(''); return; }
    const ext = p.split('.').pop()!;
    s.setHeader('content-type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', geojson: 'application/json', svg: 'image/svg+xml', png: 'image/png' } as Record<string, string>)[ext] ?? 'application/octet-stream');
    s.end(readFileSync(p));
  });
  await new Promise<void>(r => srv.listen(PORT, '127.0.0.1', () => r()));
});
test.afterAll(() => { srv?.close(); });

for (const lang of ['en', 'ru'] as const) {
  test(`Yershunos · til: ${lang} — barcha rejimlar, lugʻatda yoʻq matn qolmaydi`, async ({ page }) => {
    test.setTimeout(360_000);
    const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(l => { try { localStorage.setItem('mr-lang', l); } catch { /* */ } }, lang);
    await page.route(/fonts\.g|nominatim/, r => r.abort());
    await page.route(/unpkg\.com/, r => r.fulfill({ path: join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.js'), contentType: 'text/javascript' }));
    await page.route(/elevation-tiles-prod/, r => r.fulfill({ path: join(ROOT, 'app/yershunos/tiles/11/1426/760.png'), contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
    await page.goto(`http://127.0.0.1:${PORT}/app/yershunos/`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('#ystil button').first()).toHaveText(lang.toUpperCase());
    await expect(page.locator('#rejim button[data-v=uz] span')).toHaveText(lang === 'en' ? 'Country' : 'Страна');
    await expect(page.locator('.top .chip.warn')).toHaveText(lang === 'en' ? 'SCREENING' : 'СКРИНИНГ');
    // mamlakat: xulosa, tuman kartasi, jadval
    await expect(page.locator('#uzd .big')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? 'Uzbekistan' : 'Узбекистан');
    await page.evaluate(() => (window as any).uzPick('Baxmal tumani', false));
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? 'Baxmal district' : 'район Baxmal');
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? 'Jizzakh region' : 'Джизакская область');
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? 'Water stress' : 'Водный стресс');
    // son yozuvi: en — 1,852 va 4.8; ru — 1 852 va 4,8
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? '(1,853 km²)' : '(1 853 км²)');
    await expect(page.locator('#uzd')).toContainText(lang === 'en' ? /4\.8 \/ 5/ : /4,8 \/ 5/);
    for (const k of ['z', 'k', 'h', 't', 'q', 'x', 'ey', 'eg', 'zi', 'zs', 'zk', 'zh', 'sv', 'sw', 'ta', 'ts', 'tb', 'r', 'o']) await page.click(`#uzb button[data-u=${k}]`);
    await page.click('#uzj'); await expect(page.locator('#uzwh th').first()).toHaveText(new RegExp(lang === 'en' ? 'Name' : 'Название'));
    await page.click('#uzwx'); await page.click('#uzr');
    await page.selectOption('#uzv', 'Jizzax viloyati'); await expect(page.locator('#uzd')).toContainText(lang === 'en' ? 'Jizzakh region' : 'Джизакская область');
    // namuna rejimlar
    const rejim = async (v: string, sel: string) => { await page.click(`#rejim button[data-v=${v}]`); await expect(page.locator(sel)).not.toHaveText('—', { timeout: 90_000 }); };
    await page.click('#rejim button[data-v=relyef]'); await expect(page.locator('#sub')).toHaveText(lang === 'en' ? /Charvak basin/ : /Бассейн Чарвака/, { timeout: 90_000 });
    await rejim('toshqin', '#hq'); await page.click('#ss button[data-v=yomgir_qor]'); await expect(page.locator('#hu')).not.toHaveText('—');
    await rejim('jala', '#jq'); await rejim('iqlim', '#it1'); await page.fill('#ip', '2'); await page.dispatchEvent('#ip', 'input');
    await rejim('keng', '#ka');
    await page.click('#rejim button[data-v=hudud]'); await expect(page.locator('#hdb .big')).toBeVisible({ timeout: 90_000 });
    for (let i = 0; i < 3; i++) { await page.locator('#hlst button').nth(i).click(); await expect(page.locator('#hlst button').nth(i)).toHaveClass(/on/); await page.waitForTimeout(700); }
    await page.evaluate(() => (window as any).hbHisob(76.75, 43.0, 77.15, 43.3));
    await expect(page.locator('#hdb')).toContainText(lang === 'en' ? 'IN-BROWSER SCREENING' : 'СКРИНИНГ В БРАУЗЕРЕ');
    await expect(page.locator('#kpibar')).toContainText(lang === 'en' ? 'Valley floor' : 'Днище долины');
    // hisobot (PDF): chizilgan hudud, respublika, viloyat, tuman — ikkala varaq yoʻnalishida, sahifa toshmaydi
    const tosh = () => page.evaluate(() => [...document.querySelectorAll('#hbd .hb-body')].map(b => b.scrollHeight - b.clientHeight).filter(x => x > 1).length);
    await page.evaluate(() => (window as any).uzHisobot('h'));
    await expect(page.locator('#hbd .pg').first()).toContainText(lang === 'en' ? 'Terrain and drainage screening' : 'Скрининг рельефа и водотоков'); expect(await tosh()).toBe(0);
    await expect(page.locator('#hb .hb-bar')).toContainText(lang === 'en' ? 'Print / PDF' : 'Печать / PDF');
    await page.click('#hbs button[data-s=r]');
    await expect(page.locator('#hbd .pg').first()).toContainText(lang === 'en' ? 'By 197 districts and cities' : 'В разрезе 197 районов и городов'); expect(await tosh()).toBe(0);
    await page.click('#hbo button[data-o=al]'); expect(await tosh()).toBe(0);
    await page.click('#hbx');
    await page.click('#rejim button[data-v=uz]'); await page.selectOption('#uzv', 'Toshkent shahri'); await page.evaluate(() => (window as any).uzHisobot('v'));
    await expect(page.locator('#hbd .pg').first()).toContainText(lang === 'en' ? 'Tashkent city' : 'город Ташкент'); expect(await tosh()).toBe(0);
    await page.click('#hbo button[data-o=pt]'); expect(await tosh()).toBe(0); await page.click('#hbx');
    await page.selectOption('#uzv', ''); await page.evaluate(() => (window as any).uzPick("Ko'kdala tumani + Chiroqchi tumani", false)); await page.evaluate(() => (window as any).uzHisobot('t'));
    await expect(page.locator('#hbd .pg').first()).toContainText(lang === 'en' ? "Ko'kdala district + Chiroqchi district" : "район Ko'kdala + район Chiroqchi"); expect(await tosh()).toBe(0);
    await page.click('#hbo button[data-o=al]'); expect(await tosh()).toBe(0);
    await expect(page).toHaveTitle(lang === 'en' ? /— report$/ : /— отчёт$/);
    await page.click('#hbx');
    // lugʻatda yoʻq matn qolmagan; panelda oʻzbekcha xizmatchi soʻzlar yoʻq
    expect(await page.evaluate(() => Object.keys((window as any).T.yoq))).toEqual([]);
    const qoldiq = await page.evaluate(() => { const re = /\b(bo'yicha|uchun|hisoblan|yillik|tumanlar|aholi|maydon|ko'rsat|bo'lgan|emas)\b/i, o: string[] = [];
      document.querySelectorAll('.top, #rejim, #panel, #kpibar, .mapctl, #uzw, #hb').forEach(r => { const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = (n.nodeValue || '').trim(); if (t && re.test(t) && !(n.parentElement as HTMLElement).closest('pre,[data-noi18n]')) o.push(t.slice(0, 80)); } }); return o; });
    expect(qoldiq).toEqual([]);
    expect(errs).toEqual([]);
  });
}

test('Yershunos · til: uz — matn oʻzgarmaydi, til menyusi tanlovni saqlaydi', async ({ page }) => {
  await page.addInitScript(() => { try { if (!localStorage.getItem('mr-lang')) localStorage.setItem('mr-lang', 'uz'); } catch { /* */ } });
  await page.route(/fonts\.g|unpkg\.com/, r => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}/app/yershunos/`);
  await expect(page.locator('#rejim button[data-v=uz] span')).toHaveText('Mamlakat'); await expect(page.locator('.top .chip.warn')).toHaveText('SKRINING');
  await page.click('#ystil > button'); await page.click('#ystil [data-lang=ru]');
  await expect(page.locator('#rejim button[data-v=uz] span')).toHaveText('Страна');
  expect(await page.evaluate(() => [localStorage.getItem('mr-lang'), localStorage.getItem('kps_lang')])).toEqual(['ru', 'ru']);
});
