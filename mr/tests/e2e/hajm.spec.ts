import { test, expect } from './fx';

test('seksiya generatori: kvartal → seksiyalar, qavatni tahrirlash, undo, reyestr', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await page.selectOption('#genBlock', '0');
  await page.fill('#gMax', '9'); await page.press('#gMax', 'Tab');
  await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  const n = Number((await page.locator('#bldSt b').textContent())!.split(' ')[0]);
  expect(n).toBeGreaterThan(8);
  await expect(page.locator('#kPop b')).not.toHaveText('—');
  // qayta generatsiya — eski seksiyalar almashadi (koʻpaymaydi)
  await page.click('[data-typ=qatorlar]'); await page.click('#genGo');
  const m = Number((await page.locator('#bldSt b').textContent())!.split(' ')[0]);
  expect(m).toBeLessThan(n);
  await page.keyboard.press('Control+z');
  await expect(page.locator('#bldSt b')).toHaveText(`${n} bino/seksiya`);
  await page.click('#genClear');
  await expect(page.locator('#bldSt b')).toHaveText('0 bino/seksiya');
});

test('quyosh: vaqt surgichi va insolyatsiya xaritasi', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=quyosh]');
  await expect(page.locator('#sunInfo')).toContainText('balandlik');
  await page.locator('#sunTime').fill('9');
  await expect(page.locator('#sunInfo')).toContainText('09:00');
  await page.click('[data-date="06-22"]');
  await page.click('#insolGo');
  await expect(page.locator('#insolSt')).toContainText('oʻrtacha', { timeout: 30000 });
  const txt = (await page.locator('#insolSt').textContent())!;
  const mean = Number(txt.match(/oʻrtacha ([\d,]+)/)![1].replace(',', '.'));
  expect(mean).toBeGreaterThan(2); expect(mean).toBeLessThan(15);   // hovli va koʻchalar — qisman soyada
  await page.click('[data-date="03-22"]'); await page.click('#insolGo');
  await expect(page.locator('#insolSt')).toContainText('22 mart', { timeout: 30000 });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=insol-territory]')).toContainText('SanQvaN 0331-16');
});

test('tipologiyalar: minoralar va stilobat + yer osti parkovka → reyestrda taʼminot', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=blok_minora]');
  await page.fill('#gSty', '1'); await page.press('#gSty', 'Tab');
  await page.click('[data-park=yer_osti]');
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('Avtoturargoh (');
  await expect(page.locator('#genNotes')).toContainText('Talab:');
  await expect(page.locator('#genNotes')).toContainText('Yer uchastkasi UMN');
  await page.click('#kMore');
  const v = await page.locator('.drawer [data-rule=parking] .num').first().textContent();
  expect(Number(v!.replace(/\D/g, ''))).toBeGreaterThan(300);
});

test('avtoturargoh meʼyor boʻyicha: yer usti, 60° modul — joylar sahnada, talab va yetishmovchilik izohda', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-park=yer_usti]');
  await expect(page.locator('[data-pmod]')).toHaveCount(4);
  await page.click('[data-pmod=p60]');
  await expect(page.locator('#gPL')).toHaveCount(0);   // meʼyor boʻyicha — sathlar avtomatik
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('Burchakli 60°');
  await expect(page.locator('#genNotes')).toContainText('Talab:');
  const g = await page.evaluate(() => { const d = (window as any).__mr.store.doc; const x = d.garages[0]; return { n: x.stalls?.length ?? 0, sp: x.spaces, need: x.need, mod: x.module, ai: x.aisles?.length ?? 0 }; });
  expect(g.mod).toBe('p60'); expect(g.n).toBe(g.sp); expect(g.n).toBeGreaterThan(20); expect(g.ai).toBeGreaterThan(0); expect(g.sp).toBeLessThanOrEqual(g.need);
  if (g.sp < g.need) await expect(page.locator('#genNotes')).toContainText('Yetishmaydi');
  // #25 (26.10): boʻlaklar koʻchaga ulanadi — kirish yoʻli izohda (meʼyor bandlari bilan)
  await expect(page.locator('#genNotes')).toContainText(/Kirish yoʻli: [\d,]+ m|koʻchaga ulab boʻlmadi/);
  if (process.env.GX_SHOTS) { await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/park_kirish_1024.png` }); }
  // yer osti: sathlar talabga qarab
  await page.click('[data-park=yer_osti]'); await page.click('[data-pmod=p90]'); await page.click('#genGo');
  const u = await page.evaluate(() => { const x = (window as any).__mr.store.doc.garages[0]; return { lv: x.levels, sp: x.spaces, need: x.need }; });
  expect(u.sp).toBeGreaterThanOrEqual(Math.min(u.need, u.sp)); expect(u.lv).toBeGreaterThanOrEqual(1);
  if (u.lv < 4) expect(u.sp).toBeGreaterThanOrEqual(u.need);
});

test('shamol: shamol guli (EPW) va piyoda sathidagi oqim', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=quyosh]');
  await expect(page.locator('#windBox')).toContainText('Tashkent', { timeout: 15000 });
  await expect(page.locator('#windBox .rose path').first()).toBeAttached();
  await page.click('#windGo');
  await expect(page.locator('#windSt')).toContainText('shamoli', { timeout: 90000 });
  await expect(page.locator('.leg')).toContainText('Oʻtirish');
});

/** 6-band: qiya mavjud koʻcha kesgan oʻtkir burchakli kvartallarda ham ofis, savdo, maktab generatsiya qilinadi */
test('oʻtkir burchakli kvartallar: ofis, savdo, maktab joylashadi', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '220'); await page.click('#rectSite');
  await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'setContext', patch: { loaded: true } });
    ed.ctxMgr.current = { osm: { roads: [{ id: 31, cls: 'residential', w: 7, pts: [g(-300, -150), g(300, 60)] }], buildings: [], green: [], water: [], rail: [] } };
  });
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=tor]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  const r = await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    const bl = ed.plan().blocks.filter((b: any) => b.area > 1500).sort((a: any, b: any) => a.area - b.area);
    const uses = ['ofis', 'savdo', 'maktab'], out: any[] = [];
    ed.store.dispatch({ type: 'setZones', zones: bl.slice(0, 3).map((b: any, i: number) => ({ id: 'w' + i, at: G(b.centroid), use: uses[i] })) });
    const p2 = ed.plan();
    for (let i = 0; i < 3; i++) { const k = p2.blocks.findIndex((b: any) => b.labelId === 'w' + i); if (k < 0) continue; out.push({ use: p2.blocks[k].use, n: ed.generateBlock(k, true), note: ed.genNotes.join(' | ') }); }
    return out;
  });
  expect(r.length).toBe(3);
  for (const x of r) expect(x.n, `${x.use}: ${x.note}`).toBeGreaterThan(0);
});

test('shamol: Parijda — ERA5 (34-band), Toshkent stansiyasi emas', async ({ page }) => {
  const rose = Array.from({ length: 16 }, (_, k) => [k === 10 ? 0.3 : 0.04, 0.01, 0, 0, 0, 0]);
  await page.route(/\/data\/wind\?/, r => r.fulfill({ json: { source: 'era5', station: { name: 'ERA5 48.75, 2.25', file: 'ERA5 2015–2024', lat: 48.75, lon: 2.25, elev: null, hours: 87600, calm: 0.05, rose, mean: 3.4, p95: 7.1, monthT: Array(12).fill(12), monthV: Array(12).fill(3.4) } } }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: [2.3522, 48.8566], carry: false }));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=quyosh]');
  await expect(page.locator('#windSrc')).toContainText('ERA5', { timeout: 15000 });
  await expect(page.locator('#windStn')).toContainText('ERA5 48.75, 2.25');
  await expect(page.locator('#windFar')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/mr_era5_dark.png` });
});
