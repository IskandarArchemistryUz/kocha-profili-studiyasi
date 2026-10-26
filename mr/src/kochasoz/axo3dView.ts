/**
 * Koʻchasoz B · «Aksonometriya» koʻrinishi — 3D (26.10.2026). Kesim kartasining ustiga kanvas qoʻyiladi:
 * ortografik kamera (toʻliq bino chapda, yaqin bino 1 qavatda kesilgan), oʻzimizning transport modellari, soyalar,
 * zona nomlari va enlari (HTML yorliqlar), yer osti tarmoqlari harf bilan. Uslub: gfx 0 — rangli, 1 — oq maket; q — yer osti ajratilgan.
 */
import * as THREE from 'three';
import { buildAxo, AXO_LG, AXO_GAP, type AxoSection, type AxoStyle } from './axo3d';
import { tr, getLang } from '../i18n';

export interface AxoInput extends AxoSection { gfx: number; q: boolean; names: string[]; onQ?: () => void }

let ui: { wrap: HTMLDivElement; cv: HTMLCanvasElement; labels: HTMLDivElement; cap: HTMLDivElement; qb: HTMLButtonElement; r: THREE.WebGLRenderer; ro: ResizeObserver } | null = null;
let last: AxoInput | null = null, key = '';
const AZ = -30 * Math.PI / 180, EL = 36 * Math.PI / 180;
const css = `
.ks-axo3d{position:absolute;inset:0;z-index:1;border-radius:inherit;overflow:hidden;background:#f6f5f1}
.ks-axo3d canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ks-axo3d .lb{position:absolute;inset:0;pointer-events:none;font-family:var(--sans,Archivo,sans-serif)}
.ks-axo3d .zl{position:absolute;transform:translate(-50%,0);display:flex;flex-direction:column;align-items:center;gap:1px;font-size:10px;line-height:1.15;color:#2f2e2b;white-space:nowrap}
.ks-axo3d .zl b{font-weight:600}.ks-axo3d .zl span{font-family:var(--mono,'IBM Plex Mono',monospace);font-size:9.5px;color:#6e6a63}
.ks-axo3d .zl i{width:1px;height:10px;background:#8f8a80;margin-bottom:2px}
.ks-axo3d .ul{position:absolute;transform:translate(-50%,-50%);font:700 8.5px var(--mono,'IBM Plex Mono',monospace);color:#fff;padding:1px 3px;border-radius:3px}
.ks-axo3d .qb{position:absolute;right:14px;bottom:12px;display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:999px;border:.5px solid #d6d2ca;background:#fff;color:#2f2e2b;font:500 12px var(--sans,Archivo,sans-serif);cursor:pointer}
.ks-axo3d .qb::before{content:'';width:28px;height:16px;border-radius:999px;background:radial-gradient(circle at 8px 50%,#fff 5.5px,transparent 6px) #cfcac1;transition:background .16s}
.ks-axo3d .qb[aria-pressed=true]::before{background:radial-gradient(circle at 20px 50%,#fff 5.5px,transparent 6px) #4c5bd4}
.ks-axo3d .qb:focus-visible{outline:2px solid #4c5bd4;outline-offset:2px}
.ks-axo3d .cap{position:absolute;left:16px;bottom:12px;font-size:11px;color:#6e6a63;line-height:1.35}.ks-axo3d .cap b{display:block;font-size:13px;color:#141414}
`;

function ensure(card: HTMLElement): NonNullable<typeof ui> {
  if (ui && card.contains(ui.wrap)) return ui;
  dispose();
  if (!document.getElementById('ks-axo3d-css')) { const s = document.createElement('style'); s.id = 'ks-axo3d-css'; s.textContent = css; document.head.append(s); }
  const wrap = document.createElement('div'); wrap.className = 'ks-axo3d'; wrap.dataset.axo3d = '1';
  const cv = document.createElement('canvas'), labels = document.createElement('div'), cap = document.createElement('div');
  labels.className = 'lb'; cap.className = 'cap';
  const qb = document.createElement('button'); qb.type = 'button'; qb.className = 'qb'; qb.dataset.axoq = '1'; qb.addEventListener('click', () => last?.onQ?.());
  wrap.append(cv, labels, cap, qb);
  card.append(wrap);
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const ro = new ResizeObserver(() => { if (last) draw(last, true); }); ro.observe(wrap);
  ui = { wrap, cv, labels, cap, qb, r, ro };
  return ui;
}

export function dispose(): void {
  if (!ui) return;
  ui.ro.disconnect(); ui.r.dispose(); ui.wrap.remove(); ui = null; key = '';
}

/** Sahnani qurib, berilgan oʻlchamda chizadi. Qaytaradi: kamera va proyeksiya funksiyasi (yorliqlar uchun). */
function render(r: THREE.WebGLRenderer, inp: AxoInput, W: number, H: number, pr: number): { cam: THREE.OrthographicCamera; scene: THREE.Scene } {
  const style: AxoStyle = inp.q ? 'qatlam' : inp.gfx === 1 ? 'maket' : 'rangli';
  const { scene, target, span } = buildAxo(inp, style, false);
  scene.background = new THREE.Color(style === 'maket' ? '#eceae5' : '#f6f5f1');
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9c2b4', style === 'maket' ? 1.5 : 1.7));
  const sun = new THREE.DirectionalLight('#fff7ea', style === 'maket' ? 2.8 : 2.0); sun.position.set(target.x - 30, 45, target.z - 25); sun.target.position.copy(target); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  r.toneMappingExposure = style === 'maket' ? 1.15 : 1.05;
  // kadrga sigʻdirish: sahna qutisining 8 burchagi kamera tekisligida
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600), D = 160;
  cam.position.set(target.x + Math.sin(AZ) * Math.cos(EL) * D, target.y + Math.sin(EL) * D, target.z - Math.cos(AZ) * Math.cos(EL) * D); cam.lookAt(target); cam.updateMatrixWorld();
  const bb = new THREE.Box3().setFromObject(scene.children[0]), inv = cam.matrixWorldInverse, v = new THREE.Vector3();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  const padT = 56 / H, padB = 70 / H, padX = 24 / W, a = W / H;
  let hw = (x1 - x0) / 2 / (1 - 2 * padX), hh = (y1 - y0) / 2 / (1 - padT - padB);
  if (hw / hh > a) hh = hw / a; else hw = hh * a;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + (padB - padT) * hh;
  Object.assign(cam, { left: cx - hw, right: cx + hw, top: cy + hh, bottom: cy - hh }); cam.updateProjectionMatrix();
  r.setPixelRatio(pr); r.setSize(W, H, false); r.render(scene, cam);
  void span;
  return { cam, scene };
}

function draw(inp: AxoInput, force = false): void {
  if (!ui) return;
  const rc = ui.wrap.getBoundingClientRect(); if (rc.width < 50 || rc.height < 50) return;
  const k = JSON.stringify([inp, Math.round(rc.width), Math.round(rc.height), getLang()]);
  if (!force && k === key) return; key = k;
  const { cam, scene } = render(ui.r, inp, rc.width, rc.height, Math.min(2, devicePixelRatio));
  // yorliqlar: zona nomi va eni — old qirrada; tarmoqlar — kesim yuzida
  const P = (x: number, y: number, z: number) => { const p = new THREE.Vector3(x, y, z).project(cam); return [(p.x + 1) / 2 * rc.width, (1 - p.y) / 2 * rc.height]; };
  const fm = (n: number) => { const t = String(Math.round(n * 100) / 100); return getLang() === 'uz' ? t.replace('.', ',') : t; };
  const L: string[] = []; let acc = 0, prevX = -1e9, nL = 0;
  inp.els.forEach((e, i) => {
    const xm = acc + e[1] / 2; acc += e[1];
    const [sx, sy] = P(xm, inp.q ? -AXO_GAP - 4.2 : -4.2, 0);
    if (Math.abs(sx - prevX) < 16) return; prevX = sx; const st = (nL++ % 3) * 22;
    L.push(`<div class="zl" style="left:${sx.toFixed(1)}px;top:${(sy + 4).toFixed(1)}px"><i style="height:${10 + st}px"></i><b>${esc(inp.names[i] ?? '')}</b><span>${fm(e[1])}</span></div>`);
  });
  (inp.U ?? []).forEach(u => { const [sx, sy] = P(u.x, (inp.q ? -AXO_GAP : 0) - u.d, -0.05); L.push(`<div class="ul" style="left:${sx.toFixed(1)}px;top:${(sy - 12).toFixed(1)}px;background:${u.c ?? '#555'}">${esc(u.lbl ?? u.k)}</div>`); });
  ui.labels.innerHTML = L.join('');
  ui.cap.innerHTML = `<b>${esc(tr('Aksonometriya'))} · ${fm(AXO_LG)} ${esc(tr('m uchastka'))}</b>${esc(inp.q ? tr('Yer osti qatlami ajratib koʻrsatilgan') : tr('Yer osti tarmoqlari old kesimda'))}`;
  ui.qb.textContent = tr('Yer osti qatlamini ajratish'); ui.qb.setAttribute('aria-pressed', String(inp.q));
  disposeScene(scene);
}
function disposeScene(s: THREE.Scene): void { s.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); }
function esc(s: string): string { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }

/** B doskasi chaqiradi: view 2 da — kartaga oʻrnatib chizadi, boshqa koʻrinishda — olib tashlaydi */
export function axoSync(inp: AxoInput | null): void {
  last = inp;
  const card = document.querySelector<HTMLElement>('.ws-b main > .card');
  if (!inp || !card) { dispose(); return; }
  ensure(card); draw(inp);
}

/** Eksport: joriy aksonometriyani belgilangan oʻlchamda PNG (dataURL) — yorliqlar bilan */
export async function axoPng(scale = 2): Promise<{ url: string; w: number; h: number } | null> {
  if (!ui || !last) return null;
  const rc = ui.wrap.getBoundingClientRect(), W = Math.round(rc.width), H = Math.round(rc.height);
  const off = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); off.shadowMap.enabled = true; off.shadowMap.type = THREE.PCFSoftShadowMap; off.outputColorSpace = THREE.SRGBColorSpace; off.toneMapping = THREE.ACESFilmicToneMapping;
  const { scene } = render(off, last, W, H, scale);
  const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
  const g = c.getContext('2d')!; g.drawImage(off.domElement, 0, 0);
  disposeScene(scene); off.dispose();
  // HTML yorliqlarni kanvasga chizish
  g.scale(scale, scale); g.textAlign = 'center';
  ui.labels.querySelectorAll<HTMLElement>('.zl').forEach(el => { const x = parseFloat(el.style.left), y = parseFloat(el.style.top); const lh = parseFloat(el.querySelector('i')!.style.height) || 10; g.fillStyle = '#8f8a80'; g.fillRect(x - 0.5, y, 1, lh); g.fillStyle = '#2f2e2b'; g.font = '600 10px Archivo, sans-serif'; g.fillText(el.querySelector('b')!.textContent ?? '', x, y + lh + 12); g.fillStyle = '#6e6a63'; g.font = '9.5px "IBM Plex Mono", monospace'; g.fillText(el.querySelector('span')!.textContent ?? '', x, y + lh + 23); });
  ui.labels.querySelectorAll<HTMLElement>('.ul').forEach(el => { const x = parseFloat(el.style.left), y = parseFloat(el.style.top), t = el.textContent ?? ''; g.font = '700 8.5px "IBM Plex Mono", monospace'; const w = g.measureText(t).width + 6; g.fillStyle = el.style.background; g.fillRect(x - w / 2, y - 6.5, w, 13); g.fillStyle = '#fff'; g.fillText(t, x, y + 3); });
  g.textAlign = 'left'; const cb = ui.cap.querySelector('b')?.textContent ?? '', cs = ui.cap.childNodes[1]?.textContent ?? '';
  g.fillStyle = '#141414'; g.font = '700 13px Archivo, sans-serif'; g.fillText(cb, 16, H - 28); g.fillStyle = '#6e6a63'; g.font = '11px Archivo, sans-serif'; g.fillText(cs, 16, H - 13);
  return { url: c.toDataURL('image/png'), w: W * scale, h: H * scale };
}
