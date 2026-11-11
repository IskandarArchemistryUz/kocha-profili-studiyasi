/**
 * c77 (11.11): varaq aksonometriyasi muharriri — sahna rasmi olinishidan oldin qatlamlarni yashirish, ranglarni, binolar materialini
 * va tom yozuvlarini vaqtincha qoʻllash (snapshot ichida); rasm olingach hammasi qaytariladi (undo). Sahnaning ish holati oʻzgarmaydi.
 * Materiallar umumiy boʻlishi mumkin (fasad keshi, kontekst) — shuning uchun hech qachon joyida oʻzgartirilmaydi: nusxa olinib almashtiriladi.
 */
import * as THREE from 'three';
import { bldPaint, placeLabels, type AxoApply, type AxoLayerId } from '../core/axoedit';
import { muteTree } from '../core/gstyle';

export interface AxoScene { world: THREE.Group; ctx: THREE.Group | null; far: THREE.Object3D[]; ground: THREE.Mesh; scene: THREE.Scene }

const CTX_NAMES: Partial<Record<AxoLayerId, string[]>> = {
  atrof: ['binolar', 'tomlar', 'bino qirralari'],
  daraxt: ['daraxtlar', 'shablon daraxtlari', 'shablon tanalari'],
  yol: ['yoʻlaklar', 'trotuarlar', 'bordyurlar', 'yoʻllar', 'chiziqlar', 'koʻpriklar', 'koʻprik tayanchlari', 'temir yoʻl'],
  suv: ['suv', 'ariqlar'],
  relyef: ['relyef'],
};
/** Qatlam rangi tushadigan qismlar (qolganlari — faqat yashiriladi): yoʻllarda — asfalt, atrofda — devor va tom */
const CTX_TINT: Partial<Record<AxoLayerId, string[]>> = { atrof: ['binolar', 'tomlar'], daraxt: ['daraxtlar', 'shablon daraxtlari'], yol: ['yoʻllar', 'koʻpriklar'], suv: ['suv', 'ariqlar'], relyef: ['relyef'] };
const ROAD_PARTS = new Set(['qatnov', 'avtobus', 'tramvay']);

/** Qatlam obyektlari (yashirish uchun) */
export function layerObjects(S: AxoScene, id: AxoLayerId): THREE.Object3D[] {
  const out: THREE.Object3D[] = [], W = S.world.children, names = CTX_NAMES[id] ?? [];
  if (S.ctx) for (const o of S.ctx.children) {
    if (names.includes(o.name)) { out.push(o); const t = o.userData.trunk as THREE.Object3D | undefined; if (t?.parent) out.push(t); }
  }
  if (id === 'loyiha') out.push(...W.filter(o => o.userData.bOwner != null || o.userData.axoLbl));
  if (id === 'atrof') out.push(...W.filter(o => o.userData.cid != null), ...S.far);
  if (id === 'daraxt') out.push(...W.filter(o => o.userData.tree));
  if (id === 'yol') out.push(...W.filter(o => o.userData.layer === 1 && !o.userData.tree && !o.userData.axoLbl));
  if (id === 'relyef') out.push(S.ground);
  if (id === 'uchastka') out.push(...W.filter(o => o.userData.parcelLine || o.userData.siteLine));
  return out;
}
/** Sahnada maʼlumoti bor qatlamlar (panelda faqat shular koʻrsatiladi); fon — doim */
export function presentLayers(S: AxoScene): AxoLayerId[] {
  const ids: AxoLayerId[] = ['loyiha', 'atrof', 'daraxt', 'yol', 'suv', 'relyef', 'uchastka'];
  return [...ids.filter(id => layerObjects(S, id).some(o => o !== S.ground || S.ground.visible)), 'fon'];
}

type CMat = THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null };
/** Material nusxasi (userData nusxalanmaydi — unda tekstura va rang obyektlari bor; sheyder qoʻshimchasi saqlanadi) */
function dup<M extends THREE.Material>(m: M): M {
  const u = m.userData; m.userData = {}; const c = m.clone() as M; m.userData = u;
  c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; return c;
}

/**
 * Sozlamani qoʻllash. anchors — loyiha binolari tom nuqtasi (yozuvlar uchun), label — sahnaning yorliq yaratuvchisi
 * (mavjud uslub). Natija: yozuv spraytlari (joylash — fit dan keyin, place) va qaytarish funksiyasi.
 */
export function applyAxo(S: AxoScene, A: AxoApply, anchors: Map<string, THREE.Vector3>, label: (text: string, badge: boolean) => THREE.Sprite): { sprites: { sp: THREE.Sprite; prio: number; badge: boolean }[]; undo: () => void } {
  const undo: (() => void)[] = [];
  const hide = (o: THREE.Object3D) => { const v = o.visible; o.visible = false; undo.push(() => { o.visible = v; }); };
  /** mesh materialini (yoki massivdagi har birini) almashtirish */
  const swap = (o: THREE.Mesh | THREE.Line, f: (m: CMat) => THREE.Material | null) => {
    const old = o.material as CMat | CMat[], arr = Array.isArray(old) ? old : [old];
    let any = false; const nu = arr.map(m => { const r = f(m); if (r) { any = true; return r; } return m; });
    if (!any) return;
    o.material = Array.isArray(old) ? nu : nu[0];
    undo.push(() => { nu.forEach((m, i) => { if (m !== arr[i]) m.dispose(); }); o.material = old; });
  };
  const tint = (o: THREE.Object3D, c: number) => { const m = o as THREE.Mesh; if (!m.material) return; swap(m, x => { if (!x.color) return null; const d = dup(x); d.color!.setHex(c); return d; }); };

  // 1) yashirish
  for (const id of A.hide) {
    if (id === 'fon') continue;
    layerObjects(S, id).forEach(hide);
  }
  // 2) fon
  { const bg = S.scene.background; const c = A.hide.includes('fon') ? 0xffffff : A.col.fon; if (c != null) { S.scene.background = new THREE.Color(c); undo.push(() => { S.scene.background = bg; }); } }
  // 3) qatlamlar rangi (loyiha binolari va daraxtlar — alohida)
  for (const id of ['atrof', 'yol', 'suv', 'relyef', 'uchastka'] as AxoLayerId[]) {
    const c = A.col[id]; if (c == null || A.hide.includes(id)) continue;
    const names = CTX_TINT[id] ?? [];
    if (S.ctx) for (const o of S.ctx.children) if (names.includes(o.name)) tint(o, c);
    if (id === 'atrof') { for (const o of S.world.children) if (o.userData.cid != null && (o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material as THREE.Material).type === 'MeshLambertMaterial') tint(o, c); S.far.forEach(o => { if ((o as THREE.Mesh).isMesh) tint(o, c); }); }
    if (id === 'yol') for (const o of S.world.children) if (ROAD_PARTS.has(o.userData.part as string)) {
      tint(o, c); const sc = o.userData.sfC as THREE.Color | undefined;   // uchastkadan tashqari qismi (sheyder rangi)
      if (sc && o.userData.siteOut === 'asph') { const h = sc.getHex(); sc.setHex(c); undo.push(() => sc.setHex(h)); }
    }
    if (id === 'relyef') tint(S.ground, c);
    if (id === 'uchastka') for (const o of S.world.children) if (o.userData.parcelLine || o.userData.siteLine) tint(o, c);
  }
  // 4) daraxtlar: xira palitra yoki bitta rang (toj; tana — oʻz rangida)
  if (A.trees && !A.hide.includes('daraxt')) {
    const C = new THREE.Color(), f = (h: number) => (A.trees === 'xira' ? muteTree(h) : A.col.daraxt!);
    const crowns = [...(S.ctx?.children ?? []).filter(o => o.name === 'daraxtlar' || o.name === 'shablon daraxtlari'), ...S.world.children.filter(o => o.userData.tree === 'crown')];
    for (const o of crowns) {
      const im = o as THREE.InstancedMesh;
      if (im.isInstancedMesh && im.instanceColor) {
        const a = im.instanceColor.array as Float32Array, keep = Float32Array.from(a);
        for (let i = 0; i < im.count; i++) { im.getColorAt(i, C); im.setColorAt(i, C.setHex(f(C.getHex()))); }
        im.instanceColor.needsUpdate = true;
        undo.push(() => { a.set(keep); im.instanceColor!.needsUpdate = true; });
      } else tint(o, f(((im.material as CMat).color ?? C.setHex(0x7fa65a)).getHex()));
    }
  }
  // 5) loyiha binolari: rang (alohida → qatlam → material) va material (yuza)
  if (!A.hide.includes('loyiha')) for (const o of S.world.children) {
    const bid = o.userData.bOwner as string | undefined; if (bid == null || !(o as THREE.Mesh).isMesh) continue;
    const p = bldPaint(A, bid); if (p.color == null && !p.mat) continue;
    swap(o as THREE.Mesh, m => {
      if (!m.color) return null;
      if (p.mat && (m.type === 'MeshLambertMaterial' || m.type === 'MeshPhongMaterial')) {
        const M = p.mat, op = m.opacity * M.opacity, s = new THREE.MeshStandardMaterial({
          color: p.color ?? m.color.getHex(), map: m.map ?? null, side: m.side, roughness: M.rough, metalness: M.metal,
          transparent: m.transparent || op < 1, opacity: op, depthWrite: op < 1 ? false : m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
        s.visible = m.visible; return s;
      }
      if (p.color == null) return null;
      const d = dup(m); d.color!.setHex(p.color); return d;
    });
  }
  // 6) tom yozuvlari
  const sprites: { sp: THREE.Sprite; prio: number; badge: boolean }[] = [];
  for (const L of A.labels) {
    const at = anchors.get(L.bid); if (!at) continue;
    const sp = label(L.text, L.badge); sp.position.copy(at); sp.userData.axoLbl = true; S.world.add(sp); sprites.push({ sp, prio: L.prio, badge: L.badge });
  }
  if (sprites.length) undo.push(() => { for (const { sp } of sprites) { S.world.remove(sp); (sp.material as THREE.SpriteMaterial).map?.dispose(); sp.material.dispose(); } });
  return { sprites, undo: () => { for (let i = undo.length - 1; i >= 0; i--) undo[i](); } };
}

/** Yozuvlarni toʻqnashuvsiz joylash (ekran pikselida): px — spraytning ekrandagi oʻlchami (fitSprites), markaz — center */
export function placeSprites(sprites: { sp: THREE.Sprite; prio: number }[], cam: THREE.Camera, W: number, H: number): void {
  const v = new THREE.Vector3();
  const rects = sprites.map(({ sp, prio }) => {
    const [w, h] = sp.userData.px as [number, number]; v.copy(sp.position).project(cam);
    const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
    return { x: x - sp.center.x * w, y: y - (1 - sp.center.y) * h, w, h, prio: v.z > 1 || v.z < -1 ? -Infinity : prio };
  });
  placeLabels(rects).forEach((k, i) => { const sp = sprites[i].sp; if (k < 0) sp.visible = false; else sp.center.y -= k; });
}
