import { test, expect, type Page } from './fx';
import { readFileSync } from 'fs';

/** Koʻchasoz (app/kochasoz.html): kanvas maketlari A, B, C, E, Grafika, Varaq — rejimlar, kesim tahriri, saqlash, A→B, Varaq→Chizmadon */
const errs: string[] = [];
async function open(page: Page, hash: string, q = ''): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto(`./kochasoz.html${q}#/${hash}`);
  await expect(page.locator('.ws')).toBeVisible();
}
const blk = (page: Page) => page.locator('.ws-b .blk');

test.beforeEach(() => { errs.length = 0; });

test('B kesim: zona tanlash, eni, qoʻshish, saqlanadi; rejimlar va tekshiruv', async ({ page }) => {
  await open(page, 'b');
  await expect(page.locator('.eko .svc a.on')).toHaveText(/Koʻchasoz/);
  await expect(page.locator('.ws-b .mtab[aria-pressed=true]')).toContainText('Kesim');
  const n0 = await blk(page).count(); expect(n0).toBeGreaterThan(8);
  await expect(page.locator('.ws-b .chk').first()).toBeVisible();
  // 3-zonani tanlab, enini oshirish
  await blk(page).nth(2).click();
  await expect(blk(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
  const w0 = (await blk(page).nth(2).locator('.w').textContent())!.trim();
  await page.getByRole('button', { name: 'Enini oshirish' }).click();
  await expect(blk(page).nth(2).locator('.w')).not.toHaveText(w0);
  // zona qoʻshish (Velo)
  await page.locator('.ws-b .chipb', { hasText: '+ Velo' }).click();
  await expect(blk(page)).toHaveCount(n0 + 1);
  // koʻrinish: Reja
  await page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Reja' }).click();
  await expect(page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Reja' })).toHaveAttribute('aria-pressed', 'true');
  // qayta yuklash — saqlangan
  await page.waitForTimeout(400);
  await page.reload(); await expect(page.locator('.ws-b')).toBeVisible();
  await expect(blk(page)).toHaveCount(n0 + 1);
  // tayyor kesim: Mahalla
  await page.locator('.ws-b .tpl', { hasText: 'Mahalla koʻchasi' }).click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Mahalla koʻchasi');
  // muhandislik tarmoqlari — avto joylash
  await page.locator('.ws-b aside').last().getByRole('button', { name: 'Avto joylash' }).click();
  await expect(page.locator('.ws-b .ub').first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('saytda: faqat Kesim (Kesim, Reja, Aksonometriya koʻrinishlari) va Varaq; qolganlari «Tez orada», Grafika yashirin', async ({ page }) => {
  await open(page, 'c');
  await expect(page).toHaveURL(/#\/b$/);                                   // tayyor boʻlmagan rejim → B
  await expect(page.locator('.ws-b .mtab[aria-disabled=true]')).toHaveCount(3);
  await expect(page.locator('.ws-b .mtab', { hasText: 'Mikromodel' })).toHaveCount(0);       // butunlay yashirin
  await expect(page.locator('.ws-b .mtab', { hasText: 'Chorraha' }).locator('em.soon')).toHaveText('Tez orada');
  await page.locator('.ws-b .mtab', { hasText: 'Chorraha' }).click({ force: true });   // aria-disabled — bosilsa ham oʻtmaydi
  await expect(page).toHaveURL(/#\/b$/);
  await expect(page.locator('.ws-b main .seg').first().locator('button')).toHaveText(['Kesim', 'Reja', 'Aksonometriya']);
  await expect(page.locator('#ksGrafika')).toHaveCount(0);
  await expect(page.locator('#ksVaraq')).toBeVisible();
  // zona chegarasini pastki qatorda sudrash: qoʻshni zona hisobidan, umumiy kenglik oʻzgarmaydi
  const w = () => page.evaluate(() => (window as any).__ks.m.inst.state.els.map((e: [string, number]) => e[1]));
  const w0 = await w(), sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;
  const hb = (await page.locator('.ws-b .ks-sh').nth(1).boundingBox())!;
  await page.mouse.move(hb.x + 6, hb.y + 20); await page.mouse.down(); await page.mouse.move(hb.x + 40, hb.y + 20, { steps: 4 }); await page.mouse.up();
  const w1 = await w(); expect(w1[1]).toBeGreaterThan(w0[1]); expect(w1[2]).toBeLessThan(w0[2]); expect(sum(w1)).toBe(sum(w0));
  // tarmoq: avto joylash, sudrash → meʼyor javobi chiqadi
  await page.locator('.ws-b .tb', { hasText: 'Avto joylash' }).click();
  const ub = (await page.locator('.ws-b .ub').first().boundingBox())!;
  await page.mouse.move(ub.x + 8, ub.y + 8); await page.mouse.down(); await page.mouse.move(ub.x + 60, ub.y + 8, { steps: 4 }); await page.mouse.up();
  await expect(page.locator('.ws-b .ks-ufb')).toHaveText(/^[✓✕]/);
  // bino qavati chizmada: + tugmasi
  await page.locator('.ws-b main .seg').first().getByRole('button', { name: 'Kesim' }).click();
  const bL = await page.evaluate(() => (window as any).__ks.m.inst.state.bL);
  await page.locator('.ws-b .ks-bb').nth(1).click();
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.bL)).toBe(bL + 1);
  // tayyor kesimlar: Master reja profillari guruhi
  await page.locator('.ws-b .ks-dd').click();
  await page.locator('.ws-b .ks-menu button', { hasText: 'Asosiy' }).click();
  await expect(page.locator('.ws-b .ks-menu')).toHaveCount(0);
  await page.locator('.ws-b .tpl', { hasText: 'Mahalla koʻchasi' }).click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Mahalla koʻchasi');
  // «Tayyor kesimlar» boʻlimi yigʻiladi
  await page.locator('.ws-b .ks-acc').click();
  await expect(page.locator('.ws-b .tpl')).toHaveCount(0);
  await page.locator('.ws-b .ks-acc').click();
  await expect(page.locator('.ws-b .tpl').first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('beta: A tarmoq → B, C chorraha, E mikromodel, Grafika, Varaq', async ({ page }) => {
  await open(page, 'a', '?beta');
  await expect(page.locator('.ws-a .mtab[aria-pressed=true]')).toContainText('Tarmoq');
  await page.locator('.ws-a .mtab', { hasText: 'Chorraha' }).click();
  await expect(page.locator('.ws-c')).toBeVisible();
  await expect(page.locator('.ws-c .chk').first()).toBeVisible();
  await page.locator('.ws-c .mtab', { hasText: 'Mikromodel' }).click();
  await expect(page.locator('.ws-e')).toBeVisible();
  await page.locator('#ksGrafika').click();
  await expect(page.locator('.ws-grafika svg path').first()).toBeAttached();
  await page.locator('#ksVaraq').click();
  await expect(page.locator('.ws-varaq svg[role=img]')).toBeVisible();
  // A: koʻchani tanlab, «Kesimini ochish (B)» — B mos tayyor kesim bilan ochiladi
  await page.goto('./kochasoz.html#/a'); await expect(page.locator('.ws-a')).toBeVisible();
  await page.evaluate(() => { const k = (window as any).__ks; k.m.inst.setState({ sel: 0 }); });   // «Shahar magistrali A» (sh2 → Avtobus koridori)
  await page.locator('.ws-a a[href="#/b"]').click();
  await expect(page.locator('.ws-b aside').first()).toContainText('Avtobus koridori');
  expect(errs).toEqual([]);
});

test('Varaq: SVG yuklab olish va Chizmadonga yuborish', async ({ page }) => {
  await open(page, 'varaq');
  const dl = page.waitForEvent('download');
  await page.locator('.ws-varaq button', { hasText: /^SVG$/ }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.svg$/);
  await page.locator('.ws-varaq .btn-primary').click();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 20_000 });
  await expect(page.locator('.gx.ch')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();
  expect(errs).toEqual([]);
});

test('til va tungi rejim', async ({ page }) => {
  await open(page, 'b');
  await page.locator('#langSw [data-lang=en]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => [localStorage.getItem('mr-lang'), localStorage.getItem('kps_lang')])).toEqual(['en', 'en']);
  await page.locator('#themeBtn').click();
  const t = await page.locator('html').getAttribute('data-theme');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', t!);
  expect(errs).toEqual([]);
});

test('Master reja koʻchasi → «Koʻchasozda ochish» → B kesim shu profil bilan', async ({ page }) => {
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await expect(page.locator('#stKs')).toBeVisible();
  const name = (await page.locator('[data-sid] .k').first().textContent())!.replace(/^\d+\.\s*/, '').split(' · ')[0];
  await page.click('#stKs');
  await expect(page).toHaveURL(/kochasoz\.html#\/b$/);
  await expect(page.locator('.ws-b aside').first()).toContainText(name);
  expect(errs).toEqual([]);
});

/** B · kesim → DXF (Archicad/AutoCAD): metr 1:1, qizil chiziqlar orasi, zona enlari — DIMENSION, siluetlar — blok, UI yoʻq */
test('kesim DXF eksporti: S3 (21,7 m) — oʻlchamlar, qatlamlar, bloklar', async ({ page }) => {
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Kesim' }).click();
  await page.evaluate(() => { const E = [['front', 1.5, { orin: true }], ['piy', 3, {}], ['yash', 2, { daraxt: true }], ['park', 2.2, { mashina: true }], ['qat', 3.25, {}], ['qat', 3.25, {}], ['yash', 2, { daraxt: true }], ['piy', 3, {}], ['front', 1.5, {}]]; (window as any).__ks.m.inst.setState({ els: E, rl: 21.7, tplName: 'S3', sel: 0, selU: -1 }); });
  await page.click('[data-ksexp]');
  await expect(page.locator('.ks-menu [role=menuitemcheckbox]')).toHaveCount(5);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.ks-menu button:has-text("DXF")')]);
  expect(dl.suggestedFilename()).toMatch(/^s3_kesim_\d{4}-\d{2}-\d{2}\.dxf$/);
  const txt = readFileSync(await dl.path(), 'utf8'), T = txt.split(/\r?\n/).map(s => s.trim());
  expect(T[T.indexOf('$INSUNITS') + 2]).toBe('6');                         // metr
  // qizil chiziqlar: vertikal LWPOLYLINE, x = 0 va 21,7
  const ents: Record<string, string>[] = []; let cur: Record<string, string> | null = null;
  for (let i = T.indexOf('ENTITIES') + 1; i < T.length - 1; i += 2) { if (T[i] === '0') { if (cur) ents.push(cur); cur = { type: T[i + 1] }; if (T[i + 1] === 'ENDSEC') break; } else if (cur && !(T[i] in cur)) cur[T[i]] = T[i + 1]; }
  const red = ents.filter(e => e.type === 'LWPOLYLINE' && e['8'] === 'KS_RED_LINE').map(e => +e['10']).sort((a, b) => a - b);
  expect(red[0]).toBeCloseTo(0, 3); expect(red[red.length - 1]).toBeCloseTo(21.7, 3);
  // 9 zona + umumiy — haqiqiy DIMENSION, oʻlchanadigan qiymat (42)
  const dims = ents.filter(e => e.type === 'DIMENSION').map(e => +e['42']);
  expect(dims.length).toBe(10); expect(dims[9]).toBeCloseTo(21.7, 3); expect(dims.slice(0, 9).map(v => +v.toFixed(2))).toEqual([1.5, 3, 2, 2.2, 3.25, 3.25, 2, 3, 1.5]);
  // siluetlar — INSERT, qatlamlar
  expect(ents.some(e => e.type === 'INSERT' && e['8'] === 'KS_PEOPLE')).toBe(true);
  expect(ents.some(e => e.type === 'INSERT' && e['8'] === 'KS_CARS')).toBe(true);
  expect(ents.some(e => e.type === 'HATCH' && e['8'] === 'KS_ZONE_LANE')).toBe(true);
  // UI: tanlov rangi (#4c5bd4) va «qavat» kartochkasi yoʻq
  expect(txt).not.toContain(String(0x4c5bd4)); expect(txt).not.toMatch(/\d+ qavat/);
});

/** EN rejimida kesim va DXF faylida oʻzbekcha yozuv qolmaydi, oʻnlik ajratgich — nuqta */
test('kesim DXF: EN — oʻzbekcha yozuvsiz, oʻnlik nuqta', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('mr-lang', 'en'); localStorage.setItem('kps_lang', 'en'); });
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.locator('.ws-b main .seg').first().locator('button').first().click();
  await page.evaluate(() => { const E = [['front', 1.5, {}], ['piy', 3, {}], ['yash', 2, { daraxt: true }], ['qat', 3.25, {}], ['qat', 3.25, {}], ['med', 2, {}], ['bus', 3.5, {}], ['tram', 7, {}], ['velo', 2.5, {}], ['piy', 3, {}]]; (window as any).__ks.m.inst.setState({ els: E, rl: 31, tplName: 'S7', sel: 0, selU: -1 }); });
  await page.locator('.ws-b button', { hasText: /^Auto/ }).first().click();
  await page.click('[data-ksexp]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.ks-menu button:has-text("DXF")')]);
  const raw = readFileSync(await dl.path(), 'utf8');
  expect(raw).toMatch(/^[\x00-\x7f]*$/);                                  // ASCII: ʻ, –, kirill — \\U+XXXX
  const T = raw.replace(/\\U\+([0-9A-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))).split(/\r?\n/).map(s => s.trim());
  const texts: string[] = []; for (let i = 0; i < T.length - 1; i++) if (T[i] === '1' && T[i - 2] !== '9' && /[A-Za-zА-я]/.test(T[i + 1] ?? '')) texts.push(T[i + 1]);
  expect(texts).toContain('Section A–A'); expect(texts.some(t => t.startsWith('Footway zone'))).toBe(true);
  expect(texts.filter(t => /[ʻʼ]|Trotuar|Qatnov|Qizil|orasi|Toshkent|qavat/.test(t))).toEqual([]);
  expect(texts.filter(t => /\d,\d/.test(t))).toEqual([]);
});

/** Kesim chetlari: bino oʻrniga bogʻ / suv; tashqi chetni surish (chetdagi zona va qizil chiziqlar orasi); tor kesimda sigʻmagan tarmoq — ogohlantirish */
test('kesim chetlari, tashqi chetni surish, sigʻmagan tarmoq', async ({ page }) => {
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Kesim' }).click();
  await page.evaluate(() => { const E = [['front', 2, {}], ['piy', 3, {}], ['qat', 3.25, {}], ['qat', 3.25, {}], ['piy', 3, {}], ['yash', 3, { daraxt: true }]]; (window as any).__ks.m.inst.setState({ els: E, rl: 17.5, tplName: 'T', sel: 0, selU: -1, U: [] }); });
  const panelSeg = (i: number) => page.locator('.ws-b aside.panel').first().locator('div:has(> .chipb[aria-pressed])').filter({ hasText: 'Qiyalik' }).nth(i);
  await panelSeg(0).locator('button', { hasText: 'Bogʻ' }).click(); await panelSeg(1).locator('button', { hasText: 'Suv' }).click();
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'Daryo / kanal' })).toHaveCount(1);
  await expect(page.locator('.ws-b .blk').last()).toContainText('Suv');
  await expect(page.locator('.ws-b aside.panel').first().locator('.stepper')).toHaveCount(0);           // bino yoʻq — qavat tugmalari yoʻq
  const st = () => page.evaluate(() => { const s = (window as any).__ks.m.inst.state; return [s.rl, s.els[s.els.length - 1][1], s.els[0][1]]; });
  const sh = page.locator('.ws-b .ks-sh'), bb = (await sh.last().boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 30, bb.y + bb.height / 2, { steps: 5 }); await page.mouse.up();
  const [rl1, last1, first1] = await st();
  expect(rl1).toBeGreaterThan(17.5); expect(last1).toBeCloseTo(3 + (rl1 - 17.5), 2); expect(first1).toBe(2);
  // tor kesim: suv quvuri sigʻmaydi — qoʻyilmaydi, ogohlantirish
  await page.evaluate(() => { const E = [['piy', 1.5, {}], ['qat', 3, {}], ['piy', 1.5, {}]]; (window as any).__ks.m.inst.setState({ els: E, rl: 6, sel: 0, selU: -1, U: [], eL: 'bino', eR: 'bino' }); });
  await page.locator('.ws-b button', { hasText: /^Avto joylash/ }).first().click();
  await expect(page.locator('.ws-b .chk', { hasText: 'Sigʻmagan tarmoqlar' })).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.U.some((u: any) => u.k === 'W'))).toBe(false);
});

/** Ariq / lotok — zona: qoʻshiladi, kesim/reja/varaqda xatosiz, DXF da KS_ZONE_WATER */
test('ariq / lotok zonasi', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && /TypeError|ReferenceError/.test(m.text())) errs.push(m.text()); });
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Kesim' }).click();
  await page.evaluate(() => { const E = [['piy', 3, {}], ['qat', 3.5, {}], ['qat', 3.5, {}], ['piy', 3, {}]]; (window as any).__ks.m.inst.setState({ els: E, rl: 13, tplName: 'A', sel: 1, selU: -1, U: [] }); });
  await page.locator('.ws-b .chipb', { hasText: /^\+ Ariq$/ }).click();
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.els.map((e: any) => e[0]).join(','))).toBe('piy,qat,ariq,qat,piy');
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'Ariq / lotok' })).toHaveCount(1);   // legenda
  await expect(page.locator('.ws-b').getByText(/242-band.*QMQ 2\.04\.03-19, 19-jadval/).first()).toBeVisible();   // meʼyoriy band
  await page.click('[data-ksexp]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.ks-menu button:has-text("DXF")')]);
  expect(readFileSync(await dl.path(), 'utf8')).toContain('KS_ZONE_WATER');
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Reja' }).click();
  await page.goto('./kochasoz.html#/varaq'); await page.waitForTimeout(800);
  expect(errs).toEqual([]);
});

/** Chet turlari varaqda ham: B da tanlangan bogʻ / suv — varaq kesimi va rejasida, bino oʻrniga */
test('varaq — chet turlari', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ eL: 'suv', eR: 'bog' }));
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Reja' }).click();
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'Daryo / kanal' })).toHaveCount(1);   // B rejasi
  await page.evaluate(() => { location.hash = '#/varaq'; });
  await page.waitForFunction(() => (window as any).__ks?.id === 'varaq');
  const t = page.locator('svg text');
  await expect(t.filter({ hasText: 'Daryo / kanal' })).toHaveCount(2);   // kesim + reja
  await expect(t.filter({ hasText: /^Bogʻ$/ })).toHaveCount(2);
  expect(errs).toEqual([]);
});
