/**
 * Kvartiralar (massing bosqichi uchun sxema) va deraza insolyatsiyasi — SanQvaN 0331-16.
 *
 * Seksiya fasadi perimetr boʻylab ~3,3 m li modullarga boʻlinadi (bir modul — bitta xona derazasi).
 * Qoʻshni seksiyaga tegib turgan devor — berk (derazasiz). Ketma-ket modullar kvartiralarga guruhlanadi:
 * k xonali kvartira = k yashash xonasi + 1 oshxona moduli. Burchakda guruh ikki fasadga chiqadi (ikki tomonlama kvartira).
 * Xonalar joylashuvi «optimistik»: yashash xonalari kvartiraning eng yaxshi yoʻnalishdagi derazalarini oladi,
 * oshxona — gʻarbiy yoki eng shimoliy derazani (loyihachi shunday qiladi; aniq reja 5-bosqichda).
 *
 * Meʼyor (asl matndan, D:\Work\normalar\754f…pdf):
 *  8.3 — 22 mart – 22 sentabr, xonada uzluksiz 2,5 soat;
 *  8.4 — 1–3 xonali kvartirada kamida 1 xona, 4–5 xonalida kamida 2 xona;
 *  8.5 — uzlukli rejimda jami +0,5 soat (3,0); rekonstruksiya / murakkab sharoitda 0,5 soatga qisqartirish mumkin;
 *  9.2 — yashash xonalari derazalari 200–290° ga qaratilmaydi; istisno: 2 xonalida — 1 xona, 3 xonalida — ≤ 2 xona.
 */
import type { XY } from './geo';
import { signedArea } from './geo';
import type { Prism, SunStep } from './sun';

export interface Module { a: XY; b: XY; /** deraza nuqtasi (fasaddan 0,3 m tashqarida) */ p: XY; /** tashqi normal azimuti, ° */ az: number; blind: boolean }
export interface Apt { rooms: number; /** modullar indekslari */ mods: number[]; /** yashash xonalari modullari */ living: number[] }
export interface Layout { mods: Module[]; apts: Apt[] }

export const MIX_DEFAULT: [number, number, number, number] = [20, 40, 30, 10];
export const MOD_W = 3.3;

const az = (n: XY) => ((Math.atan2(n[0], n[1]) * 180 / Math.PI) + 360) % 360;
export const isWest = (a: number) => a >= 200 && a <= 290;
/** oshxonaga eng mos (yashash uchun eng yomon) deraza: gʻarb, keyin shimol */
const badness = (a: number) => (isWest(a) ? 2 : 0) + Math.cos(a * Math.PI / 180);

/** Kvartira turlari ketma-ketligi: har qadamda ulushidan eng koʻp orqada qolgan tur */
function mixPicker(mix: number[]): () => number {
  const tot = mix.reduce((a, b) => a + b, 0) || 1, w = mix.map(v => v / tot), placed = mix.map(() => 0); let n = 0;
  return () => { n++; let k = 0, best = -Infinity; w.forEach((s, i) => { const d = s * n - placed[i]; if (s > 0 && d > best) { best = d; k = i; } }); placed[k]++; return k + 1; };
}

/**
 * Seksiya rejasi. ring — mahalliy XY; blindAt(p) — nuqta qoʻshni binoning ichidami (berk devor).
 */
export function layoutSection(ring0: XY[], blindAt: (p: XY) => boolean, mix: number[] = MIX_DEFAULT, modW = MOD_W): Layout {
  const ring = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0, mods: Module[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const cnt = Math.floor(l / modW + 0.2); if (cnt < 1) continue;
    const n: XY = [dy / l, -dx / l], w = l / cnt;
    for (let k = 0; k < cnt; k++) {
      const ma: XY = [a[0] + dx * k / cnt, a[1] + dy * k / cnt], mb: XY = [a[0] + dx * (k + 1) / cnt, a[1] + dy * (k + 1) / cnt];
      const mid: XY = [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2];
      mods.push({ a: ma, b: mb, p: [mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3], az: az(n), blind: blindAt([mid[0] + n[0] * 0.8, mid[1] + n[1] * 0.8]) || w < 2.4 });
    }
  }
  // ochiq modullarning uzluksiz qatorlari (berk devor yoki boshlanish nuqtasi bilan uziladi)
  const runs: number[][] = []; let cur: number[] = [];
  const firstBlind = mods.findIndex(m => m.blind), start = firstBlind < 0 ? 0 : firstBlind;
  for (let j = 0; j < mods.length; j++) {
    const i = (start + j) % mods.length;
    if (mods[i].blind) { if (cur.length) runs.push(cur); cur = []; } else cur.push(i);
  }
  if (cur.length) runs.push(cur);
  const next = mixPicker(mix), apts: Apt[] = [];
  for (const run of runs) {
    let pos = 0, want = next();
    while (pos < run.length) {
      const left = run.length - pos;
      if (left >= want + 1) { apts.push(mkApt(run.slice(pos, pos + want + 1), want, mods)); pos += want + 1; want = next(); continue; }
      if (left >= 2) { apts.push(mkApt(run.slice(pos), left - 1, mods)); pos = run.length; continue; }
      // bitta modul qoldi — oldingi kvartiraga (yordamchi xona) yoki zinapoya derazasi
      if (apts.length && run.includes(apts[apts.length - 1].mods[0])) apts[apts.length - 1].mods.push(run[pos]);
      pos = run.length;
    }
  }
  apts.forEach(a => { a.living = [...a.mods].sort((x, y) => badness(mods[x].az) - badness(mods[y].az)).slice(0, a.rooms); });
  return { mods, apts };
}

function mkApt(m: number[], rooms: number, _mods: Module[]): Apt { return { rooms, mods: m, living: [] }; }

/* ---------------- deraza insolyatsiyasi ---------------- */
const RAD = Math.PI / 180;

function rayEnter(p: XY, d: XY, r: XY[]): number {
  let best = Infinity, inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t >= 0 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return inside ? 0 : best;
}

/**
 * Har deraza uchun: eng uzun uzluksiz quyoshli davr va jami (soat). Quyosh fasad oldida boʻlishi shart
 * (normal bilan burchak < 90°). steps — teng qadamli, vaqt tartibida.
 */
export function windowSun(pts: XY[], z: number[], nAz: number[], prisms: Prism[], steps: SunStep[], maxDist = 500): { run: Float32Array; total: Float32Array } {
  const C = 20, grid = new Map<string, number[]>();
  let maxTop = 0;
  prisms.forEach((pr, k) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; maxTop = Math.max(maxTop, pr.top);
    for (const p of pr.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); }
  });
  const N = pts.length, run = new Float32Array(N), total = new Float32Array(N), cur = new Float32Array(N), stamp = new Int32Array(prisms.length).fill(-1);
  let tick = 0;
  for (const st of steps) {
    const tanA = Math.tan(st.alt * RAD), d: XY = [Math.sin(st.az * RAD), Math.cos(st.az * RAD)];
    for (let n = 0; n < N; n++) {
      let lit = Math.cos((st.az - nAz[n]) * RAD) > 0;
      const p = pts[n], zp = z[n]; tick++;
      for (let s = 0; s <= maxDist && lit; s += C * 0.7) {
        if (s * tanA > maxTop - zp) break;
        const qx = p[0] + d[0] * s, qy = p[1] + d[1] * s;
        for (let di = -1; di <= 1 && lit; di++) for (let dj = -1; dj <= 1 && lit; dj++) {
          const ids = grid.get(`${Math.floor(qx / C) + di},${Math.floor(qy / C) + dj}`); if (!ids) continue;
          for (const k of ids) {
            if (stamp[k] === tick) continue; stamp[k] = tick;
            const pr = prisms[k], dh = pr.top - zp; if (dh <= 0) continue;
            const t = rayEnter(p, d, pr.ring);
            if (t < Infinity && t > 0.01 && t * tanA < dh) { lit = false; break; }
          }
        }
      }
      if (lit) { total[n] += st.dt; cur[n] += st.dt; if (cur[n] > run[n]) run[n] = cur[n]; } else cur[n] = 0;
    }
  }
  return { run, total };
}

/* ---------------- baholash ---------------- */
export interface InsolNorm { /** uzluksiz talab, soat (8.3; rekonstruksiyada −0,5) */ need: number }
export const roomOk = (run: number, total: number, n: InsolNorm) => run >= n.need - 1e-6 || total >= n.need + 0.5 - 1e-6;
/** 8.4: kamida nechta xona */
export const roomsNeeded = (k: number) => (k >= 4 ? 2 : 1);
/** 9.2: gʻarbga ruxsat etilgan yashash xonalari (4+ xonali uchun meʼyorda aytilmagan — 3 xonalidek olindi) */
export const westAllowed = (k: number) => (k <= 1 ? 0 : k === 2 ? 1 : 2);

/* ---------------- loyiha boʻyicha ---------------- */
import type { Project } from './doc';
import { frame } from './geo';
import { useDef } from './uses';

export interface SecPlan { bid: string; ring: XY[]; layout: Layout; /** turar joy qavatlari [f0, f1) — bino pastidan */ f0: number; f1: number; z0: number }

const SKIP = new Set(['stilobat', 'uy', 'taunhaus']);

/** Turar joy seksiyalari rejasi (uylar, taunhauslar va stilobat — kvartirali emas) */
export function planApartments(doc: Project): SecPlan[] {
  const fr = frame(doc.origin), mix = doc.settings.aptMix;
  const all = doc.buildings.filter(b => !SKIP.has(b.gen?.kind ?? '')).map(b => {
    const r = b.footprint.map(fr.toLocal); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { b, r, bb: [x0, y0, x1, y1] };
  });
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const out: SecPlan[] = [];
  for (const s of all) {
    const b = s.b; if (useDef(b.use).res <= 0 || b.floors - b.nonRes < 1) continue;
    const z0 = b.z0 ?? 0, top = z0 + b.floors;
    // berk devor: qoʻshni seksiya shu sathda tegib tursa
    const blindAt = (p: XY) => all.some(o => o !== s && p[0] >= o.bb[0] && p[0] <= o.bb[2] && p[1] >= o.bb[1] && p[1] <= o.bb[3] && (o.b.z0 ?? 0) < top && (o.b.z0 ?? 0) + o.b.floors > z0 + b.nonRes && inside(p, o.r));
    const layout = layoutSection(s.r, blindAt, mix);
    if (layout.apts.length) out.push({ bid: b.id, ring: s.r, layout, f0: b.nonRes, f1: b.floors, z0 });
  }
  return out;
}

/** Hisob nuqtalari: har seksiya × turar qavat × kvartiraga tegishli modul */
export function windowPoints(plans: SecPlan[]): { sec: number; f: number; m: number }[] {
  const out: { sec: number; f: number; m: number }[] = [];
  plans.forEach((pl, sec) => {
    const used = new Set(pl.layout.apts.flatMap(a => a.mods));
    for (let f = pl.f0; f < pl.f1; f++) for (let m = 0; m < pl.layout.mods.length; m++) if (used.has(m)) out.push({ sec, f, m });
  });
  return out;
}

export interface AptStats {
  apts: number; insolOk: number; westOk: number; bothOk: number; rooms: number; roomsOk: number;
  byRooms: { k: number; n: number; ok: number }[];
  /** seksiyalar boʻyicha: kvartiralar va mos emaslari */
  bySec: { bid: string; apts: number; bad: number; west: number }[];
  /** har nuqta holati: 0 — yashash xonasi mos (uzluksiz), 1 — mos (uzlukli, 8.5), 2 — mos emas, 3 — yordamchi xona; west — 9.2 buzilgan kvartira xonasi */
  cls: Uint8Array; west: Uint8Array;
}

export function evaluateApts(plans: SecPlan[], pts: { sec: number; f: number; m: number }[], run: Float32Array, total: Float32Array, norm: InsolNorm): AptStats {
  const idx = new Map<string, number>(); pts.forEach((p, i) => idx.set(`${p.sec}|${p.f}|${p.m}`, i));
  const cls = new Uint8Array(pts.length).fill(3), west = new Uint8Array(pts.length);
  const byK = new Map<number, { n: number; ok: number }>(), bySec: AptStats['bySec'] = [];
  let apts = 0, insolOk = 0, westOk = 0, bothOk = 0, rooms = 0, roomsOk = 0;
  plans.forEach((pl, sec) => {
    const S = { bid: pl.bid, apts: 0, bad: 0, west: 0 };
    for (const a of pl.layout.apts) {
      const wBad = a.living.filter(m => isWest(pl.layout.mods[m].az)).length > westAllowed(a.rooms);
      for (let f = pl.f0; f < pl.f1; f++) {
        let ok = 0;
        for (const m of a.living) {
          const i = idx.get(`${sec}|${f}|${m}`)!; rooms++;
          const good = roomOk(run[i], total[i], norm); if (good) { ok++; roomsOk++; }
          cls[i] = run[i] >= norm.need - 1e-6 ? 0 : good ? 1 : 2; if (wBad) west[i] = 1;
        }
        const iOk = ok >= roomsNeeded(a.rooms);
        apts++; S.apts++; if (iOk) insolOk++; if (!wBad) westOk++; if (iOk && !wBad) bothOk++; else S.bad++; if (wBad) S.west++;
        const e = byK.get(a.rooms) ?? { n: 0, ok: 0 }; e.n++; if (iOk && !wBad) e.ok++; byK.set(a.rooms, e);
      }
    }
    bySec.push(S);
  });
  return { apts, insolOk, westOk, bothOk, rooms, roomsOk, byRooms: [...byK.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, ...v })), bySec, cls, west };
}
