import { test, expect } from './fx';

/** 13.11: Maslahatchi Joyshunosda — tugma server yoqqanda; tez savol → buyruqlar brauzerda (qatlamlar, xizmatlar) → javob */
const API = 'https://api.test';
test('Joyshunos: Maslahatchi — qatlamlar va xizmatlar buyrugʻi', async ({ page }) => {
  const steps: { messages: { role: string; content: unknown }[] }[] = [], runs: unknown[] = [];
  await page.route(/fonts\.g|openfreemap|arcgis|overpass|kumi\.systems|nominatim|gibs|elevation-tiles|githubusercontent/, r => r.abort());
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/agent/config') return json(200, { enabled: true, services: ['mr', 'joy'], scenarios: { 'joy.ask': { svc: 'joy', tier: 'short', coins: 1 }, 'joy.passport': { svc: 'joy', tier: 'long', coins: 3 } }, freePerWeek: 3, maxSteps: 10, freeLeft: 3 });
    if (u.pathname === '/agent/run') { runs.push(r.request().postDataJSON()); return json(200, { run: '7', free: true, charged: 0, capped: false, balance: 20, freeLeft: 2, maxSteps: 10 }); }
    if (u.pathname === '/agent/step') {
      steps.push(r.request().postDataJSON());
      if (steps.length === 1) return json(200, { content: [{ type: 'tool_use', id: 'a', name: 'joyshunos_layers', input: {} }, { type: 'tool_use', id: 'b', name: 'nearby_services', input: { kind: 'all' } }], stop: 'tool_use', status: 'open', stepsLeft: 9 });
      return json(200, { content: [{ type: 'text', text: 'Xizmatlar qatlami **oʻchiq** — yoqing.' }], stop: 'end_turn', status: 'done', stepsLeft: 8 });
    }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); localStorage.setItem('mr-agent-intro', '1'); }, API);
  await page.goto('./joyshunos.html');
  await expect(page.locator('#agentBtn')).toBeVisible();
  // xarita plitkalari yuklanayotganda sarlavha qayta chiziladi — bosish DOM orqali
  await page.locator('#agentBtn').evaluate(b => (b as HTMLButtonElement).click());
  await expect(page.locator('#agentPanel')).toBeVisible();
  await page.locator('.ag-chip[data-q=svc]').evaluate(b => (b as HTMLButtonElement).click());
  await expect(page.locator('#agentPanel .ag-ans')).toContainText('oʻchiq');
  expect(runs).toEqual([{ scenario: 'joy.ask', areaHa: expect.any(Number) }]);
  const res = (steps[1].messages.at(-1)!.content as { tool_use_id: string; content: string }[]);
  const layers = JSON.parse(res.find(x => x.tool_use_id === 'a')!.content), svc = JSON.parse(res.find(x => x.tool_use_id === 'b')!.content);
  expect(layers).toHaveProperty('layers');
  expect(layers.area.radius_m).toBeGreaterThan(0);
  expect(typeof svc.available === 'boolean' || Array.isArray(svc.items)).toBe(true);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-joy.png` });
});
