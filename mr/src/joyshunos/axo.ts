/**
 * Joyshunos · Aksonometriya («Joy-B» + «Joy-D» maketlari): bitta sahnada OSM binolari soyasi bilan, masofa halqalari va kompas,
 * quyosh yoʻli (21 mart · 21 iyun · 21 dekabr, soatlari bilan), shamol guli va ustun shamol strelkalari, xizmatlar va raqobatchilar belgilari.
 * Portlatilgan rejim: har qatlam alohida tekislikka koʻtariladi, yon tomonda raqamli izohlar.
 * Koordinatalar: x — sharq, y — yuqoriga, z — janubga (−shimol); markaz — tanlangan nuqta.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LngLat } from '../core/doc';
import type { ContextBundle } from '../context/load';
import { frame } from '../core/geo';
import { terrainSampler } from '../context/tiles';
import { buildContext } from '../scene/context3d';
import { sunPosition, localToUtc } from '../core/sun';
import { tr } from '../i18n';
import type { Palette } from '../context/mapstyle';

export type AxLayer = 'relyef' | 'kochalar' | 'yashil' | 'binolar' | 'xizmat' | 'shamol' | 'quyosh';
export const AX_LAYERS: { id: AxLayer; name: string; sub: string; color: string }[] = [
  { id: 'relyef', name: 'Relyef', sub: 'AWS Terrain · halqalar', color: '#8b7a6a' },
  { id: 'kochalar', name: 'Koʻchalar', sub: 'OSM', color: '#9a9893' },
  { id: 'yashil', name: 'Yashil va suv', sub: 'OSM', color: '#7fa65a' },
  { id: 'binolar', name: 'Binolar', sub: 'OSM · balandlik', color: '#141414' },
  { id: 'xizmat', name: 'Xizmatlar va raqobatchilar', sub: 'OSM', color: '#4c5bd4' },
  { id: 'shamol', name: 'Shamol', sub: 'EPW · TMYx', color: '#3f8f6b' },
  { id: 'quyosh', name: 'Quyosh yoʻli', sub: '21 mart · 21 iyun · 21 dek', color: '#e8a317' },
];
export type AxView = 'plan' | 'axo' | 'persp';
export interface AxPin { at: LngLat; label: string; col: string }
export interface AxWind { petals: number[]; rose: number[][]; bins: number[]; mean: number }
export interface AxInput { bundle: ContextBundle; center: LngLat; r: number; pins: AxPin[]; wind: AxWind | null; sat: boolean; dark: boolean; pal: Palette; site: LngLat[] | null }
/** Shamol yoʻnalishlari (asosiy, ikkinchi, uchinchi): sektor azimuti, ulushi, oʻrtacha tezligi */
export interface AxFlow { deg: number; share: number; v: number; col: string; moved?: boolean }
export const FLOW_COLS = ['#2f8a5f', '#3a7bd5', '#e07b39'];
/** EPW gulidan eng kuchli 3 yoʻnalish (bir-biridan ≥ 45° uzoq) va har birining oʻrtacha tezligi */
export function topFlows(w: AxWind): AxFlow[] {
  const mids = w.bins.map((b, i) => i < w.bins.length - 1 ? (b + w.bins[i + 1]) / 2 : b + 1);
  const idx = w.petals.map((v, i) => [v, i] as [number, number]).sort((a, b) => b[0] - a[0]), out: AxFlow[] = [];
  for (const [v, i] of idx) {
    if (out.length >= 3 || v <= 0) break;
    const deg = i * 22.5; if (out.some(f => { const d = Math.abs(((f.deg - deg + 540) % 360) - 180); return d < 45; })) continue;
    const row = w.rose[i] ?? [], tot = row.reduce((a, b) => a + b, 0);
    out.push({ deg, share: v, v: tot > 0 ? row.reduce((a, b, k) => a + b * mids[k], 0) / tot : w.mean, col: FLOW_COLS[out.length] });
  }
  return out;
}
export const SUN_DAYS: [number, number, string][] = [[3, 21, '21 mart'], [6, 21, '21 iyun'], [12, 21, '21 dekabr']];

const NAME2LAYER: Record<string, AxLayer> = { relyef: 'relyef', yashil: 'yashil', suv: 'yashil', ariqlar: 'yashil', daraxtlar: 'yashil', 'yoʻlaklar': 'kochalar', trotuarlar: 'kochalar', 'yoʻllar': 'kochalar', chiziqlar: 'kochalar', 'temir yoʻl': 'kochalar', binolar: 'binolar', tomlar: 'binolar' };
const SUN_COL = 0xe8a317, WIND_COL = 0x3f8f6b, RING_COL = 0xc0643a;

interface XYL { x: number; y: number; l: string }
interface Lbl { el: HTMLElement; p: THREE.Vector3; layer: AxLayer; kind: 'pin' | 'hour' | 'side' | 'pinD' }

export class Axo {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -20000, 20000);
  private persp = new THREE.PerspectiveCamera(32, 1, 1, 30000);
  private ctl: OrbitControls;
  private sun = new THREE.DirectionalLight(0xffffff, 1.7);
  private hemi = new THREE.HemisphereLight(0xffffff, 0xcfc9bd, 0.85);
  private groups = new Map<AxLayer, THREE.Group>();
  private labels: Lbl[] = [];
  private overlay: HTMLDivElement;
  private svg: SVGSVGElement;
  private dirty = true;
  /** soya xaritasi qayta hisoblansinmi (faqat shamol animatsiyasida — yoʻq) */
  private sdirty = true;
  private raf = 0;
  private R = 500;
  private inp: AxInput | null = null;
  private sunMarks: THREE.Object3D[] = [];
  private flowTex: { t: THREE.Texture; v: number }[] = [];
  /** foydalanuvchi koʻchirgan belgilar (kalit → mahalliy x, y) va burgan shamol yoʻnalishlari */
  pinMoves = new Map<string, [number, number]>();
  flowDeg: (number | null)[] = [null, null, null];
  private pinObjs: { key: string; sphere: THREE.Mesh; stem: THREE.Line; lbl: Lbl; label: string; col: string; hgt: number }[] = [];
  private H: (x: number, y: number) => number = () => 0;
  private model: THREE.Object3D | null = null;
  modelRot = 0;
  modelOff: [number, number] = [0, 0];
  private guides: THREE.LineSegments | null = null;
  private slabTop = 0;
  private clock = new THREE.Clock();
  /** shamol strelkalari harakatlanadi */
  animate = true;
  flows: AxFlow[] = [];
  view: AxView = 'axo';
  private placed = false;
  order: AxLayer[] = AX_LAYERS.map(l => l.id);
  vis: Record<AxLayer, boolean> = { relyef: true, kochalar: true, yashil: true, binolar: true, xizmat: true, shamol: true, quyosh: true };
  exploded = false;
  gap = 260;
  day = 1;      // SUN_DAYS indeksi
  hour = 10;
  /** kamera yoki holat oʻzgardi (UI uchun) */
  onChange: (() => void) | null = null;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(this.renderer.domElement);
    this.overlay = document.createElement('div'); this.overlay.className = 'axo-ov';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.svg.classList.add('axo-lines');
    host.append(this.svg, this.overlay);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.4;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    for (const l of AX_LAYERS) { const g = new THREE.Group(); g.name = `L-${l.id}`; this.groups.set(l.id, g); this.scene.add(g); }
    this.ctl = new OrbitControls(this.ortho, this.renderer.domElement);
    this.ctl.enableDamping = false; this.ctl.screenSpacePanning = true; this.ctl.maxPolarAngle = Math.PI * 0.48;
    this.ctl.addEventListener('change', () => { this.dirty = true; });   // kamera — soya xaritasi oʻzgarmaydi
    this.bindDrag();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, this.clock.getDelta());
      if (this.animate && this.flowTex.length && this.eff('shamol')) { for (const f of this.flowTex) f.t.offset.x -= dt * (0.25 + f.v * 0.18); this.dirty = true; }
      if (this.dirty) { this.dirty = false; this.draw(); }
    };
    loop();
  }

  private cam(): THREE.Camera { return this.view === 'persp' ? this.persp : this.ortho; }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = `${w}px`; this.renderer.domElement.style.height = `${h}px`;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    this.fitOrtho(); this.dirty = this.sdirty = true;
  }
  /** panellar egallagan joy (px): sahna oʻrtadagi boʻsh joyga sigʻdiriladi */
  insets = { l: 304, r: 296, t: 76, b: 84 };
  private fitOrtho(): void {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    const ins = { ...this.insets, r: this.insets.r + (this.exploded ? 250 : 0) };
    const W = Math.max(200, w - ins.l - ins.r), Hh = Math.max(200, h - ins.t - ins.b);
    const halfW = this.R * 1.22, halfH = this.R * (this.view === 'plan' ? 1.22 : 0.95) + this.lift() * 0.5;
    const u = Math.max(2 * halfW / W, 2 * halfH / Hh), cx = ins.l + W / 2, cy = ins.t + Hh / 2;
    Object.assign(this.ortho, { left: -cx * u, right: (w - cx) * u, top: cy * u, bottom: -(h - cy) * u });
    this.ortho.updateProjectionMatrix();
    // perspektiva: markazni boʻsh joy oʻrtasiga surish
    this.persp.setViewOffset(w, h, (ins.l - ins.r) / -2, (ins.t - ins.b) / -2, w, h);
  }

  /* ---------------- sahnani qurish ---------------- */
  setData(inp: AxInput): void {
    this.inp = inp; this.R = inp.r;
    for (const g of this.groups.values()) { g.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); }); g.clear(); }
    this.labels.forEach(l => l.el.remove()); this.labels = []; this.pinObjs = [];
    this.scene.background = new THREE.Color(inp.dark ? 0x17181a : 0xf4f2ee);
    const fr = frame(inp.center), Hs = terrainSampler(inp.bundle.terrain), H = (x: number, y: number) => Hs(x, y); this.H = H;
    // kontekst (OSM): qismlari qatlamlarga taqsimlanadi
    const ctxR = inp.bundle.radius;
    let tex: THREE.Texture | null = null;
    if (inp.sat && inp.bundle.imagery) { tex = new THREE.Texture(); tex.colorSpace = THREE.SRGBColorSpace; void createImageBitmap(inp.bundle.imagery.image).then(bm => { tex!.image = bm; tex!.needsUpdate = true; this.dirty = this.sdirty = true; }).catch(() => {}); }
    const cs = buildContext(inp.bundle, fr, { radius: ctxR, base: inp.sat ? 'sputnik' : 'maket', layers: { buildings: true, roads: true, rail: true, water: true, green: true, trees: true, relief: true }, loaded: true }, H, tex);
    let last: AxLayer = 'kochalar';
    for (const o of [...cs.group.children]) {
      const L: AxLayer = NAME2LAYER[o.name] ?? (o.name ? 'kochalar' : last); last = L;
      if (o.name === 'daraxtlar') { const t = (o as THREE.Object3D).userData.trunk as THREE.Object3D | undefined; if (t) this.groups.get('yashil')!.add(t); }
      this.groups.get(L)!.add(o);
    }
    // doira boʻylab qirqish (kvadrat kontekst chetlari koʻrinmasin)
    const clipR = ctxR * 0.98;
    for (const id of ['relyef', 'kochalar', 'yashil', 'binolar'] as AxLayer[]) this.groups.get(id)!.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => circleClip(x, clipR)); });
    const ground = cs.ground; ground.receiveShadow = true;
    this.paint(inp.pal, inp.sat, ground);
    this.groups.get('binolar')!.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    // eng past relyef nuqtasi — plastinkalar shu sathda
    let hmin = Infinity; for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) { const x = i / 20 * clipR, y = j / 20 * clipR; if (x * x + y * y <= clipR * clipR) hmin = Math.min(hmin, H(x, y)); }
    this.slabTop = Number.isFinite(hmin) ? hmin - 0.3 : -0.3;
    this.slabs(clipR, inp.pal, inp.dark);
    this.rings(H);
    this.pins(fr, H, inp.pins);
    this.site(fr, inp.site);
    this.wind(inp.wind);
    this.sunPaths();
    if (this.model) this.placeModel();
    this.sideLabels();
    // yorugʻlik va soya kamerasi
    const sc = this.sun.shadow.camera; Object.assign(sc, { left: -ctxR * 1.1, right: ctxR * 1.1, top: ctxR * 1.1, bottom: -ctxR * 1.1, near: 1, far: ctxR * 8 }); sc.updateProjectionMatrix();
    this.fitOrtho(); this.setView(this.view, true); this.applyLayers(); this.setTime(this.day, this.hour);
  }

  /** Palitra (Master rejadagi 7 uslub): yer, koʻchalar, yashil, suv, binolar */
  private paint(P: Palette, sat: boolean, ground: THREE.Mesh): void {
    const set = (o: THREE.Object3D, c: string, op?: number) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if (!m?.color) return; m.color.set(c); if (op != null) { m.transparent = true; m.opacity = op; } };
    if (!sat) set(ground, P.bg);
    const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
    for (const g of this.groups.values()) g.traverse(o => {
      switch (o.name) {
        case 'yashil': set(o, P.park); break;
        case 'suv': case 'ariqlar': set(o, P.water); break;
        case 'yoʻllar': set(o, P.road); break;
        case 'trotuarlar': case 'yoʻlaklar': set(o, mix(P.road, P.rc, 0.55)); break;
        case 'chiziqlar': o.visible = false; break;
        case 'temir yoʻl': set(o, P.rail); break;
        case 'binolar': case 'tomlar': set(o, P.bld); break;
        default: if ((o as THREE.LineSegments).isLineSegments && o.parent === this.groups.get('binolar')) set(o, P.bl, 0.55);
      }
    });
    // yoʻl chetlari (asfaltdan kengroq qatlam) — palitraning chiziq rangida
    this.scene.background = new THREE.Color(this.inp?.dark ? 0x17181a : 0xf4f2ee);
  }

  /** Portlatilgan rejim uchun qalin doira plastinkalar (relyef — tuproq asosi) va tik punktir yoʻnaltiruvchilar */
  private slabs(rC: number, P: Palette, dark: boolean): void {
    const R = this.R, top = this.slabTop;
    const soil = new THREE.MeshLambertMaterial({ color: dark ? 0x4a3f33 : 0x9b8264 }), soilDark = new THREE.MeshLambertMaterial({ color: dark ? 0x342c24 : 0x7a644a });
    const base = new THREE.Color(P.bg), side = '#' + base.clone().multiplyScalar(0.82).getHexString();
    for (const id of ['relyef', 'kochalar', 'yashil', 'binolar'] as AxLayer[]) {
      const T = id === 'relyef' ? Math.max(8, R * 0.07) : Math.max(2, R * 0.012), g = new THREE.Group(); g.name = 'slab'; g.userData.slab = true;
      if (id === 'relyef') {
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(rC, rC, T, 128, 1, true), soil); wall.position.y = top - T / 2 + 0.3;
        const bot = new THREE.Mesh(new THREE.CircleGeometry(rC, 128), soilDark); bot.rotation.x = Math.PI / 2; bot.position.y = top - T + 0.3;
        g.add(wall, bot);
      } else {
        const mats = [new THREE.MeshLambertMaterial({ color: side }), new THREE.MeshLambertMaterial({ color: P.bg }), new THREE.MeshLambertMaterial({ color: side })];
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(rC, rC, T, 128), mats); disc.position.y = top - T / 2 - 0.4; disc.receiveShadow = true;
        g.add(disc);
      }
      g.visible = false; this.groups.get(id)!.add(g);
    }
  }

  private textPlane(text: string, size: number, color: string, weight = 600): THREE.Mesh {
    const c = document.createElement('canvas'), x = c.getContext('2d')!, fs = 64;
    x.font = `${weight} ${fs}px Archivo, system-ui, sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + 24; c.width = w; c.height = fs + 24;
    x.font = `${weight} ${fs}px Archivo, system-ui, sans-serif`; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 12; x.strokeStyle = this.inp?.dark ? 'rgba(23,24,26,.9)' : 'rgba(255,255,255,.92)'; x.strokeText(text, 8, c.height / 2); x.fillStyle = color; x.fillText(text, 8, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * w / c.height, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 40; return m;
  }

  /** Masofa halqalari (100 m qadam) va kompas — relyef qatlamida, yerga yozilgan */
  private rings(H: (x: number, y: number) => number): void {
    const g = this.groups.get('relyef')!, R = this.R, dark = this.inp!.dark, ink = dark ? '#d6d3cc' : '#3a3936';
    const step = R > 600 ? 200 : 100, radii: number[] = [];
    for (let r = step; r < R - step * 0.4; r += step) radii.push(r);
    radii.push(R);
    for (const r of radii) {
      const main = r === R;
      g.add(dashRing(r, main ? Math.max(1.4, R * 0.004) : Math.max(0.8, R * 0.0022), main ? 26 : 14, main ? 0.55 : 0.5, main ? RING_COL : (dark ? 0x8a877f : 0x6b6965), H));
      const lab = this.textPlane(`${r} m`, Math.max(14, R * 0.06), main ? '#c0643a' : ink);
      const a = -0.75 * Math.PI; lab.position.set(Math.cos(a) * r, H(Math.cos(a) * r, Math.sin(a) * r) + 14, -Math.sin(a) * r);
      lab.rotation.z = a + Math.PI / 2; g.add(lab);
    }
    // kompas: tashqi halqa, darajalar va N, E, S, W (relyefga yopishgan)
    const RC = R * 1.08, tick: THREE.Vector3[] = [], col = dark ? 0xa3a09a : 0x3a3936;
    const at = (rr: number, a: number, dz = 0.9) => { const x = Math.cos(a) * rr, y = Math.sin(a) * rr; return new THREE.Vector3(x, H(x, y) + dz, -y); };
    for (let d = 0; d < 360; d += 10) { const a = (90 - d) * Math.PI / 180, l = d % 90 === 0 ? R * 0.04 : d % 30 === 0 ? R * 0.024 : R * 0.012; tick.push(at(RC, a), at(RC + l, a)); }
    const tk = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), new THREE.LineBasicMaterial({ color: col })); tk.renderOrder = 31; g.add(tk);
    g.add(dashRing(RC, Math.max(0.8, R * 0.0025), 1, 1, col, H));
    for (const [d, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']] as const) {
      const a = (90 - d) * Math.PI / 180, m = this.textPlane(t, R * 0.09, d === 0 ? '#c0643a' : ink, 700);
      m.position.copy(at(RC + R * 0.1, a, 1.2)); g.add(m);
    }
  }

  /** Xizmatlar va raqobatchilar: ustun + shar + HTML yorliq */
  private pins(fr: ReturnType<typeof frame>, H: (x: number, y: number) => number, pins: AxPin[]): void {
    const g = this.groups.get('xizmat')!, hgt = Math.max(16, this.R * 0.05);
    const pos: number[] = [];
    const seen: XYL[] = [];
    for (const p of pins) {
      if (seen.length >= 60) break;
      const [x, y] = fr.toLocal(p.at);
      if (seen.some(q => q.l === p.label && Math.hypot(q.x - x, q.y - y) < 180)) continue;
      seen.push({ x, y, l: p.label });
      const moved = this.pinMoves.get(p.label + '@' + Math.round(x) + ',' + Math.round(y));
      const px = moved ? moved[0] : x, py = moved ? moved[1] : y, z0 = H(px, py);
      const s = new THREE.Mesh(new THREE.SphereGeometry(Math.max(2.4, this.R * 0.008), 12, 8), new THREE.MeshBasicMaterial({ color: p.col })); s.position.set(px, z0 + hgt, -py); s.userData.pin = true; g.add(s);
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px, z0, -py), new THREE.Vector3(px, z0 + hgt, -py)]), new THREE.LineBasicMaterial({ color: 0x6b6965 })); g.add(stem);
      const el = document.createElement('div'); el.className = 'axo-pin'; el.innerHTML = `<i style="background:${p.col}"></i>${escapeHtml(p.label)}`;
      const lb: Lbl = { el, p: new THREE.Vector3(px, z0 + hgt, -py), layer: 'xizmat', kind: 'pin' };
      this.overlay.append(el); this.labels.push(lb);
      this.pinObjs.push({ key: p.label + '@' + Math.round(x) + ',' + Math.round(y), sphere: s, stem, lbl: lb, label: p.label, col: p.col, hgt });
    }
    void pos;
  }

  /** Shamol: yerda 16 sektorli gul (xira) va 3 yoʻnalishning harakatlanuvchi egri strelkalari (ArchiDiagram kabi) */
  private wind(w: AxWind | null): void {
    const g = this.groups.get('shamol')!; g.children.filter(c => !c.userData.slab).forEach(c => { c.removeFromParent(); c.traverse(o => (o as THREE.Mesh).geometry?.dispose()); }); this.flowTex = []; this.flows = []; if (!w) return;
    const R = this.R, petals = w.petals, mx = Math.max(...petals, 1e-6), r0 = R * 0.04, rM = R * 0.3, y = 1.2;
    const pos: number[] = [];
    petals.forEach((v, i) => {
      const r = r0 + (v / mx) * (rM - r0), steps = 6;
      for (let k = 0; k < steps; k++) {
        const a0 = ((i * 22.5 - 9 + 18 * k / steps)) * Math.PI / 180, a1 = ((i * 22.5 - 9 + 18 * (k + 1) / steps)) * Math.PI / 180;
        const P = (rr: number, a: number) => [Math.sin(a) * rr, y, -Math.cos(a) * rr];
        pos.push(...P(r0, a0), ...P(r, a0), ...P(r, a1), ...P(r0, a0), ...P(r, a1), ...P(r0, a1));
      }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const rose = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: WIND_COL, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })); rose.renderOrder = 35; g.add(rose);
    // harakatlanuvchi strelkalar
    this.flows = topFlows(w).map((f, i) => this.flowDeg[i] != null ? { ...f, deg: this.flowDeg[i]!, moved: true } : f);
    const smax = Math.max(...this.flows.map(f => f.share), 1e-6);
    this.flows.forEach((f, rank) => {
      const tex = chevronTex(); this.flowTex.push({ t: tex, v: f.v });
      const n = 4 - rank, width = R * (0.012 + 0.016 * f.share / smax), a = f.deg * Math.PI / 180;
      const dir = new THREE.Vector2(-Math.sin(a), -Math.cos(a));            // oqim yoʻnalishi (x — sharq, y — shimol)
      const side = new THREE.Vector2(-dir.y, dir.x);
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * R * 0.16 + R * 0.05 * (rank - 1), bend = R * (0.12 + 0.05 * k) * (rank % 2 ? -1 : 1);
        const p0 = dir.clone().multiplyScalar(-R * 1.0).add(side.clone().multiplyScalar(off));
        const p2 = dir.clone().multiplyScalar(-R * (0.22 + 0.06 * k)).add(side.clone().multiplyScalar(off * 0.7));
        const p1 = p0.clone().lerp(p2, 0.5).add(side.clone().multiplyScalar(bend));
        const h0 = R * (0.07 + 0.02 * rank);
        const fl = flowRibbon(p0, p1, p2, width, h0, f.col, tex); fl.userData.flow = rank; fl.traverse(o => { o.userData.flow = rank; }); g.add(fl);
      }
    });
  }

  /** Quyosh yoʻllari (3 kun), soat nuqtalari; joriy quyosh — setTime da */
  private sunPaths(): void {
    const g = this.groups.get('quyosh')!, [lng, lat] = this.inp!.center, D = this.R * 0.95;
    SUN_DAYS.forEach(([mo, d], k) => {
      const pts: THREE.Vector3[] = [];
      for (let t = 4; t <= 21; t += 0.25) { const s = sunPosition(localToUtc(2026, mo, d, t), lat, lng); if (s.alt > 0) pts.push(sunVec(s, D)); }
      if (pts.length < 2) return;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: SUN_COL, dashSize: 6, gapSize: 5, transparent: true, opacity: k === 1 ? 0.95 : 0.6 }));
      line.computeLineDistances(); line.userData.day = k; g.add(line);
      // «quyosh soatlari» yuzasi: yoydan markazga tushgan yarim shaffof parda
      const fan: number[] = []; for (let i = 1; i < pts.length; i++) fan.push(0, 0, 0, pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z);
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
      const fm = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: SUN_COL, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); fm.userData.day = k; fm.userData.fan = true; fm.renderOrder = 36; g.add(fm);
      for (let t = 5; t <= 20; t++) {
        const s = sunPosition(localToUtc(2026, mo, d, t), lat, lng); if (s.alt <= 0) continue;
        const v = sunVec(s, D), dot = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.009, 10, 8), new THREE.MeshBasicMaterial({ color: SUN_COL }));
        dot.position.copy(v); dot.userData.day = k; g.add(dot);
        const el = document.createElement('div'); el.className = 'axo-hour'; el.textContent = String(t); el.dataset.day = String(k);
        this.overlay.append(el); this.labels.push({ el, p: v.clone(), layer: 'quyosh', kind: 'hour' });
      }
    });
  }

  /** Portlatilgan rejim: oʻng tomondagi raqamli izohlar */
  private sideLabels(): void {
    const s = (this.inp?.bundle.radius ?? this.R) * 0.98;
    for (const l of AX_LAYERS) {
      const el = document.createElement('div'); el.className = 'axo-side'; el.dataset.layer = l.id;
      el.innerHTML = `<b></b><span><strong>${escapeHtml(tr(l.name))}</strong><small>${escapeHtml(tr(l.sub))}</small></span>`;
      this.overlay.append(el); this.labels.push({ el, p: new THREE.Vector3(s, this.slabTop, 0), layer: l.id, kind: 'side' });
    }
  }
  /** Yoyilganda koʻrinadimi: quyosh va shamol diagrammasi faqat yigʻilgan koʻrinishda */
  eff(id: AxLayer): boolean { return this.vis[id] && !(this.exploded && (id === 'shamol' || id === 'quyosh')); }

  /** Foydalanuvchi uchastkasi: har qatlamda qizil punktir kontur va xira toʻldirish (portlatilganda ham har diskda) */
  private siteLocal: [number, number][] | null = null;
  private site(fr: ReturnType<typeof frame>, ring: LngLat[] | null): void {
    this.siteLocal = ring && ring.length > 2 ? ring.map(p => fr.toLocal(p) as [number, number]) : null;
    if (!this.siteLocal) return;
    const loc = this.siteLocal, H = this.H;
    for (const id of ['relyef', 'kochalar', 'yashil', 'binolar', 'xizmat'] as AxLayer[]) {
      const g = new THREE.Group(); g.name = 'uchastka'; g.userData.site = true;
      const y0 = (x: number, y: number) => (id === 'xizmat' ? this.slabTop + 0.5 : Math.max(H(x, y), this.slabTop) + 1.2);
      const pts = [...loc, loc[0]].map(([x, y]) => new THREE.Vector3(x, y0(x, y), -y));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xd2492f, dashSize: this.R * 0.012, gapSize: this.R * 0.008, depthTest: id === 'binolar' }));
      line.computeLineDistances(); line.renderOrder = 45; g.add(line);
      try {
        const shp = new THREE.Shape(loc.map(([x, y]) => new THREE.Vector2(x, y)));
        const fg = new THREE.ShapeGeometry(shp); fg.rotateX(-Math.PI / 2); fg.translate(0, Math.max(this.slabTop, H(loc[0][0], loc[0][1])) + 1, 0);
        const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xd2492f, transparent: true, opacity: id === 'binolar' ? 0.12 : 0.18, depthWrite: false, side: THREE.DoubleSide })); fill.renderOrder = 44; g.add(fill);
      } catch { /* notoʻgʻri koʻpburchak */ }
      this.groups.get(id)!.add(g);
    }
  }
  /** Uchastka chegarasining mahalliy koordinatalari (SVG eksporti uchun) */
  siteRing(): [number, number][] | null { return this.siteLocal; }

  /** Foydalanuvchi modeli (OBJ/GLB yoki Master rejadan): binolar qatlamida, koʻk rangda, soya bilan */
  setModel(obj: THREE.Object3D | null): void {
    if (this.model) { this.model.removeFromParent(); this.model.traverse(o => (o as THREE.Mesh).geometry?.dispose?.()); }
    this.model = obj;
    if (obj) {
      const mat = new THREE.MeshLambertMaterial({ color: 0x5b7fa8 }), edge = new THREE.LineBasicMaterial({ color: 0x2f4a6b });
      const edges: THREE.LineSegments[] = [];
      obj.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = mat; m.castShadow = m.receiveShadow = true; edges.push(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), edge)); m.add(edges[edges.length - 1]); } });
      this.placeModel();
    }
    this.dirty = this.sdirty = true; this.onChange?.();
  }
  hasModel(): boolean { return !!this.model; }
  placeModel(): void {
    const m = this.model; if (!m) return;
    const g = this.groups.get('binolar')!; if (m.parent !== g) g.add(m);
    m.rotation.y = this.modelRot * Math.PI / 180; m.position.set(this.modelOff[0], this.H(this.modelOff[0], this.modelOff[1]), -this.modelOff[1]);
    this.dirty = this.sdirty = true;
  }

  /* ---------------- sudrash: quyosh, shamol strelkalari, belgilar ---------------- */
  private drag: { kind: 'sun' | 'flow' | 'pin'; i: number } | null = null;
  private ray = new THREE.Raycaster();
  private ndc(e: PointerEvent): THREE.Vector2 { const r = this.renderer.domElement.getBoundingClientRect(); return new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  private hit(e: PointerEvent): { kind: 'sun' | 'flow' | 'pin'; i: number } | null {
    this.ray.setFromCamera(this.ndc(e), this.cam());
    const targets: THREE.Object3D[] = [];
    if (this.eff('quyosh') && this.sunMarks[0]) targets.push(this.sunMarks[0]);
    if (this.eff('shamol')) this.groups.get('shamol')!.traverse(o => { if (o.userData.flow != null && (o as THREE.Mesh).isMesh) targets.push(o); });
    if (this.eff('xizmat')) this.pinObjs.forEach(p => targets.push(p.sphere));
    const h = this.ray.intersectObjects(targets, false)[0]; if (!h) return null;
    if (h.object === this.sunMarks[0]) return { kind: 'sun', i: 0 };
    if (h.object.userData.flow != null) return { kind: 'flow', i: h.object.userData.flow as number };
    const i = this.pinObjs.findIndex(p => p.sphere === h.object); return i >= 0 ? { kind: 'pin', i } : null;
  }
  private ground(e: PointerEvent, y = 0): THREE.Vector3 | null {
    this.ray.setFromCamera(this.ndc(e), this.cam());
    const p = new THREE.Vector3(); return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }
  private bindDrag(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return; const h = this.hit(e); if (!h) return;
      this.drag = h; this.ctl.enabled = false; el.setPointerCapture(e.pointerId); e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      if (!this.drag) { const h = this.hit(e); el.style.cursor = h ? 'grab' : ''; return; }
      el.style.cursor = 'grabbing';
      const d = this.drag;
      if (d.kind === 'sun') {
        // tanlangan kun yoʻlidagi eng yaqin nuqta (ekranda)
        const inp = this.inp!, [mo, dd] = SUN_DAYS[this.day], r = el.getBoundingClientRect(), D = this.R * 0.95, cam = this.cam(), off = this.groups.get('quyosh')!.position.y;
        let best = this.hour, bd = Infinity;
        for (let t = 4; t <= 21; t += 0.25) { const s = sunPosition(localToUtc(2026, mo, dd, t), inp.center[1], inp.center[0]); if (s.alt <= 0) continue; const v = sunVec(s, D); v.y += off; v.project(cam); const x = (v.x + 1) / 2 * r.width + r.left, y = (1 - v.y) / 2 * r.height + r.top, q = (x - e.clientX) ** 2 + (y - e.clientY) ** 2; if (q < bd) { bd = q; best = t; } }
        if (best !== this.hour) this.setTime(this.day, best);
      } else if (d.kind === 'flow') {
        const p = this.ground(e); if (!p) return;
        // strelka shamol kelayotgan tomonda boshlanadi: azimut = nuqta yoʻnalishi
        const deg = (Math.atan2(p.x, -p.z) * 180 / Math.PI + 360) % 360;
        this.flowDeg[d.i] = Math.round(deg / 5) * 5; this.wind(this.inp?.wind ?? null); this.dirty = true; this.onChange?.();
      } else {
        const po = this.pinObjs[d.i], p = this.ground(e, this.groups.get('xizmat')!.position.y); if (!po || !p) return;
        const x = p.x, y = -p.z, z0 = this.H(x, y);
        po.sphere.position.set(x, z0 + po.hgt, -y); po.lbl.p.set(x, z0 + po.hgt, -y);
        po.stem.geometry.setFromPoints([new THREE.Vector3(x, z0, -y), new THREE.Vector3(x, z0 + po.hgt, -y)]);
        this.pinMoves.set(po.key, [x, y]); this.dirty = true;
      }
    });
    const end = (e: PointerEvent) => { if (!this.drag) return; this.drag = null; this.ctl.enabled = true; el.style.cursor = ''; try { el.releasePointerCapture(e.pointerId); } catch { /* */ } this.sdirty = true; this.onChange?.(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  resetWind(): void { this.flowDeg = [null, null, null]; this.wind(this.inp?.wind ?? null); this.dirty = true; this.onChange?.(); }
  resetPins(): void { this.pinMoves.clear(); if (this.inp) this.setData(this.inp); }

  /** Eksport uchun ichki maʼlumot */
  exportState(): { cam: THREE.Camera; w: number; h: number; groups: Map<AxLayer, THREE.Group>; inp: AxInput | null; R: number; clipR: number; slabTop: number; pins: { x: number; y: number; z: number; label: string; col: string; layer: AxLayer }[]; flows: AxFlow[]; H: (x: number, y: number) => number; model: THREE.Object3D | null } {
    return { cam: this.cam(), w: this.host.clientWidth, h: this.host.clientHeight, groups: this.groups, inp: this.inp, R: this.R, clipR: (this.inp?.bundle.radius ?? this.R) * 0.98, slabTop: this.slabTop,
      pins: this.pinObjs.map(p => ({ x: p.sphere.position.x, y: -p.sphere.position.z, z: p.sphere.position.y, label: p.label, col: p.col, layer: 'xizmat' as AxLayer })), flows: this.flows, H: this.H, model: this.model };
  }

  /** Massing: koʻrinib turgan binolar, relyef, uchastka va model — GLB yoki OBJ (Y — yuqori, metr) */
  async massing(kind: 'glb' | 'obj'): Promise<Blob> {
    const root = new THREE.Group(); root.name = 'Joyshunos';
    for (const id of ['relyef', 'kochalar', 'yashil', 'binolar'] as AxLayer[]) {
      const g = this.groups.get(id)!; if (!this.eff(id)) continue;
      const out = new THREE.Group(); out.name = id;
      g.updateMatrixWorld(true);
      g.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh || !m.visible || (m as unknown as THREE.InstancedMesh).isInstancedMesh || o.parent?.userData.slab || o.userData.slab) return; const c = new THREE.Mesh(m.geometry, (m.material as THREE.Material)); c.name = m.name || id; m.matrixWorld.decompose(c.position, c.quaternion, c.scale); out.add(c); });
      root.add(out);
    }
    if (kind === 'glb') { const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js'); const buf = await new GLTFExporter().parseAsync(root, { binary: true }) as ArrayBuffer; return new Blob([buf], { type: 'model/gltf-binary' }); }
    const { OBJExporter } = await import('three/addons/exporters/OBJExporter.js'); return new Blob([new OBJExporter().parse(root)], { type: 'text/plain' });
  }

  /* ---------------- boshqaruv ---------------- */
  setView(v: AxView, keep = false): void {
    const prevCam = this.cam();
    this.view = v;
    const R = this.R, cam = this.cam() as THREE.OrthographicCamera | THREE.PerspectiveCamera;
    this.ctl.object = cam;
    if (!keep || !this.placed || prevCam !== cam || v === 'plan') {
      this.placed = true;
      this.ctl.target.set(0, this.exploded ? this.lift() / 2 : 0, 0);
      if (v === 'plan') cam.position.set(0, R * 6, 0.001);
      else if (v === 'axo') cam.position.set(R * 3, R * (this.exploded ? 2.25 : 2.6), R * 3);   // ~ izometriya (35°); yoyilganda pastroq (≈ 28°) — qatlamlar ajralib koʻrinadi
      else cam.position.set(R * 1.7, R * 1.25, R * 1.9);
      cam.up.set(0, 1, 0); cam.lookAt(this.ctl.target);
    }
    this.ctl.enableRotate = v !== 'plan';
    this.fitOrtho();
    this.ctl.update(); this.dirty = this.sdirty = true; this.onChange?.();
  }
  /** kamerani boshlangʻich holatga */
  reset(): void { this.ortho.zoom = 1; this.placed = false; this.setView(this.view); }
  zoomBy(f: number): void { if (this.view === 'persp') { this.persp.position.lerp(this.ctl.target, 1 - 1 / f); } else { this.ortho.zoom = Math.max(0.2, Math.min(12, this.ortho.zoom * f)); this.ortho.updateProjectionMatrix(); } this.ctl.update(); this.dirty = this.sdirty = true; }
  private lift(): number { return this.exploded ? (this.order.filter(id => this.eff(id)).length - 1) * this.gap * this.R / 500 : 0; }
  applyLayers(): void {
    let k = 0; const ys: number[] = [];
    for (const id of this.order) {
      const g = this.groups.get(id)!, on = this.eff(id); g.visible = on;
      g.position.y = this.exploded && on ? k * this.gap * this.R / 500 : 0;
      if (on) { ys.push(g.position.y); k++; }
      g.children.forEach(c => { if (c.userData.slab) c.visible = this.exploded; });
    }
    // tik punktir yoʻnaltiruvchilar (qatlamlar orasida)
    this.guides?.removeFromParent(); this.guides?.geometry.dispose(); this.guides = null;
    if (this.exploded && ys.length > 1) {
      const rC = (this.inp?.bundle.radius ?? this.R) * 0.9, pos: number[] = [], y0 = Math.min(...ys) + this.slabTop, y1 = Math.max(...ys) + this.slabTop;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; pos.push(Math.cos(a) * rC, y0, -Math.sin(a) * rC, Math.cos(a) * rC, y1, -Math.sin(a) * rC); }
      for (const [x, y] of this.siteLocal ?? []) pos.push(x, y0 + 1, -y, x, y1 + 1, -y);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.guides = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: 0xc0643a, dashSize: this.R * 0.02, gapSize: this.R * 0.015, transparent: true, opacity: 0.7 }));
      this.guides.computeLineDistances(); this.scene.add(this.guides);
    }
    this.dirty = this.sdirty = true; this.onChange?.();
  }
  setExplode(on: boolean, gap = this.gap): void { const was = this.exploded; this.exploded = on; this.gap = gap; this.applyLayers(); if (was !== on && this.view === 'axo') { this.placed = false; this.setView('axo'); } this.fitOrtho(); if (this.view !== 'plan') { const dy = this.lift() / 2 - this.ctl.target.y; this.ctl.target.y += dy; this.ortho.position.y += dy; this.persp.position.y += dy; this.ctl.update(); } this.dirty = this.sdirty = true; }
  setTime(day: number, hour: number): void {
    this.day = day; this.hour = hour;
    const inp = this.inp; if (!inp) return;
    const [mo, d] = SUN_DAYS[day], s = sunPosition(localToUtc(2026, mo, d, hour), inp.center[1], inp.center[0]);
    const D = this.R * 0.95, v = sunVec(s, Math.max(D, 1));
    this.sun.position.copy(v.clone().normalize().multiplyScalar(this.R * 3)); this.sun.target.position.set(0, 0, 0);
    this.sun.intensity = s.alt > 0 ? 1.7 : 0; this.hemi.intensity = s.alt > 0 ? 0.85 : 1.4;
    const g = this.groups.get('quyosh')!;
    for (const m of this.sunMarks) { m.removeFromParent(); (m as THREE.Mesh).geometry?.dispose(); }
    this.sunMarks = [];
    if (s.alt > 0) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.03, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe0532c })); ball.position.copy(v);
      const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v, new THREE.Vector3(0, 0, 0)]), new THREE.LineDashedMaterial({ color: SUN_COL, dashSize: 5, gapSize: 4 })); ray.computeLineDistances();
      g.add(ball, ray); this.sunMarks.push(ball, ray);
    }
    g.children.forEach(o => { if (o.userData.day != null) { const mat = (o as THREE.Mesh).material as THREE.Material & { opacity: number }; mat.transparent = true; mat.opacity = o.userData.fan ? (o.userData.day === day ? 0.2 : 0.05) : (o.userData.day === day ? 1 : 0.35); } });
    this.labels.forEach(l => { if (l.kind === 'hour') l.el.classList.toggle('dim', l.el.dataset.day !== String(day)); });
    this.dirty = this.sdirty = true; this.onChange?.();
  }
  sunInfo(): { alt: number; az: number } | null { const inp = this.inp; if (!inp) return null; const [mo, d] = SUN_DAYS[this.day]; return sunPosition(localToUtc(2026, mo, d, this.hour), inp.center[1], inp.center[0]); }

  /* ---------------- chizish ---------------- */
  private draw(): void {
    const cam = this.cam();
    if (this.sdirty) { this.renderer.shadowMap.needsUpdate = true; this.sdirty = false; }
    this.renderer.render(this.scene, cam);
    this.placeLabels(cam, this.host.clientWidth, this.host.clientHeight);
  }
  private project(p: THREE.Vector3, layer: AxLayer, cam: THREE.Camera, w: number, h: number): [number, number, boolean] {
    const v = p.clone(); v.y += this.groups.get(layer)!.position.y; v.project(cam);
    return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h, v.z < 1 && v.z > -1];
  }
  private placeLabels(cam: THREE.Camera, w: number, h: number): void {
    const lines: string[] = [], sideX = w - this.insets.r - 250;
    const side = this.labels.filter(l => l.kind === 'side');
    let n = 0; const boxes: number[][] = [];
    for (const l of this.labels) {
      const vis = this.eff(l.layer) && (l.kind !== 'side' || this.exploded);
      l.el.hidden = !vis; if (!vis) continue;
      const [x, y, ok] = this.project(l.p, l.layer, cam, w, h);
      if (l.kind === 'side') continue;
      l.el.hidden = !ok; l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      if (l.kind === 'pin' && ok) {
        const bw = (l.el as HTMLElement & { _w?: number })._w ??= l.el.offsetWidth || 80, r = [x - 6, y - 28, x - 6 + bw, y - 8];
        if (boxes.some(b => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1])) l.el.hidden = true; else boxes.push(r);
      }
    }
    // portlatilgan: oʻng tomonda raqamli izohlar, qatlam burchagiga chiziq
    if (this.exploded) {
      const vis = this.order.filter(id => this.eff(id)).slice().reverse();
      for (const id of vis) {
        const l = side.find(s => s.layer === id); if (!l) continue; n++;
        const [x, y] = this.project(l.p, l.layer, cam, w, h);
        l.el.style.transform = `translate(${sideX}px,${(y - 14).toFixed(1)}px)`;
        (l.el.querySelector('b') as HTMLElement).textContent = String(this.order.filter(i => this.eff(i)).indexOf(id) + 1).padStart(2, '0');
        lines.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)}H${sideX - 8}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`);
      }
    }
    this.svg.innerHTML = lines.join('');
  }

  /** PNG: WebGL kadri + HTML yorliqlar (kenglik W px) */
  async png(W = 3840): Promise<Blob> {
    const w = this.host.clientWidth, h = this.host.clientHeight, k = W / w, pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(k); this.renderer.setSize(w, h, false);
    const cam = this.cam(); this.renderer.shadowMap.needsUpdate = true; this.renderer.render(this.scene, cam);
    const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const x = cv.getContext('2d')!; x.drawImage(this.renderer.domElement, 0, 0, cv.width, cv.height);
    x.scale(k, k);
    // chiziqlar
    x.strokeStyle = getComputedStyle(this.svg).stroke || '#6b6965'; x.fillStyle = x.strokeStyle; x.lineWidth = 1;
    this.svg.querySelectorAll('path').forEach(p => { const m = /M([\d.]+) ([\d.]+)H([\d.]+)/.exec(p.getAttribute('d') || ''); if (m) { x.beginPath(); x.moveTo(+m[1], +m[2]); x.lineTo(+m[3], +m[2]); x.stroke(); x.beginPath(); x.arc(+m[1], +m[2], 3, 0, Math.PI * 2); x.fill(); } });
    // yorliqlar — DOM dagi oʻrni va uslubi boʻyicha
    const hb = this.host.getBoundingClientRect();
    this.overlay.querySelectorAll<HTMLElement>('.axo-pin,.axo-hour,.axo-side').forEach(el => {
      if (el.hidden) return; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const lx = r.left - hb.left, ly = r.top - hb.top;
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { x.fillStyle = cs.backgroundColor; roundRect(x, lx, ly, r.width, r.height, 6); x.fill(); }
      x.fillStyle = cs.color; x.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; x.textBaseline = 'middle';
      const dot = el.querySelector('i') as HTMLElement | null;
      let tx = lx + parseFloat(cs.paddingLeft || '0');
      if (dot) { const dr = dot.getBoundingClientRect(); x.fillStyle = getComputedStyle(dot).backgroundColor; x.beginPath(); x.arc(dr.left - hb.left + dr.width / 2, dr.top - hb.top + dr.height / 2, dr.width / 2, 0, Math.PI * 2); x.fill(); tx = dr.right - hb.left + 5; x.fillStyle = cs.color; }
      if (el.classList.contains('axo-side')) {
        const b = el.querySelector('b')!, s = el.querySelector('strong')!, sm = el.querySelector('small')!;
        const t = (n: Element) => { const rr = n.getBoundingClientRect(), c2 = getComputedStyle(n); x.fillStyle = c2.color; x.font = `${c2.fontWeight} ${c2.fontSize} ${c2.fontFamily}`; x.fillText(n.textContent || '', rr.left - hb.left, rr.top - hb.top + rr.height / 2); };
        t(b); t(s); t(sm);
      } else x.fillText(el.textContent || '', tx, ly + r.height / 2);
    });
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false); this.dirty = this.sdirty = true;
    return await new Promise<Blob>((ok, no) => cv.toBlob(b => b ? ok(b) : no(new Error('PNG yaratilmadi')), 'image/png'));
  }

  dispose(): void {
    cancelAnimationFrame(this.raf); this.ctl.dispose();
    this.scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.overlay.remove(); this.svg.remove();
  }
}

/** Materialga doira tashqarisini tashlab yuborish (shader: dunyo XZ masofasi) */
function circleClip(m: THREE.Material, R: number): void {
  if (m.userData.circ) return; m.userData.circ = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.uniforms.uCircR = { value: R };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCirc;').replace('#include <project_vertex>', '#include <project_vertex>\nvCirc = (inverse(viewMatrix) * mvPosition).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vCirc;\nuniform float uCircR;').replace('void main() {', 'void main() {\n  if (length(vCirc) > uCircR) discard;');
  };
  m.customProgramCacheKey = () => `circ${R}`; m.needsUpdate = true;
}

/** Strelka teksturasi: shaffof fonda oq «›» belgilar (rang — materialdan) */
function chevronTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(0, 0, 128, 64);
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(20, 4); x.lineTo(70, 32); x.lineTo(20, 60); x.lineTo(44, 32); x.closePath(); x.fill(); x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.moveTo(26, 14); x.lineTo(58, 32); x.lineTo(26, 50); x.lineTo(40, 32); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Egri lenta-strelka (kvadratik Bezier) — tekstura uzunlik boʻylab takrorlanadi, oxirida uchburchak uchi */
function flowRibbon(p0: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2, w: number, h: number, col: string, tex: THREE.Texture): THREE.Group {
  const N = 40, pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, a = p0.clone().multiplyScalar((1 - t) ** 2), b = p1.clone().multiplyScalar(2 * (1 - t) * t), c = p2.clone().multiplyScalar(t * t); pts.push(a.add(b).add(c)); }
  const pos: number[] = [], uv: number[] = []; let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const d = (i < N ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize(), nrm = new THREE.Vector2(-d.y, d.x).multiplyScalar(w / 2);
    if (i) L += pts[i].distanceTo(pts[i - 1]);
    const y = h * (0.6 + 0.4 * Math.sin(Math.PI * i / N));
    pos.push(pts[i].x + nrm.x, y, -(pts[i].y + nrm.y), pts[i].x - nrm.x, y, -(pts[i].y - nrm.y));
    uv.push(L / (w * 2.2), 1, L / (w * 2.2), 0);
  }
  const idx: number[] = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ color: col, map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const rib = new THREE.Mesh(geo, mat); rib.renderOrder = 37;
  // uchi
  const e = pts[N], d = pts[N].clone().sub(pts[N - 2]).normalize(), n = new THREE.Vector2(-d.y, d.x), yE = h * 0.6;
  const A = e.clone().add(n.clone().multiplyScalar(w * 1.3)), B = e.clone().sub(n.clone().multiplyScalar(w * 1.3)), C = e.clone().add(d.clone().multiplyScalar(w * 2.6));
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute([A.x, yE, -A.y, B.x, yE, -B.y, C.x, yE, -C.y], 3));
  const head = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false })); head.renderOrder = 38;
  const g = new THREE.Group(); g.add(rib, head); return g;
}

/** Yerdagi uzuq-uzuq halqa (lenta — WebGL chiziqlari 1 px dan qalin chizilmaydi) */
function dashRing(r: number, w: number, n: number, fill: number, col: number, H: (x: number, y: number) => number): THREE.Mesh {
  const pos: number[] = [], seg = 6;
  for (let k = 0; k < n * 4; k++) {
    const a0 = k / (n * 4) * Math.PI * 2, a1 = a0 + fill * Math.PI * 2 / (n * 4);
    for (let j = 0; j < seg; j++) {
      const t0 = a0 + (a1 - a0) * j / seg, t1 = a0 + (a1 - a0) * (j + 1) / seg;
      const P = (rr: number, t: number) => { const x = Math.cos(t) * rr, y = Math.sin(t) * rr; return [x, H(x, y) + 0.7, -y]; };
      pos.push(...P(r - w, t0), ...P(r + w, t0), ...P(r + w, t1), ...P(r - w, t0), ...P(r + w, t1), ...P(r - w, t1));
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false })); m.renderOrder = 31; return m;
}

/** Quyosh balandligi/azimuti → sahna vektori (radius D) */
function sunVec(s: { alt: number; az: number }, D: number): THREE.Vector3 {
  const a = s.alt * Math.PI / 180, z = s.az * Math.PI / 180;
  return new THREE.Vector3(Math.sin(z) * Math.cos(a) * D, Math.sin(a) * D, -Math.cos(z) * Math.cos(a) * D);
}
function roundRect(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, r: number): void { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function escapeHtml(s: string): string { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }
