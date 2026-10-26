/**
 * Transport modellari (scene/vehicles.ts) → yassi SVG illyustratsiya (Koʻchasoz B · aksonometriya, 26.10.2026).
 * Kesim va rejadagi uslub: tekis rang, 3 xil yorugʻlik tusi (tepa / old / yon), chok koʻrinmaydi, tashqi kontur ingichka chiziq.
 * Uchburchaklar bir marta hisoblanadi (keshlanadi); proyeksiya va chizish — b.ts dagi P() va A() bilan.
 */
import * as THREE from 'three';
import { buildVehicle, VEHICLES, type VehicleKind } from '../scene/vehicles';

interface Tri { p: number[]; n: [number, number, number]; m: string }
const cache = new Map<VehicleKind, Tri[]>();

function tris(kind: VehicleKind): Tri[] {
  let t = cache.get(kind); if (t) return t;
  t = [];
  const g = buildVehicle(kind); g.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  g.traverse(o => {
    const me = o as THREE.Mesh; if (!me.isMesh) return;
    const geo = me.geometry.index ? me.geometry.toNonIndexed() : me.geometry, pos = geo.getAttribute('position'), mat = me.material as THREE.MeshStandardMaterial;
    const nm = mat.name || 'kuzov';
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i).applyMatrix4(me.matrixWorld); b.fromBufferAttribute(pos, i + 1).applyMatrix4(me.matrixWorld); c.fromBufferAttribute(pos, i + 2).applyMatrix4(me.matrixWorld);
      n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize(); if (!isFinite(n.x)) continue;
      t.push({ p: [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], n: [n.x, n.y, n.z], m: nm === 'kuzov' ? `kuzov:#${mat.color.getHexString()}` : nm });
    }
  });
  cache.set(kind, t);
  return t;
}

/** Material → illyustratsiya rangi (line — «Chizma» rejimi: oq, oynalar och kulrang) */
function base(m: string, line: boolean, body: string): string {
  if (m.startsWith('kuzov')) return line ? '#ffffff' : (m.endsWith('#ece9e2') || m.endsWith('#7d8a96') ? body : m.slice(6));
  const C: Record<string, string> = { oyna: '#b9c6d0', eshik: '#b9c6d0', eshik_oyna: '#b9c6d0', shina: '#4a4844', disk: '#bdb8ae', qora: '#55524d', tablo: '#55524d', garmon: '#6a6761', aksent: '#4c5bd4', tunuka: '#d9d5cc', chiroq: '#f6f1e2', fara: '#ffffff', burilish: '#e8a640', orqa: '#c96b5c', orqa_chiroq: '#c96b5c', chiroq_korpus: '#55524d', pantograf: '#55524d', pantograf_asosi: '#cfcac0', mayoq: '#5b7fd0', shkaf: '#b8473a', chiziq: '#f2efe8', kabina: body, furgon: '#e6e3dc', konditsioner: '#d9d5cc' };
  const c = C[m] ?? '#cfcac0';
  return line ? (m === 'shina' || m === 'qora' || m === 'tablo' || m === 'garmon' || m === 'chiroq_korpus' ? '#5d5a55' : m.startsWith('oyna') || m.startsWith('eshik') ? '#eef1f3' : '#ffffff') : c;
}
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}

export interface VehDraw {
  /** aksonometriya proyeksiyasi: (x — koʻndalang, y — koʻcha boʻylab, z — tepaga) → ekran */
  P: (x: number, y: number, z: number) => [number, number];
  /** yoʻl (path d), toʻldirish, chiziq, qalinlik, shaffoflik */
  A: (d: string, f: string | null, st: string | null, w?: number, o?: number) => void;
  line: boolean;
  /** koʻrish yoʻnalishi (uzoqlashish) — chuqurlik va orqa yuzlarni olib tashlash uchun */
  view: [number, number, number];
}

/**
 * Transport vositasini chizadi: markaz cx (koʻndalang), y0 — orqa uchi koʻcha boʻylab (oʻsish tomoni), back — teskari yoʻnalish.
 * Qaytaradi: egallagan uzunlik (m).
 */
export function drawVehicle(D: VehDraw, kind: VehicleKind, cx: number, y0: number, z0: number, back: boolean, body = '#f4f3f0'): number {
  const T = tris(kind), L = VEHICLES[kind].L, s = back ? -1 : 1, yc = y0 + L / 2;
  const [vx, vy, vz] = D.view, lt = [-0.35, -0.55, 0.76];
  // model (X kenglik, Y tepaga, Z uzunlik, old +Z) → aksonometriya (x, y, z)
  const map = (X: number, Y: number, Z: number): [number, number, number] => [cx - s * X, yc + s * Z, z0 + Y];   // (−X, Z, Y) — aylantirish, oyna aksi emas
  const items: { d: number; pts: [number, number][]; f: string }[] = [];
  const hullPts: [number, number][] = [];
  for (const t of T) {
    const nx = -s * t.n[0], ny = s * t.n[2], nz = t.n[1];
    const dv = nx * vx + ny * vy + nz * vz; if (dv >= -1e-4) continue;   // orqa yuz
    const q: [number, number, number][] = [map(t.p[0], t.p[1], t.p[2]), map(t.p[3], t.p[4], t.p[5]), map(t.p[6], t.p[7], t.p[8])];
    const pts = q.map(v => D.P(v[0], v[1], v[2]));
    const dep = (q[0][0] + q[1][0] + q[2][0]) * vx + (q[0][1] + q[1][1] + q[2][1]) * vy + (q[0][2] + q[1][2] + q[2][2]) * vz;
    // tus: tepa / old / yon — kesimdagi box() kabi uch daraja + yumshoq yorugʻlik
    const li = Math.max(0, nx * lt[0] + ny * lt[1] + nz * lt[2]), k = D.line ? 1 : 0.82 + 0.2 * li;
    items.push({ d: dep, pts, f: shade(base(t.m, D.line, body), k) });
    pts.forEach(p => hullPts.push(p));
  }
  items.sort((a, b) => b.d - a.d);
  // ketma-ket bir xil rangdagi uchburchaklar — bitta path (chok koʻrinmasin: chiziq shu rangda)
  let cur = '', buf = '';
  const flush = () => { if (buf) D.A(buf, cur, cur, 0.35); buf = ''; };
  for (const it of items) {
    if (it.f !== cur) { flush(); cur = it.f; }
    buf += 'M' + it.pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  }
  flush();
  // tashqi kontur (qavariq qobiq) — kesim uslubidagi ingichka chiziq
  const h = hull(hullPts);
  if (h.length > 2) D.A('M' + h.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z', null, '#5d5a55', D.line ? 0.6 : 0.5, 1);
  return L;
}

function hull(P: [number, number][]): [number, number][] {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
