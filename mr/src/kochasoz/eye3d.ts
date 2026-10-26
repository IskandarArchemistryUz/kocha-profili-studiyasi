/**
 * Koʻchasoz B · koʻz balandligidagi koʻrinishlar (Piyoda, Bola, Velo, Mashina) — 3D (26.10.2026).
 * Aksonometriya sahnasi (axo3d.ts) uzun koʻcha sifatida quriladi; perspektiv kamera kuzatuvchi zonasida, koʻz balandligida, koʻcha boʻylab qaraydi.
 * Uslublar: 'rangli' (kunduz), 'maket' (oq maket), 'kech' (kechki quyosh, tuman, yoniq fonarlar).
 */
import * as THREE from 'three';
import { buildAxo, type AxoSection } from './axo3d';

export type EyeMode = 'piy' | 'bola' | 'velo' | 'mashina';
export type EyeStyle = 'rangli' | 'maket' | 'kech';
export const EYE_H: Record<EyeMode, number> = { piy: 1.6, bola: 1.0, velo: 1.45, mashina: 1.15 };
const ZH: Record<string, number> = { front: .15, piy: .15, mebel: .15, yash: .15, velo: .08, park: 0, qat: 0, bus: 0, tram: .02, med: .15, ariq: 0 };
const LEN = 140;

/** Kuzatuvchi zonasi va x (perspDraw bilan bir xil tanlov) */
export function observer(sec: AxoSection, mode: EyeMode): { i: number; x: number; y: number } {
  const els = sec.els, rl = sec.rl, zx: [number, number][] = []; let acc = 0; els.forEach(e => { zx.push([acc, acc + e[1]]); acc += e[1]; });
  const zc = (i: number) => (zx[i][0] + zx[i][1]) / 2;
  const first = (t: string, p?: (i: number) => boolean) => els.findIndex((e, i) => e[0] === t && (!p || p(i)));
  let ci = mode === 'velo' ? first('velo') : mode === 'mashina' ? first('qat', i => zc(i) > rl / 2) : first('piy');
  if (ci < 0 && mode === 'mashina') ci = first('qat'); if (ci < 0) ci = first('piy'); if (ci < 0) ci = 0;
  let x = zc(ci) + (mode === 'bola' ? 0.4 : 0); if (mode === 'mashina' && zc(ci) > rl / 2) x = zc(ci) - 0.35;
  return { i: ci, x, y: (ZH[els[ci][0]] ?? 0) + EYE_H[mode] };
}

function sky(top: string, mid: string, bot: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function renderEye(r: THREE.WebGLRenderer, sec: AxoSection, mode: EyeMode, style: EyeStyle, W: number, H: number, pr: number): { cam: THREE.PerspectiveCamera; scene: THREE.Scene } {
  const ob = observer(sec, mode), zCam = LEN - 4;
  const { scene } = buildAxo(sec, style === 'maket' ? 'maket' : 'rangli', true, { len: LEN, eye: true, clear: { x: ob.x, z: zCam - 6, r: 14 }, seed: 11 });
  const kech = style === 'kech', maket = style === 'maket';
  scene.background = kech ? sky('#8fa3bd', '#e9c9a4', '#f3dcc0') : maket ? sky('#e9e7e2', '#efede9', '#f3f2ef') : sky('#a9c3dc', '#dfe8ee', '#eef1f2');
  scene.fog = new THREE.Fog(kech ? '#ecd2b4' : maket ? '#efede9' : '#e3eaee', 45, LEN * 1.05);
  // yer (koʻchaning davomi) — gorizont boʻsh qolmasin
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: maket ? '#e7e4de' : '#d9d5cc', roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.set(sec.rl / 2, -0.03, LEN / 2); gr.receiveShadow = true; scene.add(gr);
  scene.add(new THREE.HemisphereLight(kech ? '#ffe9d2' : '#ffffff', kech ? '#a08c78' : '#c9c2b4', kech ? 1.45 : maket ? 1.5 : 1.6));
  const sun = new THREE.DirectionalLight(kech ? '#ffc58a' : '#fff7ea', kech ? 3.4 : maket ? 2.6 : 2.2);
  sun.position.set(sec.rl / 2 + (kech ? -60 : -25), kech ? 14 : 45, LEN / 2 + (kech ? -30 : 10)); sun.target.position.set(sec.rl / 2, 0, LEN / 2); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 260 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  if (kech) scene.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && m.emissive && m.emissiveIntensity > 0 && m.emissiveIntensity < 1) { m.emissiveIntensity = 1.6; } });
  // konturlar perspektivda uzoqda chalkashadi — faqat yaqinda (tumanda yoʻqoladi)
  scene.traverse(o => { if ((o as THREE.LineSegments).isLineSegments) { const m = (o as THREE.LineSegments).material as THREE.LineBasicMaterial; m.fog = true; m.opacity = maket ? 0.35 : 0.45; } });
  r.toneMappingExposure = kech ? 1.12 : maket ? 1.12 : 1.05;
  const cam = new THREE.PerspectiveCamera(2 * Math.atan(Math.tan(37 * Math.PI / 180) / (W / H)) * 180 / Math.PI, W / H, 0.1, 800);
  cam.position.set(ob.x, ob.y, zCam); cam.lookAt(ob.x + (mode === 'mashina' ? 0 : (sec.rl / 2 - ob.x) * 0.08), ob.y - (mode === 'bola' ? -0.4 : 0.25), 0);
  r.setPixelRatio(pr); r.setSize(W, H, false); r.render(scene, cam);
  return { cam, scene };
}
