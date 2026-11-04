import { test, expect } from './fx';

/** 04.11 (egasi): chizma aksonometriyasi sahnaning ish holatiga bogʻliq emas — izolyatsiya, tanlangan bino, kesim, «Funksional» uslub
 *  chizmaga tushmaydi; har uslub (oq maket, funksiya, fasad…) — oʻz grafikasida. Keyin sahna avvalgi holatiga qaytadi. */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`chizma — sahnaning ish holatisiz · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(4);
  const shot = (look: string) => page.evaluate((l) => (window as any).__mr.axoShot(l, undefined, true, 1.5) as string, look);
  const diff = (a: string, b: string) => page.evaluate(async ([a, b]) => {
    const load = (u: string) => new Promise<HTMLImageElement>(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [A, B] = await Promise.all([load(a), load(b)]); const W = 360, H = Math.round(W * A.height / A.width);
    const px = (im: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!; g.drawImage(im, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
    const p = px(A), q = px(B); let s = 0; for (let i = 0; i < p.length; i += 4) s += (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])) / 3;
    return s / (W * H);   // oʻrtacha farq, 0–255
  }, [a, b] as const);
  const clean = { fasad: await shot('fasad'), oq: await shot('oq') };
  expect(await diff(clean.fasad, clean.oq)).toBeGreaterThan(1);   // uslublar farq qiladi
  // ish holati: funksional uslub, izolyatsiya, tanlangan bino, gorizontal kesim
  await page.evaluate(() => { const m = (window as any).__mr, sc = m.scene; m.stylePref = 'funksiya'; sc.setStyle('funksiya'); m.setIso(0); const b = m.store.doc.buildings[0]; m.sel = b.id; sc.select(b.id); sc.setSection({ kind: 'h', z: 12 }); });
  const busy = { fasad: await shot('fasad'), oq: await shot('oq') };
  expect(await diff(clean.fasad, busy.fasad)).toBeLessThan(1.5);
  expect(await diff(clean.oq, busy.oq)).toBeLessThan(1.5);
  // sahna holati qaytgan
  const st = await page.evaluate(() => { const sc = (window as any).__mr.scene; return { iso: sc.isolated, style: sc.style, clip: sc.renderer.clippingPlanes.length, sel: sc.selected }; });
  expect(st.iso).toBe(true); expect(st.style).toBe('funksiya'); expect(st.clip).toBe(1); expect(st.sel).toBeTruthy();
  if (process.env.GX_SHOTS) {
    const fs = await import('fs');
    for (const [k, u] of Object.entries({ ...Object.fromEntries(Object.entries(clean).map(([k, v]) => [`toza_${k}`, v])), ...Object.fromEntries(Object.entries(busy).map(([k, v]) => [`band_${k}`, v])) }))
      fs.writeFileSync(`${process.env.GX_SHOTS}/chizma_${k}_${w}${dark ? 'd' : 'l'}.png`, Buffer.from((u as string).split(',')[1], 'base64'));
    await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/chizma_sahna_${w}${dark ? 'd' : 'l'}.png` });
  }
});

/** 04.11 (egasi: «rasmini koʻrsat»): Kvartiralar qadamida «Sodda» da uzoqdan kvartira ranglari qoladi */
test('kvartira ranglari — Sodda, uzoqdan', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]'); await page.click('[data-view=axo]');
  await page.evaluate(() => (window as any).__mr.scene.frameDoc((window as any).__mr.store.doc));
  await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.liteOn)).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/kv_sodda_uzoq.png` }); }
});
