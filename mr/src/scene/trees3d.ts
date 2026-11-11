/** 3D daraxtlar: shablon (c74) toj shakllari — loyiha va (11.11) OSM kontekst daraxtlari uchun umumiy */
import * as THREE from 'three';
import type { XY } from '../core/geo';
import { TREES } from '../chizmadon/catalog';
import { treeAt } from '../core/gstyle';

type HeightFn = (x: number, y: number) => number;

/**
 * c74 (egasi 06.11): shablon daraxtlari — dumaloq emas, katalogdagi toj shakllari (catalog.ts: round/oval, umbrella/spread, cone, column),
 * och ranglar, maksimal yengil: 3 ta toj InstancedMesh (ikosaedr 0-daraja — 20 uchburchak, 6 qirrali konus — 12, choʻzilgan oktaedr — 8)
 * va 1 ta tana (4 qirrali ochiq silindr — 8 uchburchak); rang — instansiya rangi (alohida material yoʻq). Avvalgi: 80 + 20 uchburchak.
 */
const TREE_GEO = { ico: new THREE.IcosahedronGeometry(1, 0), cone: new THREE.ConeGeometry(0.85, 1.9, 6, 1), col: new THREE.OctahedronGeometry(1, 0), trunk: new THREE.CylinderGeometry(0.16, 0.22, 1, 4, 1, true) };
export function styledTreeMeshes(pts: XY[], H: HeightFn, cols: number[]): THREE.Object3D[] {
  const kinds: ('ico' | 'cone' | 'col')[] = [], sc: [number, number, number][] = [];
  pts.forEach(p => { const t = TREES[treeAt(p[0], p[1])]; const c = t.crown;
    if (c === 'cone') { kinds.push('cone'); sc.push([1, 1, 1]); }
    else if (c === 'column') { kinds.push('col'); sc.push([0.7, 2.3, 0.7]); }
    else if (c === 'umbrella' || c === 'spread') { kinds.push('ico'); sc.push([1.3, 0.62, 1.3]); }
    else if (c === 'oval') { kinds.push('ico'); sc.push([0.9, 1.25, 0.9]); }
    else { kinds.push('ico'); sc.push([1, 1, 1]); } });
  const out: THREE.Object3D[] = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (const k of ['ico', 'cone', 'col'] as const) {
    const idx = pts.map((_, i) => i).filter(i => kinds[i] === k); if (!idx.length) continue;
    const im = new THREE.InstancedMesh(TREE_GEO[k], new THREE.MeshLambertMaterial({ color: 0xffffff }), idx.length);
    idx.forEach((i, j) => { const p = pts[i], y = H(p[0], p[1]), s = 2.4 + ((i * 37) % 10) / 10, h = 3.5 + ((i * 53) % 10) / 5, [a, b] = sc[i];
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i * 1.7) % 6.28);
      m4.compose(new THREE.Vector3(p[0], y + h + s * b * 0.55, -p[1]), q, new THREE.Vector3(s * a, s * b, s * a)); im.setMatrixAt(j, m4);
      im.setColorAt(j, col.setHex(cols[(i * 7 + treeAt(p[0], p[1])) % cols.length])); });
    im.castShadow = true; im.renderOrder = 12; im.userData.tree = 'crown'; im.userData.pi = idx; out.push(im);
  }
  const trunk = new THREE.InstancedMesh(TREE_GEO.trunk, new THREE.MeshLambertMaterial({ color: 0x9a8a76 }), pts.length);
  pts.forEach((p, i) => { const y = H(p[0], p[1]), h = 3.5 + ((i * 53) % 10) / 5; m4.compose(new THREE.Vector3(p[0], y + h / 2 + 0.3, -p[1]), new THREE.Quaternion(), new THREE.Vector3(1, h + 0.6, 1)); trunk.setMatrixAt(i, m4); });
  trunk.renderOrder = 12; trunk.userData.tree = 'trunk'; out.push(trunk);
  return out;
}
