/**
 * Binokor yadrosi (26.11.2026, 1-bosqich 1-PR): public/binokor-yadro.js + binokor-korinish.js — brauzer skriptlari (modul emas),
 * shuning uchun vm ichida oddiy skript sifatida yuklanadi. Bu sinovlar joriy xulqni qayd etadi; `it.fails` — 1-bosqichda
 * tuzatiladigan maʼlum nuqsonlar (claude/binokor-1-bosqich-dizayn-26-11.md): tuzatilganda `it` ga aylantiriladi.
 */
import { describe, it, expect } from 'vitest';
// @ts-ignore
import * as vm from 'node:vm';
// @ts-ignore
import * as fs from 'node:fs';

const P = 'public';
const readFileSync = (f: string, e: string): string => fs.readFileSync(f, e);
const join = (a: string, b: string) => `${a}/${b}`;
function load(): any {
  const code = `${readFileSync(join(P, 'binokor-yadro.js'), 'utf8')}\n${readFileSync(join(P, 'binokor-korinish.js'), 'utf8')}\n;globalThis.__bk = { build, run, newModel, analyze, toFile, fromFile, TYPES };`;
  const ctx = vm.createContext({ console, Math, JSON, Date });
  vm.runInContext(code, ctx);
  return (ctx as any).__bk;
}
/* 2 qavatli sinov uyi: oʻq toʻri 4,2·3,6·4,2 × 5,7·1,5·4,2; 8 devor, 3 deraza, 2 eshik, zona, zina, tom, poydevor */
const UY = ['grid x 6 6', 'grid y 6', 'levels 1 3.0', 'grid x 4.2 3.6 4.2; grid y 5.7 1.5 4.2',
  'wall T400 А1 А4 ref=c L1', 'wall T400 А4 Г4 ref=c L1', 'wall T400 Г4 Г1 ref=c L1', 'wall T400 Г1 А1 ref=c L1',
  'wall M200 Б1 Б4 ref=c L1', 'wall M200 А2 Б2 ref=c L1', 'wall M200 В3 Г3 ref=c L1', 'wall M200 В1 4.2,7.2 ref=c L1',
  'window O15 W1 2.1', 'window O15 W1 9.9', 'window O15 W3 6', 'door D10 W5 2', 'door D10 W1 6', 'zone 1.99,3 Mehmonxona L1',
  'stair В3 Г4 type=u L1', 'level add', 'copy L1 all', 'roof hip 25 over=0.5', 'foundation strip w=0.6 d=1.5'];
const bad = (r: any) => r.out.filter((o: any) => !o.ok);

describe('Binokor yadrosi', () => {
  const B = load();

  it('sinov uyi xatosiz quriladi: 30 element, 1-qavatda 3 xona, maydonlar', () => {
    const r = B.build(UY);
    expect(bad(r)).toEqual([]);
    expect(r.M.el.length).toBe(30);
    expect(r.A.levels.L1.rooms.map((q: any) => q.net)).toEqual([21.06, 40.5, 61.04]);
    expect(r.A.levels.L1.rooms[0].name).toBe('Mehmonxona');
    expect(r.A.levels.L2.rooms.length).toBe(3);
  });

  it('bir xil buyruqlar — bir xil model (determinizm)', () => {
    expect(JSON.stringify(B.build(UY).M)).toBe(JSON.stringify(B.build(UY).M));
  });

  it('model JSON orqali tiklanadi: tahlil bir xil, raqamlash davom etadi', () => {
    const r = B.build(UY), M2 = JSON.parse(JSON.stringify(r.M));
    expect(B.analyze(M2).levels.L1.rooms.map((q: any) => q.net)).toEqual(r.A.levels.L1.rooms.map((q: any) => q.net));
    const out = B.run(M2, 'wall M200 1,1 2,1 L1');
    expect(out.every((o: any) => o.ok)).toBe(true);
    expect(M2.el[M2.el.length - 1].id).toBe(`W${r.M.seq}`);
    expect(new Set(M2.el.map((e: any) => e.id)).size).toBe(M2.el.length);
  });

  it('loyiha fayli: toFile → fromFile bir xil buyruqlarni qaytaradi; begona fayl rad etiladi', () => {
    expect(B.fromFile(B.toFile(UY))).toEqual(UY);
    expect(() => B.fromFile('{"format":"boshqa"}')).toThrow();
  });

  it('tekshiruvlar: ustma-ust deraza — O3, takror devor — W2, sigʻmagan zina — ST1', () => {
    const ids = (cmds: string[]) => B.build(cmds).A.checks.map((c: any) => c.id);
    expect(ids(UY)).toContain('ST1');
    expect(ids([...UY, 'window O15 W1 9.9'])).toContain('O3');
    expect(ids([...UY, 'wall T400 А1 А4 ref=c L1'])).toContain('W2');
  });

  it('qulflangan elementni oʻchirish xato beradi va model oʻzgarmaydi', () => {
    const r = B.build([...UY, 'lock W1']), before = JSON.stringify(r.M);
    const out = B.run(r.M, 'delete W1,W2');
    expect(out[0].ok).toBe(false);
    expect(JSON.stringify(r.M)).toBe(before);
  });

  it('oʻq surilsa bogʻlangan devorlar birga suriladi, xonalar soni saqlanadi', () => {
    const r = B.build([...UY.slice(0, 18), 'grid move 2 0.6,0']);
    expect(bad(r)).toEqual([]);
    expect(r.A.levels.L1.rooms.length).toBe(3);
    expect(r.A.levels.L1.rooms[0].net).toBeGreaterThan(21.06);
  });

  /* ——— 1-bosqichda tuzatiladigan nuqsonlar ——— */
  it.fails('NUQSON (2-PR): loyiha turlari modelda saqlanadi, boshqa modelga oʻtmaydi', () => {
    const B2 = load();
    B2.run(B2.newModel(), 'walltype ZZ9 partition Gips:100:0.3');
    expect(B2.TYPES.wall.ZZ9).toBeUndefined();
  });

  it.fails('NUQSON (5-PR): oʻq toʻri qayta yaratilganda devorlar qiyshaymaydi', () => {
    const r = B.build([...UY.slice(0, 18), 'grid x 6 6; grid y 6 6']);
    const ortho = r.A.levels.L1.walls.every((g: any) => Math.abs(g.a.x - g.b.x) < 1 || Math.abs(g.a.y - g.b.y) < 1);
    expect(ortho).toBe(true);
  });
});
