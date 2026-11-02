import { test, expect } from './fx';

// 02.11 (egasi: «OSM dan yuklanganda koʻprik bor joyda tekis yoʻl boʻlib qolyapti»): koʻprik koʻtariladi, pandus, tayanchlar; tunnel chizilmaydi
for (const dark of [false, true]) test(`OSM koʻprik va tunnel — 3D${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const els = [
    { type: 'way', id: 1, tags: { highway: 'primary', bridge: 'yes', layer: '1', lanes: '4' }, geometry: [ll(-60, 0), ll(60, 0)] },
    { type: 'way', id: 2, tags: { highway: 'primary', lanes: '4' }, geometry: [ll(-450, 0), ll(-60, 0)] },
    { type: 'way', id: 3, tags: { highway: 'primary', lanes: '4' }, geometry: [ll(60, 0), ll(450, 0)] },
    { type: 'way', id: 4, tags: { highway: 'secondary' }, geometry: [ll(0, -400), ll(0, 400)] },
    { type: 'way', id: 5, tags: { highway: 'tertiary', tunnel: 'yes', layer: '-1' }, geometry: [ll(-300, 150), ll(300, 150)] },
    { type: 'way', id: 9, tags: { building: 'yes' }, geometry: [ll(80, 60), ll(110, 60), ll(110, 90), ll(80, 90), ll(80, 60)] },
  ];
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: els } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: dark ? 1024 : 1440, height: 900 });
  await page.goto('./'); if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('1 bino', { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.scene.traverse((o: any) => { if (o.name === 'koʻpriklar') n++; }); return n; }), { timeout: 15000 }).toBe(1);
  const info = await page.evaluate(() => {
    const sc = (window as any).__mr.scene; let deck = 0, side = 0, tunnel = 0;
    sc.scene.traverse((o: any) => { if (o.name === 'koʻpriklar') deck = o.geometry.attributes.position.count; if (o.name === 'koʻprik tayanchlari') side = o.geometry.attributes.position.count; });
    const b = (window as any).__mr.ctxMgr.current.osm; tunnel = (b.tunnels ?? []).length;
    let maxY = -1e9; sc.scene.traverse((o: any) => { if (o.name === 'koʻpriklar') { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) maxY = Math.max(maxY, p.getY(i)); } });
    return { deck, side, tunnel, roads: b.roads.length, maxY };
  });
  expect(info.deck).toBeGreaterThan(0); expect(info.side).toBeGreaterThan(0);
  expect(info.tunnel).toBe(1); expect(info.roads).toBe(4);
  expect(info.maxY).toBeGreaterThan(6); expect(info.maxY).toBeLessThan(8);
  if (process.env.GX_SHOTS) {
    await page.click('[data-view=axo]'); await page.evaluate(() => (window as any).__mr.scene.frameRadius(110));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${process.env.GX_SHOTS}/koprik_${dark ? 'd' : 'l'}.png` });
  }
});
