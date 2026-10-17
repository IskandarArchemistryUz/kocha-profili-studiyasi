import { test, expect } from '@playwright/test';

test('seksiya generatori: kvartal → seksiyalar, qavatni tahrirlash, undo, reyestr', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await page.selectOption('#genBlock', '0');
  await page.fill('#gMax', '9'); await page.press('#gMax', 'Tab');
  await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  const n = Number((await page.locator('#bldSt b').textContent())!.split(' ')[0]);
  expect(n).toBeGreaterThan(8);
  await expect(page.locator('#kPop b')).not.toHaveText('—');
  // qayta generatsiya — eski seksiyalar almashadi (koʻpaymaydi)
  await page.click('[data-typ=qatorlar]'); await page.click('#genGo');
  const m = Number((await page.locator('#bldSt b').textContent())!.split(' ')[0]);
  expect(m).toBeLessThan(n);
  await page.keyboard.press('Control+z');
  await expect(page.locator('#bldSt b')).toHaveText(`${n} bino/seksiya`);
  await page.click('#genClear');
  await expect(page.locator('#bldSt b')).toHaveText('0 bino/seksiya');
});

test('quyosh: vaqt surgichi va insolyatsiya xaritasi', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=quyosh]');
  await expect(page.locator('#sunInfo')).toContainText('balandlik');
  await page.locator('#sunTime').fill('9');
  await expect(page.locator('#sunInfo')).toContainText('09:00');
  await page.click('[data-date="06-22"]');
  await page.click('#insolGo');
  await expect(page.locator('#insolSt')).toContainText('oʻrtacha', { timeout: 30000 });
  const txt = (await page.locator('#insolSt').textContent())!;
  const mean = Number(txt.match(/oʻrtacha ([\d,]+)/)![1].replace(',', '.'));
  expect(mean).toBeGreaterThan(2); expect(mean).toBeLessThan(15);   // hovli va koʻchalar — qisman soyada
  await page.click('[data-date="03-22"]'); await page.click('#insolGo');
  await expect(page.locator('#insolSt')).toContainText('22 mart', { timeout: 30000 });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=insol-territory]')).toContainText('SanQvaN 0331-16');
});

test('tipologiyalar: minoralar va stilobat + yer osti parkovka → reyestrda taʼminot', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=blok_minora]');
  await page.fill('#gSty', '1'); await page.press('#gSty', 'Tab');
  await page.click('[data-park=yer_osti]');
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('Avtoturargoh:');
  await expect(page.locator('#genNotes')).toContainText('Yer uchastkasi UMN');
  await page.click('#kMore');
  const v = await page.locator('.drawer [data-rule=parking] .num').first().textContent();
  expect(Number(v!.replace(/\D/g, ''))).toBeGreaterThan(300);
});

test('shamol: shamol guli (EPW) va piyoda sathidagi oqim', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=quyosh]');
  await expect(page.locator('#windBox')).toContainText('Tashkent', { timeout: 15000 });
  await expect(page.locator('#windBox .rose path').first()).toBeAttached();
  await page.click('#windGo');
  await expect(page.locator('#windSt')).toContainText('shamoli', { timeout: 90000 });
  await expect(page.locator('.leg')).toContainText('Oʻtirish');
});
