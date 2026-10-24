import { test, expect } from './fx';

/** Boshqa xizmatdan yuborilgan varaq begona loyiha albomiga qoʻshilib ketmaydi (egasi, 24.10.2026) */
const item = (extra: object) => JSON.stringify({ name: 'Joyshunos · Parij', kind: 'sheet', svg: '<g id="01_A"><rect width="10" height="10"/></g>', vb: [0, 0, 420, 297], w: 420, h: 297, ...extra });

test('Chizmadon: boshqa joy tahlili — yangi alohida loyiha; Master rejadan kelinganda — shu loyiha', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  const A = await page.evaluate(() => (window as any).__mr.store.doc.id as string);

  // 1) Master rejadan kelinmagan, Parij tahlili → yangi loyiha (avval oxirgi loyiha — A ga qoʻshilardi)
  await page.evaluate(([v]) => { sessionStorage.removeItem('mr-return'); localStorage.setItem('ks-chz-inbox', v); }, [item({ target: 'new', newName: 'Joyshunos · Parij', center: [2.35, 48.85] })]);
  await page.goto('./#/chizmadon');
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 20_000 });
  // xesh oʻzgarishi — sahifa qayta yuklanmaydi: yangi muharrir shu URL loyihasi bilan ochilguncha kutamiz
  await page.waitForFunction(() => (window as any).__mr?.store?.doc?.id === location.hash.split('/')[2]);
  await expect.poll(() => page.evaluate(() => ((window as any).__mr.store.doc.chizmadon?.inbox ?? []).length)).toBe(1);
  const B = await page.evaluate(() => { const d = (window as any).__mr.store.doc; return { id: d.id, name: d.name, o: d.origin, inbox: (d.chizmadon?.inbox ?? []).map((i: any) => i.name), keys: Object.keys(d.chizmadon?.inbox?.[0] ?? {}) }; });
  expect(B.id).not.toBe(A);
  expect(B.name).toBe('Joyshunos · Parij');
  expect(B.o[0]).toBeCloseTo(2.35, 2);
  expect(B.inbox).toEqual(['Joyshunos · Parij']);
  expect(B.keys).not.toContain('target');
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();

  // 2) Master reja A dan kelingan (mr-return) → varaq A ga
  await page.evaluate(([v]) => localStorage.setItem('ks-chz-inbox', v), [item({ name: 'Koʻchasoz · A', target: A })]);
  await page.goto('./#/chizmadon');
  await expect(page).toHaveURL(new RegExp(`#/p/${A}/chizmadon$`), { timeout: 20_000 });
  await page.waitForFunction(a => (window as any).__mr?.store?.doc?.id === a, A);
  await expect.poll(() => page.evaluate(() => ((window as any).__mr.store.doc.chizmadon?.inbox ?? []).map((i: any) => i.name))).toEqual(['Koʻchasoz · A']);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/chz_alohida.png` });
});
