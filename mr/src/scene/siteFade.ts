/**
 * 06.11 (egasi, 22:40 va 23:10): loyiha koʻchasi geometriyasi uchastka chegarasida kesilmaydi — mavjud koʻchagacha ulanib chiqaveradi.
 * Uchastka ichidagi qismi loyiha uslubida (profil ranglari), tashqarisi esa atrofdagi mavjud (OSM) koʻchalar uslubida — oʻsha rang
 * (asfalt, trotuar, chiziq), qizil chiziq va daraxtlarsiz. Geometriyaga tegmaydi: fragment sheyderida nuqta uchastka halqalari
 * ichidami (juft-toq qoidasi) tekshiriladi, tashqarida rang kontekst yoʻli rangiga almashtiriladi (shaffoflik yoʻq — tartib oʻzgarmaydi).
 * Pozitsiyalar sahnaning mahalliy tizimida: (x, balandlik, −y) — shuning uchun tekshiruv (position.x, −position.z) da.
 */
import * as THREE from 'three';
import type { XY } from '../core/geo';

/** uniform massiv uzunligi (qirralar soni): WebGL fragment uniform chegarasidan ancha past */
const MAXE = 128;

export interface SiteMask { edges: THREE.Vector4[]; n: number }

/** Halqalardan qirralar roʻyxati; MAXE dan koʻp boʻlsa — har k-uchidan biri olinadi (shakl saqlanadi, aniqlik ~ bir necha m) */
export function siteMask(rings: XY[][] | null | undefined): SiteMask | null {
  const rs = (rings ?? []).filter(r => r.length >= 3);
  if (!rs.length) return null;
  const total = rs.reduce((t, r) => t + r.length, 0), step = Math.max(1, Math.ceil(total / MAXE));
  const edges: THREE.Vector4[] = [];
  for (const r0 of rs) {
    const r = step > 1 ? r0.filter((_, i) => i % step === 0) : r0; if (r.length < 3) continue;
    for (let i = 0; i < r.length && edges.length < MAXE; i++) { const a = r[i], b = r[(i + 1) % r.length]; edges.push(new THREE.Vector4(a[0], a[1], b[0], b[1])); }
  }
  const n = edges.length;
  while (edges.length < MAXE) edges.push(new THREE.Vector4());
  return { edges, n };
}

/** Materialga uchastka niqobi: ichida — oʻzgarmaydi, tashqarida — rang `outside` (kontekst yoʻli rangi) */
export function outsideAs<M extends THREE.Material>(mat: M, m: SiteMask, outside: THREE.Color): M {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.sfE = { value: m.edges }; sh.uniforms.sfN = { value: m.n }; sh.uniforms.sfC = { value: outside };
    sh.vertexShader = 'varying vec2 vSfP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSfP = vec2(position.x, -position.z);');
    sh.fragmentShader = `uniform vec4 sfE[${MAXE}];\nuniform int sfN;\nuniform vec3 sfC;\nvarying vec2 vSfP;\n` + sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
  { bool sfIn = false;
    for (int i = 0; i < ${MAXE}; i++) { if (i >= sfN) break; vec4 e = sfE[i];
      if (((e.y > vSfP.y) != (e.w > vSfP.y)) && (vSfP.x < (e.z - e.x) * (vSfP.y - e.y) / (e.w - e.y) + e.x)) sfIn = !sfIn; }
    if (!sfIn) gl_FragColor.rgb = sfC; }`);
  };
  mat.customProgramCacheKey = () => 'siteOut' + MAXE;
  mat.userData.siteOut = outside.getHex();
  return mat;
}
