import { test, expect } from './fx';

/** Import qilingan binolarni sahnada tanlash (Shift + ramka, bosish) va alohida rang berish; rang loyihada saqlanadi */
const C = [66.5733, 38.3395], mx = 1 / (111320 * Math.cos(C[1] * Math.PI / 180)), my = 1 / 110574;
const g = (x: number, y: number) => [C[0] + x * mx, C[1] + y * my];
const sq = (x: number, y: number, w: number, d: number) => [[g(x, y), g(x + w, y), g(x + w, y + d), g(x, y + d), g(x, y)]];
const fc = (features: unknown[]) => JSON.stringify({ type: 'FeatureCollection', features });
const F = (coordinates: unknown, properties: Record<string, unknown>) => ({ type: 'Feature', properties, geometry: { type: 'Polygon', coordinates } });
const buildings = fc(Array.from({ length: 12 }, (_, i) => F(sq(-150 + (i % 4) * 60, -60 + Math.floor(i / 4) * 60, 30, 30), { floors: 2, height_m: 6.7, landuse: i % 2 ? 'RES' : 'NOP' })));

test('qatlam obyektlari: ramka bilan tanlash, rang berish, tiklash, saqlanish', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|interpreter|openfreemap|arcgisonline|terrain|amazonaws/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.click('#ulOpen');
  await page.setInputFiles('#ulFile', { name: 'binolar.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(buildings) });
  await page.click('#ulOk');
  await expect(page.locator('#ulList .li')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.locator('#scene canvas').waitFor();
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // Shift + ramka: butun koʻrinish — hamma 12 bino tanlanadi
  await page.keyboard.down('Shift');
  await page.mouse.move(cx - 250, cy - 260); await page.mouse.down();
  await page.mouse.move(cx, cy, { steps: 4 }); await page.mouse.move(cx + 320, cy + 260, { steps: 4 });
  await page.mouse.up(); await page.keyboard.up('Shift');
  const card = page.locator('.ulcard');
  await expect(card).toBeVisible();
  await expect(card).toContainText('12 ta obyekt');
  await expect(card).toContainText('Toifa / qatlam rangi');
  // rang berish: tanlash uskunasi → HEX → OK
  await page.click('#ulSelColor');
  await page.fill('#cpHex', '#c0643a');
  await page.click('.cp [data-cp=ok]');
  await expect(card).toContainText('Alohida rang — 12 ta');
  await expect(page.locator('#undo')).toHaveAttribute('title', /Obyekt rangi/);
  // tiklash
  await page.click('#ulSelReset');
  await expect(card).toContainText('Toifa / qatlam rangi');
  await page.keyboard.press('Control+z');
  await expect(card).toContainText('Alohida rang — 12 ta');
  // Esc — tanlov bekor; rang hujjatda qoladi (sahifa yangilangach ham)
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  // bosib tanlash: bitta bino (rejada, sahna markazi atrofida), Shift + bosish — ikkinchisi qoʻshiladi
  await page.mouse.click(cx - 80, cy - 40);
  await expect(card).toBeVisible();
  await expect(card).toContainText('Obyekt #');
  await expect(card).toContainText('landuse');
  await page.keyboard.down('Shift'); await page.mouse.click(cx + 80, cy - 40); await page.keyboard.up('Shift');
  await expect(card).toContainText('2 ta obyekt');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/userlayers_rang.png` });
  await page.keyboard.press('Escape');
  // boshqa qadamlarda ham (Koʻchalar, Parsellar — oʻz bosish mantigʻi bor) qatlam obyekti tanlanadi
  for (const st of ['kocha', 'parsel']) {
    await page.click(`[data-step=${st}]`);
    expect(await page.locator(`[data-step=${st}][data-locked=true]`).count(), `${st} qulflanmagan`).toBe(0);
    await page.keyboard.press('Escape');
    await page.mouse.click(cx - 80, cy - 40);
    await expect(card, `${st} qadamida`).toBeVisible();
    await expect(card).toContainText('Obyekt #');
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  }
  await page.click('[data-step=hudud]');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved');
  await page.waitForTimeout(800);
  await page.reload();
  const ov = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const names = ['projects'];
    const all = await new Promise<any[]>((ok, no) => { const t = db.transaction(names[0]).objectStore(names[0]).getAll(); t.onsuccess = () => ok(t.result); t.onerror = () => no(t.error); });
    const p = all.find(x => x?.userLayers?.length) ?? all.find(x => x?.doc?.userLayers?.length)?.doc;
    return p?.userLayers?.[0]?.overrides ?? null;
  });
  expect(ov && Object.keys(ov).length).toBe(12);
});
