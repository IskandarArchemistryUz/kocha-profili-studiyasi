import { describe, it, expect } from 'vitest';
import { dataFile, DATA_SRC } from '../../src/context/datafile';
import { loadNarx } from '../../src/joyshunos/narx';

const mk = (srv: 'ok' | '502' | 'throw') => {
  const calls: string[] = [];
  const f = (async (u: string) => {
    calls.push(u);
    if (u.includes('/data/file/')) { if (srv === 'throw') throw new TypeError('Failed to fetch'); return new Response(srv === 'ok' ? '{"from":"server"}' : 'x', { status: srv === 'ok' ? 200 : 502 }); }
    return new Response('{"from":"manba"}', { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
};
describe('maʼlumot fayllari: avval server nusxasi, boʻlmasa manba (24.11)', () => {
  it('server javob bersa — manbaga borilmaydi', async () => {
    const { f, calls } = mk('ok');
    expect(await (await dataFile('narx', 'toshkent_hex.json', f)).json()).toEqual({ from: 'server' });
    expect(calls).toEqual(['https://api.archemistry.uz/data/file/narx/toshkent_hex.json']);
  });
  it('server xato qaytarsa yoki ulanmasa — manba (GitHub)', async () => {
    for (const m of ['502', 'throw'] as const) {
      const { f, calls } = mk(m);
      expect(await (await dataFile('lst', 'toshkent_index.json', f)).json()).toEqual({ from: 'manba' });
      expect(calls[1]).toBe(`${DATA_SRC.lst}/toshkent_index.json`);
    }
  });
  it('uy narxi yuklovchisi shu yoʻldan oladi', async () => {
    const calls: string[] = [];
    const f = (async (u: string) => { calls.push(u); return new Response(JSON.stringify({ v: 1, sana: '2026-11-12', min: 5, kat: {} }), { status: 200 }); }) as unknown as typeof fetch;
    expect((await loadNarx(f)).sana).toBe('2026-11-12');
    expect(calls[0]).toBe('https://api.archemistry.uz/data/file/narx/toshkent_hex.json');
  });
});
