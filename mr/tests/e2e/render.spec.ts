import { test, expect, type Page, pickLang } from './fx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const B64 = readFileSync(FIX).toString('base64');

async function open(page: Page, errs: string[]): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => { errs.push(`dialog: ${d.message()}`); void d.dismiss(); });
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('renInit')) { sessionStorage.setItem('renInit', '1'); localStorage.removeItem('kps_air'); localStorage.removeItem('render-base'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./render.html');
}

test('Render studiyasi: asos rasm, referens, Gemini (mock), 2 variant, solishtirish, Chizmadonga', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  let calls = 0, imgsInLast = 0;
  await page.route(/generativelanguage\.googleapis\.com/, async r => {
    calls++; const b = JSON.parse(r.request().postData() || '{}'); imgsInLast = b.contents[0].parts.filter((p: { inline_data?: unknown }) => p.inline_data).length;
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: B64 } }] } }] }) });
  });
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.eko .svc a[data-svc=ren]')).toHaveClass(/on/);
  await expect(page.locator('.ren-hello')).toBeVisible();
  // asos rasm — fayldan
  await page.locator('#srcFile').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await expect(page.locator('.ren-base img')).toBeVisible();
  await expect(page.locator('.ren-frame .ren-img')).toBeVisible();
  await expect(page.locator('#srcPick')).toContainText('1');
  // referens — material
  await page.locator('#refAdd').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await expect(page.locator('.ren-refs .ref')).toHaveCount(1);
  await page.locator('.ren-refs .ref .role').click();
  await page.locator('.ren-refs .ren-menu button', { hasText: 'Material' }).click();
  await expect(page.locator('.ren-refs .ref .role')).toContainText('Material');
  // sozlamalar
  await page.locator('#subj button', { hasText: 'Bitta bino' }).click();
  await page.locator('#sty [data-sty=toshkent]').click();
  await page.locator('#fid button', { hasText: 'Muvozanat' }).click();
  await page.locator('#nVar button', { hasText: '2' }).click();
  await expect(page.locator('#renGo')).toContainText('2 variant');
  // kalitsiz — xato
  await page.locator('#renGo').click();
  await expect(page.locator('#renErr')).toContainText('API kalitini');
  await page.locator('#renKey').fill('test-key'); await page.locator('#renKey').press('Tab');
  await page.locator('#renGo').click();
  await expect(page.locator('#renView')).toBeVisible({ timeout: 30_000 });
  expect(calls).toBe(2); expect(imgsInLast).toBe(2);
  await expect(page.locator('#vMode button[aria-pressed=true]')).toContainText('solishtirish');
  await expect(page.locator('.ren-va .ren-gal button')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/render-natija.png' });
  await page.locator('#vMode button', { hasText: 'Yonma-yon' }).click();
  await expect(page.locator('.ren-yon figure')).toHaveCount(2);
  // referens qilish va orqaga
  await page.locator('#vRef').click();
  await page.locator('#vBack').click();
  await expect(page.locator('.ren-refs .ref')).toHaveCount(2);
  await expect(page.locator('#renGal button')).toHaveCount(2);
  await page.locator('#stView button', { hasText: 'Solishtirish' }).click();
  await expect(page.locator('.ren-frame .ren-cmp')).toBeVisible();
  await page.screenshot({ path: 'test-results/render-studiya.png' });
  // saqlanish
  await page.reload();
  await expect(page.locator('#renGal button')).toHaveCount(2);
  await expect(page.locator('.ren-refs .ref')).toHaveCount(2);
  await expect(page.locator('#sty [data-sty=toshkent]')).toHaveAttribute('aria-pressed', 'true');
  // tungi rejim va planshet
  await page.locator('#themeBtn').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: 'test-results/render-dark-1024.png' });
  // Chizmadonga
  await page.locator('#renGal button').first().click();
  await page.locator('#vChz').click();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 20_000 });
  await expect(page.locator('.gx.ch')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();
  expect(errs).toEqual([]);
});

test('boshqa xizmatdan yuborilgan kadr asos rasm boʻlib ochiladi (#/s/<id>), inglizcha', async ({ page }) => {
  const errs: string[] = [];
  await open(page, errs);
  await page.evaluate(async b64 => {
    const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    await new Promise<void>((ok, no) => { const t = db.transaction('cache', 'readwrite'); t.objectStore('cache').put({ k: 'render-src', v: [{ id: 'sMR1', name: 'Oliy Himmat · 3D', from: 'mr', subj: 'reja', t: new Date().toISOString(), img: `data:image/png;base64,${b64}`, w: 256, h: 256 }], t: Date.now() }); t.oncomplete = () => ok(); t.onerror = () => no(t.error); });
  }, B64);
  await page.goto('./render.html#/s/sMR1');
  await expect(page.locator('.ren-base .cap')).toContainText('Oliy Himmat · 3D');
  await expect(page.locator('#subj button[aria-pressed=true]')).toHaveText('Master reja');
  await pickLang(page, 'en');
  await expect(page.locator('#renRight .ttl')).toHaveText('Render');
  await expect(page.locator('#srcFile')).toHaveText('From file');
  expect(errs).toEqual([]);
});

test('Koʻchasoz varagʻidan «Render studiyasiga» — kesim asos rasm boʻladi', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./kochasoz.html#/varaq');
  await expect(page.locator('.ws-varaq svg[role=img]')).toBeVisible();
  await page.locator('.ws-varaq button[data-ren]').click();
  await expect(page).toHaveURL(/render\.html/, { timeout: 20_000 });
  await expect(page.locator('.ren-base .fr')).toHaveText('Koʻchasoz');
  await expect(page.locator('#subj button[aria-pressed=true]')).toHaveText('Koʻcha');
  await expect(page.locator('.ren-base .cap code')).toHaveText(/^2400×\d+$/);
  expect(errs).toEqual([]);
});
