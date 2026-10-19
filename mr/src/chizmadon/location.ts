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
export const hm = (h: number): string => { const H = Math.floor(h), M = Math.round((h - H) * 60); return H + ' s ' + String(M).padStart(2, '0') + ' daq'; };
export const f1 = (x: number): string => x.toFixed(1).replace('.', ',');

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
    p, lat, lon, inside, country, cn: country ? cName(country.n) : (WORLD ? 'Okean / maʼlumot yoʻq' : '—'), south: lat < 0, sd, reg, dis,
    sumAlt: 90 - Math.abs(lat - sd), winAlt: Math.max(0, 90 - Math.abs(lat + sd)), eqAlt: 90 - Math.abs(lat),
    sumLen: dayLen(lat, sd), winLen: dayLen(lat, -sd), months: MID.map(n => dayLen(lat, decl(n))), distTas: hav(p, [69.2797, 41.3111]), dArea: dis ? areaKm2(dis.g) : null,
  };
}
/** Joy nomi qisqa: tuman / viloyat / davlat */
export const placeName = (R: Resolved): string => (R.inside ? (R.dis ? dName(R.dis.n) : R.reg ? rName(R.reg.n) : 'Oʻzbekiston') : R.cn);
/** Avtomatik xulosa matni (quyosh boʻyicha fasad tavsiyasi) */
export function autoNote(R: Resolved): string {
  const d = 1 / Math.tan(R.sumAlt * D2R), lit = Math.max(0, 1 - d * Math.tan(R.winAlt * D2R));
  return `Tush paytida quyosh yozda ${f1(R.sumAlt)}°, qishda ${f1(R.winAlt)}° balandlikda: farq ${f1(R.sumAlt - R.winAlt)}°. ${R.south ? 'Shimoliy' : 'Janubiy'} fasadda har 1 m deraza balandligiga ${d.toFixed(2).replace('.', ',')} m chiqma yozgi tush quyoshini toʻliq toʻsadi, qishda esa derazaning ${Math.round(lit * 100)}% qismi quyoshda qoladi. ` + (R.winLen < 9.5 ? `Qishki kun ${hm(R.winLen)} — insolyatsiya talabini qishki kun boʻyicha tekshiring.` : `Qishki kun ${hm(R.winLen)}; bino oraligʻini qishki past quyosh boʻyicha belgilang.`);
}
