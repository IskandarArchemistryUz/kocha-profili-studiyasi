/**
 * Seksiya qavat rejasi — SXEMA (Planimetric «Floor plan» darajasida). Geometriya — sectionplan.ts (qoidadan:
 * zina-lift yadrosi → koridor → har kvartira koridorga eshik va fasadga deraza bilan). Bu fayl — chizma:
 * tashqi devor, kvartiralar (xona boʻlinmalari, sanuzel, eshik), MOP, zina va liftlar, derazalar, oʻqlar va oʻlchamlar.
 * SVG — mm da, masshtab bilan (1:100 … 1:500).
 */
import { area, obb2, type XY } from './geo';
import { type SecPlan } from './apartments';
import { rulePlan, planChecks, floorVariant, sharedEdge, facadeSegs, type RulePlan, type PlanCheck, type FloorType, type RoomKind } from './sectionplan';
import type { Bal } from './facade';

export const APT_FILL: Record<number, string> = { 1: '#f6d58f', 2: '#f4b08a', 3: '#9bd3b8', 4: '#8fa5cc' };
export interface PlanOpts {
  scale: number; /** oʻqlar va oʻlchamlar */ dims: boolean; title: string;
  /** bino qavati (1 dan) — 1-qavat va noturar qavatlar reja turi shundan */ floor: number;
  /** qavat balandligi, m (tekshiruv uchun) */ fh?: number;
  /** balkon turi (turar qavatlarda, 2-qavatdan) */ bal?: Bal | null;
  /** tahrir oynasi: boshqa reja, tanlangan kvartiralar / xona */ plan?: RulePlan; sel?: number[]; selRoom?: number;
  /** 20-band: kvartira raqami (eksplikatsiya jadvali bilan bogʻlash uchun) */ num?: boolean;
  /** varaq ichida: shimol strelkasi va pastki izoh chizilmaydi (varaqning oʻzida) */ bare?: boolean;
}
export const ROOM_LABEL: Record<RoomKind, string> = { texnik: 'texnik / ombor', ombor: 'yashovchilar omborlari', savdo: 'savdo / xizmat', velo: 'velo / kolyaska', zal: 'yashovchilar zali', tozalash: 'tozalash anjomlari ombori' };
const ROOM_FILL: Record<RoomKind, string> = { texnik: '#e4e1da', ombor: '#e6dcc8', savdo: '#cfe0f3', velo: '#dfe9d2', zal: '#efd9e8', tozalash: '#e4e1da' };
/** Qavat turi: noturar qavatlar (f0) — 1-qavat savdo + yashovchilar xonalari, yuqorisi savdo / ofis; turar 1-qavat — kirish qavati */
export function floorTypeOf(pl: SecPlan, floor: number): FloorType { return floor <= pl.f0 ? (floor === 1 ? 'ground' : 'nonres') : floor === 1 ? 'first' : 'typical'; }
export const FLOOR_NAME: Record<FloorType, string> = { ground: 'savdo + yashovchilar xonalari', nonres: 'savdo / ofis', first: 'kirish qavati', typical: 'turar qavat' };
/** Balkon maydoni koeffitsiyenti — ShNQ 2.08.01-19, 2-ilova 3-band (2022-y. 22-son buyruq tahriri): balkon, terrasa — 0,3; oynalangan lodjiya — 1,0 */
export const BAL_K: Partial<Record<Bal, number>> = { ochiq: 0.3, shisha: 0.3, uzluksiz: 0.3, lodjiya: 1.0 };
export interface PlanResult { svg: string; widthMm: number; heightMm: number; apts: { rooms: number; area: number; ring: XY[] }[]; plan: RulePlan; checks: PlanCheck[]; type: FloorType;
  /** chizma ↔ reja koordinatalari (tahrir oynasi uchun) */ toSvg: (p: XY) => [number, number]; toPlan: (x: number, y: number) => XY }

const n1 = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const cen = (r: XY[]): XY => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
/** yorliq nuqtasi: koʻpburchak ichida chegaradan eng uzoq nuqta (L shaklda markaz tashqarida qolmasin) */
function labelPt(r: XY[]): XY {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of r) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const inside = (p: XY) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const dist = (p: XY) => Math.min(...r.map((a, i) => { const b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]); }));
  let best = cen(r), bd = inside(best) ? dist(best) : -1;
  for (let i = 1; i < 14; i++) for (let j = 1; j < 14; j++) { const p: XY = [x0 + (x1 - x0) * i / 14, y0 + (y1 - y0) * j / 14]; if (!inside(p)) continue; const d = dist(p); if (d > bd + 0.3) { bd = d; best = p; } }
  return best;
}

/** Seksiya rejasi (saqlangan yoki qayta hisoblangan) */
export function sectionPlan(pl: SecPlan): RulePlan { return pl.layout.plan ?? rulePlan(pl.ring, pl.layout.mods, [20, 40, 30, 10]); }
/** Seksiya rejasi qoidalari tekshiruvi; fh — qavat balandligi */
export function sectionChecks(pl: SecPlan, fh = 3): PlanCheck[] { return planChecks(sectionPlan(pl), (pl.z0 + pl.f1 - 1) * fh, pl.layout.mods); }

export function floorPlanSvg(pl0: SecPlan, o: PlanOpts): PlanResult {
  // chizma OBB oʻqlariga buriladi: uzun tomon gorizontal (oʻlcham zanjirlari va oʻqlar toʻgʻri)
  const { U } = obb2(pl0.ring), V: XY = [-U[1], U[0]], T = (p: XY): XY => [p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1]], TR = (r: XY[]) => r.map(T);
  const ft = floorTypeOf(pl0, o.floor), PT = o.plan ?? sectionPlan(pl0), P0 = floorVariant(PT, ft, pl0.layout.mods), checks = planChecks(PT, (pl0.z0 + pl0.f1 - 1) * (o.fh ?? 3), pl0.layout.mods);
  const G: RulePlan = { ...P0, stairs: P0.stairs.map(TR), lifts: P0.lifts.map(TR), mop: P0.mop.map(TR), rest: P0.rest.map(TR), fireWalls: P0.fireWalls.map(TR), rooms: P0.rooms.map(q => ({ ...q, ring: TR(q.ring), door: T(q.door) })), apts: P0.apts.map(a => ({ ...a, ring: TR(a.ring), door: T(a.door), wet: TR(a.wet), walls: a.walls.map(([p, q]) => [T(p), T(q)] as [XY, XY]) })) };
  const mods = pl0.layout.mods.map(m => ({ ...m, a: T(m.a), b: T(m.b) }));
  const northDeg = Math.atan2(U[0], U[1]) * 180 / Math.PI;   // shimol yoʻnalishi chizmada
  const r = TR(pl0.ring), k = 1000 / o.scale;   // m → mm
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of r) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const pad = o.dims ? 28 : 8, W = (x1 - x0) * k + 2 * pad + 10, H = (y1 - y0) * k + 2 * pad + 16;
  const X = (x: number) => ((x - x0) * k + pad + 5).toFixed(2), Y = (y: number) => ((y1 - y) * k + pad + 12).toFixed(2);
  const path = (ring: XY[]) => ring.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])} ${Y(p[1])}`).join('') + 'Z';
  const seg = (a: XY, b: XY, st: string) => `<path d="M${X(a[0])} ${Y(a[1])}L${X(b[0])} ${Y(b[1])}" ${st}/>`;
  const out: string[] = [];
  out.push(`<defs><pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V1.4" stroke="#b9b5ab" stroke-width="0.3"/></pattern></defs>`);
  out.push(`<rect x="0" y="0" width="${W.toFixed(1)}" height="${H.toFixed(1)}" fill="#fff"/>`);
  out.push(`<text x="${pad + 5}" y="9" font-size="4.2" font-weight="600" fill="#141414">${esc(o.title)}</text>`);
  // MOP (koridor, lift oldi)
  for (const q of G.mop) out.push(`<path d="${path(q)}" fill="#ece9e2" stroke="#141414" stroke-width="0.3"/>`);
  // balkonlar — rejadagi deraza modullari oʻrtasida (deraza bilan bir oʻqda): har 2-modulda, ≥ 6 m devorlarda; lodjiya 0,9 m, balkon 1,3 m, uzluksiz terrasa 1,5 m
  const bals: XY[][] = [], balLines: [XY, XY][] = [];
  if (o.bal && o.bal !== 'yoq' && ft === 'typical') {
    const inApt = (p: XY) => G.apts.some(a => pin(p, a.ring));
    let run = 0;
    mods.forEach((m, i) => {
      const prev = mods[i - 1], cont = !!prev && Math.hypot(prev.b[0] - m.a[0], prev.b[1] - m.a[1]) < 0.05 && Math.abs((prev.b[0] - prev.a[0]) * (m.b[1] - m.a[1]) - (prev.b[1] - prev.a[1]) * (m.b[0] - m.a[0])) < 0.05;
      run = cont ? run + 1 : 0;
      const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ox = uy, oy = -ux;   // modullar CCW halqada — tashqi normal oʻngda
      const c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], at = (t: number, d: number): XY => [c[0] + ux * t + ox * d, c[1] + uy * t + oy * d];
      if (m.blind || !inApt(at(0, -0.6))) return;
      // devor uzunligi (shu yoʻnalishdagi modullar qatori) ≥ 6 m
      let L = l; for (let j = i - 1; j >= 0 && Math.abs((mods[j].b[0] - mods[j].a[0]) * dy - (mods[j].b[1] - mods[j].a[1]) * dx) < 0.05 * l; j--) L += Math.hypot(mods[j].b[0] - mods[j].a[0], mods[j].b[1] - mods[j].a[1]);
      for (let j = i + 1; j < mods.length && Math.abs((mods[j].b[0] - mods[j].a[0]) * dy - (mods[j].b[1] - mods[j].a[1]) * dx) < 0.05 * l; j++) L += Math.hypot(mods[j].b[0] - mods[j].a[0], mods[j].b[1] - mods[j].a[1]);
      if (L < 6) return;
      if (o.bal === 'uzluksiz') { bals.push([at(-l / 2, 0), at(l / 2, 0), at(l / 2, 1.5), at(-l / 2, 1.5)]); return; }
      if (o.bal === 'fransuz') { balLines.push([at(-0.7, 0.12), at(0.7, 0.12)]); return; }
      if (run % 2) return;
      const w2 = Math.min(l - 0.2, 2.8) / 2, d = o.bal === 'lodjiya' ? 0.9 : 1.3;
      bals.push([at(-w2, 0), at(w2, 0), at(w2, d), at(-w2, d)]);
    });
  }
  const balOf = (ring: XY[]) => bals.filter(q => pin([(q[0][0] + q[1][0]) / 2 * 1 + ((q[0][0] + q[1][0]) / 2 - (q[2][0] + q[3][0]) / 2) * 0.5, (q[0][1] + q[1][1]) / 2 + ((q[0][1] + q[1][1]) / 2 - (q[2][1] + q[3][1]) / 2) * 0.5], ring)).reduce((t, q) => t + area(q), 0) * (BAL_K[o.bal ?? 'yoq'] ?? 0);
  for (const q of bals) out.push(`<path d="${path(q)}" fill="#fff" stroke="#141414" stroke-width="0.3"/>`);
  for (const [p, q] of balLines) out.push(seg(p, q, 'stroke="#141414" stroke-width="0.35"'));
  // palisadnik (1-qavat kvartiralari, hovli tomoni): 3,5 m, panjara 0,8 m — Strelka katalogi, «Первый этаж»: rekreatsiya uchun 3–4 m
  if (ft === 'first') for (const a of G.apts) { if (!a.court) continue;
    for (const [p, q] of facadeSegs(a.ring, r)) { const l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < 2.5) continue; const ux = (q[0] - p[0]) / l, uy = (q[1] - p[1]) / l, ox = uy, oy = -ux, D = 3.5;
      const blindHere = mods.some(m => m.blind && Math.hypot((m.a[0] + m.b[0]) / 2 - (p[0] + q[0]) / 2, (m.a[1] + m.b[1]) / 2 - (p[1] + q[1]) / 2) < l / 2); if (blindHere) continue;
      const g4: XY[] = [[p[0] + ux * 0.15, p[1] + uy * 0.15], [q[0] - ux * 0.15, q[1] - uy * 0.15], [q[0] - ux * 0.15 + ox * D, q[1] - uy * 0.15 + oy * D], [p[0] + ux * 0.15 + ox * D, p[1] + uy * 0.15 + oy * D]];
      out.push(`<path d="${path(g4)}" fill="#e3eed8" stroke="#6f8f55" stroke-width="0.3" stroke-dasharray="0.8 0.5"/>`);
      const c = cen(g4); out.push(`<text x="${X(c[0])}" y="${Y(c[1])}" font-size="1.6" text-anchor="middle" fill="#4d6b38">palisadnik</text>`); } }
  // kvartira boʻlmagan xonalar
  G.rooms.forEach((q, i) => {
    out.push(`<path d="${path(q.ring)}" fill="${ROOM_FILL[q.kind]}" stroke="${o.selRoom === i ? '#0a84ff' : '#141414'}" stroke-width="${o.selRoom === i ? 1.2 : 0.4}" data-room="${i}"/>`);
    const c = labelPt(q.ring), A = area(q.ring) * 0.85;
    out.push(`<text x="${X(c[0])}" y="${Y(c[1])}" font-size="1.9" text-anchor="middle" fill="#3a3936" pointer-events="none">${ROOM_LABEL[q.kind]}</text><text x="${X(c[0])}" y="${(Number(Y(c[1])) + 2.6).toFixed(2)}" font-size="1.8" text-anchor="middle" fill="#6b6965" pointer-events="none">${n1(Math.round(A))} m²</text>`);
  });
  // kvartiralar
  G.apts.forEach((a, ai) => {
    const sel = o.sel?.indexOf(ai) ?? -1;
    out.push(`<path d="${path(a.ring)}" fill="${APT_FILL[Math.min(4, a.rooms)]}" stroke="${sel >= 0 ? '#0a84ff' : '#141414'}" stroke-width="${sel >= 0 ? 1.2 : 0.5}" stroke-linejoin="round" data-apt="${ai}"/>`);
    for (const [p, q] of a.walls) out.push(seg(p, q, 'stroke="#141414" stroke-width="0.25" stroke-dasharray="0.8 0.6"'));
    if (a.wet.length) { const c = cen(a.wet); out.push(`<path d="${path(a.wet)}" fill="rgba(255,255,255,.6)" stroke="#141414" stroke-width="0.25" stroke-dasharray="0.6 0.5"/><text x="${X(c[0])}" y="${(Number(Y(c[1])) + 0.6).toFixed(2)}" font-size="1.6" text-anchor="middle" fill="#3a3936">S</text>`); }
    const c = labelPt(a.ring), bA = balOf(a.ring);
    if (o.num) out.push(`<circle cx="${X(c[0])}" cy="${(Number(Y(c[1])) - 5.2).toFixed(2)}" r="2.1" fill="#fff" stroke="#141414" stroke-width="0.35"/><text x="${X(c[0])}" y="${(Number(Y(c[1])) - 4.35).toFixed(2)}" font-size="2.4" font-weight="700" text-anchor="middle" fill="#141414" pointer-events="none">${ai + 1}</text>`);
    out.push(`<text x="${X(c[0])}" y="${Y(c[1])}" font-size="2.6" font-weight="600" text-anchor="middle" fill="#141414" pointer-events="none">${sel >= 0 ? `${'AB'[sel] ?? ''} · ` : ''}${a.rooms}x</text><text x="${X(c[0])}" y="${(Number(Y(c[1])) + 3.2).toFixed(2)}" font-size="2.1" text-anchor="middle" fill="#3a3936" pointer-events="none">${n1(Math.round((a.area * 0.85 + bA) * 10) / 10)} m²</text>`);
  });
  // eshiklar — kvartira / xona bilan MOP chegarasida 0,9 m oʻtish (devor uziladi) va yoy
  for (const a of [...G.apts, ...G.rooms.filter(q => q.kind !== 'savdo')]) {
    let best = 0, ea: XY = a.door, eb: XY = a.door;
    for (let i = 0; i < a.ring.length; i++) { const p = a.ring[i], q = a.ring[(i + 1) % a.ring.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]), t = ((a.door[0] - p[0]) * (q[0] - p[0]) + (a.door[1] - p[1]) * (q[1] - p[1])) / (l * l || 1), d = Math.hypot(p[0] + (q[0] - p[0]) * t - a.door[0], p[1] + (q[1] - p[1]) * t - a.door[1]); if (t >= 0 && t <= 1 && d < 0.05 && l > best) { best = l; ea = p; eb = q; } }
    const l = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]) || 1, ux = (eb[0] - ea[0]) / l, uy = (eb[1] - ea[1]) / l, d0: XY = [a.door[0] - ux * 0.45, a.door[1] - uy * 0.45], d1: XY = [a.door[0] + ux * 0.45, a.door[1] + uy * 0.45];
    let nx = -uy, ny = ux; const c = cen(a.ring); if ((c[0] - a.door[0]) * nx + (c[1] - a.door[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const tip: XY = [d0[0] + nx * 0.9, d0[1] + ny * 0.9];
    out.push(seg(d0, d1, 'stroke="#fff" stroke-width="0.7"'), seg(d0, tip, 'stroke="#141414" stroke-width="0.25"'), `<path d="M${X(tip[0])} ${Y(tip[1])}A${(0.9 * k).toFixed(2)} ${(0.9 * k).toFixed(2)} 0 0 ${nx * uy - ny * ux > 0 ? 0 : 1} ${X(d1[0])} ${Y(d1[1])}" fill="none" stroke="#141414" stroke-width="0.18"/>`);
  }
  // qolgan — texnik / ombor (shtrix)
  for (const q of G.rest) { const cc = cen(q); out.push(`<path d="${path(q)}" fill="url(#hatch)" stroke="#141414" stroke-width="0.3"/>`); if (area(q) > 8) out.push(`<text x="${X(cc[0])}" y="${Y(cc[1])}" font-size="1.8" text-anchor="middle" fill="#6b6965">texnik</text>`); }
  // zinalar: ikki marsh (oraligʻida 0,1 m boʻshliq), ikki uchida maydoncha, pogʻonalar 0,3 m, yoʻnalish strelkasi
  const MOPS = G.mop;
  for (const st of G.stairs) {
    out.push(`<path d="${path(st)}" fill="#f4f2ee" stroke="#141414" stroke-width="0.5"/>`);
    if (st.length !== 4) continue;
    const [a, b, , d] = st, e1 = Math.hypot(b[0] - a[0], b[1] - a[1]), e2 = Math.hypot(d[0] - a[0], d[1] - a[1]);
    const [o0, L, W2, uL, uW] = e1 >= e2 ? [a, e1, e2, [(b[0] - a[0]) / e1, (b[1] - a[1]) / e1], [(d[0] - a[0]) / e2, (d[1] - a[1]) / e2]] as const : [a, e2, e1, [(d[0] - a[0]) / e2, (d[1] - a[1]) / e2], [(b[0] - a[0]) / e1, (b[1] - a[1]) / e1]] as const;
    const P2 = (t: number, w: number): XY => [o0[0] + uL[0] * t + uW[0] * w, o0[1] + uL[1] * t + uW[1] * w];
    const land = Math.min(1.4, L * 0.22), f0 = land, f1 = L - land, mid = W2 / 2;
    for (let t = f0; t <= f1 + 1e-6; t += 0.3) out.push(seg(P2(t, 0), P2(t, mid - 0.05), 'stroke="#141414" stroke-width="0.15"'), seg(P2(t, mid + 0.05), P2(t, W2), 'stroke="#141414" stroke-width="0.15"'));
    out.push(`<path d="${path([P2(f0, mid - 0.05), P2(f1, mid - 0.05), P2(f1, mid + 0.05), P2(f0, mid + 0.05)])}" fill="#141414"/>`);
    // strelka: birinchi marsh boʻylab yuqoriga, ikkinchisida qaytish
    const s0 = P2(f0 + 0.2, mid / 2), s1 = P2(f1, mid / 2), s2 = P2(f1, mid + mid / 2), s3 = P2(f0 + 1.2, mid + mid / 2);
    out.push(`<path d="M${X(s0[0])} ${Y(s0[1])}L${X(s1[0])} ${Y(s1[1])}L${X(s2[0])} ${Y(s2[1])}L${X(s3[0])} ${Y(s3[1])}" fill="none" stroke="#141414" stroke-width="0.22"/>`);
    const ah = P2(f0 + 1.2 - 0.0, mid + mid / 2), ah1 = P2(f0 + 1.6, mid + mid / 2 - 0.25), ah2 = P2(f0 + 1.6, mid + mid / 2 + 0.25);
    out.push(`<path d="M${X(ah[0])} ${Y(ah[1])}L${X(ah1[0])} ${Y(ah1[1])}L${X(ah2[0])} ${Y(ah2[1])}Z" fill="#141414"/>`);
    out.push(`<circle cx="${X(s0[0])}" cy="${Y(s0[1])}" r="0.5" fill="#141414"/>`);
  }
  // liftlar: shaxta (qalin devor), kabina, eshik — lift oldi tomonida, qarshi yuk (orqada)
  for (const lf of G.lifts) {
    out.push(`<path d="${path(lf)}" fill="#fff" stroke="#141414" stroke-width="0.7"/>`);
    if (lf.length !== 4) continue;
    let fi = 0, fl = 0; for (let i = 0; i < 4; i++) { const sl = MOPS.reduce((t, mq) => t + sharedEdge([lf[i], lf[(i + 1) % 4]], mq).len, 0); if (sl > fl) { fl = sl; fi = i; } }
    const A = lf[fi], B = lf[(fi + 1) % 4], C = lf[(fi + 2) % 4], wl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, dl = Math.hypot(C[0] - B[0], C[1] - B[1]) || 1;
    const ex: XY = [(B[0] - A[0]) / wl, (B[1] - A[1]) / wl], ey: XY = [(C[0] - B[0]) / dl, (C[1] - B[1]) / dl], Q = (x: number, y: number): XY => [A[0] + ex[0] * x + ey[0] * y, A[1] + ex[1] * x + ey[1] * y];
    out.push(`<path d="${path([Q(0.25, 0.2), Q(wl - 0.25, 0.2), Q(wl - 0.25, dl - 0.45), Q(0.25, dl - 0.45)])}" fill="#e8e5df" stroke="#141414" stroke-width="0.25"/>`);
    out.push(seg(Q(0.25, 0.2), Q(wl - 0.25, dl - 0.45), 'stroke="#141414" stroke-width="0.15"'), seg(Q(wl - 0.25, 0.2), Q(0.25, dl - 0.45), 'stroke="#141414" stroke-width="0.15"'));
    out.push(`<path d="${path([Q(wl * 0.3, dl - 0.35), Q(wl * 0.7, dl - 0.35), Q(wl * 0.7, dl - 0.15), Q(wl * 0.3, dl - 0.15)])}" fill="#141414"/>`);
    out.push(seg(Q(wl / 2 - 0.45, 0), Q(wl / 2 + 0.45, 0), 'stroke="#fff" stroke-width="0.8"'), seg(Q(wl / 2 - 0.45, 0.06), Q(wl / 2 + 0.45, 0.06), 'stroke="#141414" stroke-width="0.25"'));
  }
  // seksiyalar orasidagi yongʻin devorlari
  for (const q of G.fireWalls) out.push(`<path d="${path(q)}" fill="#141414" stroke="#141414" stroke-width="0.3"/>`);
  // tashqi devor
  out.push(`<path d="${path(r)}" fill="none" stroke="#141414" stroke-width="1.1" stroke-linejoin="miter"/>`);
  // kirishlar (1-qavat): savdo — koʻchadan, yashovchilar — zina-lift holli orqali hovlidan
  if (ft === 'ground' || ft === 'first') {
    const arrow = (m: XY, inward: XY, col: string) => { const a: XY = [m[0] - inward[0] * 2.2, m[1] - inward[1] * 2.2], t: XY = [m[0] - inward[0] * 0.3, m[1] - inward[1] * 0.3], px = -inward[1], py = inward[0];
      out.push(seg(a, t, `stroke="${col}" stroke-width="0.45"`), `<path d="M${X(t[0])} ${Y(t[1])}L${X(t[0] - inward[0] * 0.8 + px * 0.5)} ${Y(t[1] - inward[1] * 0.8 + py * 0.5)}L${X(t[0] - inward[0] * 0.8 - px * 0.5)} ${Y(t[1] - inward[1] * 0.8 - py * 0.5)}Z" fill="${col}"/>`); };
    const inw = (ring: XY[], m: XY): XY => { const c = cen(ring), dx = c[0] - m[0], dy = c[1] - m[1]; let best: XY = [0, 0], bl = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), t = ((m[0] - a[0]) * (b[0] - a[0]) + (m[1] - a[1]) * (b[1] - a[1])) / (l * l || 1), d = Math.hypot(a[0] + (b[0] - a[0]) * t - m[0], a[1] + (b[1] - a[1]) * t - m[1]); if (t >= 0 && t <= 1 && d < 0.1 && l > bl) { bl = l; let nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l; if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; } best = [nx, ny]; } } return best; };
    for (const q of G.rooms) if (q.kind === 'savdo') { const s2 = sharedEdge(q.ring, r); if (s2.len > 1.5) arrow(s2.mid, inw(q.ring, s2.mid), '#0a5bd8'); }
    for (const q of G.mop) for (const [p1, p2] of facadeSegs(q, r)) { const l = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); if (l > 1 && l < 8) { const m: XY = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]; arrow(m, inw(q, m), '#141414'); } }
  }
  // derazalar: kvartira modullari oʻrtasida 1,6 m
  const used = new Set(G.apts.flatMap(a => a.mods));
  mods.forEach((m, i) => { if (!used.has(i)) return; const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, w = Math.min(1.6, l * 0.5), c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], ux = dx / l * w / 2, uy = dy / l * w / 2;
    out.push(seg([c[0] - ux, c[1] - uy], [c[0] + ux, c[1] + uy], 'stroke="#fff" stroke-width="0.9"'), seg([c[0] - ux, c[1] - uy], [c[0] + ux, c[1] + uy], 'stroke="#141414" stroke-width="0.25"')); });
  // oʻqlar va oʻlchamlar: pastda — modullar, chapda — chuqurlik
  if (o.dims) {
    const { L, S } = obb2(r);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of r) { u0 = Math.min(u0, p[0]); u1 = Math.max(u1, p[0]); v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); }
    const yb = (H - 6).toFixed(1), xl = (pad - 14).toFixed(1);
    const long = mods.filter(m => Math.abs(m.b[0] - m.a[0]) > Math.abs(m.b[1] - m.a[1]));
    const us = [...new Set(long.flatMap(m => [m.a, m.b]).map(p => Math.round(p[0] * 100) / 100))].sort((a, b) => a - b);
    const xu = (u: number) => ((u - u0) * k + pad + 5).toFixed(2);
    out.push(`<path d="M${xu(u0)} ${yb}H${xu(u1)}" stroke="#141414" stroke-width="0.25"/>`);
    let prev = us[0] ?? u0;
    for (const u of us) { out.push(`<path d="M${xu(u)} ${(Number(yb) - 1.5).toFixed(1)}v3" stroke="#141414" stroke-width="0.25"/>`); if (u - prev > 0.5) out.push(`<text x="${((Number(xu(u)) + Number(xu(prev))) / 2).toFixed(2)}" y="${(Number(yb) - 1.2).toFixed(1)}" font-size="1.9" text-anchor="middle" fill="#141414">${n1(u - prev)}</text>`); prev = u; }
    out.push(`<text x="${((Number(xu(u0)) + Number(xu(u1))) / 2).toFixed(2)}" y="${(Number(yb) + 4).toFixed(1)}" font-size="2.2" font-weight="600" text-anchor="middle" fill="#141414">${n1(L)} m</text>`);
    us.forEach((u, i) => { out.push(`<circle cx="${xu(u)}" cy="${(Number(yb) + 9).toFixed(1)}" r="2" fill="#fff" stroke="#141414" stroke-width="0.25"/><text x="${xu(u)}" y="${(Number(yb) + 9.7).toFixed(1)}" font-size="1.8" text-anchor="middle" fill="#141414">${i + 1}</text>`); });
    const yv = (v: number) => ((v1 - v) * k + pad + 12).toFixed(2);
    out.push(`<path d="M${xl} ${yv(v1)}V${yv(v0)}" stroke="#141414" stroke-width="0.25"/><path d="M${(Number(xl) - 1.5).toFixed(1)} ${yv(v1)}h3 M${(Number(xl) - 1.5).toFixed(1)} ${yv(v0)}h3" stroke="#141414" stroke-width="0.25"/>`);
    out.push(`<text transform="translate(${(Number(xl) - 1.5).toFixed(1)} ${((Number(yv(v0)) + Number(yv(v1))) / 2).toFixed(1)}) rotate(-90)" font-size="2.2" font-weight="600" text-anchor="middle" fill="#141414">${n1(S)} m</text>`);
    ['А', 'Б'].forEach((t, i) => { const y = i ? yv(v0) : yv(v1); out.push(`<circle cx="${(Number(xl) - 6).toFixed(1)}" cy="${y}" r="2" fill="#fff" stroke="#141414" stroke-width="0.25"/><text x="${(Number(xl) - 6).toFixed(1)}" y="${(Number(y) + 0.7).toFixed(1)}" font-size="1.8" text-anchor="middle" fill="#141414">${t}</text>`); });
  }
  if (!o.bare) out.push(`<g transform="translate(${(W - 10).toFixed(1)} 11) rotate(${(-northDeg).toFixed(1)})"><path d="M0 5L-2.2 2.5 0 -5 2.2 2.5Z" fill="#141414"/><text y="-6" font-size="2.4" text-anchor="middle" fill="#141414">N</text></g>`);
  const bad = checks.filter(c => c.ok === false).length;
  if (!o.bare) out.push(`<text x="${(W - 4).toFixed(1)}" y="${(H - 2).toFixed(1)}" font-size="2.2" text-anchor="end" fill="#6b6965">M 1:${o.scale} · ${o.floor}-qavat (${FLOOR_NAME[ft]}) · ${bad ? `${bad} ta qoida buzilgan` : 'qoidalar bajarilgan'}${bals.length ? ' · balkon ×' + String(BAL_K[o.bal!] ?? 0).replace('.', ',') + ' (ShNQ 2.08.01-19, 2-ilova)' : ''} · sxema</text>`);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" font-family="Archivo, system-ui, sans-serif">${out.join('')}</svg>`;
  return { svg, widthMm: W, heightMm: H, apts: P0.apts.map(a => ({ rooms: a.rooms, area: a.area * 0.85, ring: a.ring })), plan: P0, checks, type: ft,
    toSvg: (p: XY) => { const q = T(p); return [Number(X(q[0])), Number(Y(q[1]))]; },
    toPlan: (sx: number, sy: number) => { const u = (sx - pad - 5) / k + x0, v = y1 - (sy - pad - 12) / k; return [U[0] * u + V[0] * v, U[1] * u + V[1] * v]; } };
}

/** Rejalar toʻplami — bitta SVG varaq, toʻrga joylangan */
function sheet(items: PlanResult[], heading: string): string {
  if (!items.length) return '';
  const cols = Math.max(1, Math.round(Math.sqrt(items.length * 1.4))), gap = 12;
  const colW: number[] = [], rowH: number[] = [];
  items.forEach((it, i) => { const c = i % cols, rr = Math.floor(i / cols); colW[c] = Math.max(colW[c] ?? 0, it.widthMm); rowH[rr] = Math.max(rowH[rr] ?? 0, it.heightMm); });
  const W = colW.reduce((a, b) => a + b, 0) + gap * (cols + 1), H = rowH.reduce((a, b) => a + b, 0) + gap * (rowH.length + 1) + 10;
  const body = items.map((it, i) => { const c = i % cols, rr = Math.floor(i / cols); const x = gap + colW.slice(0, c).reduce((a, b) => a + b, 0) + gap * c, y = 10 + gap + rowH.slice(0, rr).reduce((a, b) => a + b, 0) + gap * rr; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${it.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`; }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" font-family="Archivo, system-ui, sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="${gap}" y="8" font-size="4.5" font-weight="600">${esc(heading)}</text>${body}</svg>`;
}
/** Barcha binolarning shu qavat rejalari — bitta SVG */
export function allPlansSvg(plans: SecPlan[], floor: number, scale = 200, names: (pl: SecPlan, i: number) => string, opt: (pl: SecPlan) => Partial<PlanOpts> = () => ({})): string {
  return sheet(plans.map((pl, i) => ({ pl, i })).filter(({ pl }) => floor <= pl.f1).map(({ pl, i }) => floorPlanSvg(pl, { scale, dims: true, title: names(pl, i), floor, ...opt(pl) })), `Rejalar · ${floor}-qavat · M 1:${scale}`);
}
/** Qavatlar guruhlari: bir xil rejali ketma-ket qavatlar (1-qavat, noturar, turar 2…N) */
export function floorGroups(pl: SecPlan): { from: number; to: number; type: FloorType }[] {
  const out: { from: number; to: number; type: FloorType }[] = [];
  for (let f = 1; f <= pl.f1; f++) { const t = floorTypeOf(pl, f), last = out[out.length - 1]; if (last && last.type === t && t !== 'ground' && t !== 'first') last.to = f; else out.push({ from: f, to: f, type: t }); }
  return out;
}
export const groupName = (g: { from: number; to: number }) => g.from === g.to ? `${g.from}-qavat` : `${g.from}–${g.to}-qavatlar`;
/** Bitta binoning barcha qavat rejalari (bir xillari bitta varaqda) — bitta SVG */
export function buildingFloorsSvg(pl: SecPlan, scale: number, title: string, opt: Partial<PlanOpts> = {}): string {
  return sheet(floorGroups(pl).map(g => floorPlanSvg(pl, { scale, dims: true, ...opt, title: `${title} · ${groupName(g)}`, floor: g.from })), `${title} · barcha qavatlar · M 1:${scale}`);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
