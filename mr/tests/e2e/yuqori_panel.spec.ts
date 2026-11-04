import { test, expect, pickLang } from './fx';

/** 04.11: «Sodda / Toʻliq» kaliti qoʻshilgach yuqori panel 1024–1600 px da sigʻadi (oʻzbek va rus tilida) — hech bir tugma chetdan chiqmaydi */
// qozoq tili (і, ғ, қ) — ilova shriftida yoʻq harflar CI serverida juda keng zaxira shrift bilan chiziladi; mahalliy Chromium da kk ham sigʻadi (zaxira ≥ 16 px)
for (const lang of ['uz', 'ru'] as const) for (const w of [1024, 1280, 1366, 1440, 1600]) test(`yuqori panel sigʻadi · ${lang} · ${w}px`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto('./'); await page.click('#newP'); await page.waitForTimeout(300);
  if (lang !== 'uz') { await pickLang(page, lang); await page.waitForTimeout(500); }
  const over = await page.evaluate(() => { const t = document.querySelector('.top') as HTMLElement, tr = t.getBoundingClientRect(); return [...t.querySelectorAll('button, a')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > tr.right + 0.5 || b.left < tr.left - 0.5); }).map(e => (e.textContent || e.id).trim().slice(0, 24)); });
  expect(over).toEqual([]);
  // CI shriftlari biroz kengroq — kamida 16 px zaxira (oraliq)
  expect(await page.evaluate(() => Math.round((document.querySelector('.top .spacer') as HTMLElement).getBoundingClientRect().width))).toBeGreaterThanOrEqual(16);
  await expect(page.locator('#liteSeg')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/yuqori_${lang}_${w}.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
});
