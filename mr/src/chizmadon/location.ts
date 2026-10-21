/**
 * Loyiha hududi (bitta oyna): Oʻzbekiston chegaralari (geoBoundaries gbOpen ADM0/1/2, OSM asosida, soddalashtirilgan) va dunyo
 * davlatlari (world-atlas@2.0.2 countries-50m). Maʼlumot alohida fayllarda — kerak boʻlganda yuklanadi: ./chizmadon/uz-geo.json,
 * ./chizmadon/world.json. Bu yerda: nomlar, geometriya, quyosh hisobi va nuqtani hal qilish (resolve).
 */
export type LL = [number, number];
export type Geom = { type: 'Polygon'; coordinates: LL[][] } | { type: 'MultiPolygon'; coordinates: LL[][][] };
export interface Area { n: string; g: Geom; bb?: number[]; r?: string | null }
export interface UzGeo { c: Geom; r: Area[]; d: Area[] }

const D2R = Math.PI / 180;
export const UZ_R: Record<string, string> = { "Andijan Region": "Andijon viloyati", "Namangan Region": "Namangan viloyati", "Fergana Region": "Fargʻona viloyati", "Republic of Karakalpakstan": "Qoraqalpogʻiston Respublikasi", "Xorazm Region": "Xorazm viloyati", "Navoiy Region": "Navoiy viloyati", "Surxondaryo Region": "Surxondaryo viloyati", "Samarqand Region": "Samarqand viloyati", "Tashkent Region": "Toshkent viloyati", "Sirdaryo Region": "Sirdaryo viloyati", "Jizzakh Region": "Jizzax viloyati", "Bukhara Region": "Buxoro viloyati", "Qashqadaryo Region": "Qashqadaryo viloyati", "Tashkent": "Toshkent shahri" };
export const UZ_D: Record<string, string> = { "Chilanzar": "Chilonzor", "Yakkasaray": "Yakkasaroy", "Almazar": "Olmazor", "Shaykhantokhur": "Shayxontohur", "Yunusabad": "Yunusobod", "Mirabad": "Mirobod", "Mirzo Ulugbek": "Mirzo Ulugʻbek", "Samarkand city": "Samarqand shahri", "Samarkand": "Samarqand", "Bukhara city": "Buxoro shahri", "Nukus city": "Nukus shahri", "Karshi city": "Qarshi shahri", "Navoi city": "Navoiy shahri", "Chirchik city": "Chirchiq shahri", "Dzhizak city": "Jizzax shahri", "Fergana city": "Fargʻona shahri", "Andijan city": "Andijon shahri" };
export const UZ_C: Record<string, string> = { "Uzbekistan": "Oʻzbekiston", "Kazakhstan": "Qozogʻiston", "Kyrgyzstan": "Qirgʻiziston", "Tajikistan": "Tojikiston", "Turkmenistan": "Turkmaniston", "Afghanistan": "Afgʻoniston", "Russia": "Rossiya", "China": "Xitoy", "Turkey": "Turkiya", "Germany": "Germaniya", "France": "Fransiya", "United Kingdom": "Buyuk Britaniya", "United States of America": "AQSh", "Japan": "Yaponiya", "South Korea": "Janubiy Koreya", "India": "Hindiston", "Iran": "Eron", "United Arab Emirates": "BAA", "Saudi Arabia": "Saudiya Arabistoni", "Azerbaijan": "Ozarbayjon", "Pakistan": "Pokiston", "Italy": "Italiya", "Spain": "Ispaniya", "Netherlands": "Niderlandiya", "Singapore": "Singapur", "Malaysia": "Malayziya", "Egypt": "Misr", "Georgia": "Gruziya", "Armenia": "Armaniston", "Mongolia": "Moʻgʻuliston", "Indonesia": "Indoneziya", "Qatar": "Qatar", "Switzerland": "Shveytsariya", "Austria": "Avstriya", "Poland": "Polsha", "Ukraine": "Ukraina", "Belarus": "Belarus", "Canada": "Kanada", "Brazil": "Braziliya", "Australia": "Avstraliya", "Israel": "Isroil", "Greece": "Gretsiya", "Sweden": "Shvetsiya", "Norway": "Norvegiya", "Finland": "Finlyandiya", "Denmark": "Daniya", "Belgium": "Belgiya", "Portugal": "Portugaliya", "Czechia": "Chexiya", "Hungary": "Vengriya", "Mexico": "Meksika", "Thailand": "Tailand", "Vietnam": "Vyetnam", "Iraq": "Iroq", "Syria": "Suriya", "Jordan": "Iordaniya", "Oman": "Ummon", "Kuwait": "Quvayt" };
export const rName = (n: string): string => UZ_R[n] || n;
export const dName = (n: string): string => UZ_D[n] ? (/shahri$/.test(UZ_D[n]) ? UZ_D[n] : UZ_D[n] + ' tumani') : / city$/.test(n) ? n.replace(/ city$/, '') + ' shahri' : n + ' tumani';
export const cName = (n: string): string => UZ_C[n] || n;

/* ---------- geometriya ---------- */
export const rings = (g: Geom): LL[][][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
export function inRing(p: LL, r: LL[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > p[1]) !== (b[1] > p[1])) && (p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c; }
  return c;
}
export function inGeom(p: LL, g: Geom): boolean {
  for (const poly of rings(g)) { if (inRing(p, poly[0])) { let hole = false; for (let k = 1; k < poly.length; k++) if (inRing(p, poly[k])) hole = true; if (!hole) return true; } }
  return false;
}
export function bboxOf(g: Geom): number[] {
  const a = [1e9, 1e9, -1e9, -1e9];
  for (const poly of rings(g)) for (const pt of poly[0]) { a[0] = Math.min(a[0], pt[0]); a[1] = Math.min(a[1], pt[1]); a[2] = Math.max(a[2], pt[0]); a[3] = Math.max(a[3], pt[1]); }
  return a;
}
export function centroid(g: Geom): LL { let sx = 0, sy = 0, n = 0; for (const poly of rings(g)) for (const pt of poly[0]) { sx += pt[0]; sy += pt[1]; n++; } return [sx / n, sy / n]; }
/** Maydon, km² (mahalliy tekis proyeksiya) */
export function areaKm2(g: Geom): number {
  const lat0 = centroid(g)[1] * D2R, kx = 111.32 * Math.cos(lat0), ky = 110.57; let A = 0;
  for (const poly of rings(g)) poly.forEach((r, ri) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] * kx) * (r[i][1] * ky) - (r[i][0] * kx) * (r[j][1] * ky); A += (ri ? -1 : 1) * Math.abs(s) / 2; });
  return A;
}
/** Katta doira masofasi, km */
export function hav(a: LL, b: LL): number { const R = 6371, dl = (b[1] - a[1]) * D2R, dn = (b[0] - a[0]) * D2R; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
export const bbHit = (a: number[], b: number[]): boolean => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
/** Shakl ichidagi nuqta (eng katta qism markazi; tashqarida boʻlsa — toʻrdagi eng yaqin ichki nuqta) */
export function interiorPt(g: Geom): LL {
  let best: LL[][] | null = null, ba = -1;
  for (const poly of rings(g)) { const r = poly[0]; let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; a = Math.abs(a); if (a > ba) { ba = a; best = poly; } }
  const r = best![0]; const c: LL = [r.reduce((q, p) => q + p[0], 0) / r.length, r.reduce((q, p) => q + p[1], 0) / r.length];
  if (inGeom(c, g)) return c;
  const b = bboxOf({ type: 'Polygon', coordinates: [r] }); let bp: LL | null = null, bd = 1e9;
  for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) { const p: LL = [b[0] + (b[2] - b[0]) * i / 20, b[1] + (b[3] - b[1]) * j / 20]; if (inRing(p, r)) { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bp = p; } } }
  return bp ?? r[0];
}

/* ---------- quyosh ---------- */
export function sun(lat: number, dec: number, H: number): { alt: number; az: number } {
  const p = lat * D2R, d = dec * D2R, h = H * D2R;
  const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(p) - Math.tan(d) * Math.cos(p)) / D2R + 180;
  return { alt: alt / D2R, az };
}
export const dayLen = (lat: number, dec: number): number => { const x = -Math.tan(lat * D2R) * Math.tan(dec * D2R); return 2 * Math.acos(Math.max(-1, Math.min(1, x))) / D2R / 15; };
export const decl = (n: number): number => 23.44 * Math.sin(2 * Math.PI * (284 + n) / 365);
const MID = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
type TF = (k: string, v: Record<string, unknown>) => string;
const tf0: TF = (k, v) => k.replace(/\$\{(\w+)\}/g, (_m, n: string) => String(v[n] ?? ''));
/** «9 s 01 daq» (tf — tarjima bilan) */
export const hm = (h: number, tf: TF = tf0): string => { let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return tf('${h} s ${m} daq', { h: H, m: String(M).padStart(2, '0') }); };
export const f1 = (x: number): string => x.toFixed(1).replace('.', ',');

/* ---------- til ---------- */
let LANG: 'uz' | 'en' | 'ru' = 'uz';
/** Davlat nomlari tili (ilova tili) */
export const setLocLang = (l: 'uz' | 'en' | 'ru'): void => { LANG = l; IDX = null; };

/* ---------- maʼlumot yuklash ---------- */
let GEO: UzGeo | null = null, CBB: number[] = [55.9, 37.1, 73.2, 45.6];
let WORLD: Area[] | null = null;
export const geo = (): UzGeo | null => GEO;
export const world = (): Area[] | null => WORLD;
export const uzBB = (): number[] => CBB;
/** Oʻzbekiston chegaralarini tayyorlash (tumanni viloyatga bogʻlash, chegaralar qutisi) */
export function setGeo(g: UzGeo): UzGeo {
  g.r.forEach(r => { r.bb = bboxOf(r.g); });
  g.d.forEach(d => { const c = centroid(d.g); const r = g.r.find(x => inGeom(c, x.g)); d.r = r ? r.n : null; d.bb = bboxOf(d.g); });
  CBB = bboxOf(g.c); GEO = g; return g;
}
export function setWorld(w: Area[]): Area[] { w.forEach(c => { c.bb = bboxOf(c.g); }); WORLD = w; return w; }
let pG: Promise<UzGeo | null> | null = null, pW: Promise<Area[] | null> | null = null;
export const loadGeo = (base = './chizmadon/'): Promise<UzGeo | null> => pG ??= fetch(base + 'uz-geo.json').then(r => (r.ok ? r.json() : null)).then(j => (j ? setGeo(j) : null)).catch(() => null);
/** Dunyo chegaralari ≈ 800 KB — faqat Oʻzbekistondan tashqari nuqta yoki «Dunyo» xaritasi kerak boʻlganda */
export const loadWorld = (base = './chizmadon/'): Promise<Area[] | null> => pW ??= fetch(base + 'world.json').then(r => (r.ok ? r.json() : null)).then(j => (j ? setWorld(j) : null)).catch(() => null);

/** Tez tanlash: Toshkent (Yakkasaroy), Samarqand, Nukus, Jizzax, Chirchiq */
export function presets(): { label: string; lat: number; lon: number }[] {
  if (!GEO) return [];
  return ([['Toshkent', 'Yakkasaray'], ['Samarqand', 'Samarkand city'], ['Nukus', 'Nukus city'], ['Jizzax', 'Dzhizak city'], ['Chirchiq', 'Chirchik city']] as const).flatMap(([label, dn]) => {
    const d = GEO!.d.find(x => x.n === dn); if (!d) return [];
    let c = centroid(d.g); if (!inGeom(c, d.g)) c = rings(d.g)[0][0][0];
    return [{ label, lat: Math.round(c[1] * 1e4) / 1e4, lon: Math.round(c[0] * 1e4) / 1e4 }];
  });
}

/* ---------- nuqtani hal qilish ---------- */
export interface Resolved {
  p: LL; lat: number; lon: number; inside: boolean; country: Area | null; cn: string; south: boolean; sd: number;
  reg: Area | null; dis: Area | null; sumAlt: number; winAlt: number; eqAlt: number; sumLen: number; winLen: number; months: number[];
  distTas: number; dArea: number | null;
}
export function resolve(lat: number, lon: number): Resolved {
  const p: LL = [lon, lat], inside = !!GEO && inGeom(p, GEO.c);
  const reg = inside ? GEO!.r.find(r => inGeom(p, r.g)) ?? null : null, dis = inside ? GEO!.d.find(d => inGeom(p, d.g)) ?? null : null;
  const country: Area | null = inside ? { n: 'Uzbekistan', g: GEO!.c, bb: CBB } : (WORLD?.find(c => p[0] >= c.bb![0] && p[0] <= c.bb![2] && p[1] >= c.bb![1] && p[1] <= c.bb![3] && inGeom(p, c.g)) ?? null);
  const sd = lat >= 0 ? 23.44 : -23.44; // mahalliy yoz: janubiy yarim sharda — 22-dekabr
  return {
    p, lat, lon, inside, country, cn: country ? (country.n === 'Uzbekistan' ? 'Oʻzbekiston' : countryName(country.n, LANG)) : (WORLD ? 'Okean / maʼlumot yoʻq' : '—'), south: lat < 0, sd, reg, dis,
    sumAlt: 90 - Math.abs(lat - sd), winAlt: Math.max(0, 90 - Math.abs(lat + sd)), eqAlt: 90 - Math.abs(lat),
    sumLen: dayLen(lat, sd), winLen: dayLen(lat, -sd), months: MID.map(n => dayLen(lat, decl(n))), distTas: hav(p, [69.2797, 41.3111]), dArea: dis ? areaKm2(dis.g) : null,
  };
}
/** Joy nomi qisqa: tuman / viloyat / davlat */
export const placeName = (R: Resolved): string => (R.inside ? (R.dis ? dName(R.dis.n) : R.reg ? rName(R.reg.n) : 'Oʻzbekiston') : R.cn);
/** Avtomatik xulosa matni (quyosh boʻyicha fasad tavsiyasi) */
export function autoNote(R: Resolved, tf: TF = tf0): string {
  const d = 1 / Math.tan(R.sumAlt * D2R), lit = Math.max(0, 1 - d * Math.tan(R.winAlt * D2R));
  return tf('Tush paytida quyosh yozda ${a}°, qishda ${b}° balandlikda: farq ${c}°.', { a: f1(R.sumAlt), b: f1(R.winAlt), c: f1(R.sumAlt - R.winAlt) }) + ' '
    + tf(R.south ? 'Shimoliy fasadda har 1 m deraza balandligiga ${d} m chiqma yozgi tush quyoshini toʻliq toʻsadi, qishda esa derazaning ${p}% qismi quyoshda qoladi.' : 'Janubiy fasadda har 1 m deraza balandligiga ${d} m chiqma yozgi tush quyoshini toʻliq toʻsadi, qishda esa derazaning ${p}% qismi quyoshda qoladi.', { d: d.toFixed(2).replace('.', ','), p: Math.round(lit * 100) }) + ' '
    + tf(R.winLen < 9.5 ? 'Qishki kun ${t} — insolyatsiya talabini qishki kun boʻyicha tekshiring.' : 'Qishki kun ${t}; bino oraligʻini qishki past quyosh boʻyicha belgilang.', { t: hm(R.winLen, tf) });
}

/* ---------- qidiruv (tarmoqsiz): viloyat, tuman, davlat; koordinata ---------- */
/** Apostrof va harf katta-kichikligi eʼtiborsiz */
export const norm = (t: string): string => String(t).toLowerCase().replace(/[ʻʼ'‘’`ʹ]/g, '').replace(/\s+/g, ' ').trim();
/** «41.31, 69.28», «41,31 69,28», «33.87 S, 151.21 E», «-33.87; 151.21» */
export function parseCoord(q: string): { lat: number; lon: number } | null {
  const m = String(q).match(/(-?\d+(?:[.,]\d+)?)\s*°?\s*([NSns])?\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([EWew])?/);
  if (!m) return null;
  let la = parseFloat(m[1].replace(',', '.')), lo = parseFloat(m[3].replace(',', '.'));
  if (m[2] && /s/i.test(m[2])) la = -Math.abs(la); if (m[4] && /w/i.test(m[4])) lo = -Math.abs(lo);
  return Math.abs(la) <= 85 && Math.abs(lo) <= 180 ? { lat: Math.round(la * 1e4) / 1e4, lon: Math.round(lo * 1e4) / 1e4 } : null;
}
/** Davlat nomi tanlangan tilda: oʻzbekcha lugʻat → Intl (ISO kod topilsa) → inglizcha */
let ISO: Map<string, string> | null = null;
function isoOf(n: string): string | null {
  if (!ISO) {
    ISO = new Map();
    try {
      const en = new Intl.DisplayNames(['en'], { type: 'region' }), A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (const a of A) for (const b of A) { const code = a + b; try { const nm = en.of(code); if (nm && nm !== code) ISO.set(norm(nm), code); } catch { /* */ } }
      // Natural Earth qisqartmalari
      for (const [k, v] of Object.entries({ 'united states of america': 'US', 'dem. rep. congo': 'CD', 'congo': 'CG', 'central african rep.': 'CF', 's. sudan': 'SS', 'bosnia and herz.': 'BA', 'dominican rep.': 'DO', 'eq. guinea': 'GQ', 'czechia': 'CZ', 'macedonia': 'MK', 'north macedonia': 'MK', 'eswatini': 'SZ', 'côte divoire': 'CI', 'w. sahara': 'EH', 'solomon is.': 'SB', 'falkland is.': 'FK', 'fr. s. antarctic lands': 'TF', 'n. cyprus': 'CY', 'timor-leste': 'TL', 'myanmar': 'MM', 'russia': 'RU', 'south korea': 'KR', 'north korea': 'KP', 'laos': 'LA', 'vietnam': 'VN', 'syria': 'SY', 'iran': 'IR', 'turkey': 'TR', 'taiwan': 'TW', 'tanzania': 'TZ', 'bolivia': 'BO', 'venezuela': 'VE', 'moldova': 'MD', 'brunei': 'BN', 'palestine': 'PS', 'kosovo': 'XK', 'cabo verde': 'CV', 'st. vin. and gren.': 'VC', 'antigua and barb.': 'AG', 'st. kitts and nevis': 'KN', 'marshall is.': 'MH', 'cook is.': 'CK', 'faeroe is.': 'FO', 'cayman is.': 'KY', 'turks and caicos is.': 'TC', 'british virgin is.': 'VG', 'u.s. virgin is.': 'VI', 'n. mariana is.': 'MP', 'fr. polynesia': 'PF', 'wallis and futuna is.': 'WF', 'heard i. and mcdonald is.': 'HM', 's. geo. and the is.': 'GS', 'br. indian ocean ter.': 'IO', 'st. pierre and miquelon': 'PM', 'são tomé and principe': 'ST', 'saint lucia': 'LC', 'vatican': 'VA', 'micronesia': 'FM', 'pitcairn is.': 'PN', 'norfolk island': 'NF', 'åland': 'AX', 'curaçao': 'CW', 'sint maarten': 'SX', 'st-martin': 'MF', 'st-barthélemy': 'BL' })) ISO.set(k, v);
    } catch { /* Intl yoʻq */ }
  }
  return ISO.get(norm(n)) ?? null;
}
const DN: Record<string, Intl.DisplayNames | null> = {};
const dn = (l: string) => { if (!(l in DN)) { try { DN[l] = new Intl.DisplayNames([l], { type: 'region' }); } catch { DN[l] = null; } } return DN[l]; };
export function countryName(n: string, lang: 'uz' | 'en' | 'ru' = 'uz'): string {
  if (lang === 'uz' && UZ_C[n]) return UZ_C[n];
  if (lang === 'en') return n;
  const c = isoOf(n), d = c ? dn(lang) : null;
  try { const v = c && d ? d.of(c) : null; if (v && v !== c) return v; } catch { /* */ }
  return lang === 'uz' ? (UZ_C[n] ?? n) : n;
}
export interface LocHit { t: string; s: string; g: Geom; k: string; kind: 'r' | 'd' | 'c' }
let IDX: LocHit[] | null = null, IDXW = false;
function index(): LocHit[] {
  if (IDX && IDXW === !!WORLD) return IDX;
  const out: LocHit[] = [];
  if (GEO) {
    for (const r of GEO.r) out.push({ t: rName(r.n), s: 'viloyat · Oʻzbekiston', g: r.g, k: norm(`${rName(r.n)} ${r.n}`), kind: 'r' });
    for (const d of GEO.d) out.push({ t: dName(d.n), s: d.r ? rName(d.r) : 'Oʻzbekiston', g: d.g, k: norm(`${dName(d.n)} ${d.n}`), kind: 'd' });
  }
  for (const c of WORLD ?? []) out.push({ t: countryName(c.n, LANG), s: 'davlat', g: c.g, k: norm([c.n, UZ_C[c.n] ?? '', countryName(c.n, 'uz'), countryName(c.n, 'ru')].join(' ')), kind: 'c' });
  IDX = out; IDXW = !!WORLD; return out;
}
/** Joy qidirish: avval nomi soʻz bilan boshlanganlari, keyin qisqaroqlari; ≤ 8 ta */
export function locSearch(q: string): LocHit[] {
  const n = norm(q); if (!n) return [];
  const m = index().filter(e => e.k.includes(n));
  const starts = (e: LocHit) => Number(e.k.startsWith(n) || e.k.includes(' ' + n));
  m.sort((a, b) => starts(b) - starts(a) || a.t.length - b.t.length);
  return m.slice(0, 8);
}

/* ---------- mini xaritalar (SVG satri; bosish — nuqta tanlash) ---------- */
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Oʻzbekiston: viloyatlar, tanlangan viloyat ajratilgan, nuqta */
export function uzMini(R: Resolved | null, W = 240, H = 150): { svg: string; pick: (fx: number, fy: number) => { lat: number; lon: number } } {
  const bb = CBB, lat0 = (bb[1] + bb[3]) / 2, kx = Math.cos(lat0 * D2R), bw = (bb[2] - bb[0]) * kx, bh = bb[3] - bb[1], s = Math.min((W - 8) / bw, (H - 8) / bh), ox = (W - bw * s) / 2, oy = (H - bh * s) / 2;
  const pr = (p: LL): LL => [r2(ox + (p[0] - bb[0]) * kx * s), r2(oy + (bb[3] - p[1]) * s)];
  const path = (g: Geom) => rings(g).map(poly => poly.map(ring => ring.map((p, i) => (i ? 'L' : 'M') + pr(p).join(' ')).join('') + 'Z').join('')).join('');
  let svg = `<svg viewBox="0 0 ${W} ${H}" id="chUzMini" role="img">`;
  for (const r of GEO?.r ?? []) { const on = R?.reg && r.n === R.reg.n; svg += `<path d="${path(r.g)}" fill="${on ? 'var(--sel-soft)' : 'var(--surface)'}" stroke="var(--faint)" stroke-width=".6"/>`; }
  if (R?.inside) { const q = pr(R.p); svg += `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="var(--svc-chz)" stroke="var(--surface)" stroke-width="1.5"/>`; }
  return { svg: svg + '</svg>', pick: (fx, fy) => ({ lat: Math.round((bb[3] - (fy * H - oy) / s) * 1e4) / 1e4, lon: Math.round((bb[0] + (fx * W - ox) / (kx * s)) * 1e4) / 1e4 }) };
}
let WBASE = '';
/** Dunyo (teng oraliqli proyeksiya, 84° N … 58° S): davlatlar, tanlangan davlat, nuqta */
export function worldMini(R: Resolved | null, W = 240, H = 116): { svg: string; pick: (fx: number, fy: number) => { lat: number; lon: number } } {
  const pr = (p: LL): string => `${r2((p[0] + 180) / 360 * W)} ${r2((84 - p[1]) / 142 * H)}`;
  if (!WBASE && WORLD) { let d = ''; for (const c of WORLD) for (const poly of rings(c.g)) { const r = poly[0]; if (r.length < 4) continue; d += r.map((p, i) => (i ? 'L' : 'M') + pr(p)).join('') + 'Z'; } WBASE = d; }
  let hl = ''; if (R?.country) for (const poly of rings(R.country.g)) hl += poly[0].map((p, i) => (i ? 'L' : 'M') + pr(p)).join('') + 'Z';
  const q = R ? pr(R.p).split(' ') : null;
  const svg = `<svg viewBox="0 0 ${W} ${H}" id="chWorldMini" role="img"><path d="${WBASE}" fill="var(--surface)" stroke="var(--faint)" stroke-width=".25"/>${hl ? `<path d="${hl}" fill="var(--sel-soft)" stroke="var(--sel)" stroke-width=".4"/>` : ''}${q ? `<circle cx="${q[0]}" cy="${q[1]}" r="3" fill="var(--svc-chz)" stroke="var(--surface)" stroke-width="1.2"/>` : ''}</svg>`;
  return { svg, pick: (fx, fy) => ({ lat: Math.round((84 - fy * 142) * 1e4) / 1e4, lon: Math.round((fx * 360 - 180) * 1e4) / 1e4 }) };
}
