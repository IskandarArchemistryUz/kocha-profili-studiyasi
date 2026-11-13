import { test, expect, type Page } from './fx';

/** 13.11: agent «Maslahatchi» — tugma faqat server yoqqanda; birinchi tanishuv; savol → buyruq brauzerda → javob */
const API = 'https://api.test';
async function mockApi(page: Page, enabled: boolean) {
  const hits = { run: [] as unknown[], step: [] as { messages: { role: string; content: unknown }[] }[] };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/agent/config') return json(200, enabled
      ? { enabled: true, services: ['mr'], scenarios: { 'mr.ask': { svc: 'mr', tier: 'short', coins: 1 }, 'mr.why_fail': { svc: 'mr', tier: 'short', coins: 1 }, 'mr.audit': { svc: 'mr', tier: 'long', coins: 3 }, 'mr.brief': { svc: 'mr', tier: 'long', coins: 3 } }, freePerWeek: 3, maxSteps: 10, freeLeft: 3 }
      : { enabled: false, services: [], scenarios: {}, freePerWeek: 3, maxSteps: 10 });
    if (u.pathname === '/agent/run') { hits.run.push(r.request().postDataJSON()); return json(200, { run: '5', free: true, charged: 0, capped: false, balance: 20, freeLeft: 2, maxSteps: 10 }); }
    if (u.pathname === '/agent/step') {
      const b = r.request().postDataJSON(); hits.step.push(b);
      if (hits.step.length === 1) return json(200, { content: [{ type: 'tool_use', id: 't1', name: 'run_norm_check', input: { status: 'ALL' } }], stop: 'tool_use', status: 'open', stepsLeft: 9 });
      return json(200, { content: [{ type: 'text', text: 'Hozircha **buzilish yoʻq**.\n\n- uchastka chizilmagan' }], stop: 'end_turn', status: 'done', stepsLeft: 8 });
    }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return hits;
}

test('agent oʻchiq — tugma koʻrinmaydi', async ({ page }) => {
  await mockApi(page, false);
  await page.goto('./#/yangi');
  await expect(page.locator('.top')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('#agentBtn')).toBeHidden();
});

test('agent: tanishuv → panel → «Nega FAIL?» → buyruq natijasi serverga → javob', async ({ page }) => {
  const hits = await mockApi(page, true);
  await page.goto('./#/yangi');
  await expect(page.locator('#agentBtn')).toBeVisible();
  await expect(page.locator('#agentBtn .ag-dot')).toHaveCount(1);
  // birinchi tanishuv — bir marta
  await expect(page.locator('#agTip')).toBeVisible();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-intro.png` }); }
  await page.click('#agTry');
  await expect(page.locator('#agentPanel')).toBeVisible();
  await expect(page.locator('#agentBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#agentBtn .ag-dot')).toHaveCount(0);
  await expect(page.locator('#agFree')).toContainText('3 / 3');
  await page.click('.ag-chip[data-q=why]');
  await expect(page.locator('#agentPanel .ag-ans')).toContainText('buzilish yoʻq');
  await expect(page.locator('#agentPanel .ag-ans b')).toHaveText('buzilish yoʻq');
  await expect(page.locator('#agentPanel .ag-done summary')).toContainText('1');
  expect(hits.run).toEqual([{ scenario: 'mr.why_fail', project: expect.any(String), areaHa: 0 }]);
  const last = hits.step[1].messages.at(-1)!;
  expect(last.role).toBe('user');
  const tr0 = (last.content as { type: string; tool_use_id: string; content: string }[])[0];
  expect(tr0).toMatchObject({ type: 'tool_result', tool_use_id: 't1' });
  expect(JSON.parse(tr0.content)).toHaveProperty('items');
  if (process.env.GX_SHOTS) { await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-light.png` }); await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; }); await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-dark-1024.png` }); await page.evaluate(() => { delete document.documentElement.dataset.theme; }); await page.setViewportSize({ width: 1440, height: 900 }); }
  // yopish va qayta ochish; tanishuv qayta chiqmaydi
  await page.click('#agClose');
  await expect(page.locator('#agentPanel')).toBeHidden();
  await page.reload();
  await expect(page.locator('#agentBtn')).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator('#agTip')).toHaveCount(0);
});

test('agent: xulosa (3 tanga) — tasdiqsiz boshlanmaydi', async ({ page }) => {
  const hits = await mockApi(page, true);
  await page.addInitScript(() => { localStorage.setItem('mr-agent-intro', '1'); });
  await page.goto('./#/yangi');
  await page.click('#agentBtn');
  await page.click('.ag-chip[data-q=audit]');
  await expect(page.locator('#agConfirm')).toBeVisible();
  await expect(page.locator('#agConfirm')).toContainText('3');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-confirm.png` });
  await page.click('#agNo');
  await expect(page.locator('#agConfirm')).toHaveCount(0);
  expect(hits.run).toHaveLength(0);
  await page.click('.ag-chip[data-q=audit]');
  await page.click('#agYes');
  await expect(page.locator('#agentPanel .ag-ans')).toBeVisible();
  expect(hits.run).toHaveLength(1);
});
