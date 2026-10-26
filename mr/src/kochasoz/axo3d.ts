/**
 * Koʻchasoz B — aksonometriya 3D (prototip, 26.10.2026): kesim maʼlumotidan (els, rl, bL, bR, U) uch oʻlchamli koʻcha boʻlagi.
 * Ortografik kamera, oʻzimizning transport modellari (scene/vehicles.ts). Uslublar: 'maket' (oq maket), 'rangli' (zona ranglari + kontur), 'qatlam' (yer osti ajratilgan).
 */
import * as THREE from 'three';
import { buildVehicle } from '../scene/vehicles';

export type AxoStyle = 'maket' | 'rangli' | 'qatlam';
export interface AxoUtil { k: string; x: number; d: number; c?: string; dia?: number; lbl?: string }
export interface AxoSection { els: [string, number, Record<string, unknown>?][]; rl: number; bL: number; bR: number; U?: AxoUtil[] }

const SB = 1.5, BD = 12, DEP = 4.2;
export const AXO_LG = 40, AXO_GAP = 5;
/** Koʻz balandligidagi koʻrinish uchun: uzun koʻcha, yaqin bino kesilmaydi, yer osti yoʻq; clear — kamera turgan joyda mashina qoʻyilmaydi */
export interface AxoOpt { len?: number; eye?: boolean; clear?: { x: number; z: number; r: number }; seed?: number }
const ZH: Record<string, number> = { front: .15, piy: .15, mebel: .15, yash: .15, velo: .08, park: 0, qat: 0, bus: 0, tram: .02, med: .15, ariq: 0 };
const ZC: Record<string, string> = { front: '#efe6d4', piy: '#e9e4da', mebel: '#ddd5c5', yash: '#c9dcb6', velo: '#d98a78', park: '#d4d6da', qat: '#c9cbd0', bus: '#93a9d8', tram: '#e3d8c4', med: '#cfe0bf', ariq: '#bcd9ea' };
const UCOL: Record<string, string> = { V: '#3b82c4', K: '#8a6a4a', G: '#e0b020', E: '#d0453a', T: '#c2703a', A: '#6b7a8a', D: '#5aa0a0' };

function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function buildAxo(sec: AxoSection, style: AxoStyle, nearRight = true, opt: AxoOpt = {}): { scene: THREE.Scene; target: THREE.Vector3; span: number } {
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const maket = style === 'maket', layered = style === 'qatlam', R = rng(opt.seed ?? 7), LG = opt.len ?? AXO_LG, eye = !!opt.eye;
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial => { const k = c + JSON.stringify(o); let m = mats.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...o }); mats.set(k, m); } return m; };
  const clay = (c: string): string => maket ? new THREE.Color(c).lerp(new THREE.Color('#f4f2ee'), 0.55).getStyle() : c;
  const edge = new THREE.LineBasicMaterial({ color: maket ? '#9c978d' : '#34322e', transparent: true, opacity: maket ? 0.55 : 0.8 });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, opt: { cast?: boolean; recv?: boolean; edges?: boolean; parent?: THREE.Object3D } = {}): THREE.Mesh => {
    const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = opt.cast ?? true; me.receiveShadow = opt.recv ?? true; (opt.parent ?? root).add(me);
    if (opt.edges ?? true) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edge); me.add(e); }
    return me;
  };
  const box = (w: number, h: number, l: number, x: number, y: number, z: number, c: string, opt: Parameters<typeof add>[5] = {}): THREE.Mesh => add(new THREE.BoxGeometry(w, h, l), M(clay(c)), x + w / 2, y + h / 2, z + l / 2, opt);

  const els = sec.els, rl = sec.rl; const zx: [number, number][] = []; let acc = 0; els.forEach(e => { zx.push([acc, acc + e[1]]); acc += e[1]; });
  const xL = -SB - BD, xR = rl + SB + BD;
  // ---- yer osti (kesilgan blok)
  const under = new THREE.Group(); if (!eye) root.add(under); if (layered) under.position.y = -AXO_GAP;
  add(new THREE.BoxGeometry(xR - xL, DEP, LG), M(maket ? '#e9e4da' : '#e6d9c1'), (xL + xR) / 2, -DEP / 2, LG / 2, { parent: under, cast: false, edges: true });
  // tuproq qatlamlari (old yuzada chiziqlar)
  for (let d = 0.6; d < DEP; d += 0.9) add(new THREE.BoxGeometry(xR - xL, 0.02, 0.02), M(maket ? '#d6d0c4' : '#cbbb9f'), (xL + xR) / 2, -d, -0.01, { parent: under, cast: false, edges: false });
  (sec.U ?? []).forEach(u => { const r = Math.max(0.18, (u.dia ?? 0.3) / 2 * 1.6); const g = new THREE.CylinderGeometry(r, r, LG + 0.04, 14); g.rotateX(Math.PI / 2); add(g, M(maket ? '#bdb7ab' : (u.c ?? UCOL[u.k] ?? '#888')), u.x, -u.d, LG / 2, { parent: under, edges: false }); });
  // ---- yer usti: qizil chiziq oraligʻidan tashqari tasma va bino oldi
  box(SB, 0.15, LG, -SB, 0, 0, '#e8e4dc'); box(SB, 0.15, LG, rl, 0, 0, '#e8e4dc');
  els.forEach((e, i) => {
    const [t, w] = e, [x0, x1] = zx[i], h = ZH[t] ?? 0;
    box(w, Math.max(0.02, h), LG, x0, h > 0.03 ? 0 : -0.02 + 0.02, 0, ZC[t] ?? '#ddd', { cast: false });
    const nx = els[i + 1];
    if (t === 'qat' && nx && nx[0] === 'qat') for (let z = 2; z < LG; z += 6) box(0.12, 0.012, 3, x1 - 0.06, 0.021, z, '#ffffff', { cast: false, edges: false });
    if ((t === 'qat' || t === 'bus') && els.some(q => q[2] && (q[2] as Record<string, unknown>).zebra)) for (let zz = x0 + 0.3; zz < x1 - 0.3; zz += 1.0) box(0.5, 0.012, 4, zz, 0.021, 5, '#ffffff', { cast: false, edges: false });
    if (t === 'tram') [0.27, 0.73].forEach(f => box(0.08, 0.04, LG, x0 + (x1 - x0) * f - 0.04, h, 0, '#6d6a64', { cast: false, edges: false }));
  });
  // ---- binolar: chap — baland, oʻng — bL/bR qavat
  const bld = (x0: number, floors0: number, side: -1 | 1, near: boolean): void => {
    near = near && !eye; const floors = near ? 1 : floors0, H = near ? 4.2 : floors * 3.2, g = new THREE.Group(); root.add(g);
    const facadeX = side < 0 ? x0 + BD : x0;
    const ghost = !near && layered && floors > 2;
    const bodyMat = ghost ? new THREE.MeshStandardMaterial({ color: '#f2f0eb', transparent: true, opacity: 0.35, flatShading: true, depthWrite: false }) : M(maket ? '#f7f6f3' : '#efede8');
    const hb = ghost ? 2 * 3.2 : H;
    add(new THREE.BoxGeometry(BD, hb, LG), M(maket ? '#f7f6f3' : '#efede8'), x0 + BD / 2, hb / 2, LG / 2, { parent: g, edges: true });
    if (ghost) add(new THREE.BoxGeometry(BD, H - hb, LG), bodyMat, x0 + BD / 2, hb + (H - hb) / 2, LG / 2, { parent: g, cast: false, edges: true });
    // birinchi qavat vitrinasi va derazalar (koʻcha fasadi)
    const fx = facadeX - side * 0.03;
    const glass = M(maket ? '#dedcd6' : '#b9c7d2', { roughness: 0.3 });
    for (let z = 1.2; z < LG - 1; z += 4.4) {
      add(new THREE.BoxGeometry(0.06, 2.6, 3.4), glass, fx, 0.3 + 1.3, z + 1.7, { parent: g, cast: false, edges: false });
      for (let f = 1; f < (ghost ? 2 : floors); f++) add(new THREE.BoxGeometry(0.06, 1.5, 1.6), glass, fx, f * 3.2 + 0.9 + 0.75, z + 0.4 + 0.8, { parent: g, cast: false, edges: false }), add(new THREE.BoxGeometry(0.06, 1.5, 1.6), glass, fx, f * 3.2 + 0.9 + 0.75, z + 2.4 + 0.8, { parent: g, cast: false, edges: false });
    }
    for (let f = 1; f < (ghost ? 3 : floors); f++) add(new THREE.BoxGeometry(BD + 0.06, 0.12, LG + 0.06), M(maket ? '#e7e4de' : '#dcd8d0'), x0 + BD / 2, f * 3.2, LG / 2, { parent: g, cast: false, edges: false });
  };
  const cap = eye ? 12 : 6; if (sec.bL > 0) bld(xL, Math.min(sec.bL, cap), -1, !nearRight); if (sec.bR > 0) bld(rl + SB, Math.min(sec.bR, cap), 1, nearRight);
  // yaqin bino kesilgan: tepasida kesim belgisi (qora chiziq)
  if (!eye && (nearRight ? sec.bR : sec.bL) > 0) { const x0 = nearRight ? rl + SB : xL; box(BD, 0.04, LG, x0, 4.2, 0, maket ? '#dcd8cf' : '#d4cec2', { cast: false, edges: false }); for (let z = 0.6; z < LG; z += 1.2) box(0.05, 0.01, 1.6, x0 + 0.5 + (z * 2.7) % (BD - 1), 4.245, z, maket ? '#c4beb3' : '#b3ab9d', { cast: false, edges: false }); }
  // ---- obyektlar
  const tree = (x: number, z: number, y: number, s: number, kind: number): void => {
    const g = new THREE.Group(); g.position.set(x, y, z); root.add(g);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 2.6 * s, 6), M(maket ? '#cfc8bb' : '#7a6a58')); tr.position.y = 1.3 * s; tr.castShadow = true; g.add(tr);
    const cg = kind === 2 ? new THREE.ConeGeometry(1.1 * s, 5 * s, 7) : new THREE.IcosahedronGeometry((kind ? 1.8 : 2.1) * s, 1);
    const cr = new THREE.Mesh(cg, M(maket ? '#c9d3bd' : ['#8fae74', '#9cb87f', '#7fa267'][Math.floor(R() * 3)])); cr.position.y = (kind === 2 ? 4.6 : 4.2) * s; cr.scale.set(1, kind === 2 ? 1 : 0.9, 1); cr.castShadow = true; cr.receiveShadow = true; g.add(cr);
  };
  const lamp = (x: number, z: number, y: number, dir: number): void => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 8, 6), M(maket ? '#bdb8ae' : '#4a4844')); pole.position.set(x, y + 4, z); pole.castShadow = true; root.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), pole.material); arm.position.set(x + dir * 0.8, y + 7.9, z); root.add(arm);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), M(maket ? '#ffffff' : '#f3dc94', { emissive: new THREE.Color(maket ? '#000' : '#f3dc94'), emissiveIntensity: 0.3 })); hd.position.set(x + dir * 1.5, y + 7.85, z); root.add(hd);
  };
  /** Odam: past poligonli figura (oyoq, tana, qoʻl, bosh), boʻyi va qadami tasodifiy; yuzi ±Z */
  const person = (x: number, z: number, y: number): void => {
    if (opt.clear && Math.abs(x - opt.clear.x) < 1.4 && Math.abs(z - opt.clear.z) < opt.clear.r * 0.7) return;
    const tops = ['#d06a4e', '#4f6d9a', '#e0b35a', '#6c8f6a', '#8d7aa8', '#e9e4da', '#c45a7a', '#3d5a6c'], bots = ['#3b4252', '#5a5248', '#2f3a4a', '#7a6e5e', '#1f2328'];
    const top = maket ? '#e2ded6' : tops[Math.floor(R() * tops.length)], bot = maket ? '#d2cdc4' : bots[Math.floor(R() * bots.length)], skin = maket ? '#ebe7e0' : ['#e8c9a8', '#d6ad86', '#b98b64'][Math.floor(R() * 3)];
    const k = 0.92 + R() * 0.16, g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.3; g.scale.setScalar(k); root.add(g);
    const st = (R() - 0.5) * 0.7, part = (geo: THREE.BufferGeometry, c: string, px: number, py: number, pz: number, rx = 0): void => { const m = new THREE.Mesh(geo, M(c)); m.position.set(px, py, pz); m.rotation.x = rx; m.castShadow = true; g.add(m); };
    const leg = new THREE.BoxGeometry(0.13, 0.84, 0.15); leg.translate(0, -0.42, 0);
    part(leg, bot, -0.09, 0.86, 0, st); part(leg, bot, 0.09, 0.86, 0, -st);
    const tor = new THREE.CylinderGeometry(0.19, 0.16, 0.62, 6); part(tor, top, 0, 1.17, 0);
    const arm = new THREE.BoxGeometry(0.09, 0.6, 0.1); arm.translate(0, -0.3, 0);
    part(arm, top, -0.25, 1.45, 0, -st * 0.8); part(arm, top, 0.25, 1.45, 0, st * 0.8);
    part(new THREE.IcosahedronGeometry(0.115, 1), skin, 0, 1.62, 0);
    if (R() < 0.35) part(new THREE.IcosahedronGeometry(0.12, 1), maket ? '#d8d3ca' : ['#2b2522', '#5a3d2a', '#8a8580'][Math.floor(R() * 3)], 0, 1.67, -0.02);
  };
  /** Velosipedchi: ikki gʻildirak, rama, chavandoz; back — −Z tomonga yuradi */
  const cyclist = (x: number, z: number, y: number, back: boolean): void => {
    if (opt.clear && Math.abs(x - opt.clear.x) < 1.4 && Math.abs(z - opt.clear.z) < opt.clear.r * 0.7) return;
    const g = new THREE.Group(); g.position.set(x, y, z); if (back) g.rotation.y = Math.PI; root.add(g);
    const dark = M(maket ? '#bdb8ae' : '#2c2c2e'), col = M(maket ? '#e2ded6' : ['#d06a4e', '#4f6d9a', '#e0b35a', '#6c8f6a'][Math.floor(R() * 4)]);
    [-0.52, 0.52].forEach(dz => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 5, 14), dark); w.rotation.y = Math.PI / 2; w.position.set(0, 0.35, dz); w.castShadow = true; g.add(w); });
    const bar = (a: THREE.Vector3, b: THREE.Vector3, m: THREE.Material, r = 0.025) => { const l = a.distanceTo(b), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 5), m); c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); c.castShadow = true; g.add(c); };
    const V = (a: number, b: number) => new THREE.Vector3(0, a, b);
    bar(V(0.35, -0.52), V(0.62, -0.05), col, 0.03); bar(V(0.62, -0.05), V(0.85, 0.42), col, 0.03); bar(V(0.35, 0.52), V(0.85, 0.42), col, 0.03); bar(V(0.62, -0.05), V(0.92, -0.18), dark);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.62, 6), col); body.position.set(0, 1.25, 0.08); body.rotation.x = 0.45; body.castShadow = true; g.add(body);
    const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), M(maket ? '#ebe7e0' : '#e8c9a8')); hd.position.set(0, 1.62, 0.28); hd.castShadow = true; g.add(hd);
    bar(V(0.95, -0.08), V(0.55, 0.15), M(maket ? '#d2cdc4' : '#3b4252'), 0.06); bar(V(1.35, 0.25), V(0.95, 0.45), col, 0.045);
  };
  const umbrella = (x: number, z: number, y: number): void => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5), M('#8a857b')); p.position.set(x, y + 1.2, z); root.add(p);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 8), M(maket ? '#f6f4ef' : '#f0ead8')); c.position.set(x, y + 2.45, z); c.castShadow = true; root.add(c);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8), M('#ffffff')); t.position.set(x, y + 0.75, z); t.castShadow = true; root.add(t);
  };
  const bench = (x: number, z: number, y: number): void => { box(0.5, 0.45, 1.8, x - 0.25, y, z - 0.9, '#c9b796'); };
  const veh = (kind: Parameters<typeof buildVehicle>[0], x: number, z: number, back: boolean, color?: string): void => {
    if (opt.clear && Math.abs(x - opt.clear.x) < 1.6 && Math.abs(z - opt.clear.z) < opt.clear.r) return;
    const v = buildVehicle(kind, { color: maket ? '#f1efea' : color }); v.position.set(x, 0, z); if (back) v.rotation.y = Math.PI;
    v.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; if (maket) { const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; (o as THREE.Mesh).material = M(mm.name === 'oyna' ? '#d8d6d0' : mm.name === 'shina' ? '#9a968e' : '#f4f2ee'); } } });
    root.add(v);
  };
  const carCols = ['#c9ccd1', '#8b97a5', '#e9e7e2', '#5f6b78', '#b8433a', '#3b4a5c'];
  els.forEach((e, i) => {
    const [t, w] = e, f = (e[2] ?? {}) as Record<string, boolean>, [x0, x1] = zx[i], cx = (x0 + x1) / 2, h = ZH[t] ?? 0, left = cx < rl / 2;
    if ((t === 'yash' || t === 'med') && f.daraxt) for (let z = 3; z < LG; z += 9) tree(cx + (R() - 0.5) * 0.4, z + R(), h, w >= 2.9 ? 1 : 0.85, t === 'med' && w < 2.5 ? 2 : (z % 2 ? 1 : 0));
    if (t === 'park' && f.mashina) for (let z = 1.5; z < LG - 5; z += 6.2) { if (f.dchontak && Math.abs((z % 40) - 20) < 3) { tree(cx, z + 2.5, 0, 0.8, 0); continue; } veh('sedan', cx, z + 2.4, !left, carCols[Math.floor(R() * carCols.length)]); }
    for (let b0 = 0; b0 < LG - 10; b0 += 40) {
      if (t === 'qat') { const n = [[9, 0], [28, 1]]; n.forEach(([z, s]) => { if ((i + s + b0 / 40) % 2) return; veh('sedan', cx, b0 + z, !left, carCols[Math.floor(R() * carCols.length)]); }); if ((i + b0 / 40) % 2 === 1) veh('avtobus12', cx, b0 + 22, !left); }
      if (t === 'bus' && (b0 / 40) % 2 === 0) veh('avtobus12', cx, b0 + 18, !left);
      if (t === 'tram' && (b0 / 40) % 3 === 0) veh('tramvay', cx, b0 + 20, !left);
    }
    if ((t === 'mebel' || t === 'med') && f.fonar) for (let z = 4; z < LG; z += 12) lamp(cx, z, h, left ? 1 : -1);
    if (t === 'velo') for (let z = 7; z < LG; z += 17) cyclist(cx + (R() - 0.5) * 0.4, z + R() * 4, h, !left);
    if (t === 'piy') for (let j = 0; j < LG / 5.7; j++) person(x0 + 0.5 + R() * (w - 1), 2 + j * 5.4 + R() * 2, h);
    if (t === 'front' && f.kafe) for (let z = 4; z < LG; z += 9) umbrella(cx, z, h);
    if ((t === 'yash' || t === 'front') && f.orin) [11, 29].forEach(z0 => { for (let z = z0; z < LG; z += 40) bench(cx + (left ? 0.9 : -0.9), z, h); });
  });
  const target = new THREE.Vector3(rl / 2, layered ? -1 : 2, LG / 2);
  return { scene, target, span: xR - xL };
}
