/**
 * Yagona 3D sahna (three.js). 2D reja — shu sahnaning yuqoridan turgan ortografik kamerasi,
 * alohida xarita kutubxonasi yoʻq. Koordinatalar: X — sharq, Z — janub (−shimol), Y — yuqoriga, metrda.
 * Sahna faqat oʻzgarishda chiziladi (render on demand) — boʻsh turganda protsessorni yuklamaydi.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LngLat, Project, Shade } from '../core/doc';
import { frame, centroid, area, signedArea, type XY } from '../core/geo';
import type { ContextBundle } from '../context/load';
import { terrainSampler } from '../context/tiles';
import { buildContext, buildingMeshes, type ContextScene, type HeightFn } from './context3d';
import { projectStreetsGeo } from './streets3d';
import { computePlan } from '../core/plan';
import { profileById } from '../core/profiles';
import { MATS, roofParts } from '../core/roof';
import { winDef, type Bal } from '../core/facade';
import { MOD_W } from '../core/apartments';
import { seams, seamEdges } from '../core/seams';
import { landscape } from '../core/landscape';
import { tierParts, type TierPart } from '../core/tiers';
import { USES } from '../core/uses';

export const ZONE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.color]));
const tint = (c: number, k: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (x: number) => Math.round(x + (255 - x) * k); return (f(r) << 16) | (f(g) << 8) | f(b); };
const USE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.id === 'turar' ? 0xf4ece6 : tint(u.color, 0.72)]));
const BASE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.base]));
/** «Albom» uslubida loyiha koʻchalari: och, lekin atrofdan biroz toʻqroq (loyiha ajralib tursin) */
const PART_ALB: Record<string, number> = { avtobus: 0xd8b7ae, tramvay: 0xcfcbc2, trotuar: 0xf2f0eb, yashil: 0xd3e3c4, velo: 0xe7c2b4, parkovka: 0xd9d7d2, qatnov: 0xc8c6c1, chiziq: 0xffffff };
const PART_COL: Record<string, number> = { avtobus: 0xa5473c, tramvay: 0x6b6c72, trotuar: 0xd8d2c6, yashil: 0x9cc77f, velo: 0xc9705a, parkovka: 0x8d9097, qatnov: 0x585b62, chiziq: 0xf4f4f0 };

/** Fasad uslublari: deraza modulda (eni ulushi, tokcha va tepa balandligi, m) */
export type FacadeStyle = 'yoq' | 'klassik' | 'lenta' | 'panorama';
export const FACADE: Record<Exclude<FacadeStyle, 'yoq'>, { name: string; w: number; sill: number; head: number }> = {
  klassik: { name: 'Klassik (alohida derazalar)', w: 0.5, sill: 0.9, head: 2.4 },
  lenta: { name: 'Lenta (gorizontal)', w: 0.86, sill: 0.9, head: 2.3 },
  panorama: { name: 'Panorama (poldan shiftgacha)', w: 0.9, sill: 0.1, head: 2.85 },
};
const texCache = new Map<string, THREE.CanvasTexture>();
type WinSpec = { id: string; w: number; sill: number; head: number; arch?: boolean };
/** Bitta modul (eni modW, balandligi fh) uchun takrorlanadigan deraza teksturasi */
function facadeTex(kind: 'res' | 'shop' | 'glass', spec: WinSpec, fh: number, modW: number, aniso: number): THREE.CanvasTexture {
  const key = `${kind}|${spec.id}|${fh}|${modW}`; const hit = texCache.get(key); if (hit) return hit;
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  const f = kind === 'shop' ? { w: 0.86, sill: 0.15, head: Math.min(fh - 0.5, 3.2), arch: false } : kind === 'glass' ? { w: 0.94, sill: 0.05, head: fh - 0.25, arch: false } : spec;
  const x0 = (1 - f.w) / 2 * S, x1 = (1 + f.w) / 2 * S, y0 = (1 - Math.min(f.head, fh - 0.1) / fh) * S, y1 = (1 - f.sill / fh) * S, ww = x1 - x0;
  const shape = () => { g.beginPath(); if (f.arch) { const r = ww / 2; g.moveTo(x0, y1); g.lineTo(x0, y0 + r); g.arc(x0 + r, y0 + r, r, Math.PI, 0); g.lineTo(x1, y1); g.closePath(); } else g.rect(x0, y0, ww, y1 - y0); };
  g.fillStyle = kind === 'shop' ? '#5d7180' : '#7d93a3'; shape(); g.fill();
  g.save(); shape(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0, y0, ww * 0.35, y1 - y0); g.restore();
  g.strokeStyle = '#4b5a64'; g.lineWidth = 2; shape(); g.stroke();
  // rom (impost) — keng derazalarda
  if (kind === 'res' && ww > S * 0.35) { g.lineWidth = 1.5; g.beginPath(); g.moveTo((x0 + x1) / 2, y0 + (f.arch ? ww / 2 : 0)); g.lineTo((x0 + x1) / 2, y1); g.stroke(); }
  if (kind === 'res' && f.sill > 0.3) { g.fillStyle = '#c9c4ba'; g.fillRect(x0 - 2, y1, ww + 4, 3); }
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, S - 2, S, 2); // qavatlararo chiziq
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  t.repeat.set(1 / modW, -1 / fh); t.offset.set(0, 1 / fh);
  texCache.set(key, t); return t;
}

export const INSOL_BINS: [number, number, string][] = [[0, 0x2b3a67, '< 1 soat'], [1, 0x4a6fa5, '1–2'], [2, 0x7fb3c8, '2–3'], [3, 0xc9e4a5, '3–4'], [4, 0xf6e58d, '4–6'], [6, 0xf9b24e, '≥ 6']];
export function insolColor(h: number): number { let c = INSOL_BINS[0][1]; for (const [t, col] of INSOL_BINS) if (h >= t) c = col; return c; }

function treeMeshes(pts: XY[], H: HeightFn, color = 0x6f9f4c): THREE.Object3D[] {
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color }), pts.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.25, 1, 5), new THREE.MeshLambertMaterial({ color: 0x7a6650 }), pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => {
    const y = H(p[0], p[1]), s = 2.4 + ((i * 37) % 10) / 10, h = 3.5 + ((i * 53) % 10) / 5;
    m4.compose(new THREE.Vector3(p[0], y + h + s * 0.6, -p[1]), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); crown.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(p[0], y + h / 2 + 0.3, -p[1]), new THREE.Quaternion(), new THREE.Vector3(1, h + 0.6, 1)); trunk.setMatrixAt(i, m4);
  });
  crown.castShadow = true; crown.renderOrder = 12; trunk.renderOrder = 12;
  return [crown, trunk];
}

export type ViewMode = 'plan' | 'axo' | 'persp';
export type SceneStyle = 'albom' | 'rangli' | 'arctic' | 'funksiya' | 'minimal';
export const STYLES: { id: SceneStyle; name: string; note: string }[] = [
  { id: 'albom', name: 'Albom', note: 'oq binolar, och yoʻllar va daraxtlar, soyalar' },
  { id: 'rangli', name: 'Rangli', note: 'OSM ranglari, sunʼiy yoʻldosh tasviri' },
  { id: 'arctic', name: 'Arctic', note: 'oq gil model, yumshoq soyalar' },
  { id: 'funksiya', name: 'Funksiya', note: 'har funksiya oʻz rangida' },
  { id: 'minimal', name: 'Minimal', note: 'oq-qora grafika' },
];
/** kadr nisbatlari (eni/boʻyi) */
export const FRAMES: { id: string; name: string; r: number }[] = [
  { id: 'erkin', name: 'Erkin', r: 0 }, { id: '16:9', name: '16:9', r: 16 / 9 }, { id: '3:2', name: '3:2', r: 1.5 }, { id: '4:3', name: '4:3', r: 4 / 3 },
  { id: '1:1', name: '1:1', r: 1 }, { id: '4:5', name: '4:5', r: 0.8 }, { id: '9:16', name: '9:16', r: 9 / 16 }, { id: 'A', name: 'A · √2', r: Math.SQRT2 },
];
export const LENSES = [18, 24, 28, 35, 50, 85];
const lensFov = (mm: number) => 2 * Math.atan(24 / (2 * mm)) * 180 / Math.PI;
/** uslubga qarab atrof ranglari (null — «Rangli»: asl ranglar) */
const STYLE_PAL: Record<Exclude<SceneStyle, 'rangli'>, { pal: Record<string, number>; lerp: number; line: number | null; bg: number }> = {
  albom: { pal: { relyef: 0xf1efea, yashil: 0xe1e9d6, suv: 0xcfdfe8, ariqlar: 0xcfdfe8, 'yoʻlaklar': 0xf8f7f4, trotuarlar: 0xf8f7f4, 'yoʻllar': 0xdfddd8, chiziqlar: 0xffffff, binolar: 0xfcfbf9, tomlar: 0xefece7, daraxtlar: 0xcbd9bf }, lerp: 0.65, line: null, bg: 0xf6f5f2 },
  funksiya: { pal: { relyef: 0xf1efea, yashil: 0xe1e9d6, suv: 0xcfdfe8, ariqlar: 0xcfdfe8, 'yoʻlaklar': 0xf8f7f4, trotuarlar: 0xf8f7f4, 'yoʻllar': 0xdfddd8, chiziqlar: 0xffffff, binolar: 0xf4f2ee, tomlar: 0xe9e6e0, daraxtlar: 0xcbd9bf }, lerp: 0.65, line: null, bg: 0xf6f5f2 },
  arctic: { pal: { relyef: 0xf7f6f3, yashil: 0xeef0ea, suv: 0xe4ebef, ariqlar: 0xe4ebef, 'yoʻlaklar': 0xfbfaf8, trotuarlar: 0xfbfaf8, 'yoʻllar': 0xecebe7, chiziqlar: 0xffffff, binolar: 0xffffff, tomlar: 0xf6f5f2, daraxtlar: 0xeef1ea }, lerp: 0.88, line: null, bg: 0xfafaf8 },
  minimal: { pal: { relyef: 0xffffff, yashil: 0xf1f1f1, suv: 0xe6e6e6, ariqlar: 0xe6e6e6, 'yoʻlaklar': 0xfafafa, trotuarlar: 0xfafafa, 'yoʻllar': 0xdedede, chiziqlar: 0xffffff, binolar: 0xf7f7f7, tomlar: 0xededed, daraxtlar: 0xd8d8d8 }, lerp: 0.9, line: 0x6a6a6a, bg: 0xffffff },
};
const PART_ARC: Record<string, number> = { avtobus: 0xf0e4df, tramvay: 0xebe9e4, trotuar: 0xf8f7f4, yashil: 0xeaeee4, velo: 0xf1e6e1, parkovka: 0xeeedea, qatnov: 0xe6e5e1, chiziq: 0xffffff };
const PART_MIN: Record<string, number> = { avtobus: 0xc4c4c4, tramvay: 0xc9c9c9, trotuar: 0xfafafa, yashil: 0xececec, velo: 0xe4e4e4, parkovka: 0xe2e2e2, qatnov: 0xcfcfcf, chiziq: 0xffffff };
/** «portlatilgan» qatlamlar: 0 — atrof, 1 — koʻchalar, 2 — kvartallar, 3 — binolar */
export const EXPLODE_NAMES = ['Atrof', 'Koʻchalar', 'Kvartallar va zonalar', 'Binolar'];

const C = { ground: 0xeceae5, grid: 0xd9d6cf, gridMajor: 0xc6c2b9, site: 0xf3e3b4, siteLine: 0xc0392b, bld: 0xf7f6f2, bldSel: 0xcfe0f1, roof: 0xdedad2, edge: 0x3c3c3c, preview: 0x2a6fb0 };

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private persp: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private cam: THREE.Camera;
  private ctl: OrbitControls;
  private world = new THREE.Group();
  private prev = new THREE.Group();
  private ground: THREE.Mesh;
  private ray = new THREE.Raycaster();
  private dirty = true;
  private raf = 0;
  private mode: ViewMode = 'axo';
  private selected: string | null = null;
  private selBlock: number | null = null;
  private selStreet: string | null = null;
  private lastDoc: Project | null = null;
  private grid: THREE.Object3D[] = [];
  private ctx: ContextScene | null = null;
  private ctxKey = '';
  private tex: { blob: Blob; t: THREE.Texture } | null = null;
  private sun!: THREE.DirectionalLight;
  /** fasad uslubi (koʻrinish tanlovi, hujjatda emas) */
  facade: FacadeStyle = 'klassik';
  /** relyef balandligi (markazga nisbatan, m) — loyiha elementlari shu sathga qoʻyiladi */
  H: HeightFn = () => 0;
  onPick?: (id: string | null) => void;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xf4f3f1);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xb9b2a4, 1.6); this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-300, 500, 250); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 1, far: 2000 }); sun.shadow.bias = -0.0005;
    this.scene.add(sun); this.sun = sun;

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshLambertMaterial({ color: C.ground }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.ground.name = 'yer';
    this.scene.add(this.ground);
    const g1 = new THREE.GridHelper(2000, 200, C.grid, C.grid); g1.position.y = 0.01; (g1.material as THREE.Material).transparent = true; (g1.material as THREE.Material).opacity = 0.55;
    const g2 = new THREE.GridHelper(2000, 20, C.gridMajor, C.gridMajor); g2.position.y = 0.02;
    this.scene.add(g1, g2, this.world, this.prev); this.grid = [g1, g2];

    this.persp = new THREE.PerspectiveCamera(35, 1, 0.5, 20000);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
    this.cam = this.persp;
    this.ctl = new OrbitControls(this.persp, this.renderer.domElement);
    this.ctl.addEventListener('change', () => this.invalidate());
    this.setView('axo', true);

    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.dirty) { this.dirty = false; const c = this.rcam(); this.fitSprites(c); this.renderer.render(this.scene, c); } };
    loop();
  }

  invalidate(): void { this.dirty = true; }

  dispose(): void { cancelAnimationFrame(this.raf); this.ctl.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); }

  private resize(): void {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    const s = (this.ortho.userData.s as number) || 200;
    Object.assign(this.ortho, { left: -s * w / h, right: s * w / h, top: s, bottom: -s }); this.ortho.updateProjectionMatrix();
    this.invalidate();
  }

  get view(): ViewMode { return this.mode; }

  setView(m: ViewMode, first = false): void {
    const target = first ? new THREE.Vector3() : this.ctl.target.clone();
    /* Koʻrinadigan maydonning yarim balandligi (metr) — kamera turiga bogʻliq emas.
       Ortho kamera doim 3000 m uzoqda turadi, shuning uchun masofa emas, s/zoom olinadi. */
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2));
    const half = first ? 190
      : this.cam === this.ortho ? ((this.ortho.userData.s as number) || 200) / (this.ortho.zoom || 1)
      : this.cam.position.distanceTo(target) * tanH;
    const h = Math.max(25, half);
    this.mode = m;
    this.ctl.dispose();
    if (m === 'persp') {
      this.cam = this.persp;
      this.persp.position.copy(target).add(new THREE.Vector3(-0.55, 0.62, 0.75).normalize().multiplyScalar(h / tanH));
    } else {
      this.cam = this.ortho;
      this.ortho.userData.s = h; this.ortho.zoom = 1;
      const dir = m === 'plan' ? new THREE.Vector3(0, 1, 0.0001) : new THREE.Vector3(-1, 1.15, 1).normalize();
      this.ortho.position.copy(target).add(dir.multiplyScalar(3000));
    }
    this.ctl = new OrbitControls(this.cam, this.renderer.domElement);
    this.ctl.target.copy(target); this.ctl.enableDamping = false; this.ctl.screenSpacePanning = true;
    this.ctl.zoomSpeed = 2.2; this.ctl.zoomToCursor = true;
    this.ctl.minZoom = 0.05; this.ctl.maxZoom = 40; this.ctl.minDistance = 5; this.ctl.maxDistance = 6000;
    this.ctl.maxPolarAngle = m === 'persp' ? Math.PI * 0.5 : Math.PI * 0.49;
    if (m === 'plan') { this.ctl.enableRotate = false; this.ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; }
    else if (this.hand) this.ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.ctl.addEventListener('change', () => this.invalidate());
    this.ctl.update();
    this.resize();
  }

  /** «Qoʻl»: chap tugma — surish (oʻng — aylantirish) */
  private hand = false;
  setHand(on: boolean): void {
    this.hand = on; if (this.mode === 'plan') return;
    this.ctl.mouseButtons = on ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  }

  /** Kesim: gorizontal (balandlik, m — yer sathidan) yoki vertikal (chiziq, chap tomoni koʻrinadi); null — olib tashlash */
  section: { kind: 'h'; z: number } | { kind: 'v'; a: XY; b: XY } | null = null;
  setSection(s: { kind: 'h'; z: number } | { kind: 'v'; a: XY; b: XY } | null): void {
    this.section = s;
    if (!s) this.renderer.clippingPlanes = [];
    else if (s.kind === 'h') this.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), s.z)];
    else {
      const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], L = Math.hypot(dx, dy) || 1;
      // chapdagi tomon qoladi: chap normal (−dy, dx) → three: (−dy, 0, −dx)
      const n = new THREE.Vector3(-dy / L, 0, -dx / L);
      this.renderer.clippingPlanes = [new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(s.a[0], 0, -s.a[1]))];
    }
    this.invalidate();
  }

  /** Kamerani bitta binoga yaqinlashtirish */
  frameBuilding(doc: Project, id: string): void {
    const b = doc.buildings.find(x => x.id === id); if (!b) return;
    const fr = frame(doc.origin), r = b.footprint.map(fr.toLocal), xs = r.map(p => p[0]), ys = r.map(p => p[1]);
    this.frameAt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, Math.max(40, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), b.floors * doc.settings.floorHeight) * 1.6);
  }

  /** Chizish asboblari uchun: sichqonchani chap tugma bilan surishni vaqtincha oʻchirish */
  setPanEnabled(on: boolean): void { if (this.mode === 'plan') this.ctl.mouseButtons = { LEFT: on ? THREE.MOUSE.PAN : (null as unknown as THREE.MOUSE), MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; this.ctl.enableRotate = this.mode !== 'plan' && on; }

  /** Ekran nuqtasi → yer sathidagi mahalliy XY (metr) */
  pick(clientX: number, clientY: number): XY | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.rcam());
    if (this.ctx) { const hit = this.ray.intersectObject(this.ctx.ground, false)[0]; if (hit) return [hit.point.x, -hit.point.z]; }
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? [p.x, -p.z] : null;
  }

  /** Ekran nuqtasidagi bino (bosish bilan tanlash) */
  pickBuilding(clientX: number, clientY: number): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.rcam());
    const hit = this.ray.intersectObjects(this.world.children.filter(o => o.userData.bid), false)[0];
    return hit ? (hit.object.userData.bid as string) : null;
  }

  /** Bino sirtidagi nuqta: id, mahalliy XY, devormi (normal gorizontal) */
  pickBuildingHit(clientX: number, clientY: number): { id: string; p: XY; wall: boolean } | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.rcam());
    const hit = this.ray.intersectObjects(this.world.children.filter(o => o.userData.bid), false)[0]; if (!hit) return null;
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    return { id: hit.object.userData.bid as string, p: [hit.point.x, -hit.point.z], wall: Math.abs(n.y) < 0.5 };
  }
  /** Kamera boshqaruvini vaqtincha oʻchirish (sudrash paytida) */
  setOrbit(on: boolean): void { this.ctl.enabled = on; }

  /** Ekranda nuqtalar orasidagi piksel masofasi (chizishda yopish uchun) */
  screenDist(a: XY, clientX: number, clientY: number): number {
    const v = new THREE.Vector3(a[0], 0, -a[1]).project(this.rcam()), r = this.renderer.domElement.getBoundingClientRect();
    return Math.hypot((v.x + 1) / 2 * r.width + r.left - clientX, (1 - v.y) / 2 * r.height + r.top - clientY);
  }

  /** tanlangan binoning tanlangan qavati (1 dan) — muharrirda */
  selFloor: number | null = null;
  setSelFloor(f: number | null): void { this.selFloor = f; if (this.lastDoc) this.update(this.lastDoc); }

  /**
   * Quyosh himoyasi: naveslar (gorizontal), lamellar (vertikal) yoki panjara — 90–290° ga qaragan fasadlarda (SanQvaN 0331-16, 9.3).
   * avto: janub (135–225°) — naves, sharq va gʻarb — vertikal lamellar.
   */
  private shading(kind: Shade, tiers: TierPart[], nr: number, base: number, fh: number, shared: (ti: number, k: number) => boolean, color: number): void {
    const M: THREE.Matrix4[] = [], q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), lattice: number[] = [], luv: number[] = [];
    const box = (cx: number, cy: number, z: number, ang: number, sx: number, sy: number, sz: number) => { q.setFromAxisAngle(Y, ang); M.push(new THREE.Matrix4().compose(new THREE.Vector3(cx, z, -cy), q, new THREE.Vector3(sx, sy, sz))); };
    tiers.forEach((t, ti) => {
      const f0 = Math.max(t.f0, nr), f1 = t.f1; if (f1 <= f0) return;
      const ring = t.ring, n = ring.length, ccw = signedArea(ring) > 0;
      for (let k = 0; k < n; k++) {
        if (shared(ti, k)) continue;
        const a = ring[k], b = ring[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 3) continue;
        const ux = dx / L, uy = dy / L, ox = ccw ? uy : -uy, oy = ccw ? -ux : ux;   // tashqi normal
        const az = ((Math.atan2(ox, oy) * 180 / Math.PI) + 360) % 360, ang = Math.atan2(dy, dx);
        let k2: 'gorizontal' | 'vertikal' | 'panjara' | null = kind === 'avto' ? (az >= 135 && az <= 225 ? 'gorizontal' : (az >= 60 && az < 135) || (az > 225 && az <= 300) ? 'vertikal' : null) : az >= 90 && az <= 290 ? kind : null;
        if (!k2) continue;
        if (k2 === 'gorizontal') for (let f = f0; f < f1; f++) { const d = 0.7; box(a[0] + dx / 2 + ox * d / 2, a[1] + dy / 2 + oy * d / 2, base + (f + 1) * fh - 0.45, ang, L - 0.3, 0.08, d); }
        if (k2 === 'vertikal') { const d = 0.55, h = (f1 - f0) * fh, z = base + f0 * fh + h / 2; for (let s = 0.9; s < L - 0.5; s += 1.65) box(a[0] + ux * s + ox * d / 2, a[1] + uy * s + oy * d / 2, z, ang, 0.08, h, d); }
        if (k2 === 'panjara') {
          const o = 0.35, z0 = base + f0 * fh, z1 = base + f1 * fh, P = (p: XY): XY => [p[0] + ox * o, p[1] + oy * o], A2 = P(a), B2 = P(b);
          lattice.push(A2[0], z0, -A2[1], B2[0], z0, -B2[1], B2[0], z1, -B2[1], A2[0], z0, -A2[1], B2[0], z1, -B2[1], A2[0], z1, -A2[1]);
          const u = L / 1.2, w = (z1 - z0) / 1.2; luv.push(0, 0, u, 0, u, w, 0, 0, u, w, 0, w);
        }
      }
    });
    if (M.length) {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color }), M.length);
      M.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; im.receiveShadow = true; this.world.add(im);
    }
    if (lattice.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(lattice, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: latticeTex(), alphaTest: 0.5, side: THREE.DoubleSide, color })); m.castShadow = true; this.world.add(m);
    }
  }

  /**
   * Balkonlar: deraza teksturasi bilan bir xil modul toʻrida (ExtrudeGeometry yon devor UV — mahalliy x yoki y koordinata),
   * har 2-modulda (uzluksiz — butun qirra boʻylab). InstancedMesh: plita, panjara, shisha, lodjiya devorlari.
   */
  private balconies(kind: Bal, tiers: TierPart[], from: number, base: number, fh: number, shared: (ti: number, k: number) => boolean, plain: boolean): void {
    const slab: THREE.Matrix4[] = [], rail: THREE.Matrix4[] = [], glass: THREE.Matrix4[] = [], q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    const box = (arr: THREE.Matrix4[], cx: number, cy: number, z: number, ang: number, sx: number, sy: number, sz: number) => { q.setFromAxisAngle(Y, ang); arr.push(new THREE.Matrix4().compose(new THREE.Vector3(cx, z, -cy), q, new THREE.Vector3(sx, sy, sz))); };
    tiers.forEach((t, ti) => {
      const f0 = Math.max(t.f0, from), f1 = t.f1; if (f1 <= f0) return;
      const ring = t.ring, n = ring.length, ccw = signedArea(ring) > 0;
      for (let k = 0; k < n; k++) {
        if (shared(ti, k)) continue;
        const a = ring[k], b = ring[(k + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 6) continue;
        const ux = dx / L, uy = dy / L, ox = ccw ? uy : -uy, oy = ccw ? -ux : ux, ang = Math.atan2(dy, dx);
        const P = (s: number, d: number): XY => [a[0] + ux * s + ox * d, a[1] + uy * s + oy * d];
        if (kind === 'uzluksiz') {
          for (let f = f0; f < f1; f++) { const z = base + f * fh, d = 1.5, m = P(L / 2, d / 2); box(slab, m[0], m[1], z + 0.08, ang, L - 0.4, 0.16, d); const r = P(L / 2, d); box(glass, r[0], r[1], z + 0.6, ang, L - 0.4, 1.0, 0.04); }
          continue;
        }
        // deraza modullari markazlari: tekstura u = x (|dx| > |dy|) yoki y, modul markazi (j + 0,5)·MOD_W
        const useX = Math.abs(dx) > Math.abs(dy), ua = useX ? a[0] : a[1], ub = useX ? b[0] : b[1], lo = Math.min(ua, ub), hi = Math.max(ua, ub);
        const cs: number[] = [];
        for (let j = Math.ceil(lo / MOD_W - 0.5); (j + 0.5) * MOD_W <= hi; j++) { const s = ((j + 0.5) * MOD_W - ua) / (ub - ua) * L; if (s > 1.2 && s < L - 1.2 && (kind === 'fransuz' || ((j % 2) + 2) % 2 === 0)) cs.push(s); }
        const bw = Math.min(MOD_W * 0.85, MOD_W * Math.abs(L / (ub - ua || 1)) * 0.85);
        for (const s of cs) for (let f = f0; f < f1; f++) {
          const z = base + f * fh;
          if (kind === 'fransuz') { const m = P(s, 0.18); box(slab, m[0], m[1], z + 0.06, ang, bw * 0.6, 0.1, 0.36); box(rail, m[0] + ox * 0.17, m[1] + oy * 0.17, z + 0.55, ang, bw * 0.6, 0.9, 0.03); continue; }
          const d = kind === 'lodjiya' ? 0.7 : 1.2, m = P(s, d / 2), fr = P(s, d);
          box(slab, m[0], m[1], z + 0.08, ang, bw, 0.16, d);
          if (kind === 'lodjiya') {
            for (const sd of [-1, 1]) { const w2 = P(s + sd * bw / 2, d / 2); box(slab, w2[0], w2[1], z + fh / 2, ang, 0.18, fh, d); }
            box(glass, fr[0], fr[1], z + 0.15 + (fh - 0.3) / 2, ang, bw - 0.2, fh - 0.3, 0.05);
          } else {
            box(kind === 'shisha' ? glass : rail, fr[0], fr[1], z + 0.6, ang, bw, 1.0, 0.04);
            for (const sd of [-1, 1]) { const w2 = P(s + sd * bw / 2, d / 2); box(kind === 'shisha' ? glass : rail, w2[0], w2[1], z + 0.6, ang, 0.04, 1.0, d); }
          }
        }
      }
    });
    const add = (arr: THREE.Matrix4[], mat: THREE.Material, cast: boolean) => {
      if (!arr.length) return;
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, arr.length); arr.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = cast; im.receiveShadow = true; this.world.add(im);
    };
    add(slab, new THREE.MeshLambertMaterial({ color: plain ? 0xf1efea : 0xe4e0d8 }), true);
    add(rail, new THREE.MeshLambertMaterial({ color: plain ? 0xb9b6b0 : 0x55595e, transparent: true, opacity: 0.42, depthWrite: false }), false);
    add(glass, new THREE.MeshLambertMaterial({ color: plain ? 0xe4ebef : 0xb7cddb, transparent: true, opacity: 0.45, depthWrite: false }), false);
  }

  /** buziladigan mavjud binolar sahnada koʻrsatilmaydi (parsellar qadamidan keyin) */
  hideGone = false;
  setHideGone(on: boolean): void { if (on === this.hideGone) return; this.hideGone = on; if (this.lastDoc) this.update(this.lastDoc); }
  select(id: string | null): void { this.selected = id; if (this.lastDoc) this.update(this.lastDoc); }
  selectBlock(i: number | null): void { this.selBlock = i; if (this.lastDoc) this.update(this.lastDoc); }
  setFacade(st: FacadeStyle): void { this.facade = st; if (this.lastDoc) this.update(this.lastDoc); }
  selectStreet(id: string | null): void { this.selStreet = id; if (this.lastDoc) this.update(this.lastDoc); }

  /** Ekran nuqtasidagi uchastka ichidagi mavjud bino (OSM id) */
  pickContextBuilding(clientX: number, clientY: number): number | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.rcam());
    const hit = this.ray.intersectObjects(this.world.children.filter(o => o.userData.cid != null && (o as THREE.Mesh).isMesh), false)[0];
    return hit ? (hit.object.userData.cid as number) : null;
  }

  update(doc: Project): void {
    this.lastDoc = doc;
    disposeGroup(this.world);
    const fr = frame(doc.origin);
    const toV2 = (p: XY) => new THREE.Vector2(p[0], p[1]);
    const tag = (L: number) => { for (const o of this.world.children) o.userData.layer ??= L; };
    const st = this.style, plain = st === 'arctic' || st === 'minimal';
    if (doc.site) {
      const rings = doc.site.rings.map(r => r.map(fr.toLocal));
      // kvartallar (uchastka − koʻcha koridorlari), funksiya rangida
      const plan = computePlan(doc);
      plan.blocks.forEach((b, i) => {
        const sh = new THREE.Shape(b.rings[0].map(toV2)); b.rings.slice(1).forEach(h => sh.holes.push(new THREE.Path(h.map(toV2))));
        const g = drape(new THREE.ShapeGeometry(sh), this.H, 0.3, this.ctx ? 8 : 1e9);
        const sel = i === this.selBlock;
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: st === 'minimal' ? 0xeeeeee : st === 'arctic' ? tint(ZONE_COL[b.use] ?? C.site, 0.55) : ZONE_COL[b.use] ?? C.site, transparent: true, opacity: sel ? 0.9 : plain ? 0.55 : this.ctx ? 0.62 : 0.75, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        m.renderOrder = 6; m.userData.block = i; m.userData.layer = 2; this.world.add(m);
        if (sel) b.rings.forEach(r => this.world.add(line(densify(r, 10, true), C.preview, 0.45, true, 8, this.H)));
      });
      rings.forEach(r => { const l = line(densify(r, 10, true), C.siteLine, 0.4, true, 7, this.H); l.userData.layer = 2; this.world.add(l); });
      // hovlilar: trotuar, maysa, yoʻlaklar, maydonchalar, daraxtlar
      if (doc.settings.yards) {
        const alb = this.album, plainS = st === 'arctic' || st === 'minimal';
        const col = { pave: plainS ? 0xf4f3f0 : alb ? 0xf1eee8 : 0xdcd6cb, green: plainS ? 0xeceee8 : alb ? 0xd5e4c4 : 0xa9cc8c, path: plainS ? 0xf7f6f4 : alb ? 0xf6f3ee : 0xe7e0d2,
          bolalar: plainS ? 0xf0ede8 : 0xf0c58a, kattalar: plainS ? 0xf0ede8 : 0xeadfc8, sport: plainS ? 0xe9ece6 : 0x8fbf98, xojalik: plainS ? 0xeeeeee : 0xcfcac1 };
        const fill = (mp: XY[][][], c: number, lift: number, order: number) => mp.forEach(poly => {
          if (!poly[0] || poly[0].length < 3) return;
          const sh = new THREE.Shape(poly[0].map(toV2)); poly.slice(1).forEach(hh => sh.holes.push(new THREE.Path(hh.map(toV2))));
          const m = new THREE.Mesh(drape(new THREE.ShapeGeometry(sh), this.H, lift, this.ctx ? 8 : 1e9), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5 - order, polygonOffsetUnits: -5 - order }));
          m.renderOrder = 6.2 + order * 0.01; this.world.add(m);
        });
        const yards = landscape(doc), trees: XY[] = [];
        for (const y of yards) {
          fill(y.paving, col.pave, 0.32, 1); fill(y.green, col.green, 0.33, 2); fill(y.paths, col.path, 0.34, 3);
          for (const q of y.play) { fill([[q.ring]], col[q.kind], 0.35, 4); this.world.add(line(densify([...q.ring], 6, true), plainS ? 0xc9c6bf : 0x9a8f7c, 0.4, true, 6.5, this.H)); }
          trees.push(...y.trees);
        }
        if (trees.length) this.world.add(...treeMeshes(trees, this.H, st === 'arctic' ? 0xeef1ea : st === 'minimal' ? 0xd2d2d2 : alb ? 0xa9c993 : 0x6f9f4c));
      }
    }
    tag(2);
    // loyiha koʻchalari: profil boʻlaklari, chiziqlar, daraxtlar, qizil chiziqlar
    if (doc.streets.length) {
      const sg = projectStreetsGeo(doc.streets.map(st => ({ id: st.id, axis: st.axis.map(fr.toLocal), parts: profileById(st.profile).parts })), this.H);
      const ord: [string, number][] = [['trotuar', 9], ['yashil', 9.1], ['velo', 9.1], ['parkovka', 9.1], ['qatnov', 9.2], ['avtobus', 9.2], ['tramvay', 9.2], ['chiziq', 9.3]];
      for (const [k, o] of ord) {
        const arr = sg.layers[k]; if (!arr?.length) continue;
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: (st === 'arctic' ? PART_ARC : st === 'minimal' ? PART_MIN : this.album ? PART_ALB : PART_COL)[k], depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 - o * 0.1, polygonOffsetUnits: -3 - o * 0.1 })); m.renderOrder = o; m.frustumCulled = false; this.world.add(m);
      }
      sg.red.forEach(r => { const l = line(densify(r, 6), C.siteLine, 0.5, false, 9.5, this.H); (l.material as THREE.LineBasicMaterial).dispose(); l.material = new THREE.LineDashedMaterial({ color: C.siteLine, dashSize: 3, gapSize: 2 }); l.computeLineDistances(); this.world.add(l); });
      doc.streets.forEach(st => { if (st.id !== this.selStreet) return; this.world.add(line(densify(st.axis.map(fr.toLocal), 6), C.preview, 0.6, false, 9.6, this.H)); });
      if (sg.trees.length) this.world.add(...treeMeshes(sg.trees, this.H, st === 'arctic' ? 0xeef1ea : st === 'minimal' ? 0xd2d2d2 : this.album ? 0x9fbf86 : 0x6f9f4c));
    }
    tag(1);
    // uchastka ichidagi mavjud binolar: saqlanadigan — oddiy, qolgani — buziladigan (shaffof qizil)
    if (this.ctx?.inSite.length) {
      const keep = new Set(doc.keep);
      for (const b of this.ctx.inSite) {
        const k = keep.has(b.id); if (!k && this.hideGone) continue;
        const objs = buildingMeshes([b], this.H,
          k ? new THREE.MeshLambertMaterial({ color: 0xffffff }) : new THREE.MeshBasicMaterial({ color: 0xd9534f, transparent: true, opacity: 0.18, depthWrite: false }),
          k ? new THREE.MeshLambertMaterial({ color: 0xe3b4a2, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ color: 0xd9534f, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
          new THREE.LineBasicMaterial({ color: k ? 0x8f8a80 : 0xc0392b, transparent: true, opacity: k ? 0.4 : 0.7 }));
        objs.forEach(o => { o.userData.cid = b.id; if (k) { o.castShadow = o.receiveShadow = true; } o.renderOrder = 10; this.world.add(o); });
      }
    }
    this.ctx?.maskTrees(doc.site ? doc.site.rings[0].map(fr.toLocal) : null);
    tag(3);
    // parkovkalar: yer osti — siyohrang uzuq kontur, yer usti — kulrang maydon
    doc.garages.forEach(gr => {
      const r = gr.ring.map(fr.toLocal);
      if (gr.kind === 'yer_usti') {
        const sh = new THREE.Shape(r.map(toV2)), g = drape(new THREE.ShapeGeometry(sh), this.H, 0.35, this.ctx ? 8 : 1e9);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xa9adb3, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); m.renderOrder = 6.5; this.world.add(m);
      } else {
        const l = line(densify(r, 6, true), 0x7a4fb0, 0.5, true, 8, this.H); (l.material as THREE.Material).dispose();
        l.material = new THREE.LineDashedMaterial({ color: 0x7a4fb0, dashSize: 2, gapSize: 1.5 }); l.computeLineDistances(); this.world.add(l);
      }
    });
    tag(2);
    // loyiha binolari / seksiyalari: noturar pastki qavatlar toʻq tasma, har seksiya alohida (chegaralari koʻrinadi)
    const fh = doc.settings.floorHeight, aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    // qoʻshni seksiyalar choklari (umumiy devor, bir xil balandlikdagi tom) — chizilmaydi
    const flat = (b: Project['buildings'][number]) => !(b.gen && (b.gen.kind === 'uy' || b.gen.kind === 'taunhaus'));
    const TP = doc.buildings.map(b => tierParts(b.footprint.map(fr.toLocal), b.floors, b.tiers));
    const P3 = doc.buildings.map((b, i) => { const r = b.footprint.map(fr.toLocal), base = Math.min(...r.map(p => this.H(p[0], p[1]))) + (b.z0 ?? 0) * fh; return { ring: r, base, top: base + (TP[i][0]?.f1 ?? b.floors) * fh }; });
    const SM = seams(P3.filter((_, i) => flat(doc.buildings[i]))), smOf = new Map<string, number>(); let si = 0; doc.buildings.forEach(b => { if (flat(b)) smOf.set(b.id, si++); });
    const focus = this.selected && doc.buildings.some(b => b.id === this.selected);
    doc.buildings.forEach((b, bi) => {
      const r = b.footprint.map(fr.toLocal), base = Math.min(...r.map(p => this.H(p[0], p[1]))) + (b.z0 ?? 0) * fh, sel = b.id === this.selected, dim = focus && !sel;
      const roofK = b.roof ?? 'tekis', tinted = !plain && st !== 'funksiya';
      const part = (ring: XY[], z0: number, z1: number, color: number, kind: 'res' | 'shop' | 'glass' | null, top = false, outline = false) => {
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(ring.map(toV2)), { depth: z1 - z0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, base + z0, 0);
        if (b.mat && tinted && kind !== 'shop') color = MATS.find(m => m.id === b.mat)!.color;
        const wall = new THREE.MeshLambertMaterial({ color: dim ? 0xf4f3f0 : color });   // tanlangan — oʻz rangida, koʻk kontur bilan (fasad koʻrinsin)
        const spec: WinSpec | null = b.win ? winDef(b.win) : this.facade !== 'yoq' ? { id: this.facade, ...FACADE[this.facade] } : null;
        if (kind && spec && !plain && st !== 'funksiya' && !dim) wall.map = facadeTex(kind, spec, fh, MOD_W, aniso);
        const cap = new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : dim || plain ? 0xf6f5f2 : st === 'funksiya' ? color : C.roof });
        if (top && !sel && !dim && roofK === 'yashil') cap.color.setHex(plain ? 0xe6ece0 : 0x93b873);
        if (top && !sel && !dim && roofK === 'quyosh' && !plain) { cap.color.setHex(0xffffff); cap.map = solarTex(); }
        const m = new THREE.Mesh(g, [cap, wall]);
        m.castShadow = m.receiveShadow = true; m.userData.bid = b.id; this.world.add(m);
        if (sel) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: 0x2a6fb0, depthTest: false, transparent: true, opacity: 0.9 })); e.renderOrder = 30; this.world.add(e); }
        else if (outline) this.world.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edgeMat()));
      };
      const edgeMat = () => new THREE.LineBasicMaterial({ color: st === 'minimal' ? 0x1d1d1b : C.edge, transparent: true, opacity: dim ? 0.18 : st === 'minimal' ? 0.9 : st === 'arctic' ? 0.22 : 0.5 });
      if (b.gen && (b.gen.kind === 'uy' || b.gen.kind === 'taunhaus')) {
        // past uylar — qiya tom bilan (kontekstdagi kabi)
        const objs = buildingMeshes([{ id: 0, rings: [r], h: b.floors * fh, kind: 'house' }], this.H, new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : plain ? 0xffffff : st === 'funksiya' ? ZONE_COL[b.use] ?? C.bld : (USE_COL[b.use] ?? C.bld) }), new THREE.MeshLambertMaterial({ color: plain ? 0xf1efea : 0xc98f7a, side: THREE.DoubleSide }), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.45 }));
        objs.forEach(o => { o.userData.bid = b.id; o.castShadow = o.receiveShadow = true; this.world.add(o); });
        return;
      }
      const nr = Math.min(b.nonRes, b.floors - (b.gen?.kind === 'stilobat' ? 0 : 1));
      const parking = b.gen?.kind === 'stilobat' && b.use === 'avtoturargoh', office = b.use === 'ofis' || b.use === 'mehmonxona';
      const baseC = dim ? 0xebe9e4 : plain ? (st === 'minimal' ? 0xe6e6e6 : 0xf0eee9) : st === 'funksiya' ? tint(BASE_COL[b.use] ?? 0x9c7b6e, 0.15) : BASE_COL[b.use] ?? 0x9c7b6e;
      const topC = dim ? 0xf4f3f0 : plain ? 0xffffff : st === 'funksiya' ? ZONE_COL[b.use] ?? C.bld : USE_COL[b.use] ?? C.bld;
      const tiers = TP[bi], last = tiers[tiers.length - 1];
      tiers.forEach((t, ti) => {
        const up = ti > 0;   // yuqori pogʻonalar — toʻliq kontur bilan
        if (t.f0 < nr) part(t.ring, t.f0 * fh, Math.min(t.f1, nr) * fh, baseC, parking ? null : 'shop', t === last && t.f1 <= nr, up);
        if (t.f1 > nr) part(t.ring, Math.max(t.f0, nr) * fh, t.f1 * fh, topC, office ? 'glass' : 'res', t === last, up);
      });
      { const k = smOf.get(b.id)!, A = P3[bi], f1 = tiers[0]?.f1 ?? b.floors, segs = seamEdges(A, SM[k], nr > 0 && nr < f1 ? [A.base + nr * fh] : []);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(segs.flatMap(([x, y, z]) => [x, z, -y]), 3));
        this.world.add(new THREE.LineSegments(g, edgeMat())); }
      const shared = (ti: number, k: number) => ti === 0 && SM[smOf.get(b.id)!].edgeTop[k] >= base + (tiers[0].f1 * fh) - 0.05;
      // quyosh himoyasi
      if (b.shade && !dim) this.shading(b.shade, tiers, nr, base, fh, shared, st === 'minimal' || plain ? 0xe9e7e2 : 0xd9d4ca);
      // balkonlar (turar qavatlarda, 2-qavatdan)
      if (b.bal && !dim && !office && !parking) this.balconies(b.bal, tiers, Math.max(nr, 1), base, fh, shared, plain);
      const topZ = base + (last?.f1 ?? b.floors) * fh;
      if (roofK === 'ikki' || roofK === 'tort' || roofK === 'bir') {
        const parts = roofParts(last.ring, roofK);
        if (parts) {
          const v: number[] = [], w: number[] = [];
          for (const pr of parts) { for (let i = 0; i < pr.tris.length; i += 3) v.push(pr.tris[i], topZ + pr.tris[i + 2], -pr.tris[i + 1]); for (let i = 0; i < pr.walls.length; i += 3) w.push(pr.walls[i], topZ + pr.walls[i + 2], -pr.walls[i + 1]); }
          // tom rangi uslubga koʻra: Albom — xira terrakota, Rangli — toʻyingan, Arctic/Minimal — oq, Funksiya — zona rangi
          const rc = dim ? 0xf1efea : plain ? 0xf3f1ec : st === 'funksiya' ? tint(ZONE_COL[b.use] ?? C.bld, 0.35) : this.album ? 0xcfb2a3 : 0xb9765c;
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
          const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: rc, side: THREE.DoubleSide }));
          m.castShadow = m.receiveShadow = true; m.userData.bid = b.id; this.world.add(m);
          this.world.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({ color: st === 'minimal' ? 0x1d1d1b : C.edge, transparent: true, opacity: dim ? 0.18 : 0.45 })));
          if (w.length) {
            const gw = new THREE.BufferGeometry(); gw.setAttribute('position', new THREE.Float32BufferAttribute(w, 3)); gw.computeVertexNormals();
            const wc = dim ? 0xf4f3f0 : (b.mat && !plain && st !== 'funksiya') ? MATS.find(x => x.id === b.mat)!.color : topC;
            const mw = new THREE.Mesh(gw, new THREE.MeshLambertMaterial({ color: wc, side: THREE.DoubleSide })); mw.castShadow = true; mw.userData.bid = b.id; this.world.add(mw);
          }
        }
      } else if (b.parapet) {
        // parapet: tom chetidagi devorcha (qoʻshni seksiya bilan umumiy chokda — yoʻq)
        const ring = last.ring, n = ring.length, ccw = signedArea(ring) > 0, v: number[] = [], th = 0.25, ph = b.parapet;
        for (let k = 0; k < n; k++) {
          if (shared(tiers.length - 1, k)) continue;
          const a2 = ring[k], b2 = ring[(k + 1) % n], L = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, nx = (ccw ? -1 : 1) * -(b2[1] - a2[1]) / L * th, ny = (ccw ? -1 : 1) * (b2[0] - a2[0]) / L * th;
          const ai: XY = [a2[0] - nx, a2[1] - ny], bi2: XY = [b2[0] - nx, b2[1] - ny];
          const quad = (p: XY, q: XY, z0: number, z1: number) => { v.push(p[0], z0, -p[1], q[0], z0, -q[1], q[0], z1, -q[1], p[0], z0, -p[1], q[0], z1, -q[1], p[0], z1, -p[1]); };
          quad(a2, b2, topZ, topZ + ph); quad(bi2, ai, topZ, topZ + ph);
          v.push(a2[0], topZ + ph, -a2[1], b2[0], topZ + ph, -b2[1], bi2[0], topZ + ph, -bi2[1], a2[0], topZ + ph, -a2[1], bi2[0], topZ + ph, -bi2[1], ai[0], topZ + ph, -ai[1]);
        }
        if (v.length) {
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
          const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : dim || plain ? 0xf6f5f2 : C.roof, side: THREE.DoubleSide })); m.castShadow = true; m.userData.bid = b.id; this.world.add(m);
        }
      }
      // tanlangan qavat — yarim shaffof qatlam
      if (sel && this.selFloor != null && this.selFloor >= 1 && this.selFloor <= b.floors) {
        const f = this.selFloor, t = tiers.find(x => f > x.f0 && f <= x.f1) ?? last;
        const g = new THREE.ExtrudeGeometry(new THREE.Shape(t.ring.map(toV2)), { depth: fh - 0.1, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.scale(1.004, 1, 1.004); g.translate(0, base + (f - 1) * fh + 0.05, 0);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2a6fb0, transparent: true, opacity: 0.45, depthWrite: false })); m.renderOrder = 20; this.world.add(m);
        this.world.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x2a6fb0 })));
      }
    });
    if (this.floorLabels) doc.buildings.forEach(b => {
      const r = b.footprint.map(fr.toLocal); if (area(r) < 40) return;
      const c = centroid(r), top = Math.min(...r.map(p => this.H(p[0], p[1]))) + ((b.z0 ?? 0) + b.floors) * fh;
      const sp = labelSprite(String((b.z0 ?? 0) + b.floors), true); sp.position.set(c[0], top + 2, -c[1]); this.world.add(sp);
    });
    tag(3);
    this.applyExplode();
    this.invalidate();
  }

  /** Chizilayotgan shakl (koʻk chiziq + nuqtalar) */
  setPreview(pts: XY[], closed = false): void {
    disposeGroup(this.prev);
    if (pts.length) {
      this.prev.add(line(densify(pts, 10, closed), C.preview, 0.5, closed, 20, this.H, false));
      const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], this.H(p[0], p[1]) + 0.5, -p[1]))), new THREE.PointsMaterial({ color: C.preview, size: 7, sizeAttenuation: false, depthTest: false }));
      dots.renderOrder = 6; this.prev.add(dots);
    }
    this.invalidate();
  }

  /** Kamerani hujjatdagi obyektlarga moslash */
  frameDoc(doc: Project): void {
    const fr = frame(doc.origin), pts: XY[] = [];
    doc.site?.rings.forEach(r => r.forEach(p => pts.push(fr.toLocal(p))));
    doc.buildings.forEach(b => b.footprint.forEach(p => pts.push(fr.toLocal(p))));
    if (!pts.length) return;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, size = Math.max(80, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    this.frameAt(cx, cy, size);
  }

  /** Hisobot uchun uch koʻrinish (reja, akso, perspektiva) — loyihaga moslab; joriy kamera keyin tiklanadi */
  captureViews(doc: Project): Record<'plan' | 'axo' | 'persp', string> {
    const mode = this.mode, t = this.ctl.target.clone(), pp = this.persp.position.clone(), op = this.ortho.position.clone(), os = this.ortho.userData.s, oz = this.ortho.zoom;
    const out = {} as Record<'plan' | 'axo' | 'persp', string>;
    for (const m of ['plan', 'axo', 'persp'] as const) { this.setView(m); this.frameDoc(doc); { const c = this.rcam(); this.fitSprites(c); this.renderer.render(this.scene, c); } out[m] = this.renderer.domElement.toDataURL('image/jpeg', 0.9); }
    this.setView(mode); this.ctl.target.copy(t); this.persp.position.copy(pp); this.ortho.position.copy(op); this.ortho.userData.s = os; this.ortho.zoom = oz;
    this.resize(); this.ctl.update(); this.invalidate();
    return out;
  }

  /** Markazga (0,0) qarab, radius `r` m ni koʻrsatish */
  frameRadius(r: number): void { if (r > 0) this.frameAt(0, 0, 2 * r); }

  private frameAt(cx: number, cy: number, size: number): void {
    const t = new THREE.Vector3(cx, this.H(cx, cy), -cy), dist = size * 1.6;
    this.ctl.target.copy(t);
    if (this.mode === 'persp') this.persp.position.copy(t).add(new THREE.Vector3(-0.55, 0.62, 0.75).normalize().multiplyScalar(dist));
    else {
      const dir = this.mode === 'plan' ? new THREE.Vector3(0, 1, 0.0001) : new THREE.Vector3(-1, 1.15, 1).normalize();
      this.ortho.position.copy(t).add(dir.multiplyScalar(3000)); this.ortho.userData.s = dist * 0.45; this.ortho.zoom = 1;
    }
    this.resize(); this.ctl.update(); this.invalidate();
  }

  /** Kontekstni oʻrnatish (null — olib tashlash). Loyiha markazi yoki koʻrinish sozlamalari oʻzgarsa qayta quriladi. */
  async setContext(b: ContextBundle | null, doc: Project): Promise<void> {
    const cs = doc.context;
    const adopted = doc.streets.filter(x => x.osm != null).map(x => x.osm!);
    const key = b ? `${b.fetched}|${doc.origin.join(',')}|${JSON.stringify(cs)}|${JSON.stringify(doc.site)}|${adopted.join(',')}` : '';
    if (key === this.ctxKey) return;
    this.ctxKey = key;
    if (this.ctx) { this.scene.remove(this.ctx.group); this.ctx.dispose(); this.ctx = null; }
    if (!b) { this.H = () => 0; this.grid.forEach(g => g.visible = true); this.ground.position.y = 0; this.update(doc); return; }
    const fr = frame(doc.origin);
    // relyef markazi — loyiha markazi (kontekst keshi boshqa markazda olingan boʻlishi mumkin)
    const base = terrainSampler(cs.layers.relief ? b.terrain : null);
    const off = frame(b.center).toLocal(doc.origin), h0 = base(off[0], off[1]);
    this.H = (x, y) => base(x + off[0], y + off[1]) - h0;
    let tex: THREE.Texture | null = null;
    if (cs.base === 'sputnik' && b.imagery) {
      if (this.tex?.blob !== b.imagery.image) {
        this.tex?.t.dispose();
        const url = URL.createObjectURL(b.imagery.image);
        try { const t = await new THREE.TextureLoader().loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; this.tex = { blob: b.imagery.image, t }; }
        finally { URL.revokeObjectURL(url); }
        if (key !== this.ctxKey) return; // shu orada boshqa soʻrov keldi
      }
      tex = this.tex!.t;
    }
    this.ctx = buildContext(b, fr, cs, this.H, tex, doc.site ? doc.site.rings[0].map(fr.toLocal) : null, new Set(adopted));
    this.scene.add(this.ctx.group);
    if (this.album) this.applyStyle();
    this.grid.forEach(g => g.visible = false);
    const T = cs.layers.relief ? b.terrain : null;
    this.ground.position.y = T ? T.min - T.h[((T.n - 1) >> 1) * T.n + ((T.n - 1) >> 1)] - h0 - 1 : -0.3;
    const r = Math.max(300, b.radius);
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, far: 4000 }); this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.map?.dispose(); (this.sun.shadow as { map: unknown }).map = null; this.sun.shadow.camera.updateProjectionMatrix();
    this.update(doc);
  }

  get hasContext(): boolean { return !!this.ctx; }

  private album = false;
  /**
   * «Albom» uslubi (Planimetric kabi taqdimot koʻrinishi): atrof shaffof emas — oq binolar, och yoʻllar va daraxtlar,
   * sunʼiy yoʻldosh tasviri yashiriladi, soyalar qoladi. Loyiha (binolar, zonalar) oʻz rangida.
   * Shaffoflik ishlatilmaydi — yarim shaffof qatlamlar tartibi binolar ustida «arvoh» chiziqlar berardi.
   */
  style: SceneStyle = 'rangli';
  setAlbum(on: boolean): void { this.setStyle(on ? 'albom' : 'rangli'); }
  setStyle(st: SceneStyle): void { if (st === this.style) return; this.style = st; this.album = st !== 'rangli'; this.applyStyle(); if (this.lastDoc) this.update(this.lastDoc); }
  get albumOn(): boolean { return this.album; }
  private applyStyle(): void {
    const S = this.style === 'rangli' ? null : STYLE_PAL[this.style];
    const W = new THREE.Color(0xffffff), roots: THREE.Object3D[] = [...(this.ctx ? [this.ctx.group] : []), ...this.far];
    type M = THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null };
    for (const root of roots) root.traverse(o => {
      const mm = (o as THREE.Mesh).material as M | M[] | undefined; if (!mm) return;
      for (const m of Array.isArray(mm) ? mm : [mm]) {
        const u = m.userData as { s0?: { c?: THREE.Color; map?: THREE.Texture | null } };
        u.s0 ??= { c: m.color?.clone(), map: m.map ?? null };
        const f = u.s0;
        const sat = !!f.map && !!this.tex && f.map === this.tex.t;   // sunʼiy yoʻldosh tasviri — har uslubda saqlanadi
        if (S && sat) { if (f.c) m.color?.copy(f.c); m.map = f.map; }
        else if (S) {
          const pal = S.pal[o.name], isLine = o instanceof THREE.LineSegments;
          if (m.color && f.c) { if (isLine && S.line != null) m.color.setHex(S.line); else if (pal != null) m.color.setHex(pal); else m.color.copy(f.c).lerp(W, isLine ? 0.55 : S.lerp); }
          if ('map' in m && f.map) m.map = null;
        } else { if (f.c) m.color?.copy(f.c); if ('map' in m && f.map) m.map = f.map; }
        m.needsUpdate = true;
      }
    });
    this.scene.background = new THREE.Color(S ? S.bg : 0xf4f3f1);
    (this.ground.material as THREE.MeshLambertMaterial).color.setHex(this.style === 'minimal' || this.style === 'arctic' ? 0xf7f6f4 : C.ground);
    this.invalidate();
  }

  /** Yorliqlar ekranda doimiy piksel oʻlchamida (ortho kamerada sizeAttenuation ishlamaydi — shu yerda hisoblanadi) */
  private fitSprites(cam: THREE.Camera): void {
    const H = this.host.clientHeight || 1, P = cam as THREE.PerspectiveCamera & THREE.OrthographicCamera;
    const k = P.isOrthographicCamera ? (P.top - P.bottom) / (P.zoom || 1) / H : 2 / (P.projectionMatrix.elements[5] * H);
    const fit = (o: THREE.Object3D) => { const px = o.userData.px as [number, number] | undefined; if (px) o.scale.set(px[0] * k, px[1] * k, 1); };
    this.world.children.forEach(fit); this.explodeLabels.forEach(fit);
  }

  /* ---------- portlatilgan qatlamlar ---------- */
  exploded = false;
  /** binolar ustida qavatlar soni */
  floorLabels = false;
  setFloorLabels(on: boolean): void { this.floorLabels = on; if (this.lastDoc) this.update(this.lastDoc); }
  private explodeStep = 0;
  explodeGap = 0.6;
  private explodeLabels: THREE.Object3D[] = [];
  setExploded(on: boolean, gap = this.explodeGap): void { this.exploded = on; this.explodeGap = gap; this.applyExplode(); }
  private applyExplode(): void {
    this.explodeLabels.forEach(o => { this.scene.remove(o); const m = o as THREE.Sprite | THREE.Line; m.geometry?.dispose(); const mat = m.material as THREE.SpriteMaterial; mat.map?.dispose(); mat.dispose(); });
    this.explodeLabels = [];
    // qatlam oraligʻi: uchastka (yoki binolar) oʻlchamiga nisbatan
    const box = new THREE.Box3(); this.world.children.forEach(o => { if (o.userData.layer != null) box.expandByObject(o); });
    const size = box.isEmpty() ? 200 : Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    const step = this.exploded ? Math.max(12, size * 0.22 * this.explodeGap) : 0;
    const dy = 1.5 * (step - this.explodeStep); this.explodeStep = step;
    if (dy) { this.ctl.target.y += dy; this.cam.position.y += dy; this.ctl.update(); }
    this.world.children.forEach(o => { const L = o.userData.layer as number | undefined; o.userData.y0 ??= o.position.y; o.position.y = (o.userData.y0 as number) + (L ? L * step : 0); });
    if (this.exploded && !box.isEmpty()) {
      const x = box.max.x + size * 0.06, z = box.max.z;
      EXPLODE_NAMES.forEach((name, i) => {
        const sp = labelSprite(`${i + 1}  ${name}`); sp.position.set(x, i * step + 4, z); this.scene.add(sp); this.explodeLabels.push(sp);
      });
      const corners: [number, number][] = [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.min.x, box.max.z], [box.max.x, box.max.z]];
      for (const [cx, cz] of corners) {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, 3 * step + 2, cz)]), new THREE.LineDashedMaterial({ color: 0x9a978f, dashSize: 2, gapSize: 2 }));
        l.computeLineDistances(); this.scene.add(l); this.explodeLabels.push(l);
      }
    }
    this.invalidate();
  }

  /** Quyosh holati (balandlik, azimut — shimoldan soat yoʻnalishida, °): yorugʻlik va soyalar */
  setSun(alt: number, az: number): void {
    const a = alt * Math.PI / 180, z = az * Math.PI / 180, up = Math.max(0.02, Math.sin(a));
    const dir = new THREE.Vector3(Math.sin(z) * Math.cos(a), up, -Math.cos(z) * Math.cos(a)).normalize();
    this.sun.position.copy(dir.multiplyScalar(1500));
    this.sun.intensity = alt > 0 ? 0.6 + 1.2 * Math.min(1, Math.sin(a) * 1.6) : 0.15;
    this.invalidate();
  }

  private insol: THREE.Mesh | null = null;
  /** Insolyatsiya xaritasi: har nuqta — katakcha, soat boʻyicha rang; null — olib tashlash */
  setInsolation(pts: XY[] | null, hours?: Float32Array, cell = 3): void {
    this.setGroundMap(pts, hours ? Array.from(hours, insolColor) : undefined, cell);
  }

  /** Yer sathidagi rangli xarita (insolyatsiya, shamol): har nuqta — katakcha */
  setGroundMap(pts: XY[] | null, colors?: number[], cell = 3): void {
    if (this.insol) { this.scene.remove(this.insol); this.insol.geometry.dispose(); (this.insol.material as THREE.Material).dispose(); this.insol = null; }
    if (pts && colors) {
      const pos: number[] = [], col: number[] = [], c = new THREE.Color(), h2 = cell / 2 * 0.96;
      pts.forEach((p, i) => {
        c.setHex(colors[i]); const y = this.H(p[0], p[1]) + 0.6;
        const q = [[p[0] - h2, p[1] - h2], [p[0] + h2, p[1] - h2], [p[0] + h2, p[1] + h2], [p[0] - h2, p[1] - h2], [p[0] + h2, p[1] + h2], [p[0] - h2, p[1] + h2]];
        for (const v of q) { pos.push(v[0], y, -v[1]); col.push(c.r, c.g, c.b); }
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      this.insol = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
      this.insol.renderOrder = 7; this.scene.add(this.insol);
    }
    this.invalidate();
  }

  private netObj: THREE.Object3D[] = [];
  /** Piyoda tarmogʻi xaritasi (rangli qirralar) va nuqtalar (manbalar, seksiyalar); null — olib tashlash */
  setNetMap(segs: { a: XY; b: XY; color: number }[] | null, dots: { p: XY; color: number; size?: number }[] = []): void {
    this.netObj.forEach(o => { this.scene.remove(o); (o as THREE.Mesh).geometry.dispose(); ((o as THREE.Mesh).material as THREE.Material).dispose(); }); this.netObj = [];
    if (segs?.length) {
      // qalin tasma (3,5 m) — yoʻl rangidan ajralib tursin
      const pos: number[] = [], col: number[] = [], c = new THREE.Color(), hw = 1.75;
      for (const s of segs) {
        const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = Math.hypot(dx, dy); if (l < 0.01) continue;
        const nx = -dy / l * hw, ny = dx / l * hw; c.setHex(s.color);
        const v = [[s.a[0] + nx, s.a[1] + ny], [s.a[0] - nx, s.a[1] - ny], [s.b[0] - nx, s.b[1] - ny], [s.a[0] + nx, s.a[1] + ny], [s.b[0] - nx, s.b[1] - ny], [s.b[0] + nx, s.b[1] + ny]];
        const ya = this.H(s.a[0], s.a[1]) + 1.2, yb = this.H(s.b[0], s.b[1]) + 1.2;
        v.forEach((p, i) => { pos.push(p[0], [0, 1, 3].includes(i) ? ya : yb, -p[1]); col.push(c.r, c.g, c.b); });
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const l = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, side: THREE.DoubleSide })); l.renderOrder = 12; this.scene.add(l); this.netObj.push(l);
    }
    for (const size of [...new Set(dots.map(d => d.size ?? 9))]) {
      const ds = dots.filter(d => (d.size ?? 9) === size), c = new THREE.Color(), col: number[] = [];
      const g = new THREE.BufferGeometry().setFromPoints(ds.map(d => new THREE.Vector3(d.p[0], this.H(d.p[0], d.p[1]) + 2, -d.p[1])));
      ds.forEach(d => { c.setHex(d.color); col.push(c.r, c.g, c.b); }); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const pt = new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size, sizeAttenuation: false, depthTest: false })); pt.renderOrder = 13; this.scene.add(pt); this.netObj.push(pt);
    }
    this.invalidate();
  }

  /** GLB: loyiha qatlami (binolar, uchastka, koʻchalar); withCtx — atrofdagi kontekst ham. Y — yuqori, metr */
  async exportGLB(withCtx = false): Promise<Blob> {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const root = new THREE.Group(); root.name = 'Archemistry';
    const proj = this.world.clone(true); proj.name = 'loyiha'; root.add(proj);
    if (withCtx && this.ctx) { const c = this.ctx.group.clone(true); c.name = 'atrof'; root.add(c); }
    const buf = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true }) as ArrayBuffer;
    return new Blob([buf], { type: 'model/gltf-binary' });
  }

  /** OBJ (Wavefront): faqat sirtlar (chiziqlar va yorliqlarsiz); Y — yuqori, metr */
  async exportOBJ(withCtx = false): Promise<string> {
    const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js');
    const root = new THREE.Group(); root.name = 'Archemistry';
    const add = (src: THREE.Object3D, name: string) => { const g = new THREE.Group(); g.name = name; src.updateMatrixWorld(true); src.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh || !m.visible) return; if ((m as unknown as THREE.InstancedMesh).isInstancedMesh) return; const c = new THREE.Mesh(m.geometry, m.material); c.name = m.name || name; m.matrixWorld.decompose(c.position, c.quaternion, c.scale); g.add(c); }); root.add(g); };
    add(this.world, 'loyiha');
    if (withCtx && this.ctx) add(this.ctx.group, 'atrof');
    return new OBJExporter().parse(root);
  }

  private marks: THREE.Mesh | null = null;
  /** Fasaddagi rangli belgilar (deraza insolyatsiyasi): har biri — fasad tekisligidagi toʻrtburchak; null — olib tashlash */
  setFacadeMarks(list: { a: XY; b: XY; y0: number; y1: number; color: number }[] | null): void {
    if (this.marks) { this.scene.remove(this.marks); this.marks.geometry.dispose(); (this.marks.material as THREE.Material).dispose(); this.marks = null; }
    if (list?.length) {
      const pos: number[] = [], col: number[] = [], c = new THREE.Color();
      for (const q of list) {
        const dx = q.b[0] - q.a[0], dy = q.b[1] - q.a[1], l = Math.hypot(dx, dy) || 1, n = [dy / l * 0.12, -dx / l * 0.12], k = 0.14;
        const a = [q.a[0] + dx * k + n[0], q.a[1] + dy * k + n[1]], b = [q.b[0] - dx * k + n[0], q.b[1] - dy * k + n[1]];
        c.setHex(q.color);
        const v = [[a, q.y0], [b, q.y0], [b, q.y1], [a, q.y0], [b, q.y1], [a, q.y1]] as [number[], number][];
        for (const [p, y] of v) { pos.push(p[0], y, -p[1]); col.push(c.r, c.g, c.b); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      this.marks = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      this.marks.renderOrder = 8; this.scene.add(this.marks);
    }
    this.invalidate();
  }

  /** Soya va insolyatsiya hisobi uchun binolar prizmalari (loyiha + saqlanadigan va atrofdagi kontekst) */
  prisms(doc: Project, extra: { rings: XY[][]; h: number }[]): { ring: XY[]; top: number }[] {
    const fr = frame(doc.origin), fh = doc.settings.floorHeight, out: { ring: XY[]; top: number }[] = [];
    const base = (r: XY[]) => Math.min(...r.map(p => this.H(p[0], p[1])));
    doc.buildings.forEach(b => { const r = b.footprint.map(fr.toLocal); out.push({ ring: r, top: base(r) + ((b.z0 ?? 0) + b.floors) * fh }); });
    const keep = new Set(doc.keep);
    (this.ctx?.inSite ?? []).filter(b => keep.has(b.id)).forEach(b => out.push({ ring: b.rings[0], top: base(b.rings[0]) + b.h }));
    extra.forEach(b => out.push({ ring: b.rings[0], top: base(b.rings[0]) + b.h }));
    return out;
  }

  private far: THREE.Object3D[] = [];
  /** Gorizontgacha binolar (oddiy oq hajmlar, tomsiz, soyasiz); null — olib tashlash */
  setFar(list: { rings: LngLat[][]; h: number }[] | null, doc: Project): void {
    this.far.forEach(o => { this.scene.remove(o); const m = o as THREE.Mesh; m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
    this.far = [];
    if (list?.length) {
      const fr = frame(doc.origin), y0 = this.ground.position.y + 0.2;
      const objs = buildingMeshes(list.map((b, i) => ({ id: i, rings: b.rings.map(r => r.map(fr.toLocal)), h: b.h, kind: 'far' })), () => y0,
        new THREE.MeshLambertMaterial({ color: 0xf6f4ef }), new THREE.MeshLambertMaterial({ color: 0xf6f4ef }), new THREE.LineBasicMaterial({ color: 0xbdb8ae, transparent: true, opacity: 0.25 }));
      objs.forEach(o => { o.renderOrder = 10; this.scene.add(o); this.far.push(o); });
    }
    if (this.album) this.applyStyle();
    this.invalidate();
  }
  /** uchastka ichidagi mavjud (OSM) binolar */
  get inSite(): { id: number; rings: XY[][]; h: number }[] { return this.ctx?.inSite ?? []; }

  /** Sahna rasmi; kadr nisbati berilsa — markazdan shu nisbatda kesiladi */
  snapshot(ratio = 0): string {
    { const c = this.rcam(); this.fitSprites(c); this.renderer.render(this.scene, c); }
    const c = this.renderer.domElement; if (!ratio) return c.toDataURL('image/png');
    const r = this.frameRect(ratio), k = c.width / (c.clientWidth || c.width), o = document.createElement('canvas');
    o.width = Math.round(r.w * k); o.height = Math.round(r.h * k);
    o.getContext('2d')!.drawImage(c, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }
  /** kadr toʻrtburchagi (CSS piksel, kanvas ichida) */
  frameRect(ratio: number): { x: number; y: number; w: number; h: number } {
    const W = this.host.clientWidth || 1, H = this.host.clientHeight || 1, pad = 0.92;
    let w = W * pad, h = w / ratio; if (h > H * pad) { h = H * pad; w = h * ratio; }
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }

  /* ---------- kamera: obyektiv, koʻz sathi, 2 nuqtali perspektiva, saqlangan koʻrinishlar ---------- */
  lens = 35;
  twoPoint = false;
  private rc = new THREE.PerspectiveCamera();
  /** Chizish kamerasi: 2 nuqtali perspektivada — gorizontal qaraydi, nishon kadr markaziga linza siljishi bilan keltiriladi */
  private rcam(): THREE.Camera {
    if (!this.twoPoint || this.cam !== this.persp) return this.cam;
    const rc = this.rc, t = this.ctl.target, W = this.host.clientWidth || 1, H = this.host.clientHeight || 1;
    rc.fov = this.persp.fov; rc.aspect = this.persp.aspect; rc.near = this.persp.near; rc.far = this.persp.far;
    rc.position.copy(this.persp.position); rc.clearViewOffset();
    rc.lookAt(t.x, this.persp.position.y, t.z); rc.updateMatrixWorld(); rc.updateProjectionMatrix();
    const yt = Math.max(-3, Math.min(3, t.clone().project(rc).y));
    rc.setViewOffset(W, H, 0, -yt * H / 2, W, H); rc.updateProjectionMatrix();
    return rc;
  }
  setLens(mm: number): void { this.lens = mm; this.persp.fov = lensFov(mm); this.persp.updateProjectionMatrix(); this.invalidate(); }
  setTwoPoint(on: boolean): void { this.twoPoint = on; this.invalidate(); }
  /** Piyoda koʻzi: yerdan 1,6 m, hozirgi yoʻnalishda nishon tomon qaraydi */
  eyeLevel(): void {
    if (this.mode !== 'persp') this.setView('persp');
    const t = this.ctl.target, p = this.persp.position, dx = t.x - p.x, dz = t.z - p.z, L = Math.hypot(dx, dz) || 1;
    // kamera binolar tashqarisida: loyiha qamrovi radiusidan nariroqda
    const box = new THREE.Box3(); this.world.children.forEach(o => { if ((o as THREE.Mesh).isMesh && o.userData.bid != null) box.expandByObject(o); });
    const R = box.isEmpty() ? 60 : Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    const c = box.isEmpty() ? t : box.getCenter(new THREE.Vector3());
    const d = R + 45, ex = c.x - dx / L * d, ez = c.z - dz / L * d;
    const gy = (x: number, z: number) => this.H(x, -z) + 1.6;
    p.set(ex, gy(ex, ez), ez); this.ctl.target.set(c.x, gy(c.x, c.z) + 2, c.z);
    this.ctl.update(); this.invalidate();
  }
  getCamera(): Omit<import('../core/doc').SavedView, 'id' | 'name' | 'frame'> {
    const c = this.cam === this.persp ? this.persp : this.ortho, t = this.ctl.target;
    return { mode: this.mode, pos: [c.position.x, c.position.y, c.position.z], target: [t.x, t.y, t.z], zoom: this.ortho.zoom, lens: this.lens, twoPoint: this.twoPoint };
  }
  setCamera(v: Pick<import('../core/doc').SavedView, 'mode' | 'pos' | 'target' | 'zoom' | 'lens' | 'twoPoint'>): void {
    this.setView(v.mode); this.setLens(v.lens); this.twoPoint = v.twoPoint;
    const c = v.mode === 'persp' ? this.persp : this.ortho;
    c.position.set(...v.pos); this.ctl.target.set(...v.target); if (v.mode !== 'persp') { this.ortho.zoom = v.zoom; this.ortho.updateProjectionMatrix(); }
    this.ctl.update(); this.invalidate();
  }
}

let latT: THREE.CanvasTexture | null = null;
/** Panjara (mashrabiya) — 1,2 m katak, shaffof teshiklar */
function latticeTex(): THREE.CanvasTexture {
  if (latT) return latT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(32, 6); g.lineTo(58, 32); g.lineTo(32, 58); g.lineTo(6, 32); g.closePath(); g.fill();
  latT = new THREE.CanvasTexture(c); latT.wrapS = latT.wrapT = THREE.RepeatWrapping; latT.colorSpace = THREE.SRGBColorSpace;
  return latT;
}
let solarT: THREE.CanvasTexture | null = null;
/** Quyosh panellari: 2 × 1 m modullar (tom UV si — metrda) */
function solarTex(): THREE.CanvasTexture {
  if (solarT) return solarT;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#26364f'; g.fillRect(4, 4, 120, 56);
  g.strokeStyle = 'rgba(160,185,215,.55)'; g.lineWidth = 1.5; for (let x = 34; x < 124; x += 30) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x, 60); g.stroke(); } g.beginPath(); g.moveTo(4, 32); g.lineTo(124, 32); g.stroke();
  solarT = new THREE.CanvasTexture(c); solarT.wrapS = solarT.wrapT = THREE.RepeatWrapping; solarT.repeat.set(0.5, 1); solarT.colorSpace = THREE.SRGBColorSpace;
  return solarT;
}

/** Matnli yorliq (ekranda doimiy oʻlchamda) */
function labelSprite(text: string, badge = false): THREE.Sprite {
  const c = document.createElement('canvas'), g = c.getContext('2d')!, fs = badge ? 26 : 30;
  g.font = `600 ${fs}px Archivo, system-ui, sans-serif`; const w = Math.ceil(g.measureText(text).width) + 28;
  c.width = w; c.height = fs + 22; g.font = `600 ${fs}px Archivo, system-ui, sans-serif`;
  g.fillStyle = badge ? '#1d1d1b' : 'rgba(255,255,255,0.94)'; g.strokeStyle = '#1d1d1b'; g.lineWidth = 2; g.beginPath(); g.roundRect(1, 1, w - 2, c.height - 2, badge ? c.height / 2 : 10); g.fill(); g.stroke();
  g.fillStyle = badge ? '#ffffff' : '#1d1d1b'; g.textBaseline = 'middle'; g.fillText(text, 14, c.height / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: badge, sizeAttenuation: false }));
  const k = badge ? 0.5 : 0.55; sp.userData.px = [c.width * k, c.height * k]; sp.center.set(badge ? 0.5 : 0, 0); sp.renderOrder = 50;
  return sp;
}

/** depth — binolar orqasida yashirinsin (reja chiziqlari); chizilayotgan shakl (preview) uchun false */
function line(pts: XY[], color: number, lift: number, closed: boolean, order: number, H: HeightFn = () => 0, depth = true): THREE.Line {
  const v = pts.map(p => new THREE.Vector3(p[0], H(p[0], p[1]) + lift, -p[1])); if (closed && v.length) v.push(v[0].clone());
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color, depthTest: depth }));
  l.renderOrder = order; return l;
}

/**
 * Tekis shaklni relyefga yotqizish: uchburchaklarni qirrasi `maxEdge` m dan oshmaguncha boʻlib,
 * har uchini relyef balandligiga koʻtaradi (aks holda katta uchburchak tepaliklar ichida yoʻqoladi).
 */
function drape(g0: THREE.BufferGeometry, H: HeightFn, lift: number, maxEdge: number): THREE.BufferGeometry {
  const src = g0.index ? g0.toNonIndexed() : g0; g0.dispose();
  const p = src.attributes.position as THREE.BufferAttribute;
  type V = [number, number];
  let tris: [V, V, V][] = [];
  for (let i = 0; i < p.count; i += 3) tris.push([[p.getX(i), p.getY(i)], [p.getX(i + 1), p.getY(i + 1)], [p.getX(i + 2), p.getY(i + 2)]]);
  src.dispose();
  const L = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]), M = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (let guard = 0; guard < 12; guard++) {
    let split = false; const nt: [V, V, V][] = [];
    for (const [a, b, c] of tris) {
      if (Math.max(L(a, b), L(b, c), L(c, a)) <= maxEdge || nt.length > 60000) { nt.push([a, b, c]); continue; }
      split = true; const ab = M(a, b), bc = M(b, c), ca = M(c, a);
      nt.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    tris = nt; if (!split) break;
  }
  const pos = new Float32Array(tris.length * 9); let k = 0;
  for (const t of tris) for (const v of t) { pos[k++] = v[0]; pos[k++] = H(v[0], v[1]) + lift; pos[k++] = -v[1]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}

/** Relyefga yopishishi uchun uzun qirralarni boʻlish */
function densify(pts: XY[], step: number, closed = false): XY[] {
  const out: XY[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]; out.push(a);
    if (i === n - 1 && !closed) break;
    const b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.floor(L / step);
    for (let j = 1; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  return out;
}

function disposeGroup(g: THREE.Group): void {
  g.children.slice().forEach(o => {
    g.remove(o);
    const m = o as THREE.Mesh; m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose());
  });
}
