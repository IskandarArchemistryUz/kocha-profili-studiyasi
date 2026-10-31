import { test, expect } from './fx';

/** V2 (31.10): albomda tanlangan kvartiraning ichki rejasini qoʻlda sozlash — tomon, umumiy xona devori, master, surma eshiklar; saqlash */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ichki rejani qoʻlda sozlash · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  // ichki rejasi bor kvartirani topish: prixojayali kvartira
  const apts = page.locator('#albPlan svg [data-apt]');
  const n = await apts.count();
  let found = false;
  for (let i = 0; i < n && !found; i++) {
    await apts.nth(i).click({ force: true });
    if (await page.locator('#albInner').count() && await page.locator('#albInFlip').isEnabled()) found = true;
    else await apts.nth(i).click({ force: true });   // tanlovni olib tashlash
  }
  expect(found).toBe(true);
  const before = await page.locator('#albPlan svg').innerHTML();
  await page.click('#albInFlip');
  await expect(page.locator('#albInner')).toBeVisible();          // tanlov saqlanadi
  expect(await page.locator('#albPlan svg').innerHTML()).not.toBe(before);
  await page.click('#albInSlide');
  await expect(page.locator('#albInSlide')).toContainText('Oddiy eshiklar');
  if (await page.locator('#albInMaster').count()) await page.click('#albInMaster [aria-pressed=false] >> nth=0');
  await page.waitForTimeout(400);
  // 31.10: devorni sudrash (ArchiCAD/Revit kabi) — vaqtinchalik oʻlchamlar, strelka bilan 0,1 m
  const walls = page.locator('#albWalls [data-wall]');
  await expect(walls.first()).toBeAttached();
  let moved = false;
  for (let k = 0; k < await walls.count() && !moved; k++) {
    const bb = await walls.nth(k).boundingBox(); if (!bb) continue;
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, vert = bb.height > bb.width;
    await page.mouse.move(cx, cy); await page.mouse.down();
    for (const st of [6, 12, 18]) await page.mouse.move(cx + (vert ? st : 0), cy + (vert ? 0 : st));
    await expect(page.locator('#albWalls text').first()).toContainText('m');
    await page.mouse.up();
    moved = await page.locator('#albWallReset').count() > 0;
    if (!moved) { await page.mouse.move(cx, cy); await page.mouse.down(); for (const st of [-6, -12, -18]) await page.mouse.move(cx + (vert ? st : 0), cy + (vert ? 0 : st)); await page.mouse.up(); moved = await page.locator('#albWallReset').count() > 0; }
  }
  expect(moved).toBe(true);
  // aniq oʻlcham: devorni tanlash → oʻlchamni bosish → qiymat
  const bbOf = async (loc: typeof walls) => { for (let t = 0; t < 20; t++) { const n2 = await loc.count(); for (let k = 0; k < n2; k++) { const bx = await loc.nth(k).boundingBox().catch(() => null); if (bx) return bx; } await page.waitForTimeout(150); } throw new Error('element koʻrinmadi'); };
  const b0 = await bbOf(walls); await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await expect(page.locator('#albWalls [data-dim]').first()).toBeAttached();
  const html0 = await page.locator('#albPlan svg').innerHTML();
  await page.locator('#albWalls [data-dim]').first().click({ force: true });
  await expect(page.locator('#albDimIn')).toBeVisible();
  const cur = Number((await page.locator('#albDimIn').inputValue()).replace(',', '.'));
  await page.fill('#albDimIn', String(Math.round((cur - 0.1) * 10) / 10).replace('.', ',')); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  // joy boʻlmasa — aniq xabar (jim emas)
  if (await page.locator('#albPlan svg').innerHTML() === html0) await expect(page.locator('#albMsg')).toContainText('qoʻyib boʻlmaydi');
  // eshik: tanlash va Space — ochilish tomoni
  const dot = page.locator('#albWalls [data-door]'); await expect(dot.first()).toBeAttached();
  const db = await bbOf(dot); await page.mouse.click(db.x + db.width / 2, db.y + db.height / 2);
  const html1 = await page.locator('#albPlan svg').innerHTML();
  await page.keyboard.press(' ');
  await expect.poll(async () => page.locator('#albPlan svg').innerHTML()).not.toBe(html1);
  await page.keyboard.press('Escape');
  // xona turi: menyu
  await page.locator('#albRooms [data-room-k]').first().click({ force: true });
  await expect(page.locator('#albMenu')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_menyu_${w}${dark ? 'd' : 'l'}.png` });
  await page.locator('#albMenu [aria-checked=false]').first().click();
  await expect(page.locator('#albMenu')).toHaveCount(0);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_tahrir_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albSave');
  await expect(page.locator('#albSave')).toContainText('Saqlangan');
  const inner = await page.evaluate(() => (window as any).__mr.store.doc.buildings.flatMap((b: any) => b.planEdit?.apts ?? []).filter((a: any) => a.inner).length);
  expect(inner).toBeGreaterThan(0);
});
