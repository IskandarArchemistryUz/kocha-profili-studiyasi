import { test, expect } from './fx';

/** 14.11 (3-PR): Master reja loyihasi ichidan boshqa xizmat — ?p= manzilda; qaytish yangi varaqda ham ishlaydi; holat loyihaga ajratilgan */
test('loyiha ichidan Joyshunos: ?p= manzilda, «← Master reja» loyihaga qaytaradi, holat loyihaga ajratilgan', async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.waitForURL(/#\/p\/p_/);
  const pid = page.url().split('#/p/')[1];
  await page.locator('#svcPop').click();
  await expect(page.locator('#svcJoy')).toBeVisible();
  await page.locator('#svcJoy').click();
  await page.waitForURL(new RegExp(`joyshunos\\.html\\?p=${pid}`));
  // yangi varaq: sessionStorage yoʻq — kontekst baribir manzildan
  const p2 = await context.newPage();
  await p2.route(/fonts\.g/, r => r.abort());
  await p2.goto(`./joyshunos.html?p=${pid}`);
  const back = p2.locator('#mrBack');
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute('href', `./#/p/${pid}`);
  await expect(back.locator('.nm')).toHaveText('Yangi loyiha', { timeout: 10_000 });
  // xizmatlar menyusidagi havolalar ham loyihani saqlaydi
  expect(await p2.evaluate(() => [...document.querySelectorAll('a[href*="kochasoz.html"], a[href*="render.html"]')].every(a => (a as HTMLAnchorElement).getAttribute('href')!.includes('?p=')))).toBe(true);
  await p2.waitForTimeout(800);
  const keys = await p2.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain(`joy-state@${pid}`);
  await back.click();
  await p2.waitForURL(new RegExp(`#/p/${pid}$`));
  await expect(p2.locator('#svcPop')).toBeVisible({ timeout: 20_000 });
});

/** 3b-2: xizmat bosh sahifadan alohida ochilganda — «Loyihalar» tugmasi, yangi loyiha yaratib ichida ochish */
test('alohida Koʻchasoz: «Loyihalar» → «Yangi loyiha» — xizmat loyiha ichida qayta ochiladi', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./kochasoz.html');
  await expect(page.locator('#svcProj')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#mrBack')).toHaveCount(0);
  await page.click('#svcProj');
  await expect(page.locator('.svc-pick')).toBeVisible();
  await page.click('#svcNew');
  await page.waitForURL(/kochasoz\.html\?p=p_\w+/);
  await expect(page.locator('#mrBack')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#svcProj')).toHaveCount(0);
});
