/* Mikromodel dvigateli: har agent alohida (IDM ergashish), boʻlak/zona mantigʻi, svetofor, piyoda, bekat,
   chapga taqiq + razvorot, qoʻshimcha seksiya, velo yoʻlakda oʻngga burilish, xavf qatlami (samokat).
   Prototip: Design kanvas «Koʻchasoz — Harakat modeli», 1-doska; bu yerda birliklar metrda va tasodif urugʻli.
   UI yoʻq: kadr chizish view qatlamida (keyingi bosqich). */
import { buildGeometry, pointAt } from './geometry';
import { rng, expo, type Rng } from './rng';
import { plan, phaseAt, isGreen, pedGreen, type Phase } from './signal';
import { losPed, losVehicle, type ModeKey, type ModeStat, type Result } from './metrics';
import { RATES, TURNS, TYPES, type AgentType, type Geometry, type Lane, type Path, type Scenario, type SideRoute, type Zone } from './types';

const PED_V = 1.2, SCOOT_V = 5.5, SCOOT_RED = 0.3;
/** Jism eni, m — ustma-ust chiqmaslik tekshiruvi uchun. */
const BODY_W: Record<AgentType, number> = { car: 1.8, bus: 2.5, mini: 2.0, tram: 2.6, bike: 0.7, scoot: 0.6 };
interface Body { f: { x: number; y: number }; m: { x: number; y: number }; r: { x: number; y: number }; h: number }

interface Dwell { d: number; t: number }
export interface Agent {
  id: number; type: AgentType; path: Path; len: number; v0: number; a: number; occ: number;
  s: number; v: number; arr: number; dw: Dwell | null; dwT: number; dwDone: boolean;
  waitL: boolean; yl: boolean; hk: boolean; hb: boolean; byScoot: boolean;
  /** toʻxtash chizigʻini kesib oʻtgan vaqt (chorrahani boʻshatish navbati) */ tIn?: number;
}
interface Ped { x: number; dir: 1 | -1; arr: number; st: 'wait' | 'walk' | 'isl'; half: boolean; w?: number; scoot?: Scoot }
interface Scoot { r: SideRoute; s: number; ph: 'side1' | 'wait' | 'cross' | 'side2'; arr: number; ign: boolean; obj: Ped | null; near: boolean; hits: Ped[] }
interface Req { key: string; type: AgentType; arr: number; dw: Dwell | null }
interface Source { type: AgentType; k: number; rate: number; next: number }
interface Info { z: Zone | null; l: Lane | null; d: number }

export class Sim {
  readonly sc: Scenario;
  readonly geo: Geometry;
  readonly greens: number[];
  t = 0;
  agents: Agent[] = [];
  peds: Ped[][] = [[], [], [], []];
  scoots: Scoot[] = [];
  private R: Rng;
  private id = 0;
  private pend: Record<string, Req[]> = {};
  private src: Source[] = [];
  private pNext: number[] = [];
  private sNext: number[] = [];
  private stat: Record<ModeKey, ModeStat>;
  private lsum = 0; private ln = 0; private blocked = 0; private qmax = [0, 0, 0, 0];
  private pedRed = 0; private yields = 0; private hook = 0;
  private sRed = 0; private sNear = 0; private hard = 0;
  private arrived = 0;

  constructor(sc: Scenario) {
    this.sc = sc;
    const pocket = sc.ban || sc.tram ? 0 : sc.pocket;
    this.geo = buildGeometry({ pocket, ban: sc.ban });
    this.greens = plan(sc.cycle, sc.ban);
    this.R = rng(sc.seed);
    this.stat = { car: z(), bus: z(), mini: z(), tram: z(), bike: z(), scoot: z(), ped: z() };
    const scootLane = sc.scoot === 'lane' && sc.bike === 'lane';
    for (let k = 0; k < 4; k++) {
      for (const l of ['A', 'B', 'V', 'M']) this.pend[k + l] = [];
      this.add('car', k, sc.demand);
      if (sc.bus !== 'off') this.add('bus', k, RATES.bus);
      if (sc.mini) this.add('mini', k, RATES.mini);
      if (sc.bike !== 'off') this.add('bike', k, RATES.bike);
      if (sc.tram && k % 2 === 0) this.add('tram', k, RATES.tram);
      if (scootLane) this.add('scoot', k, RATES.scoot);
      this.pNext.push(expo(this.R, sc.ped));
      this.sNext.push(sc.scoot !== 'off' && !scootLane ? expo(this.R, RATES.scoot) : Infinity);
    }
  }

  get island(): boolean { return this.sc.island && !this.sc.tram && (this.sc.ban || this.sc.pocket === 0); }
  phase(): Phase { return phaseAt(this.t, this.sc.cycle, this.greens); }

  private add(type: AgentType, k: number, rate: number) { if (rate > 0) this.src.push({ type, k, rate, next: expo(this.R, rate) }); }

  private request(s: Source) {
    const sc = this.sc, k = s.k, t = s.type;
    let key: string, ln: Lane;
    if (t === 'car') {
      const r = this.R();
      if (r < TURNS.L) { key = `${k}${sc.ban ? 'U' : 'L'}A`; ln = 'A'; }
      else if (r < TURNS.L + TURNS.T) { ln = sc.bus === 'lane' ? 'A' : this.R() < 0.5 ? 'A' : 'B'; key = `${k}T${ln}`; }
      else { key = `${k}RB`; ln = 'B'; }
    } else if (t === 'scoot') { key = `${k}VV`; ln = 'V'; }
    else if (t === 'bike') { if (sc.bike === 'lane') { key = `${k}VV`; ln = 'V'; } else { key = `${k}TB`; ln = 'B'; } }
    else if (t === 'tram') { key = `${k}MM`; ln = 'M'; }
    else { key = `${k}TB`; ln = 'B'; }
    const stopD = this.geo.paths[`${k}TB`].zones[0].stopS;
    let dw: Dwell | null = null;
    if (t === 'bus') dw = { d: stopD - 20, t: 12 + this.R() * 8 };
    if (t === 'tram') dw = { d: stopD - 33, t: 20 };
    if (t === 'mini' && this.R() < 0.5) dw = { d: stopD - 63 + this.R() * 57, t: 6 + this.R() * 6 };
    this.pend[k + ln].push({ key, type: t, arr: s.next, dw });
    this.arrived++;
  }

  zoneOf(c: Agent): Zone | null {
    for (const z of c.path.zones) if (c.s >= z.s0 && c.s < z.sEnd) return z;
    return null;
  }
  private boxCache = new Map<string, number>();
  private sampleCache = new Map<string, { x: number; y: number }[]>();
  /** Yoʻl nuqtalari har 2 m da (s = 2·indeks). */
  private samples(P: Path): { x: number; y: number }[] {
    let v = this.sampleCache.get(P.key);
    if (!v) { v = []; for (let e = 0; e <= P.len; e += 2) v.push(pointAt(P.pts, P.cum, e)); this.sampleCache.set(P.key, v); }
    return v;
  }
  /** Zona toʻxtash chizigʻidan keyin yoʻl tugundan chiqadigan s. */
  boxOut(P: Path, zz: Zone): number {
    const key = `${P.key}:${zz.stopS}`;
    let v = this.boxCache.get(key);
    if (v === undefined) {
      const lim = this.geo.H + 0.7;
      let s = zz.stopS, inside = false;
      for (; s < P.len; s += 0.5) { const q = pointAt(P.pts, P.cum, s), o = Math.max(Math.abs(q.x), Math.abs(q.y)) <= lim; if (o) inside = true; else if (inside) break; }
      v = s; this.boxCache.set(key, v);
    }
    return v;
  }
  private laneOf(c: Agent, z: Zone): Lane { return z.pocketS !== null && c.s >= z.pocketS ? 'P' : z.lane; }

  queue(k: number): number {
    let n = this.pend[k + 'A'].length + this.pend[k + 'B'].length;
    for (const c of this.agents) { const zz = this.zoneOf(c); if (zz && zz.k === k && c.type !== 'bike' && c.type !== 'tram' && c.type !== 'scoot' && c.v < 1 && c.s < zz.stopS) n++; }
    return n;
  }

  step(dt: number) {
    const sc = this.sc, R = this.R, geo = this.geo;
    this.t += dt;
    const ph = this.phase(), island = this.island;
    for (const s of this.src) while (s.next <= this.t) { this.request(s); s.next += expo(R, s.rate); }
    const info: Info[] = this.agents.map(c => { const zz = this.zoneOf(c); return { z: zz, l: zz ? this.laneOf(c, zz) : null, d: zz ? zz.d0 + (c.s - zz.s0) : 0 }; });
    // kirish
    for (const lane in this.pend) {
      const q = this.pend[lane]; if (!q.length) continue;
      const k0 = +lane[0], l0 = lane[1] as Lane;
      let tail = Infinity, lastV = 10;
      this.agents.forEach((c, j) => { const f = info[j]; if (f.z && f.z.k === k0 && f.l === l0) { const tl = f.d - c.len; if (tl < tail) { tail = tl; lastV = c.v; } } });
      if (tail > 4) {
        const rq = q.shift()!, ty = TYPES[rq.type], path = geo.paths[rq.key];
        this.agents.push({ id: this.id++, type: rq.type, path, len: ty.len, v0: ty.v0, a: ty.a, occ: ty.occ, s: 0,
          v: Math.min(Number.isFinite(tail) ? lastV : 10, ty.v0), arr: rq.arr, dw: rq.dw, dwT: 0, dwDone: false,
          waitL: false, yl: false, hk: false, hb: false, byScoot: false });
        info.push({ z: path.zones[0], l: path.zones[0].lane, d: 0 });
      }
    }
    // piyodalar
    const W = PED_V, X0 = geo.xwFrom, X1 = geo.xwTo, XL = X1 - X0, IX = geo.islandX;
    for (let j = 0; j < 4; j++) {
      while (this.pNext[j] <= this.t) { const dir: 1 | -1 = R() < 0.5 ? 1 : -1; this.peds[j].push({ x: dir > 0 ? X0 : X1, dir, arr: this.pNext[j], st: 'wait', half: false }); this.pNext[j] += expo(R, sc.ped); }
      const pg = pedGreen(ph, j), canStart = pg && ph.left >= 7, keep: Ped[] = [];
      for (const p of this.peds[j]) {
        if (p.st === 'wait') { if (canStart) p.st = 'walk'; }
        else if (p.st === 'isl') { if (pg && ph.left >= 4) p.st = 'walk'; }
        else {
          let nx = p.x + p.dir * (p.w ?? W) * dt;
          if (p.scoot) { p.x = nx; if (p.x <= X0) { p.scoot.ph = 'side2'; p.scoot.s = p.scoot.r.s2; continue; } keep.push(p); continue; }
          if (island && !p.half && ((p.dir > 0 && p.x < IX && nx >= IX) || (p.dir < 0 && p.x > IX && nx <= IX))) { p.half = true; nx = IX; if (!(pg && ph.left >= 4)) p.st = 'isl'; }
          p.x = nx;
          if ((p.dir > 0 && p.x >= X1) || (p.dir < 0 && p.x <= X0)) {
            const d = Math.max(0, this.t - p.arr - XL / W); this.stat.ped.n++; this.stat.ped.delaySum += d;
            if (!pg) this.pedRed++;
            continue;
          }
        }
        keep.push(p);
      }
      this.peds[j] = keep;
    }
    // xavf qatlami: trotuardagi samokat
    for (let k = 0; k < 4; k++) while (this.sNext[k] <= this.t) { this.scoots.push({ r: geo.side[k], s: 0, ph: 'side1', arr: this.sNext[k], ign: R() < SCOOT_RED, obj: null, near: false, hits: [] }); this.sNext[k] += expo(R, RATES.scoot); }
    const sk: Scoot[] = [];
    for (const m of this.scoots) {
      const r = m.r;
      if (m.ph === 'side1') { m.s += SCOOT_V * dt; if (m.s >= r.s1) { m.s = r.s1; m.ph = 'wait'; } }
      if (m.ph === 'wait') { const g = pedGreen(ph, r.j); if (g || m.ign) { if (!g) this.sRed++; m.ph = 'cross'; m.obj = { x: r.x1, dir: -1, st: 'walk', half: false, w: SCOOT_V, scoot: m, arr: this.t }; this.peds[r.j].push(m.obj); } }
      if (m.ph === 'cross' && m.obj) m.s = r.s1 + (r.x1 - m.obj.x);
      if (m.ph === 'side2') { m.s += SCOOT_V * dt; if (m.s >= r.len) { this.stat.scoot.n++; this.stat.scoot.delaySum += Math.max(0, this.t - m.arr - r.len / SCOOT_V); continue; } }
      const mp = pointAt(r.pts, r.cum, m.s);
      for (let j = 0; j < 4; j++) for (const p of this.peds[j]) {
        if (p.scoot || m.hits.includes(p)) continue;
        const lx = p.st === 'wait' ? (p.dir > 0 ? X0 - 0.5 : X1 + 0.5) : p.x, ly = -(geo.H + 3);
        const [gx, gy] = rotj([lx, ly], j);
        if (Math.hypot(gx - mp.x, gy - mp.y) < 2) { m.hits.push(p); if (!m.near) { m.near = true; this.sNear++; } }
      }
      sk.push(m);
    }
    this.scoots = sk;
    // tramvay holati (razvorot yoʻl beradi)
    const trams = sc.tram ? this.agents.filter(c => c.type === 'tram').map(c => [pointAt(c.path.pts, c.path.cum, c.s), pointAt(c.path.pts, c.path.cum, Math.max(0, c.s - c.len))]) : [];
    // jismlar: oldi, oʻrtasi, orqasi, yoʻnalishi
    const A = this.agents, N = A.length;
    const G: Body[] = A.map(a => { const f = pointAt(a.path.pts, a.path.cum, a.s), r = pointAt(a.path.pts, a.path.cum, Math.max(0, a.s - a.len)); return { f, r, m: { x: (f.x + r.x) / 2, y: (f.y + r.y) / 2 }, h: f.ang }; });
    // tugunda harakatni tugatayotganlar: qolgan yoʻli (har 2 m da nuqta)
    const rest: ({ x: number; y: number }[] | null)[] = A.map(a => {
      for (const zz of a.path.zones) {
        const bo = this.boxOut(a.path, zz);
        if (a.s >= zz.stopS && a.s < bo) return this.samples(a.path).slice(Math.max(0, Math.floor((a.s - a.len) / 2)), Math.ceil(bo / 2) + 1);
      }
      return null;
    });
    const uWait = [false, false, false, false];
    A.forEach((a, i) => { if (a.path.m === 'U' && !info[i].z) { const uz = a.path.zones[1]; if (a.s > uz.s0 - 15 && a.s < uz.s0 && a.v < 1) uWait[uz.k] = true; } });
    // oldidagi istalgan jism (boshqa yoʻnalishdan ham): 20 m gacha, yon chetlanish jismlar eni yigʻindisining yarmidan kam
    const cand: ({ j: number; l: number } | null)[] = [];
    for (let i = 0; i < N; i++) {
      const gi = G[i], hx = Math.cos(gi.h), hy = Math.sin(gi.h);
      let best: { j: number; l: number } | null = null;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const gj = G[j];
        if (Math.abs(gj.m.x - gi.f.x) > 37 || Math.abs(gj.m.y - gi.f.y) > 37) continue;
        const thr = (BODY_W[A[i].type] + BODY_W[A[j].type]) / 2 + 0.4;
        let lmin = Infinity;
        for (let pp = 0; pp < 3; pp++) { const p = pp === 0 ? gj.f : pp === 1 ? gj.m : gj.r, dx = p.x - gi.f.x, dy = p.y - gi.f.y, l = dx * hx + dy * hy, lat = Math.abs(-dx * hy + dy * hx); if (l > -1.3 && l < 20 && lat < thr && l < lmin) lmin = l; }
        if (lmin < Infinity && (!best || lmin < best.l)) best = { j, l: Math.max(lmin, 0) };
      }
      cand.push(best);
    }
    // bir-birini koʻrgan juftlikda chorrahaga avval kirgan oʻtadi (harakatni tugatayotganga yoʻl beriladi)
    const tin = (a: Agent) => a.tIn ?? 1e12 + a.id;
    for (let i = 0; i < N; i++) { const b = cand[i]; if (b && cand[b.j]?.j === i) { const ti = tin(A[i]), tj = tin(A[b.j]); if (ti < tj || (ti === tj && A[i].id < A[b.j].id)) cand[i] = null; } }
    // transport
    const next: Agent[] = [];
    this.agents.forEach((c, i) => {
      const P = c.path, f = info[i], zz = f.z;
      let v0 = c.v0;
      if (c.type === 'car' && P.m !== 'T' && !(zz && f.d < zz.stopS - 25)) v0 = P.m === 'U' && !zz ? 6 : 8;
      let gap = Infinity, dv = 0, lead: Agent | null = null, stopBlock = false;
      c.byScoot = false;
      const setStop = (g: number) => { if (g < gap) { gap = Math.max(g, 0.05); dv = c.v; lead = null; return true; } return false; };
      if (zz) {
        const la = f.l!, toPocket = zz.pocketS !== null && la !== 'P', dc = f.d;
        this.agents.forEach((o, j) => {
          const fo = info[j]; if (o === c || !fo.z || fo.z.k !== zz.k || fo.d <= dc) return;
          if (!(fo.l === la || (toPocket && fo.l === 'P'))) return;
          const g = fo.d - dc - o.len; if (g < gap) { gap = g; dv = c.v - o.v; lead = o; }
        });
        if (c.dw && !c.dwDone && dc < c.dw.d + 0.7) {
          if (dc > c.dw.d - 4 && c.v < 0.5) { c.dwT += dt; if (c.dwT >= c.dw.t) c.dwDone = true; else setStop(0.05); }
          else setStop(c.dw.d - dc + 2);
        }
      } else {
        for (const o of this.agents) { if (o === c || o.path !== P || o.s <= c.s) continue; const g = o.s - c.s - o.len; if (g < gap) { gap = g; dv = c.v - o.v; lead = o; } }
        for (let zi = 1; zi < P.zones.length; zi++) {
          const z2 = P.zones[zi]; if (c.s >= z2.s0 - 9 || z2.s0 - c.s > 33) continue;
          const wait = z2.s0 - 9.5 - c.s, lo = z2.d0 - 4, hi = z2.d0 + c.len + 1;
          this.agents.forEach((o, j) => {
            const fo = info[j]; if (!fo.z || fo.z.k !== z2.k || o === c) return;
            const rear = fo.d - o.len;
            if (fo.l === 'A' && fo.z.s0 === 0) { if ((fo.d >= z2.d0 - 9.3 && rear <= z2.d0 + 0.7) || (fo.d < z2.d0 - 9.3 && fo.d > z2.d0 - 20 && o.v > 3)) setStop(wait); return; }
            if (fo.l !== z2.lane) return;
            if ((fo.d >= lo && rear <= hi) || (fo.d < lo && fo.d > z2.d0 - 10 && o.v > 3)) setStop(wait);
            else if (rear > hi) { const g2 = fo.d - z2.d0 + (z2.s0 - c.s) - o.len; if (g2 < gap) { gap = g2; dv = c.v - o.v; lead = o; } }
          });
        }
        if (P.uS !== undefined && P.uC && trams.length && c.s < P.uS && P.uS - c.s < 13) {
          for (const tr of trams) for (const e of tr) if (Math.hypot(e.x - P.uC[0], e.y - P.uC[1]) < 30) setStop(P.uS - 0.7 - c.s);
        }
      }
      if (zz && c.s < zz.stopS && !isGreen(ph, zz.k, zz.m, sc.extra)) {
        let rtor = false;
        if (sc.extra && ph.n === 2 && zz.m === 'R' && c.s > zz.stopS - 4.7 && c.v < 2) {
          rtor = true;
          for (const o of this.agents) {
            if (o === c || o.path.exit !== P.exit || o.path.k === P.k) continue;
            const oz = o.path.zones[o.path.zones.length - 1];
            if (o.s > oz.stopS - 15 && o.s < oz.stopS + 25 && (o.v > 0.5 || o.s > oz.stopS)) { rtor = false; break; }
          }
        }
        if (!rtor) { const gs = zz.stopS - c.s; if (c.v * c.v / 8 < gs || c.v < 3) { if (setStop(gs)) stopBlock = true; } }
      }
      // razvorot ochigʻi oldida navbat toʻxtamaydi (joy qoldiriladi)
      if (sc.ban && zz && (f.l === 'A' || f.l === 'B') && f.d < 37.3 && zz.s0 === 0) {
        const li0 = lead ? this.agents.indexOf(lead) : -1, ld = li0 >= 0 && info[li0].z ? info[li0].d - (lead as Agent).len : Infinity;
        if ((lead && ld < 58.7 + c.len + 2) || (f.l === 'B' && uWait[zz.k])) setStop(37.3 - f.d);
      }
      const cb = cand[i];
      if (cb) { const ob = A[cb.j], g2d = cb.l - 0.1; if (g2d < gap) { gap = Math.max(g2d, 0.05); dv = c.v - ob.v * Math.max(0, Math.cos(G[cb.j].h - G[i].h)); lead = ob; } }
      // chorrahaga kirmaslik: chiqish band boʻlsa yoki tugunda ziddiyatli transport harakatni tugatmagan boʻlsa
      if (zz && c.s < zz.stopS && zz.stopS - c.s < 15 && c.type !== 'tram') {
        const so = this.boxOut(P, zz);
        let jam = false;
        for (let e = 0; e <= c.len + 3 && !jam; e += 2) {
          const q = pointAt(P.pts, P.cum, so + e);
          for (let j = 0; j < N; j++) { if (j === i || A[j].v > 1.5) continue; const gj = G[j]; if ([gj.f, gj.m, gj.r].some(p => Math.hypot(p.x - q.x, p.y - q.y) < 2)) { jam = true; break; } }
        }
        if (!jam) {
          const mine = this.samples(P).slice(Math.floor(zz.stopS / 2), Math.ceil(so / 2) + 1);
          for (let j = 0; j < N && !jam; j++) {
            const rj = rest[j]; if (j === i || !rj || A[j].path.k === P.k) continue;
            const thr = (BODY_W[A[i].type] + BODY_W[A[j].type]) / 2 + 0.5;
            for (let a1 = 0; a1 < rj.length && !jam; a1++) for (let b1 = 0; b1 < mine.length; b1++) { const dx = rj[a1].x - mine[b1].x, dy = rj[a1].y - mine[b1].y; if (dx * dx + dy * dy < thr * thr) { jam = true; break; } }
          }
        }
        if (!jam) for (let e = zz.stopS; e <= so && !jam; e += 2) {
          const q = pointAt(P.pts, P.cum, e);
          for (let j = 0; j < N; j++) { if (j === i || A[j].path.k === P.k || Math.abs(Math.cos(G[j].h - G[i].h)) > 0.85) continue; const gj = G[j]; if ([gj.f, gj.m, gj.r].some(p => Math.hypot(p.x - q.x, p.y - q.y) < 3)) { jam = true; break; } }
        }
        if (jam) setStop(zz.stopS - c.s);
      }
      if (zz && zz.m === 'R' && c.type !== 'bike' && sc.bike === 'lane' && c.s < zz.stopS + 2 && c.s > zz.stopS - 10) {
        for (let j = 0; j < this.agents.length; j++) {
          const o = this.agents[j], fo = info[j];
          if ((o.type !== 'bike' && o.type !== 'scoot') || !fo.z || fo.z.k !== zz.k) continue;
          if (fo.d > zz.stopS - 8 && fo.d < zz.stopS + 6.7 && (o.v > 0.5 || fo.d > zz.stopS)) { if (setStop(zz.stopS + 2 - c.s) && !c.hk) { c.hk = true; this.hook++; } break; }
        }
      }
      const lat = geo.laneW + 1;
      for (const cr of P.cross) {
        if (c.s >= cr.s || cr.s - c.s > 15) continue;
        let hit = false, hitS = false;
        for (const p of this.peds[cr.j]) {
          if (p.st === 'wait') continue;
          const dx = cr.x - p.x;
          if (Math.abs(dx) < lat || (p.st === 'walk' && dx * p.dir > 0 && Math.abs(dx) < lat + (p.w ?? W) * 2.5)) { hit = true; hitS = !!p.scoot; break; }
        }
        if (hit) { const gy = cr.s - 1 - c.s; if (c.v * c.v / 10 < gy || c.v < 3) { if (setStop(gy)) { c.byScoot = hitS; if (!c.yl) { c.yl = true; this.yields++; } } } }
      }
      const li = lead ? this.agents.indexOf(lead) : -1;
      c.waitL = P.m === 'L' && c.v < 1 && !!zz && f.l !== 'P' && (stopBlock || (li >= 0 && info[li].l === 'P'));
      const sst = 2 + c.v * 1.2 + (c.v * dv) / (2 * Math.sqrt(c.a * 2));
      const acc = c.a * (1 - Math.pow(c.v / v0, 4) - Math.pow(Math.max(sst, 0) / Math.max(gap, 0.03), 2));
      if (acc < -3.5 && c.byScoot && !c.hb) { c.hb = true; this.hard++; }
      c.v = Math.max(0, c.v + Math.max(acc, -8) * dt);
      c.s += c.v * dt;
      if (c.tIn === undefined && zz && c.s >= zz.stopS) c.tIn = this.t;
      if (c.s >= P.len) {
        const free = c.type === 'car' ? P.free : P.len / c.v0;
        const d = Math.max(0, this.t - c.arr - free - (c.dw ? c.dw.t : 0));
        this.stat[c.type].n++; this.stat[c.type].delaySum += d;
        if (P.m === 'L' || P.m === 'U') { this.lsum += d; this.ln++; }
      } else next.push(c);
    });
    this.agents = next;
    const front = [-1, -1, -1, -1];
    for (const c of next) if (c.waitL && c.s > front[c.path.k]) front[c.path.k] = c.s;
    for (const c of next) if (c.path.m === 'T' && c.path.lane0 === 'A' && c.v < 1 && c.s < front[c.path.k]) this.blocked += dt;
    for (let k = 0; k < 4; k++) this.qmax[k] = Math.max(this.qmax[k], this.queue(k));
  }

  run(seconds: number, dt = 0.05) { const n = Math.round(seconds / dt); for (let i = 0; i < n; i++) this.step(dt); return this; }

  result(): Result {
    const occ: Record<ModeKey, number> = { car: TYPES.car.occ, bus: TYPES.bus.occ, mini: TYPES.mini.occ, tram: TYPES.tram.occ, bike: 1, scoot: 1, ped: 1 };
    let pn = 0, pd = 0;
    const modes = {} as Result['modes'];
    (Object.keys(this.stat) as ModeKey[]).forEach(m => {
      const s = this.stat[m], d = s.n ? s.delaySum / s.n : null, people = s.n * occ[m];
      modes[m] = { n: s.n, delay: d, people };
      if (m !== 'scoot' && d !== null) { pn += people; pd += d * people; }
    });
    let pending = 0; for (const l in this.pend) pending += this.pend[l].length;
    return {
      t: this.t, modes, personDelay: pn ? pd / pn : null, leftDelay: this.ln ? this.lsum / this.ln : null,
      blocked: this.blocked, qmax: [...this.qmax], pedRedFinish: this.pedRed, yieldsToPed: this.yields, rightHook: this.hook,
      risk: { scootRed: this.sRed, scootNear: this.sNear, hardBrake: this.hard, scootTotal: this.stat.scoot.n + this.scoots.length },
      arrived: this.arrived, onNet: this.agents.length, pending,
    };
  }
}

function z(): ModeStat { return { n: 0, delaySum: 0 }; }
function rotj(p: [number, number], j: number): [number, number] { let [x, y] = p; for (let i = 0; i < j; i++) [x, y] = [-y, x]; return [x, y]; }

/** Bir sxemani bir nechta urugʻ bilan hisoblash (oʻrtacha va oraliq uchun). */
export function replicate(sc: Scenario, seeds: number[], seconds: number, dt = 0.05): Result[] {
  return seeds.map(seed => new Sim({ ...sc, seed }).run(seconds, dt).result());
}

export { losPed, losVehicle };
