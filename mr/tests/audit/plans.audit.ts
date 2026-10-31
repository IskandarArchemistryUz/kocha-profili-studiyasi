/* Ishga tushirish: tests/unit ga vaqtincha nusxa (masalan zz_audit.test.ts) va AUD_N=300 npx vitest run … — natija scratchpad/audit.json */
/* Audit (egasi 31.10): yuzlab generatsiyada zinalar va kvartira ichki rejalari statistikasi. vitest include tashqarisida — qoʻlda ishga tushiriladi. */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { generate, DEFAULT_GEN, type Typology } from '../../src/core/generator';
import { blankProject } from '../../src/core/doc';
import { frame, area, obb2, type XY } from '../../src/core/geo';
import { planApartments } from '../../src/core/apartments';
import { sectionPlan, floorPlanSvg } from '../../src/core/floorplan';
let saved = 0;
import { aptInterior } from '../../src/core/aptplan';
import * as AP from '../../src/core/aptplan';
import { appendFileSync } from 'node:fs';
import { planChecks } from '../../src/core/sectionplan';

let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function block(): XY[] {
  const W = 70 + rnd() * 130, H = 60 + rnd() * 110, sk = (rnd() - 0.5) * 0.5, a = rnd() * Math.PI;
  const q: XY[] = [[0, 0], [W, 0], [W + sk * H * (rnd() > 0.5 ? 1 : 0.3), H], [sk * H, H]].map(([x, y]) => [x + (rnd() - 0.5) * 10, y + (rnd() - 0.5) * 10]);
  if (rnd() < 0.3) q.splice(2, 0, [W * (0.7 + rnd() * 0.3), H * (0.5 + rnd() * 0.3)]); // beshburchak (kemtik)
  return q.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
}
it('audit', () => {
  const TYP: Typology[] = ['perimetr', 'qatorlar', 'minora', 'blok_minora'];
  const st = { secs: 0, apts: 0, inter: 0, bigNoInter: 0, nonRect: 0, nonRectInter: 0, byK: {} as Record<string, [number, number]>, stairs: [] as { L: number; W: number }[], fails: {} as Record<string, number>, aptArea: [] as number[] };
  const samples: string[] = [];
  for (let n = 0; n < Number(process.env.AUD_N ?? 40); n++) {
    const typ = TYP[n % TYP.length], g = { ...DEFAULT_GEN, typology: typ, maxF: 9 + (n % 4) * 3, minF: 5 };
    const B = block(); appendFileSync('/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/aud_prog.txt', `${n} ${typ} ${Date.now()} ${JSON.stringify(B)}\n`);
    let r; try { r = generate(B, g); } catch { continue; }
    const doc = blankProject('a'); const fr = frame(doc.origin);
    doc.buildings = r.sections.filter(s => s.kind !== 'stilobat').map((s, i) => ({ id: 'b' + i, footprint: s.ring.map(fr.toGeo), floors: s.floors, nonRes: s.nonRes, use: 'turar' as const, gen: { grp: 'g', kind: s.kind, ...(s.blind ? { blind: s.blind } : {}) } }));
    appendFileSync('/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/aud_prog.txt', 'G ');
    let plans; try { plans = planApartments(doc); } catch (e) { st.fails['planApartments xato'] = (st.fails['planApartments xato'] ?? 0) + 1; continue; }
    appendFileSync('/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/aud_prog.txt', 'P ');
    for (const pl of plans) {
      appendFileSync('/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/aud_prog.txt', 's');
      st.secs++; const P = sectionPlan(pl), mods = pl.layout.mods;
      for (const s of P.stairs) { if (s.length !== 4) { st.fails['zina 4 burchakli emas'] = (st.fails['zina 4 burchakli emas'] ?? 0) + 1; continue; } const o = obb2(s); st.stairs.push({ L: o.L, W: o.S }); }
      for (const c of planChecks(P, (pl.z0 + pl.f1 - 1) * 3, mods)) if (c.ok === false) st.fails[c.title] = (st.fails[c.title] ?? 0) + 1;
      for (const a of P.apts) {
        st.apts++; const has = !!aptInterior(a, mods), o = obb2(a.ring), rect = area(a.ring) / (o.L * o.S) > 0.95, k = String(Math.min(4, a.rooms));
        st.byK[k] = st.byK[k] ?? [0, 0]; st.byK[k][0]++; if (has) st.byK[k][1]++;
        if (has) st.inter++; if (!rect) { st.nonRect++; if (has) st.nonRectInter++; }
        if (!has && a.area > 70) st.bigNoInter++;
        if (!has) { const fill = area(a.ring) / (o.L * o.S), fb = fill > 0.985 ? 'f>98' : fill > 0.9 ? 'f90-98' : fill > 0.8 ? 'f80-90' : 'f<80'; st.fails['fill ' + fb + ' n' + Math.min(a.ring.length, 8)] = (st.fails['fill ' + fb + ' n' + Math.min(a.ring.length, 8)] ?? 0) + 1; const w = String((AP as any).lastWhy).replace(/[0-9.]+/g, '#'); st.fails['why: ' + w] = (st.fails['why: ' + w] ?? 0) + 1; }
        st.aptArea.push(a.area * 0.85);
        if (has && area(a.ring) / (o.L * o.S) < 0.97 && saved < 8 && pl.f1 >= 3) { saved++; writeFileSync(`/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/clip${saved}.svg`, floorPlanSvg(pl, { scale: 100, dims: false, title: 'clip', floor: Math.min(pl.f1, Math.max(2, pl.f0 + 1)) }).svg); }
        if (!has && samples.length < 12) samples.push(`${typ} k=${a.rooms} A=${(a.area * 0.85).toFixed(1)} rect=${rect} n=${a.ring.length} mods=${a.mods.length}`);
      }
    }
  }
  const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
  const Ls = st.stairs.map(s => s.L), Ws = st.stairs.map(s => s.W);
  const rep = { ...st, stairs: undefined, aptArea: undefined, stairN: Ls.length, stairL: [q(Ls, 0), q(Ls, 0.1), q(Ls, 0.5), q(Ls, 0.9), q(Ls, 1)], stairW: [q(Ws, 0), q(Ws, 0.5), q(Ws, 1)], stairShort: Ls.filter(l => l < 5.4).length, stairLong: Ls.filter(l => l > 6.6).length, area: [q(st.aptArea, 0.05), q(st.aptArea, 0.5), q(st.aptArea, 0.95)], samples };
  writeFileSync('/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/audit.json', JSON.stringify(rep, null, 1));
}, 600_000);
