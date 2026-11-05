import { test, expect } from './fx';

/** 05.11 (egasi): yer osti avtoturargoh kirish-chiqishi va shamollatish shaxtalari modelda — park-414 va ug-park-415 haqiqiy masofalar bilan */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`avtoturargoh kirish-chiqishi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.locator('#genMore summary').click();
  await page.click('[data-park=yer_osti]');
  await expect(page.locator('[data-park=yer_osti]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#genGo');
  await expect(page.locator('#entBox')).toBeVisible();
  const ents = () => page.evaluate(() => { const d = (window as any).__mr.store.doc; const g = d.garages.find((q: any) => q.kind === 'yer_osti'); return g ? (g.entries ?? []).map((e: any) => e.kind) : null; });
  const e0 = await ents(); expect(e0).not.toBeNull(); expect(e0!.filter((k: string) => k === 'rampa')).toHaveLength(1); expect(e0!.filter((k: string) => k === 'shaxta').length).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#entBox [data-entry="0"]')).toBeVisible();
  // qoidalar: kirish qoʻyilgan — natija «koʻrib chiqish» emas
  const st = () => page.evaluate(() => { const m = (window as any).__mr; return Object.fromEntries((m.last?.results ?? []).filter((r: any) => r.id === 'park-414' || r.id === 'ug-park-415').map((r: any) => [r.id, r.status])); });
  await expect.poll(async () => (await st())['ug-park-415'], { timeout: 20_000 }).toMatch(/pass|fail/);
  expect((await st())['park-414']).toMatch(/pass|fail|review/);
  // olib tashlab, «Avtomatik joylashtir» bilan qayta
  await page.evaluate(() => { const m = (window as any).__mr, g = m.store.doc.garages.find((q: any) => q.kind === 'yer_osti'); m.store.dispatch({ type: 'updateGarage', id: g.id, patch: { entries: [] } }); m.renderPanel(); });
  await expect(page.locator('#entNone')).toBeVisible();
  await page.click('#entAuto');
  await expect(page.locator('#entBox [data-entry="0"]')).toBeVisible();
  expect((await ents())!.length).toBeGreaterThanOrEqual(2);
  // sahnada belgi (pandus va shaxta)
  await expect.poll(() => page.evaluate(() => { let c = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.entry) c++; }); return c; }), { timeout: 15_000 }).toBeGreaterThan(2);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/kirish_${w}${dark ? 'd' : 'l'}.png` }); }
});
