/**
 * Koʻchasoz C (Chorraha) — haqiqiy tugun (C1, 26.10.2026; reja: claude/kochasoz-acd-reja.md).
 * Nuqta (koordinata yoki xarita havolasi) → OSM (Overpass, ochiq maʼlumot, ODbL) dan atrofdagi yoʻllar → eng yaqin
 * chorraha tuguni → tarmoqlar (yoʻnalish, toifa, boʻlaklar, tezlik) → C maketi uchun ikki koʻcha (asosiy va kesishuvchi),
 * kesishish burchagi va hisobiy tezliklar.
 *
 * Manba va ishonch: toifa, boʻlaklar soni, bir tomonlamalik, tezlik, nom — OSM teglari; kesim elementlari
 * (trotuar, yashil tasma, ajratuvchi) — Dizayn-kod 3.4 eng kichik enlari va toifa boʻyicha ANDOZA (OSM da odatda yoʻq).
 * Hozirgi maket faqat ikki koʻcha kesishuvini chizadi (4 tarmoq); T-chorrahada uchinchi tarmoq qarama-qarshi davom
 * etgan deb chiziladi — ogohlantirish bilan.
 */

export type LL = [number, number]; // [lon, lat]
export interface OsmEl { type: 'node' | 'way'; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }
export type Tpl = [string, null, [string, number, Record<string, boolean>][], string, string];

/** Avtomobil yoʻli toifalari (servis, piyoda va velo yoʻlaklari chorraha emas) */
const DRIVE: Record<string, number> = { motorway: 7, trunk: 6, primary: 5, secondary: 4, tertiary: 3, unclassified: 2, residential: 2, living_street: 1 };
/** OSM toifasi → Koʻchasoz tugmasi (ShNQ 2.07.01-23 toifalari) va Dizayn-kod turi (claude/kochasoz-qoidalar.md) */
const SK: Record<string, [string, string]> = {
  motorway: ['tz1', 'U2'], trunk: ['sh1', 'U2'], primary: ['sh2', 'U2'], secondary: ['sh3', 'U2'], tertiary: ['tm', 'U3'],
  unclassified: ['mh', 'M1'], residential: ['mh', 'M1'], living_street: ['mh', 'M1'],
};
/** Odatiy hisobiy tezlik (km/h) — maxspeed yoʻq boʻlsa (C dagi tanlov qatoriga mos: 30, 40, 50, 60, 80) */
const V0: Record<string, number> = { tz1: 80, sh1: 60, sh2: 60, sh3: 50, tm: 50, mh: 40, pd: 30 };
/** Dizayn-kod 3.4 — piyodalar hududi eng kichik eni (m) */
const PIY: Record<string, number> = { U2: 3, U3: 3, M1: 2.25 };

/** «41.31, 69.28», «69.28,41.31» (Yandex ll), OSM / Google / Yandex havolalaridan koordinata */
export function parseLatLon(text: string): LL | null {
  const t = text.trim(), num = (s: string) => parseFloat(s.replace(',', '.'));
  let m = /[?&]ll=([-\d.]+)(?:%2C|,)([-\d.]+)/i.exec(t);                     // Yandex: ll=lon,lat
  if (m) return ok([num(m[1]), num(m[2])]);
  m = /mlat=([-\d.]+).*?mlon=([-\d.]+)/i.exec(t) ?? /#map=\d+\/([-\d.]+)\/([-\d.]+)/i.exec(t);   // OSM
  if (m) return ok([num(m[2]), num(m[1])]);
  m = /@([-\d.]+),([-\d.]+)/.exec(t);                                         // Google: @lat,lon
  if (m) return ok([num(m[2]), num(m[1])]);
  m = /^\s*([-\d]+[.,]\d+)\s*[,; ]\s*([-\d]+[.,]\d+)\s*$/.exec(t);            // «lat, lon»
  if (m) { const a = num(m[1]), b = num(m[2]); return ok(Math.abs(a) <= 90 && (Math.abs(b) > 90 || Math.abs(a) < Math.abs(b)) ? [b, a] : [a, b]); }
  return null;
  function ok(p: LL): LL | null { return Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90 && Math.abs(p[0]) <= 180 ? p : null; }
}

export const nodeQuery = (p: LL, r = 80) => `[out:json][timeout:25];way(around:${r},${p[1].toFixed(6)},${p[0].toFixed(6)})["highway"~"^(${Object.keys(DRIVE).join('|')}|.*_link)$"];(._;>;);out body;`;

const R = 6371000, rad = Math.PI / 180;
const dist = (a: LL, b: LL) => { const x = (b[0] - a[0]) * rad * Math.cos((a[1] + b[1]) / 2 * rad), y = (b[1] - a[1]) * rad; return Math.hypot(x, y) * R; };
/** Shimoldan soat strelkasi boʻyicha yoʻnalish, ° */
const bearing = (a: LL, b: LL) => { const x = (b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * rad), y = b[1] - a[1]; return (Math.atan2(x, y) / rad + 360) % 360; };
const adiff = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export interface Arm { way: number; bear: number; tags: Record<string, string>; cls: string; rank: number; name: string }
export interface NodeResult { at: LL; dist: number; arms: Arm[]; main: [Arm, Arm | null]; cross: [Arm, Arm | null]; ang: number; tee: boolean; notes: string[] }

/** Nuqtaga eng yaqin chorraha (≥ 3 tarmoq yoki ≥ 2 yoʻl kesishgan tugun) va uning tarmoqlari */
export function findNode(els: OsmEl[], p: LL, maxD = 80): NodeResult | null {
  const nodes = new Map<number, LL>(), ways = els.filter(e => e.type === 'way' && e.nodes && e.tags?.highway);
  for (const e of els) if (e.type === 'node' && e.lat != null && e.lon != null) nodes.set(e.id, [e.lon, e.lat]);
  const clsOf = (w: OsmEl) => (w.tags!.highway.replace(/_link$/, ''));
  const use = new Map<number, OsmEl[]>();
  for (const w of ways) { if (!(clsOf(w) in DRIVE)) continue; for (const n of new Set(w.nodes!)) (use.get(n) ?? use.set(n, []).get(n)!).push(w); }
  let best: { id: number; d: number; arms: Arm[] } | null = null;
  for (const [id, ws] of use) {
    const pt = nodes.get(id); if (!pt) continue;
    const d = dist(pt, p); if (d > maxD || (best && d >= best.d)) continue;
    const arms: Arm[] = [];
    for (const w of ws) {
      const ns = w.nodes!, i = ns.indexOf(id);
      for (const dir of [-1, 1]) {
        // tugundan ~25 m narigi nuqta (qiyshiq yoʻlda boshlangʻich yoʻnalish)
        let j = i + dir, q: LL | null = null, acc = 0, prev = pt;
        while (j >= 0 && j < ns.length) { const c = nodes.get(ns[j]); if (!c) break; acc += dist(prev, c); q = c; prev = c; if (acc >= 25) break; j += dir; }
        if (!q || acc < 3) continue;
        const cls = clsOf(w);
        arms.push({ way: w.id, bear: bearing(pt, q), tags: w.tags!, cls, rank: DRIVE[cls], name: w.tags!.name ?? '' });
      }
    }
    if (arms.length < 3) continue;   // oddiy davom (2 tarmoq) — chorraha emas
    best = { id, d, arms };
  }
  if (!best) return null;
  const at = nodes.get(best.id)!, arms = best.arms.sort((a, b) => b.rank - a.rank || a.bear - b.bear), notes: string[] = [];
  // asosiy koʻcha: eng yuqori toifali, bir-biriga eng toʻgʻri (≈ 180°) ikki tarmoq; nom bir xil boʻlsa — afzal
  let mp: [number, number] = [0, -1], ms = -Infinity;
  for (let i = 0; i < arms.length; i++) for (let j = i + 1; j < arms.length; j++) {
    const a = arms[i], b = arms[j], st = 180 - adiff(a.bear, b.bear);
    const sc = (a.rank + b.rank) * 10 - st * 0.6 + (a.name && a.name === b.name ? 15 : 0) + (a.way === b.way ? 10 : 0);
    if (st <= 40 && sc > ms) { ms = sc; mp = [i, j]; }
  }
  if (mp[1] < 0) mp = [0, -1];
  const mainA = arms[mp[0]], mainB = mp[1] >= 0 ? arms[mp[1]] : null;
  const rest = arms.filter((_, k) => k !== mp[0] && k !== mp[1]);
  // kesishuvchi: qolganlardan eng yuqori toifa; unga qarama-qarshi tarmoq boʻlsa — juft
  rest.sort((a, b) => b.rank - a.rank);
  const cA = rest[0], cB = rest.slice(1).sort((a, b) => adiff(adiff(a.bear, cA.bear), 180) - adiff(adiff(b.bear, cA.bear), 180))[0];
  const cross: [Arm, Arm | null] = [cA, cB && adiff(cB.bear, cA.bear) >= 140 ? cB : null];
  if (arms.length > 4) notes.push(`Tugunda ${arms.length} ta tarmoq — maketda eng asosiy 4 tasi chiziladi`);
  const tee = !cross[1] || !mainB;
  if (tee) notes.push('T-chorraha: maket hozircha 4 tarmoqli kesishuvni chizadi — uchinchi tarmoq qarama-qarshi davom etgan deb koʻrsatiladi');
  // kesishish burchagi: asosiy oʻq va kesishuvchi oʻq orasida, 0–180
  const ang = Math.round(adiff(mainA.bear, cA.bear));   // 0…180: asosiy koʻcha yoʻnalishi va kesishuvchi tarmoq orasida
  if (ang < 60 || ang > 120) notes.push(`Kesishish burchagi ${ang}° — maket 60–120° oraligʻida chizadi`);
  return { at, dist: best.d, arms, main: [mainA, mainB], cross, ang: Math.max(60, Math.min(120, ang)), tee, notes };
}

/** OSM yoʻl teglari → C maketi kesim shabloni (ANDOZA: kesim elementlari toifa boʻyicha, boʻlaklar va ajratuvchi — OSM dan) */
export function tplFromArm(a: Arm, b: Arm | null): { tpl: Tpl; v: number; src: string[] } {
  const t = a.tags, [sk, uk] = SK[a.cls] ?? ['mh', 'M1'], src: string[] = [];
  const ow = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout';
  // boʻlaklar: lanes (ikki tarmoq bir xil yoʻl boʻlmasa — ikki bir tomonlama yoʻl, yigʻindisi), aks holda toifa boʻyicha
  const ln = (x: Arm) => parseInt(x.tags.lanes ?? '', 10);
  let lanes = ln(a);
  const dual = !!b && b.way !== a.way && ow && (b.tags.oneway === 'yes' || b.tags.oneway === '1');
  if (Number.isFinite(lanes)) { if (dual && Number.isFinite(ln(b!))) lanes += ln(b!); src.push('boʻlaklar — OSM'); }
  else { lanes = ({ tz1: 6, sh1: 6, sh2: 4, sh3: 4, tm: 2, mh: 2 } as Record<string, number>)[sk] ?? 2; if (dual) lanes = Math.max(lanes, 4); src.push('boʻlaklar — andoza (OSM da lanes yoʻq)'); }
  lanes = Math.max(1, Math.min(8, lanes));
  const lw = sk === 'mh' ? 3 : sk === 'tm' ? 3.5 : 3.25, med = dual || (lanes >= 4 && /^(tz1|sh1|sh2)$/.test(sk));
  const piy = PIY[uk] ?? 2.25, yash = sk === 'mh' ? 2 : 3;
  const half = (n: number) => Array.from({ length: n }, () => ['qat', lw, {}] as [string, number, Record<string, boolean>]);
  const n1 = ow && !dual ? lanes : Math.ceil(lanes / 2), n2 = ow && !dual ? 0 : lanes - n1;
  const els: [string, number, Record<string, boolean>][] = [
    ['front', 1, {}], ['piy', piy, {}], ['yash', yash, { daraxt: true }], ['mebel', 0.6, { fonar: true }],
    ...half(n1), ...(med && n2 ? [['med', dual ? 4 : 2.5, { fonar: true }] as [string, number, Record<string, boolean>]] : []), ...half(n2),
    ['mebel', 0.6, { fonar: true }], ['yash', yash, { daraxt: true }], ['piy', piy, {}], ['front', 1, {}],
  ];
  src.push('trotuar va yashil tasma — andoza (Dizayn-kod 3.4)');
  if (med) src.push(dual ? 'ajratuvchi — OSM (ikki bir tomonlama yoʻl)' : 'ajratuvchi — andoza');
  const ms = parseInt(t.maxspeed ?? '', 10), v = [30, 40, 50, 60, 80].reduce((p, c) => (Math.abs(c - (Number.isFinite(ms) ? ms : V0[sk] ?? 40)) < Math.abs(p - (Number.isFinite(ms) ? ms : V0[sk] ?? 40)) ? c : p), 40);
  src.push(Number.isFinite(ms) ? 'tezlik — OSM maxspeed' : 'tezlik — toifa boʻyicha andoza');
  const name = `OSM · ${a.name || (b?.name ?? '') || a.cls}`;
  return { tpl: [name, null, els, sk, uk], v, src };
}
