import { test, expect } from '@playwright/test';

/** Qobiq (DS-03): rail — faqat 12 qadam; asboblar pastda; Tab — panelni yigʻish; til va tungi rejim */
test('qobiq: rail, asboblar paneli, Tab, til, tungi rejim', async ({ page }) => {
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('.rail [data-step]')).toHaveCount(12);
  await expect(page.locator('.rail [data-tool]')).toHaveCount(0);
  await expect(page.locator('.tb [data-tool]')).toHaveCount(5);
  await expect(page.locator('.tb #undo')).toBeDisabled();
  // Tab — panel yigʻiladi, yana Tab — ochiladi; sahna joyida
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel.sp')).toHaveClass(/shut/);
  await expect(page.locator('.rail [aria-current=step]')).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(page.locator('.panel.sp')).not.toHaveClass(/shut/);
  // til: en → footer inglizcha, uz → qaytadi; tanlov saqlanadi
  await page.click('[data-lang=en]');
  await expect(page.locator('.panel.sp footer')).toContainText('Next');
  expect(await page.evaluate(() => localStorage.getItem('mr-lang'))).toBe('en');
  await page.click('[data-lang=uz]');
  await expect(page.locator('.panel.sp footer')).toContainText('Keyingi');
  // tungi rejim: html[data-theme]
  await page.click('#themeBtn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.click('#themeBtn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // koʻrsatkichlar: 4 asosiy, «hammasi» → 8
  await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await expect(page.locator('.kpibar .kpi:visible')).toHaveCount(4);
  await page.click('#kAll');
  await expect(page.locator('.kpibar .kpi:visible')).toHaveCount(8);
});
