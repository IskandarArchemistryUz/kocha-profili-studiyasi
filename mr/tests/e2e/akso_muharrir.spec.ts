import { test, expect, type Page, type BrowserContext } from './fx';

/**
 * c77 (egasi 11.11): varaqdagi aksonometriya muharriri — «Qatlamlar va ranglar» (sukut — yopiq): qatlamni oʻchirish, qatlam rangi,
 * binolar materiali, rasmda binoni bosib alohida rang va tom yozuvi; sahifa qayta yuklangach sozlama varaqda saqlanib qoladi.
 * AX_SHOTS — skrinshotlar papkasi (1440 yorugʻ, 1024 tungi).
 */
const SHOTS = process.env.AX_SHOTS;
const O = [69.2797, 41.3111];
const kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
const ring = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
/** Kichik sinov shahri: koʻchalar, binolar, bogʻ, suv va daraxtlar */
function city() {
  const el: unknown[] = []; let id = 1;
  for (const c of [-300, -150, 150, 300]) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [ll(c, -420), ll(c, 420)] });
    el.push({ type: 'way', id: id++, tags: { highway: c === -150 ? 'primary' : 'residential' }, geometry: [ll(-420, c), ll(420, c)] });
  }
  for (let bx = -225; bx <= 225; bx += 150) for (let by = -225; by <= 225; by += 150) {
    if (Math.abs(bx) < 150 && Math.abs(by) < 150) continue;
    if (bx === 225 && by === 225) continue;
    for (const [dx, dy] of [[-28, -22], [28, 22]]) el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': String(4 + ((bx + by + dx) / 75 & 5)) }, geometry: ring(bx + dx - 20, by + dy - 14, bx + dx + 20, by + dy + 14) });
  }
  el.push({ type: 'way', id: id++, tags: { leisure: 'park' }, geometry: ring(160, 160, 290, 290) });
  el.push({ type: 'way', id: id++, tags: { natural: 'water' }, geometry: ring(190, 190, 260, 250) });
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) el.push({ type: 'node', id: 900000 + i, tags: { natural: 'tree' }, ...ll((rnd() - 0.5) * 800, (rnd() - 0.5) * 800) });
  return { elements: el };
}
async function mockNet(ctx: BrowserContext) {
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, r => r.abort());
  await ctx.route(/overpass|interpreter/, r => r.fulfill({ json: city() }));
  await ctx.route(/elevation-tiles|terrain|amazonaws|openfreemap\.org|cartocdn|tile\.openstreetmap|arcgis/, r => r.fulfill({ status: 404, body: '' }));
}
const edit = (page: Page) => page.evaluate(() => { const d = (window as any).__mr.store.doc; return (d.sheets ?? []).map((s: any) => s.opts?.axo?.edit ?? null).find((e: unknown) => e) ?? null; });
const img = (page: Page) => page.locator('#gxView image[data-axo-img]').getAttribute('href');
async function shot(page: Page, name: string) { if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } }

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`akso muharriri — qatlamlar, ranglar, bino va tom yozuvi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(300_000);
  const tag = `${w}${dark ? 'd' : 'l'}`;
  await mockNet(context);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 30000 });
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'setSite', rings: [[[-120, -110], [120, -110], [120, 110], [-120, 110]].map(G)] });
    ed.store.dispatch({ type: 'addStreet', axis: [[-150, 0], [150, 0]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]');
  const opts = await page.locator('#genBlock option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(v => /^\d+$/.test(v)));
  for (const v of opts.slice(0, 2)) { await page.selectOption('#genBlock', v); await page.click('#genGo'); await page.waitForTimeout(1000); }
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(2);
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'setSettings', patch: { yards: true } }));

  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('#shMode [data-mode=akso]');
  await expect(page.locator('#gxView image[data-axo-img]')).toBeAttached({ timeout: 30000 });
  // sukut — yopiq, eski koʻrinish (edit yoʻq)
  await expect(page.locator('[data-frow=axo]')).toHaveAttribute('aria-expanded', 'false');
  expect(await edit(page)).toBeNull();
  const href0 = await img(page);
  await page.click('[data-frow=axo]');
  await expect(page.locator('#shAxLayers')).toBeVisible();
  // faqat sahnada bor qatlamlar
  for (const id of ['loyiha', 'atrof', 'daraxt', 'yol', 'suv', 'relyef', 'uchastka', 'fon']) await expect(page.locator(`[data-axrow=${id}]`)).toHaveCount(1);
  await page.locator('[data-axrow=loyiha]').scrollIntoViewIfNeeded();
  await shot(page, `akso_muharrir_panel_${tag}`);

  // 1) qatlamni oʻchirish — suv
  await page.locator('label.ck:has([data-axl=suv])').click();
  await expect.poll(async () => (await edit(page))?.hide).toEqual(['suv']);
  // 2) qatlam rangi — atrof binolari, yoʻllar; daraxtlar — xira
  await page.click('[data-axc=atrof]'); await page.click('#shAxSw-atrof [data-axsw="#bdbab3"]');
  await page.click('[data-axc=yol]'); await page.click('#shAxSw-yol [data-axsw="#585b62"]');
  await page.click('[data-axc=daraxt]'); await page.click('#shAxTree [data-axtree=xira]');
  await expect.poll(async () => (await edit(page))?.col).toEqual({ atrof: '#bdbab3', yol: '#585b62' });
  await expect.poll(() => img(page)).not.toBe(href0);   // rasm qayta olingan
  expect((await edit(page)).trees).toBe('xira');
  // «Andoza» — qaytarish
  await page.click('[data-axreset=daraxt]');
  await expect.poll(async () => (await edit(page))?.trees).toBeUndefined();
  // 3) material — yogʻoch
  await page.click('#shAxMat [data-axmat=yogoch]');
  await expect.poll(async () => (await edit(page))?.mat).toBe('yogoch');
  await page.locator('#shAxMat').scrollIntoViewIfNeeded();
  await shot(page, `akso_muharrir_ranglar_${tag}`);

  // 4) rasmda binoni bosib tanlash → alohida rang va tom yozuvi
  const pt = await page.evaluate(() => {
    const ed = (window as any).__mr, P = ed.axoPicksLast as { id: string; top: number[]; d: number }[], im = document.querySelector('#gxView image[data-axo-img]')!.getBoundingClientRect();
    const area = (t: number[]) => { let a = 0; for (let i = 0; i < t.length; i += 2) { const j = (i + 2) % t.length; a += t[i] * t[j + 1] - t[j] * t[i + 1]; } return Math.abs(a) / 2; };
    const p = [...P].sort((a, b) => area(b.top) - area(a.top))[0], n = p.top.length / 2;
    const c = [0, 1].map(k => p.top.filter((_, i) => i % 2 === k).reduce((s, v) => s + v, 0) / n);
    return { id: p.id, x: im.left + c[0] * im.width, y: im.top + c[1] * im.height };
  });
  await page.mouse.click(pt.x, pt.y);
  await expect(page.locator('#shAxBld')).toHaveValue(pt.id);
  await expect(page.locator('#gxView [data-axsel]')).toBeAttached();
  await page.click('#shAxBldSw [data-axbc="#c0643a"]');
  await expect.poll(async () => (await edit(page))?.bld?.[pt.id]?.col).toBe('#c0643a');
  await page.fill('#shAxBldTxt', 'Maktab № 5'); await page.press('#shAxBldTxt', 'Tab');
  await expect.poll(async () => (await edit(page))?.bld?.[pt.id]?.text).toBe('Maktab № 5');
  await page.locator('#shAxBldTxt').scrollIntoViewIfNeeded();
  await shot(page, `akso_muharrir_bino_${tag}`);
  await page.click('#shAxRNum');
  await expect.poll(async () => (await edit(page))?.roof).toEqual({ num: true });
  // sahna ish holatiga qaytgan: muharrir koʻrsatmasi yoʻq, atrof binolari asl rangida
  expect(await page.evaluate(() => { const sc = (window as any).__mr.scene; return sc.axoApply === null && '#' + sc.ctx.group.getObjectByName('binolar').material.color.getHexString() !== '#bdbab3'; })).toBe(true);

  // 5) «Barcha varaqlarga» — nusxa varaq boshqa material olsa ham, qoʻllashdan keyin hamma akso varaqlari bir xil
  const axOpen = async () => { if ((await page.locator('[data-frow=axo]').getAttribute('aria-expanded')) !== 'true') await page.click('[data-frow=axo]'); };
  await page.click('#shAdd'); await axOpen();
  await page.click('#shAxMat [data-axmat=beton]');
  await page.click('[data-sheet="0"]'); await axOpen();
  await page.click('#shAxAll');
  await expect.poll(() => page.evaluate(() => { const S = (window as any).__mr.store.doc.sheets.filter((s: any) => s.opts.mode === 'akso'); return S.length > 1 && S.every((s: any) => s.opts.axo?.edit?.mat === 'yogoch'); })).toBe(true);

  // 6) qayta yuklash — saqlangan
  await page.click('#gxClose');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 10000 });
  await page.reload(); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const e2 = await edit(page);
  expect(e2.hide).toEqual(['suv']); expect(e2.col).toEqual({ atrof: '#bdbab3', yol: '#585b62' }); expect(e2.mat).toBe('yogoch');
  expect(e2.bld[pt.id]).toEqual({ col: '#c0643a', text: 'Maktab № 5' }); expect(e2.roof).toEqual({ num: true });
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-sheet="0"]');
  await expect(page.locator('#gxView image[data-axo-img]')).toBeAttached({ timeout: 30000 });
  await expect(page.locator('[data-frow=axo] .v')).not.toHaveText(/andoza|default/i);
  await page.click('[data-frow=axo]');
  await expect(page.locator('[data-axl=suv]')).not.toBeChecked();
  await expect(page.locator('[data-axc=atrof]')).toHaveAttribute('data-v', '#bdbab3');
  await expect(page.locator('#shAxMat [data-axmat=yogoch]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#shAxRNum')).toHaveAttribute('aria-checked', 'true');
  // Tozalash — alohida bino sozlamasi oʻchadi
  await page.locator('#shAxBld').selectOption(pt.id, { force: true });
  await expect(page.locator('#shAxBldTxt')).toHaveValue('Maktab № 5');
  await page.click('#shAxBldClr');
  await expect.poll(async () => (await edit(page))?.bld?.[pt.id]).toBeUndefined();
});
