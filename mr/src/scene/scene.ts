/**
 * Yagona 3D sahna (three.js). 2D reja — shu sahnaning yuqoridan turgan ortografik kamerasi,
 * alohida xarita kutubxonasi yoʻq. Koordinatalar: X — sharq, Z — janub (−shimol), Y — yuqoriga, metrda.
 * Sahna faqat oʻzgarishda chiziladi (render on demand) — boʻsh turganda protsessorni yuklamaydi.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Project } from '../core/doc';
import { frame, type XY } from '../core/geo';

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
    this.scene.add(sun);

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: C.ground }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true; this.ground.name = 'yer';
    this.scene.add(this.ground);
    const g1 = new THREE.GridHelper(2000, 200, C.grid, C.grid); g1.position.y = 0.01; (g1.material as THREE.Material).transparent = true; (g1.material as THREE.Material).opacity = 0.55;
    const g2 = new THREE.GridHelper(2000, 20, C.gridMajor, C.gridMajor); g2.position.y = 0.02;
    this.scene.add(g1, g2, this.world, this.prev);

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
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: C.site, transparent: true, opacity: 0.75, depthWrite: false })); m.position.y = 0.05; m.receiveShadow = true; m.renderOrder = 1;
      this.world.add(m);
      rings.forEach(r => this.world.add(line(r, C.siteLine, 0.12, true, 3)));
    }
    doc.buildings.forEach(b => {
      const r = b.footprint.map(fr.toLocal);
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(r.map(toV2)), { depth: b.floors * doc.settings.floorHeight, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
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
      this.prev.add(line(pts, C.preview, 0.3, closed, 5));
      const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], 0.3, -p[1]))), new THREE.PointsMaterial({ color: C.preview, size: 7, sizeAttenuation: false, depthTest: false }));
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
    const t = new THREE.Vector3(cx, 0, -cy), dist = size * 1.6;
    this.ctl.target.copy(t);
    if (this.mode === 'persp') this.persp.position.copy(t).add(new THREE.Vector3(-0.55, 0.62, 0.75).normalize().multiplyScalar(dist));
    else {
      const dir = this.mode === 'plan' ? new THREE.Vector3(0, 1, 0.0001) : new THREE.Vector3(-1, 1.15, 1).normalize();
      this.ortho.position.copy(t).add(dir.multiplyScalar(3000)); this.ortho.userData.s = dist * 0.45; this.ortho.zoom = 1;
    }
    this.resize(); this.ctl.update(); this.invalidate();
  }

  snapshot(): string { this.renderer.render(this.scene, this.cam); return this.renderer.domElement.toDataURL('image/png'); }
}

function line(pts: XY[], color: number, y: number, closed: boolean, order: number): THREE.Line {
  const v = pts.map(p => new THREE.Vector3(p[0], y, -p[1])); if (closed && v.length) v.push(v[0].clone());
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color, depthTest: false }));
  l.renderOrder = order; return l;
}

function disposeGroup(g: THREE.Group): void {
  g.children.slice().forEach(o => {
    g.remove(o);
    const m = o as THREE.Mesh; m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose());
  });
}
