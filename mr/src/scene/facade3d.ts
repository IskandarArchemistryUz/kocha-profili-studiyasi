/**
 * Geometrik fasad (LOD 3 ga yaqin taqdimot modeli): devor — har qavat va har qirra uchun teshikli tekislik
 * (derazalar haqiqiy oʻyiq: devorga botgan qiyalik, rom, impost, shisha ichkarida, tashqi tokcha),
 * qavatlararo tasmalar, balkonlar (plita, shisha yoki metall toʻsiq, tutqich, lodjiya devorlari).
 * Natija — massivlar (pozitsiya, UV metrda); sahna ularni materiallar bilan birlashtiradi.
 * Oʻlchamlar konseptual: modul eni ≈ 3,3 m qirra uzunligiga moslanadi, ishchi chizma emas.
 */
import * as THREE from 'three';
import type { XY } from '../core/geo';
import type { Bal } from '../core/facade';

export interface WinSpec { id: string; w: number; sill: number; head: number; arch?: boolean }
/** Qatlamlar: wall — devor va qiyaliklar (UV — metr), trim — qavat tasmalari, glass, frame, sill, slab — balkon plitasi, rail — toʻsiq shishasi/metall, bar — tutqich */
export type Layer = 'wall' | 'trim' | 'glass' | 'frame' | 'sill' | 'slab' | 'rail' | 'bar';
export type FacadeGeo = Record<Layer, { pos: number[]; uv: number[] }>;

export interface PartIn {
  ring: XY[];            // CCW yoki CW — tashqi normal oʻzi aniqlanadi
  z0: number;            // qism pastki sathi (absolyut, m)
  floors: number;        // qism qavatlari
  fh: number;
  kind: 'res' | 'shop';
  spec: WinSpec;
  bal: Bal | null;
  /** qirra qoʻshni bino bilan umumiy — chizilmaydi */
  skip: (k: number) => boolean;
  /** qirraning qoʻshni bilan qisman yopilgan qismlari: [s0, s1] qirra boʻylab, top — qoʻshni tepasi (absolyut) */
  cover?: (k: number) => { s0: number; s1: number; top: number }[];
  /** pastki qavat raqami (0 — yer qavati; balkon va tasma shunga koʻra) */
  floor0: number;
  bands: boolean;
}

const MOD = 3.3;
/** [0, L] dan yopilgan intervallarni olib tashlab, ochiq boʻlaklar (pad — chetdan chekinish) */
function runs(L: number, cov: { s0: number; s1: number }[], pad: number): [number, number][] {
  const out: [number, number][] = []; let s = pad;
  for (const c of [...cov].sort((a, b) => a.s0 - b.s0)) { if (c.s0 - 0.05 > s) out.push([s, c.s0 - 0.05]); s = Math.max(s, c.s1 + 0.05); }
  if (L - pad > s) out.push([s, L - pad]);
  return out;
}
const SHOP: WinSpec = { id: 'shop', w: 0.86, sill: 0.15, head: 3.0 };

export function emptyGeo(): FacadeGeo { return { wall: { pos: [], uv: [] }, trim: { pos: [], uv: [] }, glass: { pos: [], uv: [] }, frame: { pos: [], uv: [] }, sill: { pos: [], uv: [] }, slab: { pos: [], uv: [] }, rail: { pos: [], uv: [] }, bar: { pos: [], uv: [] } }; }

/** Teshik konturi (s, z) — toʻrtburchak yoki ravoq */
function holeOf(x0: number, x1: number, sill: number, head: number, arch: boolean): [number, number][] {
  if (!arch) return [[x0, sill], [x1, sill], [x1, head], [x0, head]];
  const r = (x1 - x0) / 2, zc = Math.max(sill + 0.3, head - r), out: [number, number][] = [[x0, sill], [x1, sill]];
  for (let i = 0; i <= 10; i++) { const a = Math.PI * i / 10; out.push([x0 + r + r * Math.cos(a), zc + r * Math.sin(a)]); }
  out.push([x0, zc]);
  return out;
}

const triCache = new Map<string, number[][]>();
function triangulate(contour: [number, number][], holes: [number, number][][], key?: string): number[][] {
  if (key) { const h = triCache.get(key); if (h) return h; }
  const v2 = (p: [number, number]) => new THREE.Vector2(p[0], p[1]);
  const f = THREE.ShapeUtils.triangulateShape(contour.map(v2), holes.map(h => h.map(v2)));
  if (key) { if (triCache.size > 4000) triCache.clear(); triCache.set(key, f); }
  return f;
}

export function buildFacade(parts: PartIn[], G: FacadeGeo = emptyGeo()): FacadeGeo {
  let perim = 0; // UV u — perimetr boʻylab uzluksiz (gʻisht choklari burchakda uzilmasin)
  for (const P of parts) {
    const r = P.ring, n = r.length;
    let sa = 0; for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; sa += a[0] * b[1] - b[0] * a[1]; }
    const ccw = sa > 0;
    for (let k = 0; k < n; k++) {
      const a = r[k], b = r[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (L < 0.3) continue;
      const ux = dx / L, uy = dy / L, ox = ccw ? uy : -uy, oy = ccw ? -ux : ux;  // tashqi normal
      const u0 = perim; perim += L;
      if (P.skip(k)) continue;
      // nuqta: s — qirra boʻylab, z — absolyut balandlik, d — tashqariga (manfiy — devor ichiga)
      const V = (s: number, z: number, d: number): [number, number, number] => [a[0] + ux * s + ox * d, z, -(a[1] + uy * s + oy * d)];
      const push = (L2: Layer, p: [number, number, number][], uv?: [number, number][]) => { const g = G[L2]; for (let i = 0; i < p.length; i++) { g.pos.push(...p[i]); g.uv.push(...(uv ? uv[i] : [0, 0])); } };
      const quad = (L2: Layer, p0: [number, number, number], p1: [number, number, number], p2: [number, number, number], p3: [number, number, number], uv?: [number, number][]) => push(L2, [p0, p1, p2, p0, p2, p3], uv ? [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]] : undefined);
      /** quti: s0..s1 qirra boʻylab, z0..z1, d0..d1 normal boʻylab */
      const box = (L2: Layer, s0: number, s1: number, z0: number, z1: number, d0: number, d1: number) => {
        const c = [V(s0, z0, d0), V(s1, z0, d0), V(s1, z0, d1), V(s0, z0, d1), V(s0, z1, d0), V(s1, z1, d0), V(s1, z1, d1), V(s0, z1, d1)];
        const ws = s1 - s0, wd = d1 - d0, hz = z1 - z0;
        const uvS: [number, number][] = [[u0 + s0, z0], [u0 + s1, z0], [u0 + s1, z1], [u0 + s0, z1]];
        quad(L2, c[3], c[2], c[6], c[7], uvS); quad(L2, c[1], c[0], c[4], c[5], uvS);           // old, orqa
        quad(L2, c[0], c[3], c[7], c[4], [[0, z0], [wd, z0], [wd, z1], [0, z1]]); quad(L2, c[2], c[1], c[5], c[6], [[0, z0], [wd, z0], [wd, z1], [0, z1]]);
        quad(L2, c[4], c[7], c[6], c[5], [[0, 0], [0, wd], [ws, wd], [ws, 0]]); quad(L2, c[0], c[1], c[2], c[3], [[0, 0], [ws, 0], [ws, wd], [0, wd]]);
        void hz;
      };
      // modullar
      const nm = L >= 2.6 ? Math.max(1, Math.round(L / MOD)) : 0, bw = nm ? L / nm : L;
      const balEdge = P.kind === 'res' && P.bal && P.bal !== 'yoq' && L >= 6;
      for (let f = 0; f < P.floors; f++) {
        const zb = P.z0 + f * P.fh, absF = P.floor0 + f, fh = P.fh;
        const shop = P.kind === 'shop', sp = shop ? { ...SHOP, head: Math.min(fh - 0.45, SHOP.head) } : P.spec;
        const holes: [number, number][][] = [], wins: { x0: number; x1: number; sill: number; head: number; arch: boolean; door: boolean; j: number }[] = [];
        const cov = P.cover?.(k) ?? [], zTop = zb + fh - 0.05;
        // shu qavatda yopilgan interval bilan kesishadimi (m — qoʻshimcha chet); qoʻshni tepasi 0,6 m gacha past boʻlsa ham yopiq (relyef farqi)
        const covF = cov.filter(c => c.top >= zTop - 0.6);
        const covered = (x0: number, x1: number, m = 0) => covF.some(c => x1 + m > c.s0 && x0 - m < c.s1);
        for (let j = 0; j < nm; j++) {
          const c = (j + 0.5) * bw;
          if (covered(c - bw * 0.45, c + bw * 0.45, 0.25)) continue;   // qoʻshni seksiya devori ortida — deraza yoʻq
          const isBal = !!balEdge && absF >= 1 && (P.bal === 'uzluksiz' || P.bal === 'fransuz' || j % 2 === 0);
          let w = Math.min(sp.w * bw, bw - 0.3), sill = sp.sill, head = Math.min(sp.head, fh - 0.15), arch = !!sp.arch && !shop;
          const door = isBal && P.bal !== 'fransuz';
          if (door) { sill = 0.05; head = Math.min(fh - 0.25, Math.max(head, 2.4)); w = Math.min(Math.max(w, 1.4), bw - 0.4); arch = false; }
          if (isBal && P.bal === 'fransuz') { sill = Math.min(sill, 0.1); head = Math.min(fh - 0.25, Math.max(head, 2.3)); }
          if (w < 0.5 || head - sill < 0.6) continue;
          const x0 = c - w / 2, x1 = c + w / 2;
          if (door && covered(x0, x1, 1.6)) { // balkon qoʻshni devoriga urilardi — oddiy deraza
            const w2 = Math.min(sp.w * bw, bw - 0.3); holes.push(holeOf(c - w2 / 2, c + w2 / 2, sp.sill, Math.min(sp.head, fh - 0.15), !!sp.arch && !shop)); wins.push({ x0: c - w2 / 2, x1: c + w2 / 2, sill: sp.sill, head: Math.min(sp.head, fh - 0.15), arch: !!sp.arch && !shop, door: false, j }); continue;
          }
          holes.push(holeOf(x0, x1, sill, head, arch)); wins.push({ x0, x1, sill, head, arch, door, j });
        }
        // devor yuzasi (teshiklar bilan), UV — metr; qoʻshni seksiya yopgan oraliqda devor chizilmaydi
        for (const [r0, r1] of runs(L, covF, 0)) {
          const contour: [number, number][] = [[r0, 0], [r1, 0], [r1, fh], [r0, fh]];
          const hs = holes.filter(hh => hh[0][0] >= r0 - 1e-6 && hh[1][0] <= r1 + 1e-6);
          const key = `${r0.toFixed(2)}|${r1.toFixed(2)}|${fh}|${sp.id}|${shop}|${P.bal}|${absF >= 1}|${nm}|${hs.map(hh => `${hh[0][0].toFixed(2)}-${hh[1][0].toFixed(2)}-${hh[0][1]}-${hh[hh.length - 1][1]}-${hh.length}`).join(',')}`;
          const flat = contour.concat(...hs), faces = triangulate(contour, hs, key);
          for (const t of faces) push('wall', t.map(i => V(flat[i][0], zb + flat[i][1], 0)), t.map(i => [u0 + flat[i][0], zb + flat[i][1]] as [number, number]));
        }
        // derazalar
        for (const wn of wins) {
          const hp = holeOf(wn.x0, wn.x1, wn.sill, wn.head, wn.arch), m = hp.length, dep = shop ? 0.12 : 0.2, dg = -dep + 0.04;
          for (let i = 0; i < m; i++) { // qiyaliklar (oʻyiq ichki yuzalari)
            const p = hp[i], q = hp[(i + 1) % m];
            const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
            quad('wall', V(p[0], zb + p[1], 0), V(q[0], zb + q[1], 0), V(q[0], zb + q[1], -dep), V(p[0], zb + p[1], -dep), [[0, 0], [len, 0], [len, dep], [0, dep]]);
          }
          // shisha
          for (const t of triangulate(hp, [])) push('glass', t.map(i => V(hp[i][0], zb + hp[i][1], dg)), t.map(i => [hp[i][0] - wn.x0, hp[i][1]] as [number, number]));
          // rom: kontur boʻylab 6 sm tasma, ichkariga qarab
          const cx = (wn.x0 + wn.x1) / 2, cz = (wn.sill + wn.head) / 2, fw = 0.065;
          for (let i = 0; i < m; i++) {
            const p = hp[i], q = hp[(i + 1) % m], ip: [number, number] = [p[0] + Math.sign(cx - p[0]) * fw, p[1] + Math.sign(cz - p[1]) * fw], iq: [number, number] = [q[0] + Math.sign(cx - q[0]) * fw, q[1] + Math.sign(cz - q[1]) * fw];
            quad('frame', V(p[0], zb + p[1], dg + 0.01), V(q[0], zb + q[1], dg + 0.01), V(iq[0], zb + iq[1], dg + 0.01), V(ip[0], zb + ip[1], dg + 0.01));
          }
          // impost (vertikal) va fortochka (gorizontal)
          const ww = wn.x1 - wn.x0;
          if (ww > 1.1 && !wn.arch) { const n2 = shop ? Math.max(2, Math.round(ww / 1.6)) : ww > 2.6 ? 3 : 2; for (let i = 1; i < n2; i++) { const s = wn.x0 + ww * i / n2; box('frame', s - 0.03, s + 0.03, zb + wn.sill, zb + wn.head, dg - 0.03, dg + 0.02); } }
          if (wn.arch) box('frame', cx - 0.03, cx + 0.03, zb + wn.sill, zb + wn.head, dg - 0.03, dg + 0.02);
          if (!shop && wn.head - wn.sill > 1.9 && !wn.arch) { const z = zb + wn.head - 0.55; box('frame', wn.x0, wn.x1, z - 0.03, z + 0.03, dg - 0.03, dg + 0.02); }
          // tokcha (tashqi)
          if (!wn.door && wn.sill > 0.3) box('sill', wn.x0 - 0.06, wn.x1 + 0.06, zb + wn.sill - 0.06, zb + wn.sill, -dep, 0.07);
        }
        // balkonlar
        if (balEdge && absF >= 1) {
          const kind = P.bal!;
          if (kind === 'uzluksiz') {
            const d = 1.5;
            for (const [r0, r1] of runs(L, covF, 0.1)) { if (r1 - r0 < 1) continue; box('slab', r0, r1, zb - 0.1, zb + 0.08, 0, d); box('rail', r0, r1, zb + 0.08, zb + 1.1, d - 0.03, d); box('bar', r0, r1, zb + 1.08, zb + 1.13, d - 0.05, d + 0.01); }
          } else for (const wn of wins) {
            if (kind === 'fransuz') { box('bar', wn.x0, wn.x1, zb + 0.95, zb + 1.0, 0.02, 0.07); for (let s = wn.x0 + 0.1; s < wn.x1; s += 0.12) box('bar', s, s + 0.02, zb + 0.1, zb + 0.95, 0.03, 0.05); continue; }
            if (!wn.door) continue;
            const c = (wn.x0 + wn.x1) / 2, w2 = Math.min(bw - 0.2, wn.x1 - wn.x0 + 1.2) / 2, d = kind === 'lodjiya' ? 0.9 : 1.3;
            box('slab', c - w2, c + w2, zb - 0.1, zb + 0.08, 0, d);
            if (kind === 'lodjiya') {
              box('wall', c - w2, c - w2 + 0.2, zb + 0.08, zb + fh - 0.1, 0, d); box('wall', c + w2 - 0.2, c + w2, zb + 0.08, zb + fh - 0.1, 0, d);
              box('slab', c - w2, c + w2, zb + fh - 0.25, zb + fh - 0.1, 0, d);
              box('wall', c - w2 + 0.2, c + w2 - 0.2, zb + 0.08, zb + 0.95, d - 0.12, d);       // parapet
              box('rail', c - w2 + 0.2, c + w2 - 0.2, zb + 0.95, zb + fh - 0.25, d - 0.08, d - 0.05); // oynalangan old qism
            } else {
              if (kind === 'shisha') {
                box('rail', c - w2, c + w2, zb + 0.08, zb + 1.1, d - 0.03, d);
                box('rail', c - w2, c - w2 + 0.03, zb + 0.08, zb + 1.1, 0, d); box('rail', c + w2 - 0.03, c + w2, zb + 0.08, zb + 1.1, 0, d);
              } else {
                // yon tomonlar: tutqich + tayoqchalar (yaxlit panel emas)
                for (const sx of [c - w2, c + w2 - 0.04]) { box('bar', sx, sx + 0.04, zb + 1.08, zb + 1.13, 0, d); for (let dd = 0.14; dd < d - 0.05; dd += 0.14) box('bar', sx + 0.008, sx + 0.032, zb + 0.08, zb + 1.08, dd, dd + 0.025); }
              }
              box('bar', c - w2, c + w2, zb + 1.08, zb + 1.13, d - 0.05, d + 0.01);
              if (kind === 'ochiq') for (let s = c - w2 + 0.12; s < c + w2 - 0.05; s += 0.14) box('bar', s, s + 0.025, zb + 0.08, zb + 1.08, d - 0.03, d - 0.005);
            }
          }
        }
        // qavatlararo tasma
        if (P.bands && f > 0) for (const [r0, r1] of runs(L, covF, 0)) box('trim', r0, r1, zb - 0.12, zb + 0.12, 0, 0.06);
      }
      // karniz (qism tepasida)
      { const zt = P.z0 + P.floors * P.fh; if (P.bands) for (const [r0, r1] of runs(L, (P.cover?.(k) ?? []).filter(c => c.top >= zt - 0.6), 0)) box('trim', r0, r1, zt - 0.25, zt, 0, 0.1); }
    }
  }
  return G;
}

/* ---------- materiallar teksturasi (metr masshtabida) ---------- */
const texC = new Map<string, THREE.CanvasTexture>();
const hexS = (c: number) => '#' + c.toString(16).padStart(6, '0');
const shade = (c: number, k: number) => { const f = (x: number) => Math.max(0, Math.min(255, Math.round(x * k))); return (f(c >> 16 & 255) << 16) | (f(c >> 8 & 255) << 8) | f(c & 255); };
/** Material teksturasi: kind — material id, color — asosiy rang. Kanvas = `m` metr */
export function matTexture(kind: string, color: number, aniso = 4): { t: THREE.CanvasTexture; m: number } | null {
  const m = ({ gisht: 1.2, beton: 3.3, tosh: 2.4, yogoch: 1.2, metall: 1.2, terrakota: 1.2, suvoq: 2.0 } as Record<string, number>)[kind]; if (!m) return null;
  const key = `${kind}|${color}`; let t = texC.get(key);
  if (!t) {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!, px = S / m;
    g.fillStyle = hexS(color); g.fillRect(0, 0, S, S);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    if (kind === 'gisht') {
      const bh = 0.075 * px, bl = 0.26 * px; g.fillStyle = hexS(shade(color, 1.28)); g.fillRect(0, 0, S, S);  // chok (och)
      for (let row = 0, y = 0; y < S; row++, y += bh) for (let x = row % 2 ? -bl / 2 : 0; x < S; x += bl) { g.fillStyle = hexS(shade(color, 0.86 + rnd() * 0.22)); g.fillRect(x + 1, y + 1, bl - 2, bh - 2); }
    } else if (kind === 'beton') {
      g.strokeStyle = hexS(shade(color, 0.82)); g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`; g.beginPath(); g.arc(rnd() * S, rnd() * S, 1 + rnd() * 2, 0, 7); g.fill(); }
    } else if (kind === 'tosh') {
      const rh = 0.6 * px; g.strokeStyle = hexS(shade(color, 0.84)); g.lineWidth = 2;
      for (let row = 0, y = 0; y < S; row++, y += rh) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = row % 2 ? 0.6 * px : 0; x < S; x += 1.2 * px) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rh); g.stroke(); } }
    } else if (kind === 'yogoch') {
      for (let x = 0; x < S; x += 0.15 * px) { g.fillStyle = hexS(shade(color, 0.9 + rnd() * 0.18)); g.fillRect(x, 0, 0.15 * px - 2, S); }
    } else if (kind === 'metall') {
      for (let x = 0; x < S; x += 0.2 * px) { g.fillStyle = hexS(shade(color, 0.82)); g.fillRect(x, 0, 3, S); g.fillStyle = hexS(shade(color, 1.08)); g.fillRect(x + 3, 0, 3, S); }
    } else if (kind === 'terrakota') {
      for (let y = 0; y < S; y += 0.2 * px) { g.fillStyle = hexS(shade(color, 0.8)); g.fillRect(0, y, S, 4); }
    } else if (kind === 'suvoq') {
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + rnd() * 0.03})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 2 + rnd() * 6); }
    }
    t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.repeat.set(1 / m, 1 / m);
    texC.set(key, t);
  }
  return { t, m };
}

/** Cherepitsa teksturasi (qiya tom): kanvas = 1,2 m */
export function tileTexture(color: number, aniso = 4): THREE.CanvasTexture {
  const key = `tile|${color}`; let t = texC.get(key); if (t) return t;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!, px = S / 1.2;
  g.fillStyle = hexS(color); g.fillRect(0, 0, S, S);
  const rh = 0.3 * px, tw = 0.24 * px;
  for (let row = 0, y = 0; y < S; row++, y += rh) {
    g.fillStyle = hexS(shade(color, 0.72)); g.fillRect(0, y, S, 3);
    for (let x = row % 2 ? tw / 2 : 0; x < S + tw; x += tw) { const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, hexS(shade(color, 0.86))); gr.addColorStop(0.5, hexS(shade(color, 1.08))); gr.addColorStop(1, hexS(shade(color, 0.86))); g.fillStyle = gr; g.fillRect(x + 1, y + 3, tw - 2, rh - 3); }
  }
  t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.repeat.set(1 / 1.2, 1 / 1.2);
  texC.set(key, t); return t;
}

/** Qiya tom uchburchaklari uchun UV: u — tizma boʻylab, v — qiyalik boʻylab (metr) */
export function roofUV(pos: number[]): number[] {
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 9) {
    const A = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]), B = new THREE.Vector3(pos[i + 3], pos[i + 4], pos[i + 5]), C = new THREE.Vector3(pos[i + 6], pos[i + 7], pos[i + 8]);
    const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
    let hx = n.x, hz = n.z; const hl = Math.hypot(hx, hz);
    if (hl < 1e-3) { for (const p of [A, B, C]) uv.push(p.x, p.z); continue; }
    hx /= hl; hz /= hl; const k = 1 / Math.max(0.2, Math.abs(n.y));
    for (const p of [A, B, C]) uv.push(p.x * -hz + p.z * hx, (p.x * hx + p.z * hz) * k);
  }
  return uv;
}
