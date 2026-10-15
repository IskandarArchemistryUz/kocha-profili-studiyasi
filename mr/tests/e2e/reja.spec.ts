import { test, expect, type Page } from '@playwright/test';

async function newSite(page: Page, w = 120, h = 100) {
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', String(w)); await page.fill('#rh', String(h));
  await page.click('#rectSite');
}

test('koʻcha chiziladi → ikki kvartal → zona → yashil hisob', async ({ page }) => {
  await newSite(page);
  await page.click('[data-step=kocha]');
  await expect(page.locator('.panel h2')).toHaveText('Koʻchalar');
  await page.click('[data-prof=turar-20]');
  await page.click('#drawStreet');                       // reja koʻrinishiga oʻtadi
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy - box.height * 0.36);
  await page.mouse.click(cx, cy + box.height * 0.36);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sid]')).toHaveCount(1);
  await expect(page.locator('[data-sid]')).toContainText('Turar joy koʻchasi · 20 m');
  await expect(page.locator('#stArea')).not.toContainText('0,00 ga');

  await page.click('[data-step=parsel]');
  await expect(page.locator('[data-block]')).toHaveCount(2);
  await page.locator('[data-block="1"]').click();
  await page.click('[data-use=yashil]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Park' })).toHaveCount(1);

  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenSt')).toContainText('Yashil kvartallar: 1');

  await page.keyboard.press('Control+z');               // zona bekor
  await page.click('[data-step=parsel]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Park' })).toHaveCount(0);

  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await page.click('[data-step=kocha]');
  await expect(page.locator('[data-sid]')).toHaveCount(1);
});

test('uchastkadagi mavjud binolar: buzish va saqlash', async ({ page, context }) => {
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const el: unknown[] = []; let id = 1;
  for (const bx of [-150, 0, 150]) for (const by of [-150, 0, 150]) if (bx || by) el.push({ type: 'way', id: id++, tags: { building: 'yes' }, geometry: [ll(bx - 6, by - 5), ll(bx + 6, by - 5), ll(bx + 6, by + 5), ll(bx - 6, by + 5), ll(bx - 6, by - 5)] });
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: el } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('8 bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '400'); await page.fill('#rh', '400'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('8 bino');
  await expect(page.locator('#demo')).toContainText('buziladi 8');
  await page.click('#keepAll');
  await expect(page.locator('#demo')).toContainText('buziladi 0');
});

test('parsellar: boʻlish, funksiya (maktab), kesish, butun kvartal; reyestrda maktab va parkovka', async ({ page }) => {
  await newSite(page, 300, 200);
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="0"]').click();
  await page.locator('#pSize').fill('1');
  await page.click('[data-grid=ns]');
  await page.click('#pSplit');
  await expect(page.locator('[data-block]')).toHaveCount(6);
  await page.locator('[data-block="0"]').click();
  await page.click('[data-use=maktab]');
  await expect(page.locator('[data-block]').filter({ hasText: 'Maktab' })).toHaveCount(1);
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=school]')).toContainText('oʻrin');
  await expect(page.locator('.drawer [data-rule=parking] .chip')).toHaveAttribute('data-s', 'fail');
  await page.click('#kMore');
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="1"]').click();
  await page.click('#pClear');
  await expect(page.locator('[data-block]')).toHaveCount(1);
});
