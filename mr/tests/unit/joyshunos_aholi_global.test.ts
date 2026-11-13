import { describe, it, expect } from 'vitest';
import { readCogWindow, popStats, popDens, kadWindow, ghsCol } from '../../src/joyshunos/population';

/** Kichik plitkali TIFF (klassik, LE, float64, Deflate, 4×4 plitka, 8×8 piksel, 1″ = 1/3600°) — GHS-POP ga oʻxshash tuzilma */
async function deflate(u8: Uint8Array): Promise<Uint8Array> { return new Uint8Array(await new Response(new Blob([u8 as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); }
async function makeTiff(val: (i: number, j: number) => number, ox: number, oy: number, px: number): Promise<Uint8Array> {
  const W = 8, T = 4, nt = 4, tiles: Uint8Array[] = [];
  for (let tj = 0; tj < 2; tj++) for (let ti = 0; ti < 2; ti++) {
    const b = new DataView(new ArrayBuffer(T * T * 8));
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) b.setFloat64((y * T + x) * 8, val(ti * T + x, tj * T + y), true);
    tiles.push(ti === 1 && tj === 1 ? new Uint8Array(0) : await deflate(new Uint8Array(b.buffer)));   // bitta boʻsh plitka
  }
  const tags: [number, number, number, number[] | string][] = [[256, 3, 1, [W]], [257, 3, 1, [W]], [258, 3, 1, [64]], [259, 3, 1, [8]], [322, 3, 1, [T]], [323, 3, 1, [T]], [324, 4, nt, []], [325, 4, nt, tiles.map(t => t.length)], [339, 3, 1, [3]], [33550, 12, 3, [px, px, 0]], [33922, 12, 6, [0, 0, 0, ox, oy, 0]], [42113, 2, 5, '-200']];
  const ifdAt = 8, ifdLen = 2 + tags.length * 12 + 4; let extra = ifdAt + ifdLen; const ext: [number, Uint8Array][] = [];
  const enc = (typ: number, v: number[] | string) => { if (typeof v === 'string') return new TextEncoder().encode(v + '\0'); const s = typ === 3 ? 2 : typ === 4 ? 4 : 8, d = new DataView(new ArrayBuffer(s * v.length)); v.forEach((x, k) => typ === 3 ? d.setUint16(k * s, x, true) : typ === 4 ? d.setUint32(k * s, x, true) : d.setFloat64(k * s, x, true)); return new Uint8Array(d.buffer); };
  const tagAt: number[] = [];
  for (const [, typ, , v] of tags) { const e = enc(typ, typeof v === 'string' ? v : v.length ? v : new Array(nt).fill(0)); if (e.length > 4) { tagAt.push(extra); ext.push([extra, e]); extra += e.length + (e.length & 1); } else tagAt.push(-1); }
  let off = extra; const tileOff = tiles.map(t => { const o = off; off += t.length; return o; });
  const out = new Uint8Array(off), dv = new DataView(out.buffer);
  dv.setUint16(0, 0x4949); dv.setUint16(2, 42, true); dv.setUint32(4, ifdAt, true); dv.setUint16(ifdAt, tags.length, true);
  tags.forEach(([tag, typ, cnt, v], k) => {
    const e = ifdAt + 2 + k * 12; dv.setUint16(e, tag, true); dv.setUint16(e + 2, typ, true); dv.setUint32(e + 4, cnt, true);
    const data = tag === 324 ? enc(4, tileOff) : enc(typ, typeof v === 'string' ? v : v);
    if (tagAt[k] < 0) out.set(data, e + 8); else { dv.setUint32(e + 8, tagAt[k], true); out.set(data, tagAt[k]); }
  });
  tiles.forEach((t, k) => out.set(t, tileOff[k]));
  return out;
}
const rangeFetch = (file: Uint8Array, calls: string[]) => (async (_u: string, init?: RequestInit) => {
  const m = /bytes=(\d+)-(\d+)/.exec(String((init?.headers as Record<string, string>)?.Range)); calls.push(m ? m[0] : 'full');
  if (!m) return new Response(file as BodyInit, { status: 200 });
  return new Response(file.slice(+m[1], +m[2] + 1) as BodyInit, { status: 206 });
}) as unknown as typeof fetch;

describe('Joyshunos · global aholi (GHS-POP COG)', () => {
  it('plitkali COG dan oyna: qiymatlar, nodata, boʻsh plitka', async () => {
    const px = 1 / 3600, file = await makeTiff((i, j) => (i === 0 && j === 0 ? -200 : 10 + i + 8 * j), 69, 41.002, px), calls: string[] = [];
    const w = await readCogWindow('mem://a.tif', [69 + 4 * px, 41.002 - 4 * px], 200, rangeFetch(file, calls));
    expect(w.src).toBe('ghsl'); expect(w.dx).toBeCloseTo(px, 9);
    const at = (i: number, j: number) => w.v[Math.round((41.002 - j * px - w.lat0) / -px) * w.w + Math.round((69 + i * px - w.lon0) / px)];
    expect(at(1, 0)).toBe(11); expect(at(3, 5)).toBe(10 + 3 + 40); expect(Number.isNaN(at(0, 0))).toBe(true); expect(Number.isNaN(at(6, 6))).toBe(true);
    expect(calls.every(c => c !== 'full')).toBe(true);
    const s = popStats(w, [69 + 4 * px, 41.002 - 4 * px], 60); expect(s.aholi).toBeGreaterThan(0);
    expect(popDens(w, 69 + 1.5 * px, 41.002 - 0.5 * px)).toBeCloseTo(11 / ((px * 111_320 * Math.cos(41.0019 * Math.PI / 180)) * (px * 111_132) / 1e4), 0);
  });
  it('server Range ni eʼtiborsiz qoldirsa — butun fayl yuklanmaydi, xato', async () => {
    const f = (async () => new Response(new Uint8Array(10), { status: 200 })) as unknown as typeof fetch;
    await expect(readCogWindow('mem://b.tif', [0, 0], 100, f)).rejects.toThrow(/COG 200/);
  });
  it('kadastr oynasi va rang', () => {
    const g = { ix: { bbox: [69, 41, 69.01, 41.01] as [number, number, number, number], qadam: [0.001, 0.001] as [number, number], nx: 10, ny: 10 }, aholi: new Uint16Array(100).fill(25) };
    const w = kadWindow(g, [69.005, 41.005], 150)!; expect(w.src).toBe('kadastr'); expect(w.v.every(v => v === 25)).toBe(true);
    expect(ghsCol(0)).toBeNull(); expect(ghsCol(120)).toBe('#d94801');
  });
});
