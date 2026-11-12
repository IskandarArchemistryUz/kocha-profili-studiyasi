/* 4 tarmoqli chorraha geometriyasi (andoza shablon) — boʻlak markaz chiziqlari, ulagichlar, zonalar, oʻtish joylari.
   Har tarmoq shimoliy tarmoqning nusxasi, 90° ga buriladi. Mahalliy koordinata: tarmoq boʻylab y (tugun tomonga +),
   chapdan oʻngga x; tugun markazi (0,0). 1-bosqichda bu shablon C1 tugunidan (OSM) quriladigan geometriyaga almashtiriladi. */
import type { Crossing, Geometry, Lane, Move, Path, SideRoute, XY, Zone } from './types';

export interface GeoParams {
  /** boʻlak eni, m */ laneW: number;
  /** tarmoq uzunligi (tugun markazidan), m */ arm: number;
  /** chap choʻntak, m (0 — yoʻq) */ pocket: number;
  /** choʻntakka oʻtish (taper), m */ taper: number;
  /** razvorot tugundan, m */ uturn: number;
  /** chapga taqiq + razvorot */ ban: boolean;
}

export const GEO_DEFAULT: GeoParams = { laneW: 3.5, arm: 120, pocket: 60, taper: 15, uturn: 70, ban: false };

/** Nuqtani k × 90° ga burish (ekran koordinatasi: y pastga). */
export function rot(p: XY, k: number): XY {
  let [x, y] = p;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [x, y] = [-y, x];
  return [x, y];
}

function bez(p0: XY, p1: XY, p2: XY, n = 10): XY[] {
  const out: XY[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

export function cum(pts: XY[]): number[] {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
}

/** Yoʻl boʻyicha nuqtaning s masofasi (aniq mos keladigan tugun nuqta). */
function sAt(pts: XY[], cu: number[], q: XY): number {
  const i = pts.findIndex(p => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9);
  if (i < 0) throw new Error(`geometry: nuqta topilmadi ${q}`);
  return cu[i];
}

export function pointAt(pts: XY[], cu: number[], s: number): { x: number; y: number; ang: number } {
  let i = 1;
  while (i < cu.length - 1 && cu[i] < s) i++;
  const a = pts[i - 1], b = pts[i], L = cu[i] - cu[i - 1];
  const f = Math.max(0, Math.min(1, L ? (s - cu[i - 1]) / L : 0));
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

interface Frame { w: number; H: number; A: number; stop: number; curve: number; band: [number, number]; xw: [number, number] }

function frame(g: GeoParams): Frame {
  const w = g.laneW, H = 3 * w;
  return { w, H, A: g.arm, stop: -(H + 6), curve: -(H + 2), band: [-(H + 5), -(H + 1)], xw: [-(H + 1.5), 2 * w + 1.5] };
}

/** Yoʻl qaysi oʻtish joylarini kesib oʻtadi (tugun koordinatasida, k ga burilgandan keyin). */
function crossings(pts: XY[], cu: number[], F: Frame): Crossing[] {
  const out: Crossing[] = [];
  for (let j = 0; j < 4; j++) {
    let inside = false;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = cu[i] - cu[i - 1], n = Math.max(1, Math.ceil(L / 0.25));
      for (let t = 0; t <= n; t++) {
        const f = t / n, [lx, ly] = rot([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], 4 - j);
        const ins = ly >= F.band[0] && ly <= F.band[1] && lx >= F.xw[0] - 0.5 && lx <= F.xw[1] + 0.5;
        if (ins && !inside) out.push({ s: cu[i - 1] + L * f, j, x: lx });
        inside = ins;
      }
    }
  }
  return out;
}

function localPaths(g: GeoParams, F: Frame): Record<string, XY[]> {
  const { w, H, A, stop, curve } = F;
  const P: Record<string, XY[]> = {};
  const exitL: XY = [H + 2, 0.5 * w];
  if (g.ban) {
    const cx = w, cy = g.uturn, r = 1.5 * w, arc: XY[] = [];
    for (let i = 1; i <= 12; i++) { const th = Math.PI * (1 - i / 12); arc.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]); }
    arc[arc.length - 1] = [2.5 * w, cy];
    P.U = [[-1.5 * w, -A], [-1.5 * w, stop], [-1.5 * w, curve], [-0.5 * w, H + 2], [-0.5 * w, cy], ...arc,
      [2.5 * w, H + 6], [2.5 * w, H + 2], ...bez([2.5 * w, H + 2], [2.5 * w, 1.5 * w], [H + 2, 1.5 * w]), [A, 1.5 * w]];
  } else if (g.pocket > 0) {
    const yT0 = stop - g.pocket - g.taper;
    P.L = [[-1.5 * w, -A], [-1.5 * w, yT0], [-0.5 * w, yT0 + g.taper], [-0.5 * w, stop], [-0.5 * w, curve],
      ...bez([-0.5 * w, curve], [-0.5 * w, 0.5 * w], exitL), [A, 0.5 * w]];
  } else {
    P.L = [[-1.5 * w, -A], [-1.5 * w, stop], [-1.5 * w, curve], ...bez([-1.5 * w, curve], [-1.5 * w, 0.5 * w], exitL), [A, 0.5 * w]];
  }
  P.TA = [[-1.5 * w, -A], [-1.5 * w, stop], [-1.5 * w, curve], [-0.5 * w, H + 2], [-0.5 * w, A]];
  P.TB = [[-2.5 * w, -A], [-2.5 * w, stop], [-2.5 * w, curve], [-1.5 * w, H + 2], [-1.5 * w, A]];
  P.R = [[-2.5 * w, -A], [-2.5 * w, stop], [-2.5 * w, curve], ...bez([-2.5 * w, curve], [-2.5 * w, -1.5 * w], [-(H + 2), -1.5 * w]), [-A, -1.5 * w]];
  P.V = [[-(H + 1.25), -A], [-(H + 1.25), stop], [-(H + 1.25), curve], [-(2 * w + 1.25), H + 2], [-(2 * w + 1.25), A]];
  P.M = [[-0.5 * w, -A], [-0.5 * w, stop], [-0.5 * w, curve], [0.5 * w, H + 2], [0.5 * w, A]];
  return P;
}

const LANE_OF: Record<string, Lane> = { L: 'A', U: 'A', TA: 'A', TB: 'B', R: 'B', V: 'V', M: 'M' };
const EXIT: Record<Move, number> = { L: 1, U: 1, T: 2, R: 3, V: 2, M: 2 };

export function buildGeometry(gp: Partial<GeoParams> = {}): Geometry {
  const g = { ...GEO_DEFAULT, ...gp };
  const F = frame(g), { w, H, A, stop } = F;
  const P = localPaths(g, F);
  const directL = localPaths({ ...g, ban: false, pocket: 0 }, F).L;
  const freeL = cum(directL)[directL.length - 1] / 13.9;
  const paths: Record<string, Path> = {};
  for (let k = 0; k < 4; k++) {
    for (const [name, loc] of Object.entries(P)) {
      if (name === 'M' && k % 2 === 1) continue;
      const m = name[0] as Move, cu = cum(loc), len = cu[cu.length - 1];
      const pocketL = m === 'L' && g.pocket > 0 && !g.ban;
      const stopS = sAt(loc, cu, [loc[0][0] === -1.5 * w && pocketL ? -0.5 * w : loc[0][0], stop]);
      const lane0 = LANE_OF[name];
      const zones: Zone[] = [{
        k, lane: lane0, s0: 0, d0: 0, stopS, sEnd: stopS + 10, m: m === 'L' ? 'L' : m === 'R' ? 'R' : 'T',
        pocketS: pocketL ? (stop - g.pocket - g.taper + A) + g.taper / 2 : null,
      }];
      const extra: Partial<Path> = {};
      if (m === 'U') {
        const s0 = sAt(loc, cu, [2.5 * w, g.uturn]), st = sAt(loc, cu, [2.5 * w, H + 6]);
        zones.push({ k: (k + 2) % 4, lane: 'B', s0, d0: A - g.uturn, stopS: st, sEnd: st + 10, m: 'R', pocketS: null });
        extra.uS = sAt(loc, cu, [-0.5 * w, g.uturn]);
        extra.uC = rot([w, g.uturn], k);
      }
      const pts = loc.map(p => rot(p, k));
      const key = `${k}${m}${lane0}`;
      paths[key] = {
        key, k, m, lane0, pts, cum: cu, len, zones, cross: crossings(pts, cu, F),
        exit: (k + EXIT[m]) % 4, free: m === 'L' || m === 'U' ? freeL : len / 13.9, ...extra,
      };
    }
  }
  const side: SideRoute[] = [];
  for (let k = 0; k < 4; k++) {
    const x0 = -(H + 3), x1 = -(2 * w + 2.5);
    const loc: XY[] = [[x0, -A], [x0, -(2 * w + 2)], [x0, H + 2], [x1, H + 5], [x1, A]];
    const pts = loc.map(p => rot(p, k)), cu = cum(loc), j = (k + 3) % 4;
    let s1 = -1, s2 = -1, xa = 0, xb = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = cu[i] - cu[i - 1], n = Math.max(1, Math.ceil(L / 0.1));
      for (let t = 0; t <= n; t++) {
        const f = t / n, [lx, ly] = rot([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], 4 - j);
        if (ly >= F.band[0] && ly <= F.band[1] && lx >= F.xw[0] && lx <= F.xw[1]) {
          if (s1 < 0) { s1 = cu[i - 1] + L * f; xa = lx; }
          s2 = cu[i - 1] + L * f; xb = lx;
        }
      }
    }
    side.push({ k, pts, cum: cu, len: cu[cu.length - 1], j, s1, s2, x1: xa, x2: xb });
  }
  return { laneW: w, H, xwFrom: F.xw[0], xwTo: F.xw[1], islandX: -0.5 * w, paths, side };
}
