import { test, expect } from './fx';

/* 22.11 — ekran sinflari: Master reja qobigʻi har oʻlchamda ekranga sigʻadi.
   Kichik noutbuk (ThinkPad 1280×720 @150 % → 1280×630), proyektor, 1366, tik va yotiq planshet, FHD.
   Tekshiruv: header tugmalari ekrandan chiqmaydi, 11 qadam railga skrollsiz sigʻadi, «Oldingi / Keyingi» koʻrinadi. */
const VP: [string, number, number][] = [
  ['noutbuk-150', 1280, 630], ['proyektor', 1024, 680], ['noutbuk-1366', 1366, 657],
  ['planshet-tik', 820, 1100], ['planshet-yotiq', 1180, 760], ['fhd', 1920, 969],
];

for (const [nm, w, h] of VP) {
  test(`ekran sinfi: ${nm} ${w}×${h} — qobiq sigʻadi`, async ({ page }, info) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr'));
    await expect(page.locator('.rail .rb')).toHaveCount(11);
    await page.waitForTimeout(600);   // panel kirish animatsiyasi
    const r = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight, out: string[] = [];
      const top = document.querySelector('.top') as HTMLElement, tr = top.getBoundingClientRect();
      for (const e of top.querySelectorAll<HTMLElement>('button, a, input')) {
        const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || getComputedStyle(e).visibility === 'hidden') continue;
        if (b.right > Math.min(W, tr.right) + 1 || b.left < tr.left - 1) out.push(`header: ${e.id || e.textContent?.trim().slice(0, 20)} x=${Math.round(b.left)}..${Math.round(b.right)}`);
      }
      const rail = document.querySelector('.rail') as HTMLElement, rb = [...rail.querySelectorAll('.rb')];
      const last = rb[rb.length - 1].getBoundingClientRect();
      if (last.bottom > H || rail.scrollHeight > rail.clientHeight + 1) out.push(`rail: oxirgi qadam ${Math.round(last.bottom)} / ${H}, skroll ${rail.scrollHeight}/${rail.clientHeight}`);
      for (const b of document.querySelectorAll<HTMLElement>('.panel.sp > footer .btn')) {
        const q = b.getBoundingClientRect(); if (q.bottom > H || q.top < 0) out.push(`panel footer: ${b.textContent?.trim()} ${Math.round(q.top)}..${Math.round(q.bottom)} / ${H}`);
      }
      const body = document.querySelector('.panel.sp > .body') as HTMLElement | null;
      return { out, body: body ? Math.round(body.getBoundingClientRect().height) : 0 };
    });
    await info.attach(`${nm}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    expect(r.out, r.out.join('\n')).toEqual([]);
    // qadam panelining ish qismi: kichik ekranda ham kamida 380 px (avval 1280×630 da ~300 px edi)
    if (w > 900) expect(r.body).toBeGreaterThan(h <= 720 ? 380 : 420);
  });
}

test('rail: qadam bosilgandan keyin izoh qayta chiqib sarlavhani yopmaydi', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 630 });
  await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr'));
  await expect(page.locator('.rail .rb')).toHaveCount(11);
  const b = page.locator('.rail .rb').nth(0); const box = (await b.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 300); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await expect(page.locator('.tip-card')).toBeVisible({ timeout: 3000 });   // sichqoncha ustida — izoh bor
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(1500);
  await expect(page.locator('.tip-card')).toHaveCount(0);                    // bosildi — joyidan qoʻzgʻalmasa qayta chiqmaydi
  const b2 = (await page.locator('.rail .rb').nth(1).boundingBox())!;
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2, { steps: 6 });   // keyingi tugmaga oʻtildi — izoh yana ishlaydi
  await expect(page.locator('.tip-card')).toBeVisible({ timeout: 3000 });
});
