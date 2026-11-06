/**
 * Mavjud holat va cheklovlar — OSM dan avtomatik aniqlash (02.11, cheklovlar 4-bosqichi; egasi: «OSM da maʼlumot boʻlsa mavjud
 * yer foydalanishi va ELU tayanchlari bilan yuklansin, boʻlmasa qoʻlda toʻldiriladi»).
 *
 * Alohida yengil Overpass soʻrovi (kontekst keshi oʻzgarmaydi). Uchastka atrofida 500 m (eng katta qabriston SMZ — II sinf) ichida:
 *  - qabriston: landuse=cemetery, amenity=grave_yard;
 *  - issiqxona: landuse=greenhouse_horticulture, building=greenhouse;
 *  - ombor: building=warehouse;
 *  - temir yoʻl: railway=rail (oʻq atrofida 6 m yoʻlak — izlar koridori, TAXMIN);
 *  - ELU: power=line / minor_line (havo), power=cable (kabel); kuchlanish — voltage tegidan (V → kV, eng kattasi);
 *    tayanchlar — power=tower / pole nuqtalari, eng yaqin liniyaga (≤ 15 m) biriktiriladi;
 *  - suv obyektlari (04.11, Murad sinovi, 6-band): waterway=river|stream|canal|drain|ditch (chiziq — oʻq), natural=water (koʻl, suv ombori;
 *    water=river|canal — daryo/kanal yuzasi); toifa (sarf) OSM da yoʻq — river «oʻrta», stream «juda kichik», canal — kiritilmagan;
 *    06.11 (c63): amenity=fountain, leisure=swimming_pool, water=pond|reflecting_pool|basin|fountain va tabiiy tegsiz < 0,5 ga suv — bezak suvi;
 *  - yer foydalanishi (qimmatli yerlar): landuse=orchard / vineyard / farmland — uchastka bilan kesishganlari, sukut «buziladi»
 *    (cheklov emas, yer balansi va yoʻqotiladigan yerlar uchun);
 *  - 07.11 (c70): SMZ obyektlari (`objOf`, katalog — limits.ts OBJ): amenity=fuel (fuel:* teglari), bus_station, car_wash, marketplace,
 *    crematorium, veterinary, fire_station, waste_transfer_station; shop=car_repair; power=substation; pipeline=substation (GTP);
 *    man_made=wastewater_plant / pumping_station (oqova); building=boiler_house; landuse=landfill / depot; industrial=slaughterhouse;
 *    leisure=stadium. Nuqta obyektlar — 10 m doira (ANDOZA). Qidiruv radiusi — obyekt zonasi.
 * Hammasi src: 'osm', osm: id — foydalanuvchi holat, turini oʻzgartiradi yoki oʻchiradi.
 */
import type { LngLat } from '../core/doc';
import { frame, type XY } from '../core/geo';
import { objZone, type Limit, type LimitKind } from '../core/limits';

type Geo = { lat: number; lon: number };
export interface OsmEl { type: 'node' | 'way' | 'relation'; id: number; tags?: Record<string, string>; lat?: number; lon?: number; geometry?: Geo[]; members?: { type: string; role: string; geometry?: Geo[] }[] }

export const LIM_OSM_R = 1000;   // 04.11: sanoat korxonasi I sinf SMZ — 1000 m (SanQvaN 0103-25, 7-band: 1-sinf); avval 500

export function limitsQuery(site: LngLat[], r = LIM_OSM_R): string {
  const fr = frame(site[0]), loc = site.map(fr.toLocal), xs = loc.map(p => p[0]), ys = loc.map(p => p[1]);
  const sw = fr.toGeo([Math.min(...xs) - r, Math.min(...ys) - r]), ne = fr.toGeo([Math.max(...xs) + r, Math.max(...ys) + r]);
  const bb = [sw[1], sw[0], ne[1], ne[0]].map(v => v.toFixed(6)).join(',');
  return `[out:json][timeout:60][bbox:${bb}];
(
  way["landuse"="cemetery"]; relation["landuse"="cemetery"]; way["amenity"="grave_yard"];
  way["landuse"="greenhouse_horticulture"]; way["building"="greenhouse"];
  way["building"="warehouse"];
  way["railway"="rail"]["tunnel"!="yes"];
  way["power"~"^(line|minor_line|cable)$"];
  node["power"~"^(tower|pole)$"];
  way["landuse"~"^(orchard|vineyard|farmland)$"];
  way["waterway"~"^(river|stream|canal|drain|ditch)$"]["tunnel"!="culvert"]["tunnel"!="yes"]; way["natural"="water"]; relation["natural"="water"]; way["amenity"="fountain"]; way["leisure"="swimming_pool"];
  way["landuse"="industrial"]; relation["landuse"="industrial"]; way["building"~"^(industrial|manufacture)$"]; way["man_made"="works"];
  nwr["amenity"~"^(fuel|bus_station|car_wash|marketplace|crematorium|veterinary|fire_station|waste_transfer_station)$"]; nwr["shop"="car_repair"];
  nwr["power"="substation"]; nwr["pipeline"="substation"]; nwr["man_made"~"^(wastewater_plant|pumping_station)$"]; nwr["building"="boiler_house"];
  way["landuse"~"^(landfill|depot)$"]; nwr["industrial"="slaughterhouse"]; way["leisure"="stadium"];
);
out geom qt;`;
}

const ring = (g?: Geo[]): LngLat[] | null => { if (!g || g.length < 4) return null; const r = g.map(p => [p.lon, p.lat] as LngLat); const a = r[0], b = r[r.length - 1]; return a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r; };
const pip = (p: XY, r: XY[]) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
/** nuqtadan koʻpburchak chegarasigacha masofa (ichida — 0) */
function distToRing(p: XY, r: XY[]): number { if (pip(p, r)) return 0; let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; }
/** chiziq / koʻpburchak uchastkadan m masofada yoki ichidami */
const near = (pts: XY[], site: XY[], m: number) => pts.some(p => distToRing(p, site) <= m) || site.some(q => pts.length > 2 && pip(q, pts))
  // uzun kesma: uchastka burchaklaridan chiziq kesmalarigacha
  || site.some(q => pts.some((a, i) => i > 0 && segD(q, pts[i - 1], a) <= m))
  || pts.some((a, i) => i > 0 && site.some((_q, k) => segX(pts[i - 1], a, site[k], site[(k + 1) % site.length])));
const segX = (a: XY, b: XY, c: XY, d: XY) => { const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };

/** 06.11 (c63): bezak suvi chegarasi — 0,5 ga (ANDOZA) */
export const DECOR_MAX_M2 = 5000;
const NATURAL_WATER = /^(lake|reservoir|river|oxbow|stream|canal|ditch|drain|lagoon|rapids|stream_pool|wastewater|lock)$/;
const DECOR_WATER = /^(pond|reflecting_pool|basin|fountain|pool|moat)$/;
/** natural=water — bezak suvimi: water=pond|reflecting_pool|basin|fountain yoki tabiiy teg yoʻq va maydoni < 0,5 ga */
export function isDecor(t: Record<string, string>, loc: XY[]): boolean {
  const w = t.water ?? '';
  if (DECOR_WATER.test(w)) return true;
  if (NATURAL_WATER.test(w) || t.name && /(suv ombori|водохранилищ|reservoir|koʻl|ko'l|озеро)/i.test(t.name)) return false;
  let a = 0; for (let i = 0; i < loc.length; i++) { const p = loc[i], q = loc[(i + 1) % loc.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a) / 2 < DECOR_MAX_M2;
}

/** voltage tegi (V, «;» bilan bir nechta) → kV, eng kattasi; yoʻq — undefined */
export function kvOf(v?: string): number | undefined {
  if (!v) return undefined;
  const n = v.split(/[;,]/).map(s => parseFloat(s.trim())).filter(x => Number.isFinite(x) && x > 0);
  if (!n.length) return undefined;
  const m = Math.max(...n); return m >= 100 ? Math.round(m / 100) / 10 : m;   // 110000 → 110; 400 → 0,4; «10» (kV yozilgan) — oʻzi
}

/** 07.11 (c70): nuqta obyekt (OSM node) — r = 10 m doira (12 burchak, ANDOZA: manba konturi nomaʼlum) */
export const POINT_R = 10;
function pointRing(fr: ReturnType<typeof frame>, p: LngLat): LngLat[] { const c = fr.toLocal(p); return Array.from({ length: 12 }, (_, i) => { const a = (i + 0.5) / 12 * Math.PI * 2; return fr.toGeo([c[0] + Math.cos(a) * POINT_R, c[1] + Math.sin(a) * POINT_R]); }); }
const yes = (v?: string) => !!v && v !== 'no';
/**
 * 07.11 (c70): OSM teglari → SMZ obyekti katalogi qatori (limits.ts, OBJ). guess — oʻlcham, quvvat yoki tur teglardan aniqlanmadi:
 * eng ehtiyotkor qator olinadi, natija «koʻrib chiqish» (TALQIN), foydalanuvchi panelda aniqlashtiradi.
 *  - amenity=fuel: fuel:* teglari. Suyuq + gaz — 414 (4-sinf); faqat propan (fuel:lpg) — 494 (5-sinf); faqat metan (fuel:cng) — 492 sharti
 *    (≤ 500 avto/kun, kompressor bino ichida) nomaʼlum → 414 (guess); faqat LNG — sigʻim nomaʼlum → 422 (guess); faqat suyuq — 491 sharti
 *    (≤ 3 joy) nomaʼlum → 414 (guess); teg yoʻq — 414 (guess). Nomda «metan/AGNKS» — metan, «propan/AGZS» — propan deb olinadi.
 *  - power=substation: ≤ 20 kV (yoki substation=minor_distribution) — TP, 257-band; kuchlanish yoʻq — TP (guess); > 20 kV — normada
 *    masofa yoʻq (ilovaga qoʻshilmaydi; ELU liniyalari 15-band boʻyicha alohida).
 *  - pipeline=substation (gaz) — GTP, bosim nomaʼlum → 15 m (guess).
 */
export function objOf(t: Record<string, string>): { key: string; guess: boolean } | null {
  const a = t.amenity ?? '', nm = `${t.name ?? ''} ${t.brand ?? ''}`;
  if (a === 'fuel') {
    const liquid = ['diesel', 'petrol', 'gasoline', 'octane_80', 'octane_91', 'octane_92', 'octane_95', 'octane_98', 'octane_100', 'e10', 'e85'].some(k => yes(t[`fuel:${k}`]));
    const cng = yes(t['fuel:cng']) || yes(t['fuel:biogas']) || /metan|AGNKS|AGTKSh|АГНКС|АГЗКС|метан|CNG/i.test(nm), lpg = yes(t['fuel:lpg']) || /propan|AGZS|АГЗС|пропан|LPG/i.test(nm), lng = yes(t['fuel:lng']);
    if (liquid && (cng || lpg || lng)) return { key: 'yoqilgi_414', guess: false };
    if (lpg && !cng && !lng && !liquid) return { key: 'agzs_494', guess: false };
    if (lng && !cng && !lpg) return { key: 'kriogen_422', guess: true };
    return { key: 'yoqilgi_414', guess: true };
  }
  if (t.power === 'substation') {
    const kv = kvOf(t.voltage);
    if (kv != null && kv > 20) return null;
    return { key: 'tp_257', guess: kv == null && t.substation !== 'minor_distribution' };
  }
  if (t.pipeline === 'substation' && (!t.substance || /gas/.test(t.substance))) return { key: 'gtp_12', guess: true };
  if (t.man_made === 'wastewater_plant') return { key: 'oqova_mb', guess: true };
  if (t.man_made === 'pumping_station' && /sewage|wastewater/.test(`${t.pumping_station ?? ''} ${t.substance ?? ''}`)) return { key: 'oqova_nasos', guess: true };
  if (t.building === 'boiler_house') return { key: 'qozon_290', guess: true };
  if (a === 'bus_station') return { key: 'avtovokzal_308', guess: false };
  if (t.landuse === 'depot') return { key: 'avtopark_309', guess: true };
  if (a === 'car_wash') return { key: 'yuvish_421', guess: true };
  if (t.shop === 'car_repair') return { key: 'avtoservis_423', guess: true };
  if (a === 'marketplace') return { key: 'bozor_488', guess: false };
  if (a === 'crematorium') return { key: 'kremator_79', guess: true };
  if (a === 'veterinary') return { key: 'vet_380', guess: true };
  if (a === 'fire_station') return { key: 'otochirish_485', guess: false };
  if (a === 'waste_transfer_station') return { key: 'qaytayuk_420', guess: false };
  if (t.landuse === 'landfill') return { key: 'poligon_168', guess: true };
  if (t.industrial === 'slaughterhouse') return { key: 'qushxona_149', guess: true };
  if (t.leisure === 'stadium') return { key: 'stadion_310', guess: true };
  return null;
}

/** Overpass javobidan cheklovlar roʻyxati; site — uchastka (LngLat) */
export function parseLimitsOsm(j: { elements?: OsmEl[] }, site: LngLat[]): Limit[] {
  const fr = frame(site[0]), S = site.map(fr.toLocal), out: Limit[] = [], els = j.elements ?? [];
  const add = (e: OsmEl, kind: LimitKind, extra: Partial<Limit>) => out.push({ id: `osm_${e.type[0]}${e.id}`, kind, status: 'saqlanadi', src: 'osm', osm: e.id, ...(e.tags?.name ? { name: e.tags.name.slice(0, 120) } : {}), ...extra } as Limit);
  const poles = els.filter(e => e.type === 'node' && e.lat != null && e.lon != null && /^(tower|pole)$/.test(e.tags?.power ?? '')).map(e => [e.lon!, e.lat!] as LngLat);
  // 04.11 (Murad Buildings sinovi, 7-band): zavod ichki temir yoʻl tarmoqlari avtomatik «saqlanadi» boʻlib, 100 m SMZ bilan katta joyni
  // yopardi. Uchastka ichida toʻliq joylashgan va tashqi tarmoqqa ulanmagan shoxobchalar (bogʻlangan izlar guruhi) — «buziladi» taklifi
  const rails = els.filter(e => e.tags?.railway === 'rail' && e.geometry && e.geometry.length >= 2).map(e => ({ id: e.id, loc: e.geometry!.map(p => fr.toLocal([p.lon, p.lat] as LngLat)) }));
  const par = rails.map((_, i) => i), root = (i: number): number => (par[i] === i ? i : (par[i] = root(par[i])));
  for (let i = 0; i < rails.length; i++) for (let j = i + 1; j < rails.length; j++) {
    const A = rails[i].loc, B = rails[j].loc, ends = [A[0], A[A.length - 1], B[0], B[B.length - 1]];
    if (ends.slice(0, 2).some(p => B.some((q, k) => k > 0 && segD(p, B[k - 1], q) <= 3)) || ends.slice(2).some(p => A.some((q, k) => k > 0 && segD(p, A[k - 1], q) <= 3))) par[root(i)] = root(j);
  }
  const outside = new Set<number>(); rails.forEach((r, i) => { if (r.loc.some(p => !pip(p, S))) outside.add(root(i)); });
  const spur = new Set(rails.filter((_, i) => !outside.has(root(i))).map(r => r.id));
  for (const e of els) {
    const t = e.tags ?? {};
    // 07.11 (c70): SMZ obyektlari (nuqta, chiziq yoki poligon) — SanQvaN 0103-25 1-ilova / 4-ilova, ShNQ masofalari
    const ob = objOf(t);
    if (ob) {
      const r = e.type === 'node' ? (e.lat != null && e.lon != null ? pointRing(fr, [e.lon, e.lat]) : null) : e.type === 'way' ? ring(e.geometry) : ring(e.members?.find(m => m.role === 'outer')?.geometry);
      if (!r || r.length < 3) continue;
      const loc = r.map(fr.toLocal), z = objZone({ obj: ob.key, objGuess: ob.guess });
      if (!near(loc, S, Math.max(z.m, 10))) continue;
      add(e, 'obyekt', { rings: [r], obj: ob.key, ...(ob.guess ? { objGuess: true } : {}) });
      continue;
    }
    if (e.type === 'node') continue;
    // ELU
    if (t.power && /^(line|minor_line|cable)$/.test(t.power) && e.geometry && e.geometry.length >= 2) {
      const axis = e.geometry.map(p => [p.lon, p.lat] as LngLat), loc = axis.map(fr.toLocal);
      if (!near(loc, S, 60)) continue;
      const kv = kvOf(t.voltage) ?? (t.power === 'minor_line' ? 0.4 : undefined);
      const pl = poles.filter(p => { const q = fr.toLocal(p); return loc.some((a, i) => i > 0 && segD(q, loc[i - 1], a) <= 15); });
      add(e, 'elu', { axis, ...(kv ? { kv } : {}), elu: t.power === 'cable' || t.location === 'underground' ? 'kabel' : 'mavjud', ...(pl.length ? { poles: pl } : {}) });
      continue;
    }
    // 04.11: suv oqimi (chiziq) — daryo yoki kanal oʻqi
    if (t.waterway && /^(river|stream|canal|drain|ditch)$/.test(t.waterway) && e.geometry && e.geometry.length >= 2) {
      const axis = e.geometry.map(p => [p.lon, p.lat] as LngLat), loc = axis.map(fr.toLocal), riv = t.waterway === 'river' || t.waterway === 'stream';
      if (!near(loc, S, riv ? 300 : 60)) continue;
      add(e, 'suv', { axis, suv: riv ? { t: 'daryo', q: t.waterway === 'stream' ? 4 : 2 } : { t: 'kanal', ...(t.waterway === 'canal' ? {} : { q: 2 }) } });
      continue;
    }
    // temir yoʻl — oʻq atrofida 6 m izlar koridori
    if (t.railway === 'rail' && e.geometry && e.geometry.length >= 2) {
      const loc = e.geometry.map(p => [p.lon, p.lat] as XY).map(p => fr.toLocal(p as LngLat));
      if (!near(loc, S, 110)) continue;
      const L = loc.length, left: XY[] = [], right: XY[] = [];
      for (let i = 0; i < L; i++) { const a = loc[Math.max(0, i - 1)], b = loc[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 3, ny = dx / l * 3; left.push([loc[i][0] + nx, loc[i][1] + ny]); right.push([loc[i][0] - nx, loc[i][1] - ny]); }
      add(e, 'temiryol', { rings: [[...left, ...right.reverse()].map(fr.toGeo)], ...(spur.has(e.id) ? { status: 'buziladi' as const, name: `${e.tags?.name ? e.tags.name.slice(0, 80) + ' — ' : ''}ichki shoxobcha: uchastka ichida, tashqi tarmoqqa ulanmagan — zavod bilan birga buziladi (taklif)` } : {}) });
      continue;
    }
    // poligonlar (way yoki multipolygon relation — tashqi halqa)
    const r = e.type === 'way' ? ring(e.geometry) : ring(e.members?.find(m => m.role === 'outer')?.geometry);
    if (!r || r.length < 3) continue;
    const loc = r.map(fr.toLocal);
    if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') { if (near(loc, S, 500)) add(e, 'qabriston', { rings: [r] }); continue; }
    if (t.landuse === 'greenhouse_horticulture' || t.building === 'greenhouse') { if (near(loc, S, 100)) add(e, 'issiqxona', { rings: [r] }); continue; }
    if (t.building === 'warehouse') { if (near(loc, S, 50)) add(e, 'ombor', { rings: [r] }); continue; }
    // 04.11 (Murad Buildings sinovi, 8-band): sanoat korxonasi — SMZ sinfi korxona turiga qarab (2.9-band), OSM da yoʻq — qoʻlda kiritiladi.
    // Markazi uchastka ichida boʻlsa — qayta qurilayotgan korxona: «buziladi» (taklif)
    if (t.landuse === 'industrial' || t.man_made === 'works' || (t.building && /^(industrial|manufacture)$/.test(t.building))) {
      if (!near(loc, S, 1000)) continue;
      const c: XY = [loc.reduce((a, p) => a + p[0], 0) / loc.length, loc.reduce((a, p) => a + p[1], 0) / loc.length];
      add(e, 'sanoat', pip(c, S) ? { rings: [r], status: 'buziladi' } : { rings: [r] });
      continue;
    }
    // 06.11 (c63, egasi: «oddiy fontan hududidanham shunday katta zona»): fontan, bezak hovuzi, basseyn — bezak suvi (zonasiz, TALQIN);
    // tabiiy suv teglari (lake, reservoir, river …) boʻlmagan 0,5 ga dan kichik yopiq suv yuzasi ham bezak (ANDOZA). Faqat uchastka ichida va yonida
    if (t.amenity === 'fountain' || t.leisure === 'swimming_pool' || (t.natural === 'water' && isDecor(t, loc))) {
      if (near(loc, S, 0)) add(e, 'suv', { rings: [r], suv: { t: 'bezak' } });
      continue;
    }
    if (t.natural === 'water') {
      const w = t.water ?? '', tp = /^(river|oxbow|stream)$/.test(w) ? 'daryo' : /^(canal|ditch|drain)$/.test(w) ? 'kanal' : 'kol';
      if (near(loc, S, tp === 'daryo' ? 300 : 250)) add(e, 'suv', { rings: [r], suv: tp === 'daryo' ? { t: 'daryo', q: 2 } : { t: tp } });
      continue;
    }
    if (t.landuse && /^(orchard|vineyard|farmland)$/.test(t.landuse)) {
      if (near(loc, S, 0)) add(e, 'boshqa', { rings: [r], status: 'buziladi', name: e.tags?.name ?? ({ orchard: 'Bogʻ', vineyard: 'Uzumzor', farmland: 'Ekin maydoni' } as Record<string, string>)[t.landuse] });
      continue;
    }
  }
  return out;
}

/** Yangi topilganlar: hujjatda bor OSM obyektlari va bir xil turdagi qoʻlda chizilganlar bilan ustma-ust tushganlari tashlanadi */
export function newOnes(found: Limit[], have: Limit[], origin: LngLat): Limit[] {
  const fr = frame(origin), ids = new Set(have.map(l => l.osm).filter(x => x != null));
  const cen = (l: Limit): XY | null => { const r = l.rings?.[0]; if (!r?.length) return null; const loc = r.map(fr.toLocal); return [loc.reduce((t, p) => t + p[0], 0) / loc.length, loc.reduce((t, p) => t + p[1], 0) / loc.length]; };
  return found.filter(f => {
    if (f.osm != null && ids.has(f.osm)) return false;
    const c = cen(f);
    if (c && have.some(h => h.kind === f.kind && h.rings?.[0] && pip(c, h.rings[0].map(fr.toLocal)))) return false;
    if ((f.kind === 'elu' || f.kind === 'suv') && f.axis) { const a = f.axis.map(fr.toLocal); if (have.some(h => h.kind === f.kind && h.axis && a.every(p => h.axis!.map(fr.toLocal).some((q, i, arr) => i > 0 && segD(p, arr[i - 1], q) <= 20)))) return false; }
    return true;
  });
}

/**
 * 04.11 (Murad Buildings sinovi, 8-band): Overpass javob bermasa — atrof konteksti (xarita qatlami: OSM yoki OpenFreeMap vektor
 * plitalari) dan zaxira aniqlash. Kontekst obyektlari Overpass elementlariga aylantirilib, xuddi shu `parseLimitsOsm` qoidalaridan
 * oʻtadi: bino turi (industrial, manufacture → sanoat; warehouse → ombor; greenhouse → issiqxona), qabriston, suv yuzasi va oqimlari,
 * temir yoʻl. ELU va yer foydalanishi kontekstda yoʻq. Tegsiz katta binolar (≥ 3000 m², 1000 m ichida) — faqat soni qaytariladi
 * (sanoat boʻlishi mumkin, qoʻlda tekshiriladi).
 */
export interface CtxLite {
  buildings: { id: number; rings: LngLat[][]; kind: string }[];
  green: { id: number; rings: LngLat[][]; kind: string }[];
  water: { id: number; rings: LngLat[][]; kind: string }[];
  waterways: { id: number; pts: LngLat[]; cls: string; name?: string }[];
  rails: { id: number; pts: LngLat[]; cls: string }[];
}
export function limitsFromContext(c: CtxLite, site: LngLat[]): { limits: Limit[]; bigUnknown: number } {
  const geo = (r: LngLat[]): Geo[] => r.map(p => ({ lon: p[0], lat: p[1] })), shut = (r: LngLat[]) => [...geo(r), geo(r)[0]];
  const els: OsmEl[] = [];
  for (const b of c.buildings) if (/^(industrial|manufacture|warehouse|greenhouse)$/.test(b.kind) && b.rings[0]?.length >= 3) els.push({ type: 'way', id: b.id, tags: { building: b.kind }, geometry: shut(b.rings[0]) });
  for (const g of c.green) if (g.kind === 'cemetery' && g.rings[0]?.length >= 3) els.push({ type: 'way', id: g.id, tags: { landuse: 'cemetery' }, geometry: shut(g.rings[0]) });
  for (const w of c.water) if (w.rings[0]?.length >= 3) els.push({ type: 'way', id: w.id, tags: { natural: 'water', ...(/^(river|canal|stream|ditch|drain|lake|reservoir|pond|reflecting_pool|basin|fountain)$/.test(w.kind) ? { water: w.kind } : {}) }, geometry: shut(w.rings[0]) });
  for (const w of c.waterways) if (/^(river|stream|canal|drain|ditch)$/.test(w.cls) && w.pts.length >= 2) els.push({ type: 'way', id: w.id, tags: { waterway: w.cls, ...(w.name ? { name: w.name } : {}) }, geometry: geo(w.pts) });
  for (const r of c.rails) if (r.cls === 'rail' && r.pts.length >= 2) els.push({ type: 'way', id: r.id, tags: { railway: 'rail' }, geometry: geo(r.pts) });
  const limits = parseLimitsOsm({ elements: els }, site);
  const fr = frame(site[0]), S = site.map(fr.toLocal);
  const area = (r: XY[]) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const bigUnknown = c.buildings.filter(b => b.kind === 'yes' && b.rings[0]?.length >= 3 && (() => { const l = b.rings[0].map(fr.toLocal); return area(l) >= 3000 && near(l, S, 1000); })()).length;
  return { limits, bigUnknown };
}
