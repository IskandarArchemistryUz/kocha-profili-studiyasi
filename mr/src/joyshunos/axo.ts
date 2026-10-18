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
export interface AxInput { bundle: ContextBundle; center: LngLat; r: number; pins: AxPin[]; petals: number[] | null; prevailing: number | null; sat: boolean; dark: boolean }
export const SUN_DAYS: [number, number, string][] = [[3, 21, '21 mart'], [6, 21, '21 iyun'], [12, 21, '21 dekabr']];

const NAME2LAYER: Record<string, AxLayer> = { relyef: 'relyef', yashil: 'yashil', suv: 'yashil', ariqlar: 'yashil', daraxtlar: 'yashil', 'yoʻlaklar': 'kochalar', trotuarlar: 'kochalar', 'yoʻllar': 'kochalar', chiziqlar: 'kochalar', 'temir yoʻl': 'kochalar', binolar: 'binolar', tomlar: 'binolar' };
const SUN_COL = 0xe8a317, WIND_COL = 0x3f8f6b, RING_COL = 0xc0643a;

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
  private frames = new Map<AxLayer, THREE.LineSegments>();
  private labels: Lbl[] = [];
  private overlay: HTMLDivElement;
  private svg: SVGSVGElement;
  private dirty = true;
  private raf = 0;
  private R = 500;
  private inp: AxInput | null = null;
  private sunMarks: THREE.Object3D[] = [];
  view: AxView = 'axo';
  private placed = false;
  order: AxLayer[] = AX_LAYERS.map(l => l.id);
  vis: Record<AxLayer, boolean> = { relyef: true, kochalar: true, yashil: true, binolar: true, xizmat: true, shamol: true, quyosh: true };
  exploded = false;
  gap = 110;
  day = 1;      // SUN_DAYS indeksi
  hour = 10;
  /** kamera yoki holat oʻzgardi (UI uchun) */
  onChange: (() => void) | null = null;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.ctl.addEventListener('change', () => { this.dirty = true; });
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.dirty) { this.dirty = false; this.draw(); } };
    loop();
  }

  private cam(): THREE.Camera { return this.view === 'persp' ? this.persp : this.ortho; }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = `${w}px`; this.renderer.domElement.style.height = `${h}px`;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    this.fitOrtho(); this.dirty = true;
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
    this.labels.forEach(l => l.el.remove()); this.labels = [];
    this.scene.background = new THREE.Color(inp.dark ? 0x17181a : 0xf4f2ee);
    const fr = frame(inp.center), Hs = terrainSampler(inp.bundle.terrain), H = (x: number, y: number) => Hs(x, y);
    // kontekst (OSM): qismlari qatlamlarga taqsimlanadi
    const ctxR = inp.bundle.radius;
    let tex: THREE.Texture | null = null;
    if (inp.sat && inp.bundle.imagery) { tex = new THREE.Texture(); tex.colorSpace = THREE.SRGBColorSpace; void createImageBitmap(inp.bundle.imagery.image).then(bm => { tex!.image = bm; tex!.needsUpdate = true; this.dirty = true; }).catch(() => {}); }
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
    if (!inp.sat) (ground.material as THREE.MeshLambertMaterial).color.set(inp.dark ? 0x2a2b2d : 0xe6e1d8);
    this.groups.get('binolar')!.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (inp.dark && m.name === 'binolar') (m.material as THREE.MeshLambertMaterial).color.set(0xdcd8d0); } });
    this.rings(H);
    this.pins(fr, H, inp.pins);
    this.wind(inp.petals, inp.prevailing);
    this.sunPaths();
    this.layerFrames();
    // yorugʻlik va soya kamerasi
    const sc = this.sun.shadow.camera; Object.assign(sc, { left: -ctxR * 1.1, right: ctxR * 1.1, top: ctxR * 1.1, bottom: -ctxR * 1.1, near: 1, far: ctxR * 8 }); sc.updateProjectionMatrix();
    this.fitOrtho(); this.setView(this.view, true); this.applyLayers(); this.setTime(this.day, this.hour);
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
    const step = R > 600 ? 200 : 100;
    for (let r = step; r <= R + 1; r += step) {
      const main = r >= R - 1;
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
    for (const p of pins.slice(0, 60)) {
      const [x, y] = fr.toLocal(p.at), z0 = H(x, y);
      pos.push(x, z0, -y, x, z0 + hgt, -y);
      const s = new THREE.Mesh(new THREE.SphereGeometry(Math.max(2.2, this.R * 0.007), 12, 8), new THREE.MeshBasicMaterial({ color: p.col })); s.position.set(x, z0 + hgt, -y); g.add(s);
      const el = document.createElement('div'); el.className = 'axo-pin'; el.innerHTML = `<i style="background:${p.col}"></i>${escapeHtml(p.label)}`;
      this.overlay.append(el); this.labels.push({ el, p: new THREE.Vector3(x, z0 + hgt, -y), layer: 'xizmat', kind: 'pin' });
    }
    if (pos.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x6b6965 }))); }
  }

  /** Shamol: yerda 16 sektorli gul va ustun yoʻnalish strelkalari */
  private wind(petals: number[] | null, prev: number | null): void {
    const g = this.groups.get('shamol')!; if (!petals) return;
    const R = this.R, mx = Math.max(...petals, 1e-6), r0 = R * 0.04, rM = R * 0.34, y = 1.2;
    const pos: number[] = [];
    petals.forEach((v, i) => {
      const r = r0 + (v / mx) * (rM - r0), steps = 6;
      for (let k = 0; k < steps; k++) {
        const a0 = ((i * 22.5 - 9 + 18 * k / steps)) * Math.PI / 180, a1 = ((i * 22.5 - 9 + 18 * (k + 1) / steps)) * Math.PI / 180;
        const P = (rr: number, a: number) => [Math.sin(a) * rr, y, -Math.cos(a) * rr];   // azimut: shimoldan soat yoʻnalishida
        pos.push(...P(r0, a0), ...P(r, a0), ...P(r, a1), ...P(r0, a0), ...P(r, a1), ...P(r0, a1));
      }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: WIND_COL, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); m.renderOrder = 35; g.add(m);
    if (prev == null) return;
    // strelkalar: shamol «qayerdan» esadi → oqim teskari tomonga
    const a = prev * Math.PI / 180, dir = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), side = new THREE.Vector3(dir.z, 0, -dir.x);
    for (let k = -2; k <= 2; k++) {
      const o = side.clone().multiplyScalar(k * R * 0.28), start = o.clone().addScaledVector(dir, -R * 0.95), len = R * 1.6;
      const arrow = new THREE.ArrowHelper(dir, start.setY(R * 0.02), len, WIND_COL, R * 0.08, R * 0.04);
      (arrow.line.material as THREE.LineBasicMaterial).transparent = true; (arrow.line.material as THREE.LineBasicMaterial).opacity = 0.75;
      g.add(arrow);
    }
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
      for (let t = 5; t <= 20; t++) {
        const s = sunPosition(localToUtc(2026, mo, d, t), lat, lng); if (s.alt <= 0) continue;
        const v = sunVec(s, D), dot = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.009, 10, 8), new THREE.MeshBasicMaterial({ color: SUN_COL }));
        dot.position.copy(v); dot.userData.day = k; g.add(dot);
        const el = document.createElement('div'); el.className = 'axo-hour'; el.textContent = String(t); el.dataset.day = String(k);
        this.overlay.append(el); this.labels.push({ el, p: v.clone(), layer: 'quyosh', kind: 'hour' });
      }
    });
  }

  /** Portlatilgan rejimda har qatlam chegarasi (kvadrat ramka) */
  private layerFrames(): void {
    for (const f of this.frames.values()) { f.removeFromParent(); f.geometry.dispose(); }
    this.frames.clear();
    const s = this.R * 1.15, c = [[-s, -s], [s, -s], [s, s], [-s, s]], pos: number[] = [];
    for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; pos.push(a[0], 0, a[1], b[0], 0, b[1]); }
    for (const id of this.groups.keys()) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const f = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: this.inp?.dark ? 0x77746e : 0xa19e97, transparent: true, opacity: 0.8 }));
      f.visible = false; this.groups.get(id)!.add(f); this.frames.set(id, f);
    }
    // yon izohlar (raqamli)
    for (const l of AX_LAYERS) {
      const el = document.createElement('div'); el.className = 'axo-side'; el.dataset.layer = l.id;
      el.innerHTML = `<b></b><span><strong>${escapeHtml(tr(l.name))}</strong><small>${escapeHtml(tr(l.sub))}</small></span>`;
      this.overlay.append(el); this.labels.push({ el, p: new THREE.Vector3(s, 0, 0), layer: l.id, kind: 'side' });
    }
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
      else if (v === 'axo') cam.position.set(R * 3, R * 2.6, R * 3);   // ~ izometriya (35°)
      else cam.position.set(R * 1.7, R * 1.25, R * 1.9);
      cam.up.set(0, 1, 0); cam.lookAt(this.ctl.target);
    }
    this.ctl.enableRotate = v !== 'plan';
    this.fitOrtho();
    this.ctl.update(); this.dirty = true; this.onChange?.();
  }
  /** kamerani boshlangʻich holatga */
  reset(): void { this.ortho.zoom = 1; this.placed = false; this.setView(this.view); }
  zoomBy(f: number): void { if (this.view === 'persp') { this.persp.position.lerp(this.ctl.target, 1 - 1 / f); } else { this.ortho.zoom = Math.max(0.2, Math.min(12, this.ortho.zoom * f)); this.ortho.updateProjectionMatrix(); } this.ctl.update(); this.dirty = true; }
  private lift(): number { return this.exploded ? (this.order.filter(id => this.vis[id]).length - 1) * this.gap * this.R / 500 : 0; }
  applyLayers(): void {
    let k = 0;
    for (const id of this.order) {
      const g = this.groups.get(id)!; g.visible = this.vis[id];
      g.position.y = this.exploded && this.vis[id] ? k * this.gap * this.R / 500 : 0;
      if (this.vis[id]) k++;
      const f = this.frames.get(id); if (f) f.visible = this.exploded;
    }
    this.dirty = true; this.onChange?.();
  }
  setExplode(on: boolean, gap = this.gap): void { this.exploded = on; this.gap = gap; this.applyLayers(); this.fitOrtho(); if (this.view !== 'plan') { const dy = this.lift() / 2 - this.ctl.target.y; this.ctl.target.y += dy; this.ortho.position.y += dy; this.persp.position.y += dy; this.ctl.update(); } this.dirty = true; }
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
      const ball = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.028, 20, 14), new THREE.MeshBasicMaterial({ color: SUN_COL })); ball.position.copy(v);
      const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v, new THREE.Vector3(0, 0, 0)]), new THREE.LineDashedMaterial({ color: SUN_COL, dashSize: 5, gapSize: 4 })); ray.computeLineDistances();
      g.add(ball, ray); this.sunMarks.push(ball, ray);
    }
    g.children.forEach(o => { if (o.userData.day != null) { const mat = (o as THREE.Mesh).material as THREE.Material & { opacity: number }; mat.transparent = true; mat.opacity = o.userData.day === day ? 1 : 0.35; } });
    this.labels.forEach(l => { if (l.kind === 'hour') l.el.classList.toggle('dim', l.el.dataset.day !== String(day)); });
    this.dirty = true; this.onChange?.();
  }
  sunInfo(): { alt: number; az: number } | null { const inp = this.inp; if (!inp) return null; const [mo, d] = SUN_DAYS[this.day]; return sunPosition(localToUtc(2026, mo, d, this.hour), inp.center[1], inp.center[0]); }

  /* ---------------- chizish ---------------- */
  private draw(): void {
    const cam = this.cam();
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
    let n = 0;
    for (const l of this.labels) {
      const vis = this.vis[l.layer] && (l.kind !== 'side' || this.exploded);
      l.el.hidden = !vis; if (!vis) continue;
      const [x, y, ok] = this.project(l.p, l.layer, cam, w, h);
      if (l.kind === 'side') continue;
      l.el.hidden = !ok; l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    // portlatilgan: oʻng tomonda raqamli izohlar, qatlam burchagiga chiziq
    if (this.exploded) {
      const vis = this.order.filter(id => this.vis[id]).slice().reverse();
      for (const id of vis) {
        const l = side.find(s => s.layer === id); if (!l) continue; n++;
        const [x, y] = this.project(l.p, l.layer, cam, w, h);
        l.el.style.transform = `translate(${sideX}px,${(y - 14).toFixed(1)}px)`;
        (l.el.querySelector('b') as HTMLElement).textContent = String(this.order.filter(i => this.vis[i]).indexOf(id) + 1).padStart(2, '0');
        lines.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)}H${sideX - 8}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"/>`);
      }
    }
    this.svg.innerHTML = lines.join('');
  }

  /** PNG: WebGL kadri + HTML yorliqlar (kenglik W px) */
  async png(W = 3840): Promise<Blob> {
    const w = this.host.clientWidth, h = this.host.clientHeight, k = W / w, pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(k); this.renderer.setSize(w, h, false);
    const cam = this.cam(); this.renderer.render(this.scene, cam);
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
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false); this.dirty = true;
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
