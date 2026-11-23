import { test, expect } from './fx';

/** 14.11 (3-PR): Master reja loyihasi ichidan boshqa xizmat — ?p= manzilda; qaytish yangi varaqda ham ishlaydi; holat loyihaga ajratilgan */
test('loyiha ichidan Joyshunos: ?p= manzilda, «← Master reja» loyihaga qaytaradi, holat loyihaga ajratilgan', async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr'));
  await page.waitForURL(/#\/p\/p_/);
  const pid = page.url().split('#/p/')[1];
  await page.locator('#svcPop').click();
  await expect(page.locator('#svcJoy')).toBeVisible();
  await page.locator('#svcJoy').click();
  await page.waitForURL(new RegExp(`joyshunos\\.html\\?p=${pid}`));
  // yangi varaq: sessionStorage yoʻq — kontekst baribir manzildan
  const p2 = await context.newPage();
  await p2.route(/fonts\.g/, r => r.abort());
  await p2.goto(`./joyshunos.html?p=${pid}`);
  const back = p2.locator('#mrBack');
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute('href', `./#/p/${pid}`);
  await expect(back.locator('.nm')).toHaveText('Yangi loyiha', { timeout: 10_000 });
  // xizmatlar menyusidagi havolalar ham loyihani saqlaydi
  expect(await p2.evaluate(() => [...document.querySelectorAll('a[href*="kochasoz.html"], a[href*="render.html"]')].every(a => (a as HTMLAnchorElement).getAttribute('href')!.includes('?p=')))).toBe(true);
  await p2.waitForTimeout(800);
  const keys = await p2.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain(`joy-state@${pid}`);
  await back.click();
  await p2.waitForURL(new RegExp(`#/p/${pid}$`));
  await expect(p2.locator('#svcPop')).toBeVisible({ timeout: 20_000 });
});

/** 22.11 (egasi: «yangi loyiha — boʻsh sahna, eski sahnalar ochilmasin»): eski ish bir marta nomli loyihaga, yangi loyiha toza */
test('Koʻchasoz: eski ish «… — eski ish» loyihasiga koʻchadi, yangi loyiha boʻsh; Render manbalari loyihalar orasida aralashmaydi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./kochasoz.html?asosiy=1#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.evaluate(() => { localStorage.setItem('ks-b', JSON.stringify({ bL: 7 })); localStorage.removeItem('svcmig:ks'); localStorage.removeItem('svcp:ks'); });
  await page.goto('./kochasoz.html');
  await expect(page.locator('#projWin .pw-card')).toHaveCount(1);
  await expect(page.locator('#projWin .pw-card')).toContainText('eski ish');
  const reg = await page.evaluate(() => JSON.parse(localStorage.getItem('svcp:ks') || '[]'));
  expect(await page.evaluate(id => localStorage.getItem(`ks-b@${id}`), reg[0].id)).toBe(JSON.stringify({ bL: 7 }));
  // yangi loyiha — eski holat yoʻq
  await page.click('#pwNew');
  await page.waitForURL(/kochasoz\.html\?p=s_\w+/);
  await page.waitForFunction(() => (window as any).__ks);
  const pid = new URL(page.url()).searchParams.get('p')!;
  expect(pid).not.toBe(reg[0].id);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem(`ks-b@${id}`) || '{}').bL, pid)).not.toBe(7);
  // qayta ochilganda — panel yana chiqadi (2 loyiha), eski sahna oʻzi ochilmaydi
  await page.goto('./kochasoz.html');
  await expect(page.locator('#projWin .pw-card')).toHaveCount(2);
  await expect(page.locator('#svcProj')).toHaveCount(0);
  // Render: bir loyihaga qoʻshilgan manba boshqasida koʻrinmaydi
  await page.goto('./render.html'); await page.click('#pwNew'); await page.waitForURL(/render\.html\?p=s_/);
  const r1 = new URL(page.url()).searchParams.get('p')!;
  const n = (key: string) => page.evaluate(async k => { const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); return new Promise<number>(ok => { const q = db.transaction('cache').objectStore('cache').get(k); q.onsuccess = () => ok((q.result?.v ?? []).length); }); }, key);
  await page.evaluate(async k => { const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); await new Promise<void>(ok => { const t = db.transaction('cache', 'readwrite'); t.objectStore('cache').put({ k, v: [{ id: 'sX', name: 'A', from: 'fayl', subj: 'reja', t: new Date().toISOString(), img: 'data:,' }], t: Date.now() }); t.oncomplete = () => ok(); }); }, `render-src@${r1}`);
  await page.goto('./render.html'); await page.click('#pwNew'); await page.waitForURL(/render\.html\?p=s_/);
  const r2 = new URL(page.url()).searchParams.get('p')!;
  expect(r2).not.toBe(r1);
  expect(await n(`render-src@${r2}`)).toBe(0);
  expect(await n(`render-src@${r1}`)).toBe(1);
});

/** 22.11 (egasi): xizmat loyihasiz ochilsa — eski ish oʻzi ochilmaydi, avval oʻz loyihalari paneli */
for (const svc of ['kochasoz', 'joyshunos', 'render']) {
  test(`${svc}: loyihasiz ochilganda — loyihalar paneli (eshik), xizmat yuklanmaydi`, async ({ page }) => {
    await page.route(/fonts\.g/, r => r.abort());
    await page.goto(`./${svc}.html`);
    await expect(page.locator('#projWin')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#pwClose')).toHaveCount(0);
    await expect(page.locator('#pwHome')).toBeVisible();
    await expect(page.locator('#svcProj')).toHaveCount(0);   // xizmat sarlavhasi chizilmagan
    await page.keyboard.press('Escape');
    await expect(page.locator('#projWin')).toBeVisible();
    await page.click('#pwNew');
    await page.waitForURL(new RegExp(`${svc}\\.html\\?p=s_\\w+`));
    await expect(page.locator('#projWin')).toHaveCount(0);
    await expect(page.locator('#svcProj')).toBeVisible({ timeout: 20_000 });
  });
}

/** 23.11 (egasi): «Loyihalarim» — barcha servis loyihalari bitta panelda; «Yangi loyiha» → servis tanlanadi, boʻsh sahna */
test('Loyihalarim: yangi loyiha servis tanlab ochiladi, kartalar servis belgisi va filtri bilan', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./#/');
  await expect(page.locator('h1')).toContainText('Loyihalarim');
  await expect(page.locator('#newMenu')).toBeHidden();
  await page.click('#newP');
  await expect(page.locator('#newMenu')).toBeVisible();
  await expect(page.locator('#newMenu button')).toHaveCount(5);
  await page.click('#newP-ks');
  await page.waitForURL(/kochasoz\.html\?p=s_\w+/);
  await expect(page.locator('#projWin')).toHaveCount(0);
  const ks = new URL(page.url()).searchParams.get('p')!;
  await page.goto('./#/'); await page.click('#newP'); await page.click('#newP-mr');
  await page.waitForURL(/#\/p\/p_/);
  await page.goto('./#/');
  await expect(page.locator(`#cards [data-sid="${ks}"] .svcbadge`)).toContainText('Koʻchasoz');
  await expect(page.locator('#svcF [data-s=ks]')).toBeVisible();
  await page.click('#svcF [data-s=ks]');
  await expect(page.locator('#cards [data-pid]')).toHaveCount(0);
  await expect(page.locator('#cards [data-sid]')).toHaveCount(1);
  await page.click('#svcF [data-s=mr]');
  await expect(page.locator('#cards [data-sid]')).toHaveCount(0);
  await expect(page.locator('#cards [data-pid]')).toHaveCount(1);
  await page.click('#svcF [data-s=all]');
  await page.click(`#cards [data-sid="${ks}"]`);
  await page.waitForURL(new RegExp(`kochasoz\\.html\\?p=${ks}`));
});
