import { describe, it, expect } from 'vitest';
import { windAt } from '../../src/core/windsrc';
import type { Climate, Station } from '../../src/core/wind';

const rose = Array.from({ length: 16 }, (_, k) => [k === 4 ? 0.3 : 0.04, 0.01, 0, 0, 0, 0]);
const tash: Station = { name: 'Tashkent', file: 'x', lat: 41.27, lon: 69.27, elev: 457, hours: 8760, calm: 0.1, rose, mean: 1.6, p95: 3.5, monthT: Array(12).fill(10), monthV: Array(12).fill(1.5) };
const C: Climate = { source: 't', bins: [0.5, 2, 4, 6, 8, 10], stations: [tash] };
const era: Station = { ...C.stations[0], name: 'ERA5 48.75, 2.25', file: 'ERA5 2015–2024', lat: 48.75, lon: 2.25 };
const res = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('Shamol manbasi joyga qarab', () => {
  it('Toshkent — yaqin EPW stansiyasi, serverga soʻrov yoʻq', async () => {
    let asked = 0; const f = (async () => { asked++; return new Response('{}'); }) as unknown as typeof fetch;
    const a = await windAt(C, 69.28, 41.31, f, 'https://api.test');
    expect(a.kind).toBe('ok'); if (a.kind === 'ok') expect(a.src).toBe('epw'); expect(asked).toBe(0);
  });
  it('Parij — ERA5 (server), keyin xotiradan; navbatda — pending; ulanmagan — none', async () => {
    const a = await windAt(C, 2.35, 48.85, res(200, { station: era }), 'https://api.test');
    expect(a.kind).toBe('ok'); if (a.kind === 'ok') { expect(a.src).toBe('era5'); expect(a.km).toBeLessThan(20); }
    const b = await windAt(C, 2.36, 48.86, res(500, {}), 'https://api.test');   // xuddi shu katak — xotiradan
    expect(b.kind).toBe('ok');
    expect((await windAt(C, -73.99, 40.73, res(202, { status: 'pending' }), 'https://api.test')).kind).toBe('pending');
    const n = await windAt(C, 144.96, -37.81, res(503, { error: 'disabled' }), 'https://api.test');
    expect(n.kind).toBe('none'); if (n.kind === 'none') expect(n.why).toBe('off');
  });
});
