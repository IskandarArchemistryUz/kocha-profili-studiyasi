import { test, expect, pickLang } from './fx';

/** 10-band: ishlanayotgan dahani izolyatsiya qilish — tashqarisi yengil fon, ichkarisi toʻliq */
test('izolyatsiya: bitta daha toʻliq, qolgani arvoh toʻr; chiqish — asl holat', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(20);
  const stat = () => page.evaluate(() => {
    const ed = (window as any).__mr, sc = ed.scene; let tris = 0; const owners = new Set<string>(); let ghost = 0;
    sc.world.traverse((o: any) => { const g = o.geometry; if (o.isMesh && g) tris += (g.index ? g.index.count : g.attributes.position.count) / 3; if (o.userData.bOwner) owners.add(o.userData.bOwner); if (o.userData.isoGhost) ghost++; });
    return { tris: Math.round(tris), owners: owners.size, ghost, iso: sc.isolated, n: ed.store.doc.buildings.length };
  });
  const before = await stat();
  expect(before.iso).toBe(false); expect(before.owners).toBe(before.n);
  await expect(page.locator('#isoGo')).toHaveCount(0);   // daha tanlanmagan
  await page.selectOption('#genBlock', '0');
  await page.click('#isoGo');
  const iso = await stat();
  expect(iso.iso).toBe(true); expect(iso.ghost).toBe(1);
  expect(iso.owners).toBeGreaterThan(0); expect(iso.owners).toBeLessThan(before.n);
  // fasad tafsiloti (LOD) faqat hudud binolariga beriladi
  expect(await page.evaluate(() => { const sc = (window as any).__mr.scene, own = new Set<string>(); sc.world.traverse((o: any) => { if (o.userData.bOwner) own.add(o.userData.bOwner); }); return [...sc.detIds].every((id: string) => own.has(id)); })).toBe(true);
  await expect(page.locator('#isoExit')).toBeVisible();
  await expect(page.locator('#isoGo')).toHaveAttribute('aria-pressed', 'true');
  // tahrir izolyatsiyada ham ishlaydi: qayta generatsiya — tashqi binolar oʻzgarmaydi
  await page.click('#genGo');
  expect((await stat()).ghost).toBe(1);
  const shots = process.env.SHOTS;
  if (shots) {
    await page.screenshot({ path: `${shots}/iso-light.png` });
    await page.click('[data-view=axo], button:has-text("Aksonometriya")'); await page.waitForTimeout(800);
    await page.mouse.move(700, 400); for (let k = 0; k < 4; k++) await page.mouse.wheel(0, 400); await page.waitForTimeout(800);
    await page.screenshot({ path: `${shots}/iso-axo.png` });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.screenshot({ path: `${shots}/iso-dark.png` });
    await pickLang(page, 'en'); await page.screenshot({ path: `${shots}/iso-en.png` });
  }
  await page.click('#isoExit');
  const after = await stat();
  expect(after.iso).toBe(false); expect(after.ghost).toBe(0); expect(after.owners).toBe(after.n);
  await expect(page.locator('#isoExit')).toHaveCount(0);
});
