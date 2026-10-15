/**
 * Yagona 3D sahna (three.js). 2D reja — shu sahnaning yuqoridan turgan ortografik kamerasi,
 * alohida xarita kutubxonasi yoʻq. Koordinatalar: X — sharq, Z — janub (−shimol), Y — yuqoriga, metrda.
 * Sahna faqat oʻzgarishda chiziladi (render on demand) — boʻsh turganda protsessorni yuklamaydi.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Project } from '../core/doc';
import { frame, type XY } from '../core/geo';
import type { ContextBundle } from '../context/load';
import { terrainSampler } from '../context/tiles';
import { buildContext, type ContextScene, type HeightFn } from './context3d';

export type ViewMode = 'plan' | 'axo' | 'persp';

const C = { ground: 0xeceae5, grid: 0xd9d6cf, gridMajor: 0xc6c2b9, site: 0xf3e3b4, siteLine: 0xc0392b, bld: 0xf7f6f2, bldSel: 0xcfe0f1, edge: 0x3c3c3c, preview: 0x2a6fb0 };

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
  private lastDoc: Project | null = null;
  private grid: THREE.Object3D[] = [];
  private ctx: ContextScene | null = null;
  private ctxKey = '';
  private tex: { blob: Blob; t: THREE.Texture } | null = null;
  private sun!: THREE.DirectionalLight;
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

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: C.ground }));
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
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.dirty) { this.dirty = false; this.renderer.render(this.scene, this.cam); } };
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
    this.ctl.maxPolarAngle = Math.PI * 0.49;
    if (m === 'plan') { this.ctl.enableRotate = false; this.ctl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; }
    this.ctl.addEventListener('change', () => this.invalidate());
    this.ctl.update();
    this.resize();
  }

  /** Chizish asboblari uchun: sichqonchani chap tugma bilan surishni vaqtincha oʻchirish */
  setPanEnabled(on: boolean): void { if (this.mode === 'plan') this.ctl.mouseButtons = { LEFT: on ? THREE.MOUSE.PAN : (null as unknown as THREE.MOUSE), MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; this.ctl.enableRotate = this.mode !== 'plan' && on; }

  /** Ekran nuqtasi → yer sathidagi mahalliy XY (metr) */
  pick(clientX: number, clientY: number): XY | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    if (this.ctx) { const hit = this.ray.intersectObject(this.ctx.ground, false)[0]; if (hit) return [hit.point.x, -hit.point.z]; }
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? [p.x, -p.z] : null;
  }

  /** Ekran nuqtasidagi bino (bosish bilan tanlash) */
  pickBuilding(clientX: number, clientY: number): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.cam);
    const hit = this.ray.intersectObjects(this.world.children.filter(o => o.userData.bid), false)[0];
    return hit ? (hit.object.userData.bid as string) : null;
  }

  /** Ekranda nuqtalar orasidagi piksel masofasi (chizishda yopish uchun) */
  screenDist(a: XY, clientX: number, clientY: number): number {
    const v = new THREE.Vector3(a[0], 0, -a[1]).project(this.cam), r = this.renderer.domElement.getBoundingClientRect();
    return Math.hypot((v.x + 1) / 2 * r.width + r.left - clientX, (1 - v.y) / 2 * r.height + r.top - clientY);
  }

  select(id: string | null): void { this.selected = id; if (this.lastDoc) this.update(this.lastDoc); }

  update(doc: Project): void {
    this.lastDoc = doc;
    disposeGroup(this.world);
    const fr = frame(doc.origin);
    const toV2 = (p: XY) => new THREE.Vector2(p[0], p[1]);
    if (doc.site) {
      const rings = doc.site.rings.map(r => r.map(fr.toLocal));
      const sh = new THREE.Shape(rings[0].map(toV2)); rings.slice(1).forEach(h => sh.holes.push(new THREE.Path(h.map(toV2))));
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
      const P = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) P.setY(i, this.H(P.getX(i), -P.getZ(i)) + 0.25);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: C.site, transparent: true, opacity: this.ctx ? 0.6 : 0.75, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.renderOrder = 6;
      this.world.add(m);
      rings.forEach(r => this.world.add(line(densify(r, 10, true), C.siteLine, 0.4, true, 7, this.H)));
    }
    this.ctx?.maskTrees(doc.site ? doc.site.rings[0].map(fr.toLocal) : null);
    doc.buildings.forEach(b => {
      const r = b.footprint.map(fr.toLocal);
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(r.map(toV2)), { depth: b.floors * doc.settings.floorHeight, bevelEnabled: false });
      g.rotateX(-Math.PI / 2); g.translate(0, Math.min(...r.map(p => this.H(p[0], p[1]))), 0);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: b.id === this.selected ? C.bldSel : C.bld }));
      m.castShadow = m.receiveShadow = true; m.userData.bid = b.id; this.world.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.55 })); this.world.add(e);
    });
    this.invalidate();
  }

  /** Chizilayotgan shakl (koʻk chiziq + nuqtalar) */
  setPreview(pts: XY[], closed = false): void {
    disposeGroup(this.prev);
    if (pts.length) {
      this.prev.add(line(densify(pts, 10, closed), C.preview, 0.5, closed, 20, this.H));
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
    const key = b ? `${b.fetched}|${doc.origin.join(',')}|${JSON.stringify(cs)}` : '';
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
    this.ctx = buildContext(b, fr, cs, this.H, tex);
    this.scene.add(this.ctx.group);
    this.grid.forEach(g => g.visible = false);
    const T = cs.layers.relief ? b.terrain : null;
    this.ground.position.y = T ? T.min - T.h[((T.n - 1) >> 1) * T.n + ((T.n - 1) >> 1)] - h0 - 1 : -0.3;
    const r = Math.max(300, b.radius);
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, far: 4000 }); this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.map?.dispose(); (this.sun.shadow as { map: unknown }).map = null; this.sun.shadow.camera.updateProjectionMatrix();
    this.update(doc);
  }

  get hasContext(): boolean { return !!this.ctx; }

  snapshot(): string { this.renderer.render(this.scene, this.cam); return this.renderer.domElement.toDataURL('image/png'); }
}

function line(pts: XY[], color: number, lift: number, closed: boolean, order: number, H: HeightFn = () => 0): THREE.Line {
  const v = pts.map(p => new THREE.Vector3(p[0], H(p[0], p[1]) + lift, -p[1])); if (closed && v.length) v.push(v[0].clone());
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color, depthTest: false }));
  l.renderOrder = order; return l;
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
