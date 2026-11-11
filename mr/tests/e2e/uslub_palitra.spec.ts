import { test, expect, type Page } from './fx';

/**
 * c74 (egasi 06.11): grafika shablonlari — varaq sozlamasida tanlanadi (funksional reja, zonalashtirish, yer uchastkalari rejasi),
 * «Barcha varaqlarga», parsellar «bir xil kulrang»; sahna (3D) shabloni loyihada saqlanadi; Chizmadon albomida — «Uslub» boʻlimida.
 * Sukut — «Asl uslub» (mavjud loyihalar koʻrinishi oʻzgarmaydi). GX_SHOTS — har shablon uchun skrinshotlar.
 */
const SHOTS = process.env.GX_SHOTS;
const STYLES = ['joriy', 'pastel', 'kontrast', 'mono', 'yorqin', 'tuproq'];

async function setup(page: Page, w: number, dark: boolean) {
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|interpreter|arcgisonline|terrain|amazonaws|elevation|openfreemap|tile|cartocdn|openstreetmap\.org))/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '170'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'addStreet', axis: [[-140, 0], [140, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[20, -110], [20, 110]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]');
  const opts = await page.locator('#genBlock option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(v => /^\d+$/.test(v)));
  for (const v of opts.slice(0, 3)) { await page.selectOption('#genBlock', v); await page.click('#genGo'); await page.waitForTimeout(1200); }
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(0);
  // har xil funksiyalar: kvartallardan biri — maktab, biri — park
  await page.evaluate(() => { const ed = (window as any).__mr, z = ed.store.doc.zones; if (z.length > 2) ed.store.dispatch({ type: 'setZones', zones: z.map((q: any, i: number) => i === 1 ? { ...q, use: 'maktab' } : i === 2 ? { ...q, use: 'yashil' } : q) }); });
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`grafika shablonlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(420_000);
  await setup(page, w, dark);
  const tag = `${w}${dark ? 'd' : 'l'}`;

  // ---------- 3D sahna: shablon loyihada saqlanadi ----------
  await page.click('#stylePop');
  await expect(page.locator('#scGStyle [data-gstyle]')).toHaveCount(STYLES.length);
  await expect(page.locator('#scGStyle [data-gstyle=joriy]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#stylePop');
  await page.evaluate(() => { const sc = (window as any).__mr.scene; sc.setView('axo'); sc.frameDoc((window as any).__mr.store.doc); });
  for (const s of STYLES) {
    await page.click('#stylePop'); await page.click(`#scGStyle [data-gstyle=${s}]`);
    await expect(page.locator(`#scGStyle [data-gstyle=${s}]`)).toHaveAttribute('aria-pressed', 'true');
    await page.click('#stylePop');
    expect(await page.evaluate(() => (window as any).__mr.store.doc.gstyle ?? 'joriy')).toBe(s);
    // 3D daraxtlar: shablonda — bir nechta shakl (InstancedMesh), asl uslubda — bitta dumaloq toj
    const crowns = await page.evaluate(() => { const g: number[] = []; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.tree === 'crown') g.push(o.geometry.type === 'IcosahedronGeometry' ? 1 : 2); }); return g; });
    if (s === 'joriy') expect(crowns.every(x => x === 1)).toBe(true); else expect(crowns.length).toBeGreaterThan(0);
    if (SHOTS) { await page.waitForTimeout(700); await page.screenshot({ path: `${SHOTS}/sahna_${s}_${tag}.png` }); }
  }
  await page.click('#stylePop'); await page.click('#scGStyle [data-gstyle=joriy]'); await page.click('#stylePop');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.gstyle)).toBeUndefined();

  // ---------- Varaqlar ----------
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const names = await page.locator('[data-sheet]').allTextContents();
  const idx = { funksional: names.findIndex(t => /Funksional reja/.test(t)), zona: names.findIndex(t => /Zonalashtirish/.test(t)), parsel: names.findIndex(t => /Parsellar rejasi|Yer uchastkalari rejasi/.test(t)) };
  for (const v of Object.values(idx)) expect(v).toBeGreaterThanOrEqual(0);
  const view = page.locator('#gxView svg');
  await page.locator('[data-sheet]').nth(idx.zona).click();
  await expect(page.locator('#shGStyle [data-gstyle=joriy]')).toHaveAttribute('aria-pressed', 'true');
  const legend0 = await page.evaluate(() => document.querySelectorAll('#gxView #Shartli_belgilar text').length);
  for (const s of STYLES) for (const [k, i] of Object.entries(idx)) {
    await page.locator('[data-sheet]').nth(i).click();
    await page.click(`#shGStyle [data-gstyle=${s}]`);
    await expect(page.locator(`#shGStyle [data-gstyle=${s}]`)).toHaveAttribute('aria-pressed', 'true');
    if (k === 'zona') expect(await page.evaluate(() => document.querySelectorAll('#gxView #Shartli_belgilar text').length)).toBe(legend0);   // legend tuzilishi oʻzgarmaydi
    if (SHOTS) { await page.waitForTimeout(250); await view.screenshot({ path: `${SHOTS}/varaq_${k}_${s}_${tag}.png` }); }
  }
  // tanlov varaqda saqlanadi
  const saved = await page.evaluate(() => (window as any).__mr.store.doc.sheets.map((x: any) => x.opts.gstyle ?? 'joriy'));
  expect(saved.filter((x: string) => x === 'tuproq').length).toBe(3);
  // parsellar: bir xil kulrang (11.11: sukut — och #8c8a85)
  await page.locator('[data-sheet]').nth(idx.parsel).click();
  await page.click('#shParcel [data-parcel=kulrang]');
  const fills = await view.locator('#Parsellar path').evaluateAll(ps => [...new Set(ps.map(p => p.getAttribute('fill')))]);
  expect(fills).toEqual(['#8c8a85']);
  if (SHOTS) { await page.waitForTimeout(250); await view.screenshot({ path: `${SHOTS}/varaq_parsel_kulrang_${tag}.png` }); await page.screenshot({ path: `${SHOTS}/varaq_panel_${tag}.png` }); }
  await page.click('#shParcel [data-parcel=rang]');
  // barcha varaqlarga
  await page.click('#shGStyle [data-gstyle=pastel]'); await page.click('#shGStyleAll');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.sheets.every((x: any) => x.opts.gstyle === 'pastel'))).toBe(true);
  // akso varagʻi — shu shablon bilan rasm (sahna shabloni qaytariladi)
  await page.locator('#shMode [data-mode=akso]').click();
  await page.click('[data-alook=funksiya]');
  await expect(view.locator('image')).toHaveCount(1);
  if (SHOTS) { await page.waitForTimeout(300); await view.screenshot({ path: `${SHOTS}/varaq_akso_pastel_${tag}.png` }); }
  expect(await page.evaluate(() => (window as any).__mr.scene.gstyle)).toBe('joriy');
  await page.click('#gxClose');

  // ---------- Chizmadon: albom rejalari shabloni ----------
  await page.click('#chOpen'); await page.click('#chStGo').catch(() => {});
  const sec = page.locator('[data-sec=uslub] .ch-sh');
  if ((await sec.getAttribute('aria-expanded')) !== 'true') await sec.click();
  await expect(page.locator('#chGStyle [data-gstyle]')).toHaveCount(STYLES.length);
  await page.click('#chGStyle [data-gstyle=kontrast]');
  await expect(page.locator('#chGStyle [data-gstyle=kontrast]')).toHaveAttribute('aria-pressed', 'true');
  if (SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/chizmadon_kontrast_${tag}.png` }); }
});
