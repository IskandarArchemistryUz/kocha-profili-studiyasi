/**
 * Yagona 3D sahna (three.js). 2D reja — shu sahnaning yuqoridan turgan ortografik kamerasi,
 * alohida xarita kutubxonasi yoʻq. Koordinatalar: X — sharq, Z — janub (−shimol), Y — yuqoriga, metrda.
 * Sahna faqat oʻzgarishda chiziladi (render on demand) — boʻsh turganda protsessorni yuklamaydi.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LngLat, Project } from '../core/doc';
import { frame, type XY } from '../core/geo';
import type { ContextBundle } from '../context/load';
import { terrainSampler } from '../context/tiles';
import { buildContext, buildingMeshes, type ContextScene, type HeightFn } from './context3d';
import { projectStreetsGeo } from './streets3d';
import { computePlan } from '../core/plan';
import { profileById } from '../core/profiles';
import { USES } from '../core/uses';

export const ZONE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.color]));
const tint = (c: number, k: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (x: number) => Math.round(x + (255 - x) * k); return (f(r) << 16) | (f(g) << 8) | f(b); };
const USE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.id === 'turar' ? 0xf4ece6 : tint(u.color, 0.72)]));
const BASE_COL: Record<string, number> = Object.fromEntries(USES.map(u => [u.id, u.base]));
const PART_COL: Record<string, number> = { trotuar: 0xd8d2c6, yashil: 0x9cc77f, velo: 0xc9705a, parkovka: 0x8d9097, qatnov: 0x585b62, chiziq: 0xf4f4f0 };

/** Fasad uslublari: deraza modulda (eni ulushi, tokcha va tepa balandligi, m) */
export type FacadeStyle = 'yoq' | 'klassik' | 'lenta' | 'panorama';
export const FACADE: Record<Exclude<FacadeStyle, 'yoq'>, { name: string; w: number; sill: number; head: number }> = {
  klassik: { name: 'Klassik (alohida derazalar)', w: 0.5, sill: 0.9, head: 2.4 },
  lenta: { name: 'Lenta (gorizontal)', w: 0.86, sill: 0.9, head: 2.3 },
  panorama: { name: 'Panorama (poldan shiftgacha)', w: 0.9, sill: 0.1, head: 2.85 },
};
const texCache = new Map<string, THREE.CanvasTexture>();
/** Bitta modul (eni modW, balandligi fh) uchun takrorlanadigan deraza teksturasi */
function facadeTex(kind: 'res' | 'shop' | 'glass', st: Exclude<FacadeStyle, 'yoq'>, fh: number, modW: number, aniso: number): THREE.CanvasTexture {
  const key = `${kind}|${st}|${fh}|${modW}`; const hit = texCache.get(key); if (hit) return hit;
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  const f = kind === 'shop' ? { w: 0.86, sill: 0.15, head: Math.min(fh - 0.5, 3.2) } : kind === 'glass' ? { w: 0.94, sill: 0.05, head: fh - 0.25 } : FACADE[st];
  const x0 = (1 - f.w) / 2 * S, x1 = (1 + f.w) / 2 * S, y0 = (1 - f.head / fh) * S, y1 = (1 - f.sill / fh) * S;
  g.fillStyle = kind === 'shop' ? '#5d7180' : '#7d93a3'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0, y0, (x1 - x0) * 0.35, y1 - y0);
  g.strokeStyle = '#4b5a64'; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  if (kind === 'res' && st !== 'panorama') { g.fillStyle = '#c9c4ba'; g.fillRect(x0 - 2, y1, x1 - x0 + 4, 3); }
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, S - 2, S, 2); // qavatlararo chiziq
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  t.repeat.set(1 / modW, -1 / fh); t.offset.set(0, 1 / fh);
  texCache.set(key, t); return t;
}

export const INSOL_BINS: [number, number, string][] = [[0, 0x2b3a67, '< 1 soat'], [1, 0x4a6fa5, '1–2'], [2, 0x7fb3c8, '2–3'], [3, 0xc9e4a5, '3–4'], [4, 0xf6e58d, '4–6'], [6, 0xf9b24e, '≥ 6']];
export function insolColor(h: number): number { let c = INSOL_BINS[0][1]; for (const [t, col] of INSOL_BINS) if (h >= t) c = col; return c; }

function treeMeshes(pts: XY[], H: HeightFn): THREE.Object3D[] {
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x6f9f4c }), pts.length);
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
  selectBlock(i: number | null): void { this.selBlock = i; if (this.lastDoc) this.update(this.lastDoc); }
  setFacade(st: FacadeStyle): void { this.facade = st; if (this.lastDoc) this.update(this.lastDoc); }
  selectStreet(id: string | null): void { this.selStreet = id; if (this.lastDoc) this.update(this.lastDoc); }

  /** Ekran nuqtasidagi uchastka ichidagi mavjud bino (OSM id) */
  pickContextBuilding(clientX: number, clientY: number): number | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.cam);
    const hit = this.ray.intersectObjects(this.world.children.filter(o => o.userData.cid != null && (o as THREE.Mesh).isMesh), false)[0];
    return hit ? (hit.object.userData.cid as number) : null;
  }

  update(doc: Project): void {
    this.lastDoc = doc;
    disposeGroup(this.world);
    const fr = frame(doc.origin);
    const toV2 = (p: XY) => new THREE.Vector2(p[0], p[1]);
    if (doc.site) {
      const rings = doc.site.rings.map(r => r.map(fr.toLocal));
      // kvartallar (uchastka − koʻcha koridorlari), funksiya rangida
      const plan = computePlan(doc);
      plan.blocks.forEach((b, i) => {
        const sh = new THREE.Shape(b.rings[0].map(toV2)); b.rings.slice(1).forEach(h => sh.holes.push(new THREE.Path(h.map(toV2))));
        const g = drape(new THREE.ShapeGeometry(sh), this.H, 0.3, this.ctx ? 8 : 1e9);
        const sel = i === this.selBlock;
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: ZONE_COL[b.use] ?? C.site, transparent: true, opacity: sel ? 0.9 : this.ctx ? 0.62 : 0.75, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        m.renderOrder = 6; m.userData.block = i; this.world.add(m);
        if (sel) b.rings.forEach(r => this.world.add(line(densify(r, 10, true), C.preview, 0.45, true, 8, this.H)));
      });
      rings.forEach(r => this.world.add(line(densify(r, 10, true), C.siteLine, 0.4, true, 7, this.H)));
    }
    // loyiha koʻchalari: profil boʻlaklari, chiziqlar, daraxtlar, qizil chiziqlar
    if (doc.streets.length) {
      const sg = projectStreetsGeo(doc.streets.map(st => ({ id: st.id, axis: st.axis.map(fr.toLocal), parts: profileById(st.profile).parts })), this.H);
      const ord: [string, number][] = [['trotuar', 9], ['yashil', 9.1], ['velo', 9.1], ['parkovka', 9.1], ['qatnov', 9.2], ['chiziq', 9.3]];
      for (const [k, o] of ord) {
        const arr = sg.layers[k]; if (!arr?.length) continue;
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PART_COL[k], depthTest: false, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = o; m.frustumCulled = false; this.world.add(m);
      }
      sg.red.forEach(r => { const l = line(densify(r, 6), C.siteLine, 0.5, false, 9.5, this.H); (l.material as THREE.LineBasicMaterial).dispose(); l.material = new THREE.LineDashedMaterial({ color: C.siteLine, dashSize: 3, gapSize: 2, depthTest: false }); l.computeLineDistances(); this.world.add(l); });
      doc.streets.forEach(st => { if (st.id !== this.selStreet) return; this.world.add(line(densify(st.axis.map(fr.toLocal), 6), C.preview, 0.6, false, 9.6, this.H)); });
      if (sg.trees.length) this.world.add(...treeMeshes(sg.trees, this.H));
    }
    // uchastka ichidagi mavjud binolar: saqlanadigan — oddiy, qolgani — buziladigan (shaffof qizil)
    if (this.ctx?.inSite.length) {
      const keep = new Set(doc.keep);
      for (const b of this.ctx.inSite) {
        const k = keep.has(b.id);
        const objs = buildingMeshes([b], this.H,
          k ? new THREE.MeshLambertMaterial({ color: 0xffffff }) : new THREE.MeshBasicMaterial({ color: 0xd9534f, transparent: true, opacity: 0.18, depthWrite: false }),
          k ? new THREE.MeshLambertMaterial({ color: 0xe3b4a2, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ color: 0xd9534f, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
          new THREE.LineBasicMaterial({ color: k ? 0x8f8a80 : 0xc0392b, transparent: true, opacity: k ? 0.4 : 0.7 }));
        objs.forEach(o => { o.userData.cid = b.id; if (k) { o.castShadow = o.receiveShadow = true; } o.renderOrder = 10; this.world.add(o); });
      }
    }
    this.ctx?.maskTrees(doc.site ? doc.site.rings[0].map(fr.toLocal) : null);
    // parkovkalar: yer osti — siyohrang uzuq kontur, yer usti — kulrang maydon
    doc.garages.forEach(gr => {
      const r = gr.ring.map(fr.toLocal);
      if (gr.kind === 'yer_usti') {
        const sh = new THREE.Shape(r.map(toV2)), g = drape(new THREE.ShapeGeometry(sh), this.H, 0.35, this.ctx ? 8 : 1e9);
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xa9adb3, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 })); m.renderOrder = 6.5; this.world.add(m);
      } else {
        const l = line(densify(r, 6, true), 0x7a4fb0, 0.5, true, 8, this.H); (l.material as THREE.Material).dispose();
        l.material = new THREE.LineDashedMaterial({ color: 0x7a4fb0, dashSize: 2, gapSize: 1.5, depthTest: false }); l.computeLineDistances(); this.world.add(l);
      }
    });
    // loyiha binolari / seksiyalari: noturar pastki qavatlar toʻq tasma, har seksiya alohida (chegaralari koʻrinadi)
    const fh = doc.settings.floorHeight, aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    doc.buildings.forEach(b => {
      const r = b.footprint.map(fr.toLocal), base = Math.min(...r.map(p => this.H(p[0], p[1]))) + (b.z0 ?? 0) * fh, sel = b.id === this.selected;
      const shape = new THREE.Shape(r.map(toV2));
      const part = (z0: number, z1: number, color: number, kind: 'res' | 'shop' | 'glass' | null) => {
        const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, base + z0, 0);
        const wall = new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : color });
        if (kind && this.facade !== 'yoq') wall.map = facadeTex(kind, this.facade, fh, 3.3, aniso);
        const m = new THREE.Mesh(g, [new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : C.roof }), wall]);
        m.castShadow = m.receiveShadow = true; m.userData.bid = b.id; this.world.add(m);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.5 })); this.world.add(e);
      };
      if (b.gen && (b.gen.kind === 'uy' || b.gen.kind === 'taunhaus')) {
        // past uylar — qiya tom bilan (kontekstdagi kabi)
        const objs = buildingMeshes([{ id: 0, rings: [r], h: b.floors * fh, kind: 'house' }], this.H, new THREE.MeshLambertMaterial({ color: sel ? C.bldSel : (USE_COL[b.use] ?? C.bld) }), new THREE.MeshLambertMaterial({ color: 0xc98f7a, side: THREE.DoubleSide }), new THREE.LineBasicMaterial({ color: C.edge, transparent: true, opacity: 0.45 }));
        objs.forEach(o => { o.userData.bid = b.id; o.castShadow = o.receiveShadow = true; this.world.add(o); });
        return;
      }
      const nr = Math.min(b.nonRes, b.floors - (b.gen?.kind === 'stilobat' ? 0 : 1));
      const parking = b.gen?.kind === 'stilobat' && b.use === 'avtoturargoh', office = b.use === 'ofis' || b.use === 'mehmonxona';
      if (nr > 0) part(0, nr * fh, BASE_COL[b.use] ?? 0x9c7b6e, parking ? null : 'shop');
      if (nr >= b.floors) return;
      part(nr * fh, b.floors * fh, USE_COL[b.use] ?? C.bld, office ? 'glass' : 'res');
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
    this.grid.forEach(g => g.visible = false);
    const T = cs.layers.relief ? b.terrain : null;
    this.ground.position.y = T ? T.min - T.h[((T.n - 1) >> 1) * T.n + ((T.n - 1) >> 1)] - h0 - 1 : -0.3;
    const r = Math.max(300, b.radius);
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, far: 4000 }); this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.map?.dispose(); (this.sun.shadow as { map: unknown }).map = null; this.sun.shadow.camera.updateProjectionMatrix();
    this.update(doc);
  }

  get hasContext(): boolean { return !!this.ctx; }

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
    this.invalidate();
  }
  /** uchastka ichidagi mavjud (OSM) binolar */
  get inSite(): { id: number; rings: XY[][]; h: number }[] { return this.ctx?.inSite ?? []; }

  snapshot(): string { this.renderer.render(this.scene, this.cam); return this.renderer.domElement.toDataURL('image/png'); }
}

function line(pts: XY[], color: number, lift: number, closed: boolean, order: number, H: HeightFn = () => 0): THREE.Line {
  const v = pts.map(p => new THREE.Vector3(p[0], H(p[0], p[1]) + lift, -p[1])); if (closed && v.length) v.push(v[0].clone());
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), new THREE.LineBasicMaterial({ color, depthTest: false }));
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
