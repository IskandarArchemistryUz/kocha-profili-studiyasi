/**
 * Archemistry transport modellari — oʻzimiz yasagan, brendsiz, past poligonli (26.10.2026).
 * Oʻlchamlar Koʻchasoz C dagi burilish izi dizayn avtomobillari bilan bir xil (boards/c.ts VH: baza, old osilish, eni):
 *   avtobus 12 m: baza 7,6, old 2,4, eni 2,6 · oʻt oʻchirish: 6,1 / 1,5 / 2,5 · yuk 10 m: 6,1 / 1,2 / 2,5 · yengil: eni 1,8.
 * glTF qoidasi: +Y — tepaga, old tomon — +Z, oʻng tomon — −X (eshiklar oʻng tomonda, oʻng tomonlama harakat);
 * nol nuqta — yer sathida, oldingi va orqa chet oʻrtasida (uzunlik boʻyicha markaz).
 * Materiallar nomlari barqaror (kuzov, oyna, shina, disk, chiroq, qora, aksent) — uslub almashganda rang oʻzgartirish uchun.
 */
import * as THREE from 'three';

export type VehicleKind = 'avtobus12' | 'avtobus18' | 'trolleybus' | 'tramvay' | 'sedan' | 'yuk' | 'ot';
export interface VehicleSpec { kind: VehicleKind; name: string; L: number; W: number; H: number; wb?: number; fo?: number }
export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  avtobus12: { kind: 'avtobus12', name: 'Avtobus 12 m', L: 12, W: 2.55, H: 3.15, wb: 7.6, fo: 2.4 },
  avtobus18: { kind: 'avtobus18', name: 'Avtobus 18 m (boʻgʻimli)', L: 18, W: 2.55, H: 3.15 },
  trolleybus: { kind: 'trolleybus', name: 'Trolleybus 12 m', L: 12, W: 2.55, H: 3.4, wb: 7.6, fo: 2.4 },
  tramvay: { kind: 'tramvay', name: 'Tramvay (3 seksiya)', L: 27, W: 2.5, H: 3.5 },
  sedan: { kind: 'sedan', name: 'Yengil avtomobil', L: 4.7, W: 1.8, H: 1.47, wb: 2.75, fo: 0.95 },
  yuk: { kind: 'yuk', name: 'Yuk avtomobili 10 m', L: 10, W: 2.5, H: 3.6, wb: 6.1, fo: 1.2 },
  ot: { kind: 'ot', name: 'Oʻt oʻchirish avtomobili', L: 10, W: 2.5, H: 3.3, wb: 6.1, fo: 1.5 },
};

/** Ranglar — Archemistry palitrasi (yumshoq, brendsiz) */
const COL = { kuzov: '#ece9e2', aksent: '#4c5bd4', oyna: '#3a4757', shina: '#1d1d1f', disk: '#9a9a9e', qora: '#2c2c2e', chiroq: '#fff6d8', orqa: '#c0392b', qizil: '#c23b2e', tunuka: '#b9b6ae' };
const mats = new Map<string, THREE.MeshStandardMaterial>();
function M(name: keyof typeof COL | string, color?: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = `${name}:${color ?? ''}:${JSON.stringify(o)}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: color ?? (COL as Record<string, string>)[name] ?? '#cccccc', roughness: name === 'oyna' ? 0.25 : name === 'shina' ? 0.9 : 0.6, metalness: name === 'disk' ? 0.4 : name === 'oyna' ? 0.1 : 0.05, ...o });
    m.name = String(name); mats.set(key, m);
  }
  return m;
}

/** Faralar juftligi: qora korpus + yorugʻ linza (+ old tomonda sariq burilish chirogʻi). dir: +1 — old (+Z), −1 — orqa. */
function lamps(g: THREE.Group, x: number, y: number, z: number, dir: 1 | -1, w = 0.36, hh = 0.16, rear = dir < 0): void {
  const lens = rear ? M('orqa', undefined, { emissive: new THREE.Color('#ff3b2a'), emissiveIntensity: 0.55 }) : M('chiroq', '#ffffff', { emissive: new THREE.Color('#fff4d6'), emissiveIntensity: 0.9 });
  const amber = M('chiroq', '#f5a623', { emissive: new THREE.Color('#f5a623'), emissiveIntensity: 0.5 });
  [-1, 1].forEach(sd => {
    const cx = sd * x;
    g.add(box(w + 0.07, hh + 0.07, 0.03, cx, y, z, M('qora'), 'chiroq_korpus'));
    g.add(box(w * (rear ? 1 : 0.72), hh, 0.03, cx - sd * (rear ? 0 : w * 0.14), y, z + dir * 0.02, lens, rear ? 'orqa_chiroq' : 'fara'));
    if (!rear) g.add(box(w * 0.24, hh, 0.03, cx + sd * w * 0.38, y, z + dir * 0.02, amber, 'burilish'));
  });
}

/** Yon profil (x — uzunlik, y — balandlik) → kenglik boʻylab chiqarish; natija: uzunlik +Z boʻylab, kenglik X boʻylab, markazda */
function extrude(shape: THREE.Shape, width: number, bevel = 0.06, curve = 5): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -(width - 2 * bevel) / 2);
  g.rotateY(-Math.PI / 2);   // x (uzunlik) → +Z
  return g;
}
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, name = '') => { const o = new THREE.Mesh(g, m); o.name = name; o.castShadow = true; o.receiveShadow = true; return o; };
/** Quti: markaz (x, y, z), oʻlcham (sx, sy, sz) */
function box(sx: number, sy: number, sz: number, x: number, y: number, z: number, m: THREE.Material, name = '') { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return mesh(g, m, name); }
/** Yumaloq burchakli toʻrtburchak shakl (x0..x1, y0..y1), burchak radiuslari: [past-orqa, past-old, tepa-old, tepa-orqa] */
function rrect(x0: number, y0: number, x1: number, y1: number, r: [number, number, number, number]): THREE.Shape {
  const s = new THREE.Shape(), [a, b, c, d] = r;
  s.moveTo(x0 + a, y0); s.lineTo(x1 - b, y0); if (b) s.quadraticCurveTo(x1, y0, x1, y0 + b); s.lineTo(x1, y1 - c); if (c) s.quadraticCurveTo(x1, y1, x1 - c, y1);
  s.lineTo(x0 + d, y1); if (d) s.quadraticCurveTo(x0, y1, x0, y1 - d); s.lineTo(x0, y0 + a); if (a) s.quadraticCurveTo(x0, y0, x0 + a, y0);
  return s;
}
/** Gʻildirak: shina + disk; markaz (z — uzunlik boʻyicha), tomoni (±1 — X), radius, eni */
function wheel(z: number, side: number, W: number, r: number, w = 0.3, dual = false): THREE.Group {
  const g = new THREE.Group(), seg = 14;
  const t = new THREE.CylinderGeometry(r, r, dual ? w * 1.8 : w, seg); t.rotateZ(Math.PI / 2);
  const h = new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.02, seg); h.rotateZ(Math.PI / 2);
  const x = side * (W / 2 - (dual ? w * 0.9 : w / 2) - 0.02);
  t.translate(x, r, z); h.translate(x + side * ((dual ? w * 0.9 : w / 2) + 0.005), r, z);
  g.add(mesh(t, M('shina'), 'shina'), mesh(h, M('disk'), 'disk'));
  return g;
}
const wheels = (zs: number[], W: number, r: number, dualRear = false) => { const g = new THREE.Group(); zs.forEach((z, i) => [-1, 1].forEach(s => g.add(wheel(z, s, W, r, 0.3, dualRear && i > 0)))); return g; };

/** Shina oʻyiqli kuzov profili: uzunlik L, pol balandligi y0, tom H, gʻildiraklar (markaz x, radius) */
function bodyShape(L: number, y0: number, H: number, arches: { x: number; r: number }[], front: { rake: number; r: number }, rear = 0.18): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(rear, y0);
  for (const a of [...arches].sort((p, q) => p.x - q.x)) { const R = a.r + 0.08; s.lineTo(a.x - R, y0); s.absarc(a.x, y0, R, Math.PI, 0, true); }
  s.lineTo(L - 0.12, y0); s.quadraticCurveTo(L, y0, L, y0 + 0.12);
  s.lineTo(L - front.rake * 0.4, H * 0.55); s.lineTo(L - front.rake, H - front.r); s.quadraticCurveTo(L - front.rake, H, L - front.rake - front.r, H);
  s.lineTo(rear + 0.25, H); s.quadraticCurveTo(0, H, 0, H - 0.25); s.lineTo(0, y0 + rear); s.quadraticCurveTo(0, y0, rear, y0);
  return s;
}

/** Shahar avtobusi korpusi (bitta seksiya): z0 dan L uzunlik; old — +Z; doors — oʻng (−X) tomonda */
function busBody(L: number, W: number, H: number, axles: number[], opt: { nose?: boolean; tail?: boolean; doors: number[]; accent?: string } = { doors: [] }): THREE.Group {
  const g = new THREE.Group(), y0 = 0.32, r = 0.5;
  const sh = opt.nose === false && opt.tail === false
    ? rrect(0, y0, L, H, [0.05, 0.05, 0.12, 0.12])
    : opt.nose === false ? rrect(0, y0, L, H, [0.15, 0.05, 0.12, 0.25])
      : bodyShape(L, y0, H, axles.map(x => ({ x, r })), { rake: 0.05, r: 0.3 });
  const body = mesh(extrude(sh, W, 0.08), M('kuzov'), 'kuzov'); body.position.z = -L / 2; g.add(body);
  const zL = (x: number) => x - L / 2;   // profil x → model z
  // pastki qora etak (bamper va yon etak) — gʻildirak oʻyiqlari orasida
  const sk = M('qora'), gaps = [0, ...axles.flatMap(a => [a - r - 0.1, a + r + 0.1]), L];
  for (let i = 0; i + 1 < gaps.length; i += 2) { const a = gaps[i] + (i === 0 ? 0.05 : 0), b = gaps[i + 1] - (i + 2 === gaps.length ? 0.05 : 0); if (b - a > 0.2) [-1, 1].forEach(s => g.add(box(0.03, 0.32, b - a, s * (W / 2 + 0.005), y0 + 0.16, zL((a + b) / 2), sk, 'qora'))); }
  if (opt.nose !== false) g.add(box(W - 0.1, 0.35, 0.06, 0, y0 + 0.18, zL(L) + 0.08, sk, 'qora'));
  if (opt.tail !== false) g.add(box(W - 0.1, 0.35, 0.06, 0, y0 + 0.18, zL(0) - 0.08, sk, 'qora'));
  // aksent tasma (brendsiz chiziq)
  const ac = M('aksent', opt.accent);
  [-1, 1].forEach(s => g.add(box(0.02, 0.14, L - 0.6, s * (W / 2 + 0.008), 1.02, 0, ac, 'aksent')));
  // yon oynalar: ustunlar bilan boʻlingan panellar
  const gl = M('oyna'), wy0 = 1.25, wy1 = H - 0.35, x0 = opt.tail === false ? 0.25 : 0.6, x1 = opt.nose === false ? L - 0.25 : L - 0.9;
  const n = Math.max(2, Math.round((x1 - x0) / 1.45)), pw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * pw + 0.06, b = x0 + (i + 1) * pw - 0.06; [-1, 1].forEach(s => g.add(box(0.03, wy1 - wy0, b - a, s * (W / 2 + 0.01), (wy0 + wy1) / 2, zL((a + b) / 2), gl, 'oyna'))); }
  // eshiklar (oʻng tomonda): toʻliq balandlikdagi oyna + ramka
  for (const d of opt.doors) { g.add(box(0.035, wy1 - 0.42, 1.25, -(W / 2 + 0.015), (0.42 + wy1) / 2, zL(d), gl, 'oyna')); g.add(box(0.04, 0.05, 1.3, -(W / 2 + 0.02), 0.42, zL(d), sk, 'qora')); g.add(box(0.04, wy1 - 0.42, 0.04, -(W / 2 + 0.02), (0.42 + wy1) / 2, zL(d), sk, 'qora')); }
  // old: shamol oynasi, yoʻnalish tablosi, faralar; orqa: oyna va chiroqlar
  if (opt.nose !== false) {
    g.add(box(W - 0.22, wy1 - 0.75, 0.04, 0, (0.75 + wy1) / 2, zL(L) + 0.1, gl, 'oyna'));
    g.add(box(W - 0.4, 0.22, 0.04, 0, wy1 + 0.15, zL(L) + 0.09, M('qora'), 'tablo'));
    lamps(g, W / 2 - 0.36, 0.62, zL(L) + 0.1, 1, 0.46, 0.2);
  }
  if (opt.tail !== false) {
    g.add(box(W - 0.5, 0.8, 0.04, 0, H - 0.75, zL(0) - 0.1, gl, 'oyna'));
    lamps(g, W / 2 - 0.22, 0.95, zL(0) - 0.1, -1, 0.2, 0.44);
  }
  // tom: konditsioner bloki (oldingi qismda)
  if (opt.nose !== false) { const ac2 = mesh(extrude(rrect(0, 0, 2.6, 0.28, [0.05, 0.12, 0.12, 0.05]), W - 0.6, 0.04, 3), M('tunuka'), 'konditsioner'); ac2.position.set(0, H, zL(L - 4.2) - 1.3); g.add(ac2); }
  g.add(wheels(axles.map(zL), W, r));
  return g;
}

function bus12(accent?: string): THREE.Group {
  const v = VEHICLES.avtobus12, fa = v.L - v.fo!, ra = fa - v.wb!;
  const g = busBody(v.L, v.W, v.H - 0.28, [ra, fa], { doors: [v.L - 1.15, v.L / 2 + 0.2, 1.4], accent }); g.name = v.name; return g;
}
function bus18(): THREE.Group {
  const v = VEHICLES.avtobus18, g = new THREE.Group(); g.name = v.name;
  const A = 11.2, B = 6.4, J = 0.4, H = v.H - 0.28;
  const a = busBody(A, v.W, H, [A - 2.4 - 5.6, A - 2.4], { tail: false, doors: [A - 1.15, A / 2 - 0.6] }); a.position.z = v.L / 2 - A / 2;
  const b = busBody(B, v.W, H, [B - 1.6 - 0.3], { nose: false, doors: [B - 1.5] }); b.position.z = -v.L / 2 + B / 2;
  // boʻgʻim (garmon): qora ikki halqa
  const bel = mesh(extrude(rrect(0, 0.36, J, H - 0.05, [0.02, 0.02, 0.05, 0.05]), v.W - 0.16, 0.03, 2), M('qora'), 'garmon'); bel.position.z = -v.L / 2 + B - 0.0;
  g.add(a, b, bel); return g;
}
function trolley(): THREE.Group {
  const g = bus12('#3f8f6e'), v = VEHICLES.trolleybus; g.name = v.name;
  const H = VEHICLES.avtobus12.H - 0.28;
  // shtangalar: tomning orqa qismidan oldinga va yuqoriga
  [-0.28, 0.28].forEach(x => { const len = 5.6, p = new THREE.CylinderGeometry(0.035, 0.035, len, 6); p.rotateX(Math.PI / 2 - 0.3); p.translate(x, H + 0.3 + Math.sin(0.3) * len / 2, -v.L / 2 + 3.2 + Math.cos(0.3) * len / 2); g.add(mesh(p, M('qora'), 'shtanga')); });
  g.add(box(1.1, 0.25, 1.6, 0, H + 0.13, -v.L / 2 + 3.2, M('tunuka'), 'shtanga_asosi'));
  return g;
}
function tram(): THREE.Group {
  const v = VEHICLES.tramvay, g = new THREE.Group(); g.name = v.name;
  const segL = (v.L - 2 * 0.5) / 3, H = v.H - 0.2, y0 = 0.25, W = v.W;
  for (let i = 0; i < 3; i++) {
    const z0 = -v.L / 2 + i * (segL + 0.5), first = i === 0, last = i === 2;
    // tumshuq: old/orqa seksiyalarda yumaloq, qiya
    const s = new THREE.Shape();
    s.moveTo(first ? 0.9 : 0, y0); s.lineTo(last ? segL - 0.9 : segL, y0);
    if (last) { s.quadraticCurveTo(segL, y0, segL, y0 + 0.9); s.lineTo(segL - 0.45, H - 0.2); s.quadraticCurveTo(segL - 0.55, H, segL - 0.9, H); } else { s.lineTo(segL, H); }
    if (first) { s.lineTo(0.9, H); s.quadraticCurveTo(0.55, H, 0.45, H - 0.2); s.lineTo(0, y0 + 0.9); s.quadraticCurveTo(0, y0, 0.9, y0); } else { s.lineTo(0, H); s.lineTo(0, y0); }
    const b = mesh(extrude(s, W, 0.06, 6), M('kuzov'), 'kuzov'); b.position.z = z0; g.add(b);
    // oyna tasmasi va eshiklar
    const gl = M('oyna'), a0 = first ? 1.3 : 0.25, a1 = last ? segL - 1.3 : segL - 0.25;
    [-1, 1].forEach(sd => g.add(box(0.03, 1.1, a1 - a0, sd * (W / 2 + 0.01), 1.75, z0 + (a0 + a1) / 2, gl, 'oyna')));
    [-1, 1].forEach(sd => { g.add(box(0.035, 1.95, 1.3, sd * (W / 2 + 0.015), 1.3, z0 + segL / 2, M('tunuka', '#b9b6af'), 'eshik')); g.add(box(0.04, 1.2, 0.55, sd * (W / 2 + 0.02), 1.65, z0 + segL / 2 - 0.33, gl, 'eshik_oyna')); g.add(box(0.04, 1.2, 0.55, sd * (W / 2 + 0.02), 1.65, z0 + segL / 2 + 0.33, gl, 'eshik_oyna')); });
    [-1, 1].forEach(sd => g.add(box(0.02, 0.18, segL - 0.4, sd * (W / 2 + 0.008), 0.7, z0 + segL / 2, M('aksent'), 'aksent')));
    if (first || last) { const zf = last ? z0 + segL - 0.47 : z0 + 0.47; { const dy = H - 0.2 - (y0 + 0.9), t = (H - 0.8 - (y0 + 0.9)) / dy, sg = last ? -1 : 1, wg = new THREE.BoxGeometry(W - 0.55, 1.25, 0.04); wg.rotateX(sg * Math.atan2(0.45, dy)); wg.translate(0, H - 0.8, last ? z0 + segL - 0.45 * t + 0.08 : z0 + 0.45 * t - 0.08); g.add(mesh(wg, gl, 'oyna')); void zf; } g.add(box(W - 0.9, 0.18, 0.05, 0, H - 0.12, zf + (last ? -0.12 : 0.12), M('qora'), 'tablo')); lamps(g, W / 2 - 0.42, 0.75, last ? z0 + segL + 0.07 : z0 - 0.07, last ? 1 : -1, 0.4, 0.16, false); }
    // aravachalar (past, etak orqasida)
    [segL * 0.5].forEach(zz => [-1, 1].forEach(sd => g.add(box(0.06, 0.34, 2.0, sd * (W / 2 - 0.05), 0.2, z0 + zz, M('qora'), 'arava'))));
    if (i < 2) g.add(box(W - 0.2, H - 0.4, 0.5, 0, (y0 + H) / 2 + 0.1, z0 + segL + 0.25, M('qora'), 'garmon'));
  }
  // pantograf (oʻrta seksiya): romb
  const zc = 0, top = H + 0.15, ph = 0.9;
  g.add(box(1.2, 0.18, 1.4, 0, top, zc, M('tunuka'), 'pantograf_asosi'));
  const arm = (z1: number, z2: number, y1: number, y2: number) => { const len = Math.hypot(z2 - z1, y2 - y1), c = new THREE.CylinderGeometry(0.025, 0.025, len, 5); c.rotateX(Math.atan2(z2 - z1, y2 - y1)); c.translate(0, (y1 + y2) / 2, (z1 + z2) / 2); return mesh(c, M('qora'), 'pantograf'); };
  g.add(arm(zc - 0.5, zc + 0.3, top + 0.1, top + ph * 0.55), arm(zc + 0.3, zc - 0.1, top + ph * 0.55, top + ph));
  g.add(box(1.5, 0.04, 0.08, 0, top + ph, zc - 0.1, M('qora'), 'pantograf'));
  return g;
}
function sedan(color = '#7d8a96'): THREE.Group {
  const v = VEHICLES.sedan, g = new THREE.Group(); g.name = v.name;
  const fa = v.L - v.fo!, ra = fa - v.wb!, r = 0.33, y0 = 0.2;
  const s = new THREE.Shape();
  s.moveTo(0.15, y0);
  for (const x of [ra, fa]) { const R = r + 0.05; s.lineTo(x - R, y0); s.absarc(x, y0 + 0.06, R, Math.PI, 0, true); }
  s.lineTo(v.L - 0.15, y0); s.quadraticCurveTo(v.L, y0, v.L, y0 + 0.25); s.lineTo(v.L - 0.08, 0.72); s.quadraticCurveTo(v.L - 0.25, 0.85, v.L - 0.6, 0.86);
  s.lineTo(0.35, 0.92); s.quadraticCurveTo(0, 0.9, 0, 0.6); s.lineTo(0, 0.4); s.quadraticCurveTo(0, y0, 0.15, y0);
  const body = mesh(extrude(s, v.W, 0.1, 6), M('kuzov', color), 'kuzov'); body.position.z = -v.L / 2; g.add(body);
  // salon (oyna) — torroq, qiya old/orqa oynalar
  const c = new THREE.Shape(); const cx0 = 1.0, cx1 = 3.25;
  c.moveTo(cx0 - 0.25, 0.86); c.lineTo(cx1 + 0.45, 0.84); c.quadraticCurveTo(cx1 + 0.05, v.H - 0.02, cx1 - 0.25, v.H); c.lineTo(cx0 + 0.3, v.H); c.quadraticCurveTo(cx0, v.H - 0.02, cx0 - 0.25, 0.86);
  const cab = mesh(extrude(c, v.W - 0.16, 0.06, 6), M('oyna'), 'oyna'); cab.position.z = -v.L / 2; g.add(cab);
  const roof = mesh(extrude(rrect(cx0 + 0.25, v.H - 0.035, cx1 - 0.2, v.H + 0.015, [0, 0, 0.02, 0.02]), v.W - 0.2, 0.03, 2), M('kuzov', color), 'kuzov'); roof.position.z = -v.L / 2; g.add(roof);
  // B ustun
  [-1, 1].forEach(sd => g.add(box(0.03, v.H - 0.92, 0.1, sd * (v.W / 2 - 0.07), (0.9 + v.H) / 2, -v.L / 2 + 2.15, M('kuzov', color), 'kuzov')));
  lamps(g, v.W / 2 - 0.32, 0.62, v.L / 2 + 0.07, 1, 0.38, 0.12); lamps(g, v.W / 2 - 0.3, 0.66, -v.L / 2 - 0.1, -1, 0.34, 0.12);
  g.add(wheels([ra - v.L / 2, fa - v.L / 2], v.W, r));
  return g;
}
function truck(): THREE.Group {
  const v = VEHICLES.yuk, g = new THREE.Group(); g.name = v.name;
  const fa = v.L - v.fo!, ra = fa - v.wb!, cl = 2.3, Hc = 3.0;
  const c = mesh(extrude(rrect(v.L - cl, 0.55, v.L, Hc, [0.08, 0.12, 0.35, 0.08]), v.W, 0.08, 5), M('kuzov', '#d9d6cf'), 'kabina'); c.position.z = -v.L / 2; g.add(c);
  g.add(box(v.W - 0.3, 0.9, 0.04, 0, Hc - 0.7, v.L / 2 + 0.1, M('oyna'), 'oyna'));
  lamps(g, v.W / 2 - 0.34, 0.98, v.L / 2 + 0.1, 1, 0.42, 0.18);
  [-1, 1].forEach(sd => g.add(box(0.03, 0.75, 0.9, sd * (v.W / 2 + 0.01), Hc - 0.62, v.L / 2 - 0.65, M('oyna'), 'oyna')));
  g.add(box(v.W - 0.2, 0.28, 0.08, 0, 0.66, v.L / 2 + 0.1, M('qora'), 'bamper'));
  // rama va kuzov-furgon
  g.add(box(v.W - 0.7, 0.25, v.L - cl - 0.2, 0, 0.75, -v.L / 2 + (v.L - cl) / 2, M('qora'), 'rama'));
  const fl = v.L - cl - 0.35;
  g.add(mesh(extrude(rrect(0.1, 1.0, fl, v.H, [0.03, 0.03, 0.05, 0.05]), v.W, 0.04, 2), M('tunuka', '#e6e3dc'), 'furgon').translateZ(-v.L / 2));
  [-1, 1].forEach(sd => g.add(box(0.02, 0.16, fl - 0.4, sd * (v.W / 2 + 0.006), v.H - 0.35, -v.L / 2 + fl / 2, M('aksent'), 'aksent')));
  lamps(g, v.W / 2 - 0.25, 0.8, -v.L / 2 - 0.06, -1, 0.3, 0.14);
  g.add(wheels([ra - v.L / 2 - 0.65, ra - v.L / 2 + 0.65, fa - v.L / 2].sort((a, b) => b - a), v.W, 0.5, true));
  return g;
}
function fire(): THREE.Group {
  const v = VEHICLES.ot, g = new THREE.Group(), red = '#c23b2e'; g.name = v.name;
  const fa = v.L - v.fo!, ra = fa - v.wb!, cl = 2.6, Hc = 2.9;
  const c = mesh(extrude(rrect(v.L - cl, 0.55, v.L, Hc, [0.08, 0.15, 0.3, 0.08]), v.W, 0.08, 5), M('kuzov', red), 'kabina'); c.position.z = -v.L / 2; g.add(c);
  g.add(box(v.W - 0.3, 0.85, 0.04, 0, Hc - 0.65, v.L / 2 + 0.1, M('oyna'), 'oyna'));
  lamps(g, v.W / 2 - 0.34, 1.0, v.L / 2 + 0.1, 1, 0.42, 0.18);
  [-1, 1].forEach(sd => g.add(box(0.03, 0.7, 1.9, sd * (v.W / 2 + 0.01), Hc - 0.6, v.L / 2 - 1.2, M('oyna'), 'oyna')));
  g.add(box(v.W - 0.2, 0.3, 0.08, 0, 0.68, v.L / 2 + 0.1, M('disk'), 'bamper'));
  g.add(box(1.3, 0.14, 0.3, 0, Hc + 0.07, v.L / 2 - 0.5, M('chiroq', '#3b6fd4', { emissive: new THREE.Color('#3b6fd4'), emissiveIntensity: 0.5 }), 'mayoq'));
  lamps(g, v.W / 2 - 0.25, 0.9, -v.L / 2 - 0.07, -1, 0.3, 0.16);
  // kuzov: shkaflar (yon panellar boʻlingan) + oq chiziq
  const bl = v.L - cl - 0.15;
  g.add(mesh(extrude(rrect(0, 0.55, bl, Hc + 0.1, [0.05, 0.03, 0.05, 0.05]), v.W, 0.05, 2), M('kuzov', red), 'kuzov').translateZ(-v.L / 2));
  for (let i = 0; i < 4; i++) [-1, 1].forEach(sd => g.add(box(0.025, 1.6, bl / 4 - 0.12, sd * (v.W / 2 + 0.008), 1.6, -v.L / 2 + (i + 0.5) * bl / 4, M('tunuka', '#a8342a'), 'shkaf')));
  [-1, 1].forEach(sd => g.add(box(0.02, 0.12, v.L - 0.5, sd * (v.W / 2 + 0.012), 0.95, 0, M('kuzov', '#f2efe8'), 'chiziq')));
  // narvon: ikki relsli, tomda
  const lz = v.L - 0.6, ly = Hc + 0.35;
  [-0.45, 0.45].forEach(x => g.add(box(0.07, 0.1, lz, x, ly, -0.25, M('disk'), 'narvon')));
  for (let k = 0; k < 18; k++) g.add(box(0.9, 0.04, 0.04, 0, ly, -0.25 - lz / 2 + 0.3 + k * (lz - 0.6) / 17, M('disk'), 'narvon'));
  g.add(wheels([fa - v.L / 2, ra - v.L / 2], v.W, 0.5, true));
  return g;
}

/** Transport modeli (Three.js guruhi). glTF eksport va sahnaga qoʻyish uchun bir xil. */
export function buildVehicle(kind: VehicleKind, opt: { color?: string } = {}): THREE.Group {
  const g = kind === 'avtobus12' ? bus12() : kind === 'avtobus18' ? bus18() : kind === 'trolleybus' ? trolley() : kind === 'tramvay' ? tram() : kind === 'sedan' ? sedan(opt.color) : kind === 'yuk' ? truck() : fire();
  g.userData.vehicle = kind;
  return g;
}
/** Uchburchaklar soni (tekshiruv uchun) */
export function triCount(o: THREE.Object3D): number {
  let n = 0;
  o.traverse(x => { const m = x as THREE.Mesh; if (m.isMesh) { const gg = m.geometry; n += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } });
  return Math.round(n);
}
