import { test, expect } from './fx';
import { fileURLToPath } from 'node:url';

const SAMPLE = fileURLToPath(new URL('../../../data/namuna-mahalla.archemistry.json', import.meta.url));

/** 14.11 audit (Loyihalar): 6 tadan koʻp loyihada qidiruv va «Boʻsh» saralash; «Oʻchirish» — «⋯» ichida; namuna takrorlanmaydi; sukut nomi joy tanlanganda «joy, sana» */
test('loyihalar: qidiruv, boʻsh loyihalar, ⋯ ichida oʻchirish', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./#/');
  await page.waitForFunction(() => !!document.getElementById('newP'));
  for (let i = 0; i < 6; i++) { await page.goto('./#/'); await page.click('#newP'); await page.waitForURL(/#\/p\//); }
  await page.goto('./#/');
  await expect(page.locator('#cards [data-pid]')).toHaveCount(6);
  await expect(page.locator('#projQ')).toBeVisible();
  // «Oʻchirish» koʻrinmaydi, «⋯» bosilgach chiqadi
  const card = page.locator('#cards [data-pid]').first();
  await expect(card.locator('.card-del')).toBeHidden();
  await card.locator('.card-more').click();
  await expect(card.locator('.card-del')).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);   // ⋯ loyihani ochmaydi
  // qidiruv
  await page.fill('#projQ', 'yoʻq-bunaqa-nom');
  await expect(page.locator('#cards [data-pid]')).toHaveCount(0);
  await expect(page.locator('#projNone')).toBeVisible();
  await page.fill('#projQ', '');
  await expect(page.locator('#cards [data-pid]')).toHaveCount(6);
});

test('namuna: ikkinchi marta — oʻsha nusxa', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/data/namuna-mahalla.archemistry.json', r => r.fulfill({ path: SAMPLE, contentType: 'application/json' }));   // vite preview /data/ ni bermaydi
  await page.goto('./#/namuna'); await page.waitForURL(/#\/p\//);
  const a = page.url().split('#/p/')[1];
  await page.goto('./#/'); await page.reload();
  await page.click('#sampleP'); await page.waitForURL(/#\/p\//);
  expect(page.url().split('#/p/')[1]).toBe(a);
});
