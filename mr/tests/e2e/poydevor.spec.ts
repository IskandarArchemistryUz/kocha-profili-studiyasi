import { test, expect, type Page } from './fx';

async function newProject(page: Page) {
  await page.goto('./');
  await page.click('#newP');
  await expect(page).toHaveURL(/#\/p\/p_/);
  await expect(page.locator('.panel h2')).toHaveText('Hudud');           // yangi loyiha — avval joy tanlanadi
  await page.click('[data-step=uchastka]');
  await expect(page.locator('.panel h2')).toHaveText('Uchastka');
}

/** sahna markazi atrofida ekranda bino chizish */
async function drawBuilding(page: Page, dx = 0) {
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2 + dx, cy = box.y + box.height / 2;
  await page.click('#drawBld');
  await page.mouse.click(cx - 40, cy - 30); await page.mouse.click(cx + 40, cy + 30);
  await page.click('#drawBld');
}

test('yangi loyiha: nom saqlanadi va sahifa yangilanganda tiklanadi', async ({ page }) => {
  await newProject(page);
  const name = page.locator('.pname');
  await name.fill('Fitrat sinov'); await name.press('Enter');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('.pname')).toHaveValue('Fitrat sinov');
});

test('uchastka, bino, koʻrsatkichlar, undo/redo va yangilanish', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');                                        // 120 × 100 m
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await page.click('[data-step=hajm]');
  await drawBuilding(page);
  await expect(page.locator('#kGfa b')).not.toHaveText('—');
  const pop = await page.locator('#kPop b').textContent();
  expect(Number(pop!.replace(/\s/g, ''))).toBeGreaterThan(0);
  await page.keyboard.press('Control+z');                               // binoni bekor qilish
  await expect(page.locator('#kGfa b')).toHaveText('—');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('#kGfa b')).not.toHaveText('—');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await expect(page.locator('#bldSt b')).toHaveText('1 bino/seksiya');
});

test('meʼyoriy reyestr: §84 natijasi chiqadi', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await drawBuilding(page);
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=density-84]');
  await expect(row).toContainText('ShNQ 2.07.01-23 · 84-band');
  await expect(row.locator('.chip')).toHaveAttribute('data-s', /pass|fail/);
});

test('eksport → import: fayldan nusxa ochiladi', async ({ page }) => {
  await newProject(page);
  await page.locator('.pname').fill('Eksport sinovi'); await page.locator('.pname').press('Enter');
  await page.click('#rectSite');
  await page.click('[data-step=eksport]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exJson')]);
  const path = await dl.path();
  await page.click('#back');
  await expect(page.locator('#newP')).toBeVisible();
  await page.setInputFiles('#file', path!);
  await expect(page.locator('.pname')).toHaveValue('Eksport sinovi');
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await page.click('#back');
  await expect(page.locator('.card', { hasText: 'Eksport sinovi' })).toHaveCount(2);
});

test('uchastka chizilmaguncha loyiha qadamlari yopiq, keyin hammasi ochiq', async ({ page }) => {
  await newProject(page);
  await expect(page.locator('[data-step=xizmat]')).toHaveAttribute('data-locked', '');
  await page.click('#rectSite');   // newProject allaqachon «Uchastka»da (qayta bosish panelni yopadi)
  await expect(page.locator('.rail [data-locked]')).toHaveCount(0);
});

/** Regressiya: Akso → Reja oʻtishda kamera 3000 m uzoqlashib, uchastka nuqtadek kichrayib qolardi */
test('Reja koʻrinishi uchastkani ekranga moslab koʻrsatadi', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');                                        // 120 × 100 m
  await page.click('[data-view=plan]');
  const r = await page.evaluate(() => {
    const ed = (window as any).__mr, c: HTMLCanvasElement = ed.scene.renderer.domElement, b = c.getBoundingClientRect();
    const a = ed.scene.pick(b.left + b.width / 2, b.top + b.height / 2), z = ed.scene.pick(b.left + b.width / 2 + 100, b.top + b.height / 2);
    return { mPer100px: Math.hypot(z[0] - a[0], z[1] - a[1]), w: b.width };
  });
  const sitePx = 120 / r.mPer100px * 100;
  expect(sitePx).toBeGreaterThan(r.w * 0.2);
  expect(sitePx).toBeLessThan(r.w * 1.2);
});

/** Cheksiz xarita: joy surilib, uchastka uzoqda qoʻyilsa — loyiha markazi uchastkaga koʻchadi (atrof shu yerda yuklanadi) */
test('uzoqda qoʻyilgan uchastka — loyiha markazi unga koʻchadi', async ({ page }) => {
  await newProject(page);
  // kamera surish va tugma bosish bir evaluate ichida — orada asos xarita/kamera animatsiyasi nishonni qaytarib qoʻymasin (CI flake)
  const o0 = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin.slice(); ed.scene.ctl.target.set(2000, 0, -1500); ed.scene.ctl.update(); (document.querySelector('#rectSite') as HTMLElement).click(); return o; });
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.origin[0])).not.toBe(o0[0]);
  const d = await page.evaluate(() => { const doc = (window as any).__mr.store.doc, r = doc.site.rings[0], c = [r.reduce((a: number, p: number[]) => a + p[0], 0) / r.length, r.reduce((a: number, p: number[]) => a + p[1], 0) / r.length]; return [(c[0] - doc.origin[0]) * 84000, (c[1] - doc.origin[1]) * 111000]; });
  expect(Math.hypot(d[0], d[1])).toBeLessThan(20);
});

/** Yangi koʻcha uchi atrofdagi (OSM) yoʻl oʻqiga yopishadi — mavjud yoʻllarga ulanadi */
test('koʻcha uchi OSM yoʻliga yopishadi', async ({ page }) => {
  await newProject(page);
  const r = await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180);
    ed.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    ed.ctxMgr.current = { osm: { roads: [{ id: 1, cls: 'primary', w: 20, pts: [[o[0] - 200 / mx, o[1] + 100 / 111132], [o[0] + 200 / mx, o[1] + 100 / 111132]] }, { id: 2, cls: 'footway', w: 3, pts: [[o[0] - 200 / mx, o[1] - 50 / 111132], [o[0] + 200 / mx, o[1] - 50 / 111132]] }] } };
    return { a: ed.snapStreet([10, 90]), b: ed.snapStreet([10, 75]), c: ed.snapStreet([10, -49]) };
  });
  expect(r.a[1]).toBeCloseTo(100, 0);   // qatnov ichida bosildi → oʻqqa
  expect(r.b).toEqual([10, 75]);         // 25 m uzoqda — yopishmaydi
  expect(r.c).toEqual([10, -49]);        // piyoda yoʻlakka yopishmaydi
});

test('«Uchlarini mavjud yoʻllarga ulash» — qisqa qolgan koʻcha OSM yoʻlgacha uzayadi', async ({ page }) => {
  await newProject(page);
  await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    ed.ctxMgr.current = { osm: { roads: [{ id: 1, cls: 'primary', w: 20, pts: [g(-200, 100), g(200, 100)] }] } };
    ed.store.dispatch({ type: 'addStreet', axis: [g(0, -50), g(0, 85)], profile: 'mahalla-15' });
  });
  await page.click('#rectSite'); await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await page.click('#connEnds');
  const y = await page.evaluate(() => { const ed = (window as any).__mr, st = ed.store.doc.streets[0]; return (st.axis[st.axis.length - 1][1] - ed.store.doc.origin[1]) * 111132; });
  expect(y).toBeCloseTo(100, 0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets[0].axis.length)).toBe(3);
});

/** Xarita surilib «Atrofni yuklash» bosilsa — loyiha markazi ekran markaziga koʻchadi (Amir Temur xiyoboni qolib ketmaydi) */
test('«Atrofni yuklash» — markaz ekran markaziga koʻchadi', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await expect(page.locator('.panel h2')).toHaveText('Hudud');
  await page.waitForTimeout(1500);   // fon xaritasi kelib kamerani moslashi mumkin — undan keyin suriladi
  // surish va bosish bir vaqtda (fon xaritasi kelganda kamera qayta moslanishi oldini olish uchun)
  const o0 = await page.evaluate(() => { const ed = (window as any).__mr; ed.scene.ctl.target.set(1500, 0, -900); ed.scene.ctl.update(); const o = ed.store.doc.origin; (document.querySelector('#ctxLoad') as HTMLButtonElement).click(); return o; });
  const d = await page.evaluate(([o]) => { const ed = (window as any).__mr, o1 = ed.store.doc.origin; return [(o1[0] - o[0]) * 84000, (o1[1] - o[1]) * 111132, ed.store.doc.context.loaded]; }, [o0]);
  expect(d[0]).toBeGreaterThan(1400); expect(d[1]).toBeGreaterThan(800); expect(d[2]).toBe(true);
});

/** 3-band: atrofdagi (OSM) yoʻl va trotuar bosib tanlanadi, Delete bilan olib tashlanadi, Ctrl+Z — qaytadi */
test('atrof yoʻli va piyoda yoʻlagi tanlanib oʻchiriladi', async ({ page }) => {
  await newProject(page);
  await page.click('[data-view=plan]');
  const at = await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    ed.ctxMgr.current = { osm: { roads: [{ id: 11, cls: 'primary', w: 14, pts: [g(-150, 0), g(150, 0)] }, { id: 12, cls: 'footway', w: 3, pts: [g(-150, 40), g(150, 40)] }], buildings: [], green: [], water: [], rail: [] } };
    ed.scene.frameRadius(120);
    const r = ed.scene.renderer.domElement.getBoundingClientRect(), s = (x: number, y: number) => { const p = ed.scene.toScreen(x, y, 0); return [p.x + 0 * r.x, p.y + 0 * r.y]; };
    return { road: s(30, 2), foot: s(30, 40) };
  });
  const c = (await page.locator('#scene canvas').boundingBox())!;
  const abs = (p: number[]) => (p[0] > c.x && p[1] > c.y ? p : [p[0] + c.x, p[1] + c.y]);
  const [rx, ry] = abs(at.road), [fx, fy] = abs(at.foot);
  await page.mouse.click(rx, ry);
  await expect(page.locator('.hint')).toContainText('yoʻllar — 1');
  await page.keyboard.down('Shift'); await page.mouse.click(fx, fy); await page.keyboard.up('Shift');
  await expect(page.locator('.hint')).toContainText('yoʻllar — 2');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/yol-tanlov.png` });
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.removedRoads)).toEqual([11, 12]);
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.removedRoads ?? [])).toEqual([]);
});

/** 5-band: uchastkani kesib oʻtgan mavjud koʻcha — kvartallar ustiga tushmaydi, loyihaga olinadi, toʻr koʻchalari unga ulanadi */
test('toʻr: mavjud koʻchalar saqlanadi — kvartallar ularning ustida emas', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '500'); await page.fill('#rh', '480'); await page.click('#rectSite');
  await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    ed.ctxMgr.current = { osm: { roads: [{ id: 21, cls: 'secondary', w: 14, pts: [g(-400, 20), g(400, 40)] }, { id: 22, cls: 'footway', w: 3, pts: [g(-400, -100), g(400, -100)] }], buildings: [], green: [], water: [], rail: [] } };
  });
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=tor]'); await page.click('[data-gpre=barselona]');
  await expect(page.locator('#gridKeep')).toHaveAttribute('aria-checked', 'true');
  await page.click('#gridApply');
  const r = await page.evaluate(() => {
    const ed = (window as any).__mr, d = ed.store.doc, o = d.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), L = (p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132];
    const ad = d.streets.filter((s: any) => s.osm === 21), grid = d.streets.filter((s: any) => s.gen === 'grid');
    // kvartal markazlari mavjud koʻcha oʻqidan uzoqda (tuman-40 yarmi = 20 m)
    const dist = (p: number[]) => { const a = [-400, 20], b = [400, 40], dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); };
    const blocks = ed.plan().blocks, minD = Math.min(...blocks.flatMap((b: any) => b.rings[0].map((p: number[]) => dist(p))));
    const touch = grid.filter((s: any) => s.axis.some((p: number[]) => dist(L(p)) < 1)).length;
    return { ad: ad.length, profile: ad[0]?.profile, foot: d.streets.some((s: any) => s.osm === 22), grid: grid.length, minD, touch, blocks: blocks.length };
  });
  expect(r.ad).toBe(1); expect(r.profile).toBe('tuman-40'); expect(r.foot).toBe(false);
  expect(r.grid).toBeGreaterThan(2);
  expect(r.minD).toBeGreaterThan(19.5);   // hech bir kvartal mavjud koʻcha koridoriga kirmaydi
  expect(r.touch).toBeGreaterThan(0);     // toʻr koʻchalari mavjud koʻcha oʻqiga ulangan
  // bitta qadam ortga — olingan koʻcha ham, toʻr ham ketadi
  expect(await page.evaluate(() => { const ed = (window as any).__mr; ed.store.undo(); return ed.store.doc.streets.length; })).toBe(0);
  // oʻchirilsa — avvalgidek (mavjud koʻcha olinmaydi)
  await page.click('#gridKeep'); await page.click('#gridApply');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets.some((s: any) => s.osm === 21))).toBe(false);
});
