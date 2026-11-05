import { test, expect } from './fx';

/** 05.11 (egasi): chekinish har qirrada shu qirraga qaragan seksiyalarning haqiqiy balandligidan (79-band, 2-jadval, 1-izoh) — 2-oʻtishli generatsiya */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`chekinish qirralar boʻyicha · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  // qatorlar, 7 ball (Hmax·kʏ oraliq — ikki qator sigʻadi), janub qatori generatorda pastroq boʻladi
  await page.evaluate(() => { const m = (window as any).__mr; m.store.dispatch({ type: 'setSettings', patch: { seismic: 7 } }); Object.assign(m.gen, { typology: 'qatorlar', minF: 5, maxF: 12, setbackAuto: true, parking: 'yoq' }); m.renderPanel(); });
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('79-band');
  const info = await page.evaluate(() => { const m = (window as any).__mr, d = m.store.doc, fr = m.frame ? m.frame(d.origin) : null; const bs = d.buildings.filter((b: any) => b.gen); return { n: bs.length, floors: bs.map((b: any) => b.floors), notes: Array.from(document.querySelectorAll('#genNotes *')).map(e => (e as HTMLElement).innerText).join(' ') }; });
  expect(info.n).toBeGreaterThan(1);
  // 2-oʻtish izohi: qirralar boʻyicha H oraligʻi (seksiyalar balandligi turlicha boʻlsa) yoki bitta H
  expect(info.notes).toMatch(/Chekinish \(79-band, 2-jadval\): H/);
  if (new Set(info.floors).size > 1) expect(info.notes).toContain('qirralar boʻyicha');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/chekinish_qirra_${w}${dark ? 'd' : 'l'}.png` }); }
});
