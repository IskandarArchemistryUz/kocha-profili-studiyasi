/**
 * Transport modellari (app/transport.html) — Archemistry oʻzi yasagan past poligonli modellar koʻrigi (26.10.2026).
 * Model tanlash, aylantirib koʻrish, oʻlcham va uchburchaklar soni, GLB yuklab olish. Modellar: src/scene/vehicles.ts.
 */
import '../ui/ds2.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { h, svgIcon, toast } from '../ui/dom';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { tr, tf, getLang, setLang, onLang, LANGS, type Lang } from '../i18n';
import { VEHICLES, buildVehicle, triCount, type VehicleKind } from '../scene/vehicles';

const KINDS = Object.keys(VEHICLES) as VehicleKind[];
const css = `
.tr-body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans)}
.tr{display:grid;grid-template-columns:260px 1fr;grid-template-rows:60px 1fr;height:100vh}
.tr-top{grid-column:1/3;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:.5px solid var(--hairline);background:var(--surface)}
.tr-top b{font-size:15px}.tr-top .sp{flex:1}
.tr-list{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:6px;background:var(--surface);border-right:.5px solid var(--hairline)}
.tr-list .li{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px 12px;border-radius:12px;border:0;background:transparent;color:var(--ink);cursor:pointer;font:inherit}
.tr-list .li:hover{background:var(--fill)}.tr-list .li[aria-pressed=true]{background:var(--ink);color:var(--surface)}
.tr-list .li small{opacity:.7;font-size:12px}
.tr-view-wrap{position:relative;min-width:0;min-height:0;overflow:hidden}.tr-view{position:absolute;inset:0}.tr-view canvas{display:block;width:100%;height:100%}
.tr-info{position:absolute;right:16px;bottom:16px;width:300px;padding:14px;border-radius:16px}
.tr-info .row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:13px;padding:3px 0}.tr-info .row span{color:var(--muted)}.tr-info .row b{font-family:var(--mono);font-weight:500;white-space:nowrap}
.tr-info .btn{width:100%;margin-top:10px}
.tr-note{position:absolute;left:16px;bottom:16px;max-width:min(420px,calc(100% - 360px));font-size:12px;color:var(--muted)}
.tr-top svg,.tr-info svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media (max-width:899px){.tr{grid-template-columns:1fr;grid-template-rows:60px auto 1fr}.tr-list{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:.5px solid var(--hairline)}.tr-list .li{flex:none}.tr-info{left:16px;right:16px;width:auto}.tr-note{display:none}}
`;
document.head.append(h('style', {}, css));
const root = document.getElementById('tr')!;
let cur: VehicleKind = (KINDS.includes(location.hash.slice(2) as VehicleKind) ? location.hash.slice(2) : 'avtobus12') as VehicleKind;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 500);
const hemi = new THREE.HemisphereLight('#ffffff', '#b9b2a4', 1.6), sun = new THREE.DirectionalLight('#ffffff', 2.4);
sun.position.set(-18, 26, 14); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
scene.add(hemi, sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.49;
let model: THREE.Group | null = null;

function show(kind: VehicleKind): void {
  cur = kind; history.replaceState(null, '', `#/${kind}`);
  if (model) scene.remove(model);
  model = buildVehicle(kind); scene.add(model);
  const v = VEHICLES[kind], d = Math.max(v.L, 6) * 1.3 / Math.min(1, Math.max(0.6, cam.aspect / 1.6));
  cam.position.set(-d * 0.95, d * 0.42, d * 0.75); ctl.target.set(0, v.H * 0.42, 0); ctl.update();
  draw();
}
function theme(): void { const dk = isDark(); scene.background = new THREE.Color(dk ? '#1b1b1a' : '#f2f1ee'); (ground.material as THREE.MeshStandardMaterial).color.set(dk ? '#2a2a28' : '#dedbd3'); }
async function glb(): Promise<void> {
  if (!model) return;
  const ex = new GLTFExporter(), buf = await ex.parseAsync(model, { binary: true }) as ArrayBuffer;
  const a = h('a', { href: URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' })), download: `archemistry_${cur}.glb` }); a.click();
  setTimeout(() => URL.revokeObjectURL((a as HTMLAnchorElement).href), 2000);
  toast(tf('${f} yuklab olindi', { f: `archemistry_${cur}.glb` }));
}
const view = h('div', { class: 'tr-view' }, renderer.domElement);
function draw(): void {
  const v = VEHICLES[cur], tri = model ? triCount(model) : 0;
  root.replaceChildren(h('div', { class: 'tr' },
    h('header', { class: 'tr-top' },
      h('a', { class: 'btn btn-ghost btn-sm', href: './kochasoz.html' }, svgIcon('<path d="M15 6l-6 6 6 6"/>'), tr('Koʻchasoz')),
      h('b', {}, tr('Transport modellari')), h('span', { class: 'sp' }),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Til') }, ...LANGS.map(l => h('button', { type: 'button', 'aria-pressed': l.id === getLang(), onclick: () => setLang(l.id as Lang) }, l.name))),
      h('button', { class: 'btn btn-ghost icon-btn', 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() }, svgIcon(isDark() ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' : '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'))),
    h('nav', { class: 'tr-list', 'aria-label': tr('Modellar') }, ...KINDS.map(k => h('button', { class: 'li', 'data-kind': k, 'aria-pressed': k === cur, onclick: () => show(k) }, h('span', {}, tr(VEHICLES[k].name)), h('small', {}, `${String(VEHICLES[k].L).replace('.', ',')} × ${String(VEHICLES[k].W).replace('.', ',')} m`)))),
    h('main', { class: 'tr-view-wrap' }, view,
      h('div', { class: 'tr-info group glassbar', id: 'trInfo' },
        h('b', {}, tr(v.name)),
        h('div', { class: 'row' }, h('span', {}, tr('Uzunlik × eni × balandlik')), h('b', {}, `${[v.L, v.W, v.H].map(x => String(x).replace('.', ',')).join(' × ')} m`)),
        v.wb ? h('div', { class: 'row' }, h('span', {}, tr('Baza / old osilish')), h('b', {}, `${String(v.wb).replace('.', ',')} / ${String(v.fo).replace('.', ',')} m`)) : '',
        h('div', { class: 'row' }, h('span', {}, tr('Uchburchaklar')), h('b', { id: 'trTri' }, tri.toLocaleString('ru-RU'))),
        h('button', { class: 'btn btn-primary', id: 'trGlb', onclick: () => void glb() }, svgIcon('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'), tr('GLB yuklab olish'))),
      h('div', { class: 'tr-note' }, tr('Archemistry oʻzi yasagan modellar: brendsiz, haqiqiy oʻlchamda (metr), +Y — tepaga, old — +Z. Oʻlchamlar Koʻchasoz chorrahasidagi burilish izi avtomobillari bilan bir xil.')))));
  resize();
}
function resize(): void { const r = view.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); new ResizeObserver(resize).observe(view);
onTheme(() => { theme(); draw(); }); onLang(() => draw());
theme(); show(cur);
renderer.setAnimationLoop(() => { ctl.update(); renderer.render(scene, cam); });
(window as unknown as { __tr: unknown }).__tr = { show, triCount: () => (model ? triCount(model) : 0), KINDS, cam, ctl };
