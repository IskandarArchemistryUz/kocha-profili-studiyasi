import { describe, it, expect } from 'vitest';
import { runAgent, encodeResult, MAX_RESULT } from '../../src/agent/loop';
import { mrTools, ruleOut, type MrHost } from '../../src/agent/tools-mr';
import type { AgentApi, Msg, StepRes } from '../../src/agent/api';
import { blankProject } from '../../src/core/doc';
import type { Result } from '../../src/norms/rules';

/** Soxta server: navbatdagi javoblar; yuborilgan suhbatlar yoziladi */
function fakeApi(steps: StepRes[]) {
  const sent: Msg[][] = [];
  const api: AgentApi = {
    config: async () => ({ enabled: true, services: ['mr'], scenarios: {}, freePerWeek: 3, maxSteps: 10 }),
    run: async () => ({ run: '7', free: true, charged: 0, capped: false, balance: 5, freeLeft: 2, maxSteps: 10 }),
    step: async (_run, msgs) => { sent.push(JSON.parse(JSON.stringify(msgs))); return steps.shift() ?? { content: [{ type: 'text', text: 'tamom' }], stop: 'end_turn', status: 'done', stepsLeft: 5 }; },
  };
  return { api, sent };
}

const RULE: Result = {
  id: 'green-86', title: 'Koʻkalamzorlashtirish', status: 'fail', value: 22.456, digits: 1, unit: '%', limit: '≥ 30', delta: -25.1,
  source: { doc: 'ShNQ 2.07.01-23', clause: '86-band', edition: '2023', verified: true }, where: { bids: ['b1'] },
};
function host(over: Partial<MrHost> = {}): MrHost & { lit: string[][] } {
  const doc = blankProject('Sinov');
  doc.buildings.push({ id: 'b1', footprint: [[69.24, 41.3], [69.2402, 41.3], [69.2402, 41.3002], [69.24, 41.3002]], floors: 9, nonRes: 1, use: 'turar' } as never);
  const lit: string[][] = [];
  return {
    lit, doc: () => doc, derived: () => null, rules: () => [RULE, { ...RULE, id: 'x', status: 'pass', title: 'Boshqa', source: { ...RULE.source, clause: '79-band' } }],
    tep: () => [{ g: 'Aholi', name: 'Aholi', unit: 'kishi', v: 1234.567 }], normSet: () => 'UZ', step: () => 'normalar',
    highlight: (ids) => { lit.push(ids); return ids.filter(i => i === 'b1').length; }, ...over,
  };
}

describe('agent sikli', () => {
  it('buyruq brauzerda bajariladi, natija keyingi qadamga tool_result boʻlib ketadi', async () => {
    const { api, sent } = fakeApi([{ content: [{ type: 'text', text: 'Tekshiraman.' }, { type: 'tool_use', id: 't1', name: 'run_norm_check', input: { status: 'FAIL' } }], stop: 'tool_use', status: 'open', stepsLeft: 9 }]);
    const seen: string[] = [];
    const r = await runAgent({ api, scenario: 'mr.why_fail', question: 'Nega FAIL?', lang: 'uz', tools: mrTools(host()), ev: { onTool: (n, s) => seen.push(`${n}:${s}`) } });
    expect(r.status).toBe('done'); expect(r.text).toBe('tamom'); expect(r.tools).toEqual(['run_norm_check']);
    expect(seen).toEqual(['run_norm_check:run', 'run_norm_check:ok']);
    const last = sent[1].at(-1)!;
    expect(last.role).toBe('user');
    const res = (last.content as { type: string; content: string }[])[0];
    expect(res.type).toBe('tool_result');
    const j = JSON.parse(res.content);
    expect(j.items).toHaveLength(1);
    expect(j.items[0]).toMatchObject({ id: 'green-86', status: 'FAIL', value: 22.5, clause: '86-band', objects: ['b1'] });
  });
  it('nomaʼlum buyruq — is_error bilan qaytadi, sikl toʻxtamaydi', async () => {
    const { api, sent } = fakeApi([{ content: [{ type: 'tool_use', id: 't1', name: 'delete_all', input: {} }], stop: 'tool_use', status: 'open', stepsLeft: 9 }]);
    const r = await runAgent({ api, scenario: 'mr.ask', question: 'x', lang: 'uz', tools: mrTools(host()) });
    expect(r.status).toBe('done');
    expect((sent[1].at(-1)!.content as { is_error?: boolean }[])[0].is_error).toBe(true);
  });
  it('qadamlar tugasa — limit', async () => {
    const { api } = fakeApi([{ content: [{ type: 'tool_use', id: 't1', name: 'get_tep', input: {} }], stop: 'tool_use', status: 'limit', stepsLeft: 0 }]);
    expect((await runAgent({ api, scenario: 'mr.ask', question: 'x', lang: 'uz', tools: mrTools(host()) })).status).toBe('limit');
  });
  it('oldingi savol-javob kontekstga qoʻshiladi (oxirgi 2 tasi)', async () => {
    const { api, sent } = fakeApi([]);
    await runAgent({ api, scenario: 'mr.ask', question: 'uch', lang: 'uz', tools: {}, history: [{ q: 'bir', a: 'A' }, { q: 'ikki', a: 'B' }, { q: 'uch0', a: 'C' }] });
    expect(sent[0].map(m => m.content)).toEqual(['ikki', 'B', 'uch0', 'C', 'uch']);
  });
  it('katta natija qisqartiriladi', () => {
    expect(encodeResult({ s: 'x'.repeat(MAX_RESULT * 2) }).length).toBeLessThan(MAX_RESULT + 40);
  });
});

describe('Master reja buyruqlari', () => {
  it('meʼyor bandi: qoida topiladi, matn yoʻqligi aytiladi', async () => {
    const t = mrTools(host());
    const r = await t.get_norm_clause({ doc: 'ShNQ 2.07.01-23', clause: '86' }) as { found: boolean; verbatim_text: null; rules: { id: string }[] };
    expect(r.found).toBe(true); expect(r.verbatim_text).toBeNull(); expect(r.rules.map(x => x.id)).toEqual(['green-86']);
    expect((await t.get_norm_clause({ doc: 'ShNQ 2.07.01-23', clause: '999' }) as { found: boolean }).found).toBe(false);
  });
  it('TEP, obyektlar, belgilash', async () => {
    const H = host(), t = mrTools(H);
    expect((await t.get_tep({}) as { rows: { value: number }[] }).rows[0].value).toBe(1234.57);
    const o = await t.list_objects({ kind: 'building' }) as { items: { id: string; floors: number; footprint_m2: number }[] };
    expect(o.items[0]).toMatchObject({ id: 'b1', floors: 9 }); expect(o.items[0].footprint_m2).toBeGreaterThan(200);
    const g = await t.get_object({ id: 'b1' }) as { checks: unknown[] };
    expect(g.checks).toHaveLength(1);
    expect(await t.highlight({ ids: ['b1', 'nope'] })).toMatchObject({ highlighted: 1, requested: 2 });
    expect(H.lit).toEqual([['b1', 'nope']]);
  });
  it('xulosa: tekshiruv soni holat boʻyicha', async () => {
    const s = await mrTools(host()).project_summary({}) as { checks: Record<string, number>; norm_set: string };
    expect(s.checks).toEqual({ FAIL: 1, REVIEW: 0, PASS: 1 }); expect(s.norm_set).toBe('UZ');
  });
  it('ruleOut: raqam kasr xonasi boʻyicha yaxlitlanadi', () => {
    expect(ruleOut(RULE)).toMatchObject({ value: 22.5, deviation_pct: -25.1, required: '≥ 30' });
  });
});
