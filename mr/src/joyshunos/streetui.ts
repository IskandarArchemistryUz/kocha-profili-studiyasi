/**
 * Joyshunos «Koʻcha» rejimi — interfeys: chap panel (A/B, xarita koʻrsatkichi, harakat sanogʻi), oʻng ustun (modullar kartalari va xulosa),
 * pastda koʻcha boʻylab lenta (SVG) va xaritadagi qatlamlar. Hisoblar — street.ts (sof).
 * Maʼlumot: OSM kontekst toʻplami (binolar, yoʻllar, daraxtlar — ContextManager), qoʻshimcha Overpass soʻrovi
 * (piyoda oʻtish joylari, svetofor, bekatlar, doʻkon/xizmatlar, yoʻl tezligi).
 */
import type { Map as MLMap, GeoJSONSource, Marker } from 'maplibre-gl';
import type { LngLat } from '../core/doc';
import { h, svgIcon, fmt, toast } from '../ui/dom';
import { tr, tf } from '../i18n';
import { frame as geoFrame, type XY } from '../core/geo';
import { ContextManager } from '../context/manager';
import { overpass } from '../context/load';
import { daySteps, sunPosition, localToUtc } from '../core/sun';
import { distM } from './analyze';
import { routeAB, analyzeSlices, summarize, findings, along, hwColor, HW_BINS, FRONT_SETBACK, type SRoad, type SBld, type SPoi, type Slice, type Route, type StreetSummary, type Finding } from './street';

export interface StreetHost {
  map(): MLMap | null;
  /** chap/oʻng panel va lentani qayta chizish */
  rerender(): void;
  fit(b: [[number, number], [number, number]]): void;
  marker(el: HTMLElement): Marker | null;
}
type Metric = 'hw' | 'soya' | 'fasad' | 'kenglik';
const METRICS: [Metric, string][] = [['hw', 'H/W'], ['soya', 'Soya'], ['fasad', 'Fasad'], ['kenglik', 'Koʻcha eni']];
interface Counts { car?: number; ped?: number; bike?: number; when?: string }
interface Saved { A?: LngLat | null; B?: LngLat | null; metric?: Metric; counts?: Record<string, Counts> }
const SK = 'joy-street';
const st: Saved = (() => { try { return JSON.parse(localStorage.getItem(SK) || 'null') ?? {}; } catch { return {}; } })();
const save = () => { try { localStorage.setItem(SK, JSON.stringify(st)); } catch { /* */ } };

type Res = { rt: Route; sl: Slice[]; S: StreetSummary; F: Finding[]; pois: (SPoi & { s: number })[]; fr: ReturnType<typeof geoFrame>; extrasErr?: string; stale?: string };
let host: StreetHost | null = null;
let status: { st: 'idle' | 'load' | 'ok' | 'err'; msg?: string } = { st: 'idle' };
let R: Res | null = null, seq = 0, hover = -1;
let mA: Marker | null = null, mB: Marker | null = null;
const sctx = new ContextManager();

export function streetInit(hst: StreetHost): void { host = hst; }
const metric = (): Metric => st.metric ?? 'hw';
const keyAB = () => st.A && st.B ? `${st.A.map(v => v.toFixed(5)).join(',')}|${st.B.map(v => v.toFixed(5)).join(',')}` : '';

/* ---------------- tanlash va hisoblash ---------------- */
export function streetClick(c: LngLat): void {
  if (!st.A || (st.A && st.B)) { st.A = c; st.B = null; R = null; status = { st: 'idle' }; }
  else st.B = c;
  save(); host?.rerender(); streetPaint();
  if (st.A && st.B) void analyze();
}
export function streetReset(): void { st.A = null; st.B = null; R = null; status = { st: 'idle' }; seq++; save(); host?.rerender(); streetPaint(); }
/** Rejimga kirganda: saqlangan A–B boʻlsa — qayta hisoblash (kesh tufayli tez) */
export function streetEnter(): void { if (st.A && st.B && !R && status.st !== 'load') void analyze(); }

const EXTRA_Q = (b: [number, number, number, number]) => {
  const bb = b.map(v => v.toFixed(6)).join(',');
  return `[out:json][timeout:25];(node["highway"~"^(crossing|traffic_signals|bus_stop)$"](${bb});node["public_transport"="platform"](${bb});node["railway"="tram_stop"](${bb});node["shop"](${bb});node["amenity"~"^(cafe|restaurant|fast_food|bank|pharmacy|bar|pub|marketplace|post_office|clinic|dentist|ice_cream|bakery|atm)$"](${bb}););out body;way["highway"]["maxspeed"](${bb});out tags;`;
};
async function analyze(): Promise<void> {
  const A = st.A!, B = st.B!, my = ++seq, d = distM(A, B);
  if (d > 2500) { status = { st: 'err', msg: tf('A va B orasi ${d} m — 2,5 km gacha boʻlak tanlang', { d: fmt(d) }) }; host?.rerender(); return; }
  status = { st: 'load', msg: tr('Binolar, yoʻllar va daraxtlar yuklanmoqda (OSM)…') }; host?.rerender();
  try {
    const c: LngLat = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], rad = Math.min(1400, d / 2 + 160);
    const b = await sctx.load(c, rad, (m, f) => { if (my !== seq) return; status = { st: 'load', msg: `${tr(m)} ${Math.round(f * 100)} %` }; host?.rerender(); });
    if (my !== seq) return;
    const fr = geoFrame(c), L = (p: LngLat) => fr.toLocal(p);
    const roads: SRoad[] = b.osm.roads.map(r => ({ id: r.id, pts: r.pts.map(L), cls: r.cls, w: r.w, lanes: r.lanes, oneway: r.oneway, name: r.name }));
    const rt = routeAB(roads, L(A), L(B));
    if (!rt) { status = { st: 'err', msg: tr('A yoki B nuqta yoʻlga yaqin emas (60 m dan uzoq) yoki ular orasida yoʻl topilmadi') }; host?.rerender(); return; }
    // qoʻshimcha: oʻtish joylari, bekatlar, doʻkonlar, tezlik
    let extrasErr: string | undefined; const pois: SPoi[] = [];
    try {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of rt.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const g0 = fr.toGeo([x0 - 40, y0 - 40]), g1 = fr.toGeo([x1 + 40, y1 + 40]);
      status = { st: 'load', msg: tr('Piyoda oʻtish joylari, bekatlar va doʻkonlar (OSM)…') }; host?.rerender();
      const j = await overpass(EXTRA_Q([g0[1], g0[0], g1[1], g1[0]]), fetch, m => { status = { st: 'load', msg: tr(m) }; host?.rerender(); }) as { elements: { type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }[] };
      if (my !== seq) return;
      const speed = new Map<number, number>();
      for (const e of j.elements) {
        const t = e.tags ?? {};
        if (e.type === 'way') { const v = parseFloat(t.maxspeed); if (Number.isFinite(v)) speed.set(e.id, v); continue; }
        if (e.lat == null || e.lon == null) continue;
        const kind: SPoi['kind'] | null = t.highway === 'crossing' ? 'crossing' : t.highway === 'traffic_signals' ? (t.crossing ? 'crossing' : 'signals') : (t.highway === 'bus_stop' || t.public_transport === 'platform' || t.railway === 'tram_stop') ? 'stop' : (t.shop || t.amenity) ? 'shop' : null;
        if (kind) pois.push({ p: L([e.lon, e.lat]), kind, name: t.name });
      }
      for (const r of roads) { const v = speed.get(r.id); if (v) r.maxspeed = v; }
    } catch (e) { extrasErr = (e as Error).message; }
    status = { st: 'load', msg: tr('Fasadlar, soya va koʻrsatkichlar hisoblanmoqda…') }; host?.rerender();
    await new Promise(r => setTimeout(r, 20));
    // koʻcha koridori atrofidagi binolar va daraxtlar (≤ 200 m)
    const samp: XY[] = []; for (let i = 0; i + 1 < rt.pts.length; i++) { const a = rt.pts[i], q = rt.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 40)); for (let k = 0; k < n; k++) samp.push([a[0] + (q[0] - a[0]) * k / n, a[1] + (q[1] - a[1]) * k / n]); } samp.push(rt.pts[rt.pts.length - 1]);
    const near = (p: XY) => samp.some(q => Math.abs(p[0] - q[0]) < 230 && Math.abs(p[1] - q[1]) < 230 && Math.hypot(p[0] - q[0], p[1] - q[1]) < 230);
    const blds: SBld[] = b.osm.buildings.map(x => ({ ring: x.rings[0].map(L), h: x.h })).filter(x => x.ring.length > 2 && near(x.ring[0]));
    const trees = b.osm.trees.map(L).filter(near);
    const sp = sunPosition(localToUtc(2026, 6, 22, 14), c[1], c[0]);
    const sl = analyzeSlices(rt, blds, trees, { step14: { alt: sp.alt, az: sp.az, dt: 1 }, day: daySteps(2026, 6, 22, c[1], c[0], 20) });
    const pa = along(rt, pois, 25);
    const S = summarize(rt, sl, pa, true);
    R = { rt, sl, S, F: findings(S), pois: pa, fr, extrasErr, stale: b.stale };
    status = { st: 'ok' };
    const xs = rt.pts.map(p => fr.toGeo(p));
    host?.fit([[Math.min(...xs.map(p => p[0])), Math.min(...xs.map(p => p[1]))], [Math.max(...xs.map(p => p[0])), Math.max(...xs.map(p => p[1]))]]);
  } catch (e) { if (my !== seq) return; status = { st: 'err', msg: `${tr('Maʼlumot yuklanmadi')}: ${(e as Error).message}` }; }
  host?.rerender(); streetPaint();
}

/* ---------------- xarita ---------------- */
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features });
export function streetLayers(m: MLMap): void {
  for (const id of ['joy-st-line', 'joy-st-pts', 'joy-st-hl']) if (!m.getSource(id)) m.addSource(id, { type: 'geojson', data: fc([]) as never });
  m.addLayer({ id: 'joy-st-case', type: 'line', source: 'joy-st-line', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 7, 18, 22] } } as never);
  m.addLayer({ id: 'joy-st-line', type: 'line', source: 'joy-st-line', layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': ['get', 'col'], 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 5, 18, 18] } } as never);
  m.addLayer({ id: 'joy-st-hl', type: 'line', source: 'joy-st-hl', paint: { 'line-color': '#141414', 'line-width': 3, 'line-dasharray': [1, 1] } } as never);
  m.addLayer({ id: 'joy-st-pts', type: 'circle', source: 'joy-st-pts', paint: { 'circle-radius': ['match', ['get', 'k'], 'shop', 3, 5], 'circle-color': ['match', ['get', 'k'], 'crossing', '#ffffff', 'signals', '#e0a400', 'stop', '#4c5bd4', '#8b4a9c'], 'circle-stroke-color': ['match', ['get', 'k'], 'crossing', '#141414', '#ffffff'], 'circle-stroke-width': 1.5 } } as never);
}
const VIS = ['joy-st-case', 'joy-st-line', 'joy-st-hl', 'joy-st-pts'];
export function streetHide(m: MLMap): void { for (const id of VIS) if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', 'none'); mA?.remove(); mB?.remove(); }
const SHADE_COL = ['#f2c14e', '#9fb7c9', '#4f6f8f'];
function sliceColor(s: Slice): string {
  switch (metric()) {
    case 'hw': { const w = s.L.d != null && s.R.d != null ? s.L.d + s.R.d : null, hs = [s.L.h, s.R.h].filter((v): v is number => v != null); return hwColor(w && hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length / w : null); }
    case 'soya': return SHADE_COL[2 - s.sun14[0] - s.sun14[1]];
    case 'fasad': { const f = (d: number | null) => d != null && d - s.road.w / 2 <= FRONT_SETBACK ? 1 : 0; return ['#e6e3dc', '#d39a6a', '#a4512a'][f(s.L.d) + f(s.R.d)]; }
    default: { const w = s.L.d != null && s.R.d != null ? s.L.d + s.R.d : null; return w == null ? '#cfccc5' : w < 15 ? '#c9e4a5' : w < 25 ? '#7fb3c8' : w < 40 ? '#4a6fa5' : '#2b3a67'; }
  }
}
export function streetPaint(): void {
  const m = host?.map(); if (!m || !m.getSource('joy-st-line')) return;
  for (const id of VIS) m.setLayoutProperty(id, 'visibility', 'visible');
  const feats: unknown[] = [], pts: unknown[] = [], hl: unknown[] = [];
  if (R) {
    const g = (p: XY) => R!.fr.toGeo(p);
    R.sl.forEach((s, i) => {
      const a: XY = [s.p[0] - s.t[0] * s.len / 2, s.p[1] - s.t[1] * s.len / 2], b: XY = [s.p[0] + s.t[0] * s.len / 2, s.p[1] + s.t[1] * s.len / 2];
      feats.push({ type: 'Feature', properties: { col: sliceColor(s), i }, geometry: { type: 'LineString', coordinates: [g(a), g(b)] } });
      if (i === hover) { const w = Math.max(s.L.d ?? 15, 8), w2 = Math.max(s.R.d ?? 15, 8); hl.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [g([s.p[0] + s.n[0] * w, s.p[1] + s.n[1] * w]), g([s.p[0] - s.n[0] * w2, s.p[1] - s.n[1] * w2])] } }); }
    });
    for (const q of R.pois) pts.push({ type: 'Feature', properties: { k: q.kind }, geometry: { type: 'Point', coordinates: g(q.p) } });
  }
  (m.getSource('joy-st-line') as GeoJSONSource).setData(fc(feats) as never);
  (m.getSource('joy-st-pts') as GeoJSONSource).setData(fc(pts) as never);
  (m.getSource('joy-st-hl') as GeoJSONSource).setData(fc(hl) as never);
  const pin = (lab: string) => h('div', { class: 'joy-stpin' }, lab);
  if (st.A) { mA ??= host!.marker(pin('A')); mA?.setLngLat(st.A as [number, number]).addTo(m); } else mA?.remove();
  if (st.B) { mB ??= host!.marker(pin('B')); mB?.setLngLat(st.B as [number, number]).addTo(m); } else mB?.remove();
}
/** Xarita legendasi (joriy koʻrsatkich) */
export function streetLegend(): Node[] {
  if (!R) return [];
  const it = (c: string, n: string) => h('span', {}, h('i', { style: `background:${c}` }), n);
  const L: Record<Metric, Node[]> = {
    hw: [h('b', {}, tr('H/W — balandlik / fasaddan fasadgacha')), ...HW_BINS.map(([, c, n]) => it(c, tr(n))), it('#cfccc5', tr('bir tomonda bino yoʻq'))],
    soya: [h('b', {}, tr('Trotuar 22 iyun 14:00')), it(SHADE_COL[0], tr('ikkala tomon quyoshda')), it(SHADE_COL[1], tr('bir tomon soyada')), it(SHADE_COL[2], tr('ikkala tomon soyada'))],
    fasad: [h('b', {}, tf('Fasad koʻcha chizigʻida (chetdan ≤ ${d} m)', { d: FRONT_SETBACK })), it('#e6e3dc', tr('yoʻq')), it('#d39a6a', tr('bir tomonda')), it('#a4512a', tr('ikki tomonda'))],
    kenglik: [h('b', {}, tr('Fasaddan fasadgacha')), it('#c9e4a5', '< 15 m'), it('#7fb3c8', '15–25 m'), it('#4a6fa5', '25–40 m'), it('#2b3a67', '≥ 40 m')],
  };
  return [h('div', { class: 'lg' }, ...L[metric()]), h('div', { class: 'lg' }, h('span', {}, h('i', { class: 'dot', style: 'background:#fff;border:1.5px solid #141414' }), tr('piyoda oʻtish')), h('span', {}, h('i', { class: 'dot', style: 'background:#e0a400' }), tr('svetofor')), h('span', {}, h('i', { class: 'dot', style: 'background:#4c5bd4' }), tr('bekat')), h('span', {}, h('i', { class: 'dot', style: 'background:#8b4a9c' }), tr('doʻkon, xizmat')))];
}

/* ---------------- chap panel ---------------- */
export function streetLeft(): Node[] {
  const step = !st.A ? 1 : !st.B ? 2 : 3;
  const ll = (p?: LngLat | null) => p ? `${p[1].toFixed(5)}, ${p[0].toFixed(5)}` : '—';
  const out: Node[] = [
    h('div', { class: 'joy-st-how' },
      h('div', { class: 'glabel' }, tr('Koʻcha boʻlagi')),
      h('ol', { class: 'joy-st-steps' },
        h('li', { 'aria-current': step === 1 ? 'step' : null }, h('b', {}, 'A'), h('span', {}, step === 1 ? tr('Xaritada koʻchaning boshini bosing') : ll(st.A))),
        h('li', { 'aria-current': step === 2 ? 'step' : null }, h('b', {}, 'B'), h('span', {}, step === 2 ? tr('Endi oxirini bosing (2,5 km gacha)') : ll(st.B)))),
      st.A ? h('button', { type: 'button', class: 'btn btn-sm', id: 'stReset', onclick: () => streetReset() }, tr('Boshqa koʻcha tanlash')) : null),
  ];
  if (status.st === 'load') out.push(h('div', { class: 'note', id: 'stStatus' }, status.msg ?? tr('Yuklanmoqda…')));
  if (status.st === 'err') out.push(h('div', { class: 'note warn', id: 'stStatus' }, status.msg ?? ''), st.A && st.B ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => void analyze() }, tr('Qayta urinish')) : null as never);
  if (R) {
    out.push(h('div', { class: 'glabel' }, tr('Xaritada koʻrsatish')),
      h('div', { class: 'seg sm', id: 'stMetric', role: 'group', 'aria-label': tr('Xaritada koʻrsatish') }, ...METRICS.map(([k, n]) => h('button', { type: 'button', 'data-metric': k, 'aria-pressed': metric() === k, onclick: () => { st.metric = k; save(); host?.rerender(); streetPaint(); } }, tr(n)))));
    out.push(countsBox());
  }
  out.push(h('div', { class: 'note' }, tr('Koʻcha tahlili — koʻchani tushunish uchun: tarmoqdagi oʻrni, kesim, fazoviy ramka, soya, xavfsizlik, faol fasad. Har raqam yonida manbasi.')));
  return out.filter(Boolean);
}
function countsBox(): HTMLElement {
  const k = keyAB(), c: Counts = (st.counts ??= {})[k] ?? {};
  const num = (id: string, label: string, v: number | undefined, set: (n: number | undefined) => void) => {
    const i = h('input', { class: 'input num', id, inputmode: 'numeric', value: v != null ? String(v) : '', placeholder: '—', 'aria-label': tr(label) }) as HTMLInputElement;
    i.addEventListener('change', () => { const n = Number(i.value.replace(/\s/g, '')); set(i.value.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined); st.counts![k] = { ...c }; save(); host?.rerender(); });
    return h('div', { class: 'li' }, h('span', { class: 'k' }, tr(label)), i);
  };
  const when = h('input', { class: 'input', id: 'stCntWhen', value: c.when ?? '', placeholder: tr('masalan: 23.10, 8:00–9:00'), 'aria-label': tr('Qachon sanalgan') }) as HTMLInputElement;
  when.addEventListener('change', () => { c.when = when.value.trim() || undefined; st.counts![k] = { ...c }; save(); host?.rerender(); });
  return h('details', { class: 'joy-st-cnt', open: c.car != null || c.ped != null },
    h('summary', {}, tr('Harakat sanogʻi (qoʻlda)')),
    h('div', { class: 'group' },
      num('stCntCar', 'Avtomobil, soatiga', c.car, n => { c.car = n; }),
      num('stCntPed', 'Piyoda, soatiga', c.ped, n => { c.ped = n; }),
      num('stCntBike', 'Velo / samokat, soatiga', c.bike, n => { c.bike = n; })),
    when,
    h('span', { class: 't-small' }, tr('Choʻqqi soatdagi sanoq; ikkala yoʻnalish birga. Brauzerda saqlanadi.')));
}

/* ---------------- oʻng ustun: modullar ---------------- */
const f1 = (v: number | null | undefined, d = 1) => v == null ? '—' : fmt(v, d);
const pct = (v: number | null | undefined) => v == null ? '—' : `${Math.round(v * 100)} %`;
function card(id: string, color: string, name: string, src: string, big: string, sub: (string | Node)[], extra?: Node): HTMLElement {
  return h('article', { class: 'joy-card', 'data-card': id },
    h('header', {}, h('i', { class: 'sq', style: `background:${color}` }), h('span', { class: 'nm' }, tr(name)), h('span', { class: 'chip' }, src)),
    h('div', { class: 'big' }, big), h('div', { class: 'sub' }, ...sub), extra ?? null);
}
export function streetRight(): Node[] {
  if (!R) {
    const msg = status.st === 'load' ? status.msg ?? tr('Yuklanmoqda…') : status.st === 'err' ? status.msg ?? '' : tr('Xaritada koʻcha boshini (A) va oxirini (B) bosing — tahlil oʻzi boshlanadi.');
    return [h('article', { class: 'joy-card head' }, h('div', { class: 't-small' }, tr('Koʻcha tahlili')), h('h1', { class: 'ttl' }, tr('Koʻcha tanlanmagan')), h('div', { class: 'sub' }, msg))];
  }
  const { S, F, rt } = R, c = (st.counts ?? {})[keyAB()] ?? {};
  const cards: HTMLElement[] = [];
  cards.push(h('article', { class: 'joy-card head', id: 'stHead' },
    h('div', { class: 't-small' }, tr('Koʻcha tahlili · A → B')),
    h('h1', { class: 'ttl' }, S.name || tr('Nomsiz koʻcha'), h('span', { class: 'r' }, ` · ${fmt(S.len)} m`)),
    h('div', { class: 'meta' }, h('span', { class: 'chip' }, tr(S.cat.name)), h('span', { class: 'chip' }, `OSM: ${S.cls}`)),
    R.stale ? h('div', { class: 'sub err' }, tr('Tarmoq ishlamadi — keshdagi eski nusxa'), ': ', R.stale) : null,
    R.extrasErr ? h('div', { class: 'sub err' }, tr('Oʻtish joylari va doʻkonlar yuklanmadi'), ': ', R.extrasErr) : null));
  // 1. tarmoq
  cards.push(card('tarmoq', '#5b86b0', 'Tarmoqdagi oʻrni', 'OSM', tf('${n} chorraha', { n: S.junctions }), [
    tf('Eng uzun blok: ${b} m', { b: f1(S.junctionGap, 0) }), ' · ',
    S.oneway ? tr('bir tomonlama') : tr('ikki tomonlama'), S.lanes ? ` · ${tf('${n} boʻlak', { n: S.lanes })}` : '', S.maxspeed ? ` · ${S.maxspeed} km/h` : '',
    h('br'), h('span', { class: 'src' }, tr('Toifa — OSM sinfidan andoza; haqiqiy toifa bosh rejada belgilanadi.'))]));
  // 2. kesim
  const corr = S.corridor, fl = S.freeL ?? 0, frr = S.freeR ?? 0, tot = corr ?? (S.carriage + fl + frr);
  const bar = corr ? h('div', { class: 'joy-st-bar', 'aria-hidden': 'true' },
    h('i', { class: 'pd', style: `flex:${Math.max(0.1, fl)}`, title: tr('chap: fasadgacha') }), h('i', { class: 'cw', style: `flex:${S.carriage}` }), h('i', { class: 'pd', style: `flex:${Math.max(0.1, frr)}` })) : undefined;
  cards.push(card('kesim', '#7a7166', 'Koʻndalang kesim', 'OSM · 3D', `${f1(S.carriage)} / ${f1(corr)} m`, [
    tr('qatnov qismi / fasaddan fasadgacha (median)'), h('br'),
    tf('Avtomobilga: ${p} · fasadgacha boʻsh joy: chap ${l} m, oʻng ${r} m', { p: pct(S.carShare), l: f1(S.freeL), r: f1(S.freeR) }),
    S.cat.sidewalk ? h('span', { class: 'src' }, tf('Piyoda yoʻlagi eng kami ${w} m — ShNQ 2.07.06-24, 2-ilova 1-jadval', { w: S.cat.sidewalk[0] === S.cat.sidewalk[1] ? fmt(S.cat.sidewalk[0], 2) : `${fmt(S.cat.sidewalk[0], 1)}–${fmt(S.cat.sidewalk[1], 1)}` })) : '',
    h('span', { class: 'src' }, tr('Qatnov qismi: OSM width, boʻlaklar × 3,5 m yoki sinf andozasi. Trotuar va yashil tasma eni alohida oʻlchanmagan.'))], bar));
  void tot;
  // 3. fazoviy ramka
  cards.push(card('ramka', '#2c4f78', 'Fazoviy ramka', '3D', `H/W ${f1(S.hw, 2)}`, [
    tf('Oʻrtacha balandlik ${h} m · fasad koʻcha chizigʻida: chap ${l}, oʻng ${r}', { h: f1(S.heightMed, 0), l: pct(S.wallL), r: pct(S.wallR) }), h('br'),
    h('span', { class: 'src' }, tf('H/W oraligʻi — andoza (meʼyor emas). Fasad «koʻcha chizigʻida»: qatnov qismi chetidan ≤ ${d} m. Balandlik — OSM height/levels, boʻlmasa taxmin.', { d: FRONT_SETBACK }))]));
  // 4. soya
  cards.push(card('soya', '#e8a317', 'Mikroiqlim va soya', tr('hisob'), `${pct(S.shade14)} ${tr('soyada')}`, [
    tf('22 iyun 14:00 da trotuar · kun davomida oʻrtacha ${s} soat toʻgʻri quyosh · daraxtlar: ${t} / 100 m', { s: f1(S.sunHours), t: f1(S.treesPer100) }), h('br'),
    h('span', { class: 'src' }, tr('Binolar soyasi + OSM daraxtlari (andoza: toj 3 m, balandlik 8 m). OSM da daraxtlar koʻpincha toʻliq emas.'))]));
  // 5. xavfsizlik
  cards.push(card('xavf', '#c2416b', 'Xavfsizlik va oʻtish', 'OSM', tf('${n} ta oʻtish joyi', { n: S.crossings }), [
    S.crossGap ? tf('Eng katta oraliq ${g} m (${a}–${b} m)', { g: fmt(S.crossGap.len), a: fmt(S.crossGap.from), b: fmt(S.crossGap.to) }) : '', ' · ', tf('bekatlar: ${n}', { n: S.stops }), h('br'),
    h('span', { class: 'src' }, tr('Meʼyor: oʻtish joylari orasida 300–500 m (ShNQ 2.07.06-24, 12-band), bekatlar orasida 400–600 m (26-band). OSM da oʻtish joylari toʻliq boʻlmasligi mumkin.'))]));
  // 6. faol fasad
  cards.push(card('faol', '#8b4a9c', 'Faol birinchi qavat', 'OSM', tf('${n} / 100 m', { n: f1(S.shopsPer100) }), [
    tr('doʻkon, kafe va xizmatlar oʻqdan 25 m ichida'), h('br'), h('span', { class: 'src' }, tr('OSM POI — Toshkentda toʻliq emas; video skaneri (2-bosqich) aniqlashtiradi.'))]));
  // 7. sanoq
  if (c.car != null || c.ped != null) cards.push(card('sanoq', '#4c5bd4', 'Harakat sanogʻi', tr('qoʻlda'), `${c.ped ?? '—'} / ${c.car ?? '—'}`, [
    tr('piyoda / avtomobil, soatiga'), c.ped != null && c.car ? ` · ${tf('har avtomobilga ${k} piyoda', { k: fmt(c.ped / c.car, 2) })}` : '', c.when ? ` · ${c.when}` : '']));
  // xulosa
  cards.push(h('article', { class: 'joy-card', 'data-card': 'xulosa', id: 'stFind' },
    h('header', {}, h('i', { class: 'sq', style: 'background:var(--svc-joy)' }), h('span', { class: 'nm' }, tr('Xulosa'))),
    h('ul', { class: 'joy-st-find' }, ...F.map(f => h('li', { class: f.ok ? 'ok' : 'bad' }, svgIcon(f.ok ? '<path d="M5 12l5 5 9-10"/>' : '<path d="M12 7v6M12 16v.5"/><circle cx="12" cy="12" r="9"/>'), h('span', {}, tf(f.t, f.p), h('em', {}, tr(f.src))))))));
  void rt;
  return cards;
}

/* ---------------- lenta: koʻcha boʻylab ---------------- */
let ro: ResizeObserver | null = null, lastW = 0;
export function streetStrip(el: HTMLElement): void {
  if (!R) { el.hidden = true; el.replaceChildren(); return; }
  el.hidden = false;
  if (!ro) { ro = new ResizeObserver(() => { if (R && !el.hidden && Math.abs(el.clientWidth - lastW) > 8) streetStrip(el); }); ro.observe(el); }
  lastW = el.clientWidth;
  const { sl, S, pois, rt } = R, W = Math.max(320, (el.clientWidth || 900) - 28), padL = 74, padR = 12, x = (s: number) => padL + (W - padL - padR) * s / (S.len || 1);
  const rows: [string, number][] = [['H/W', 26], [tr('Fasad'), 22], [tr('Koʻcha eni'), 34], [tr('Soya 14:00'), 22], [tr('Daraxtlar'), 14], [tr('Belgilar'), 18]];
  let y = 8; const Y: number[] = []; for (const [, hh] of rows) { Y.push(y); y += hh + 6; }
  const H = y + 14, out: string[] = [];
  rows.forEach(([n, hh], i) => out.push(`<text x="0" y="${Y[i] + hh / 2 + 4}" class="lb">${esc(n)}</text>`));
  const maxW = Math.max(40, ...sl.map(s => s.L.d != null && s.R.d != null ? s.L.d + s.R.d : 0));
  sl.forEach((s, i) => {
    const x0 = x(s.s), x1 = x(s.s + s.len), w = Math.max(0.5, x1 - x0 - 0.6), W2 = s.L.d != null && s.R.d != null ? s.L.d + s.R.d : null;
    const hs = [s.L.h, s.R.h].filter((v): v is number => v != null), hw = W2 && hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length / W2 : null;
    out.push(`<g data-i="${i}" class="sl${i === hover ? ' on' : ''}"><title>${Math.round(s.s)}–${Math.round(s.s + s.len)} m · H/W ${hw == null ? '—' : hw.toFixed(2)} · ${W2 == null ? '—' : Math.round(W2) + ' m'}</title>`);
    out.push(`<rect x="${x0}" y="${Y[0]}" width="${w}" height="26" fill="${hwColor(hw)}"/>`);
    const f = (d: number | null) => d != null && d - s.road.w / 2 <= FRONT_SETBACK;
    out.push(`<rect x="${x0}" y="${Y[1]}" width="${w}" height="10" fill="${f(s.L.d) ? '#a4512a' : 'var(--fill)'}"/><rect x="${x0}" y="${Y[1] + 12}" width="${w}" height="10" fill="${f(s.R.d) ? '#a4512a' : 'var(--fill)'}"/>`);
    if (W2 != null) { const hh = 34 * W2 / maxW, hc = 34 * Math.min(W2, s.road.w) / maxW; out.push(`<rect x="${x0}" y="${Y[2] + 34 - hh}" width="${w}" height="${hh}" fill="#9fbcd6"/><rect x="${x0}" y="${Y[2] + 34 - hc}" width="${w}" height="${hc}" fill="#4a5560"/>`); }
    else out.push(`<rect x="${x0}" y="${Y[2] + 30}" width="${w}" height="4" fill="var(--fill)"/>`);
    out.push(`<rect x="${x0}" y="${Y[3]}" width="${w}" height="10" fill="${s.sun14[0] ? '#f2c14e' : '#4f6f8f'}"/><rect x="${x0}" y="${Y[3] + 12}" width="${w}" height="10" fill="${s.sun14[1] ? '#f2c14e' : '#4f6f8f'}"/>`);
    for (let k = 0; k < Math.min(s.trees, 6); k++) out.push(`<circle cx="${x0 + 4 + k * 5}" cy="${Y[4] + 7}" r="2.4" fill="#5f8f3e"/>`);
    out.push(`<rect x="${x0}" y="0" width="${x1 - x0}" height="${H - 14}" fill="transparent" class="hit"/></g>`);
  });
  for (const j of rt.junctions) out.push(`<path d="M${x(j)} 2V${H - 14}" class="jn"/>`);
  for (const p of pois) {
    const cx = x(p.s), cy = Y[5] + 9;
    if (p.kind === 'crossing') out.push(`<rect x="${cx - 3}" y="${cy - 6}" width="6" height="12" fill="#fff" stroke="#141414" stroke-width="1"/>`);
    else if (p.kind === 'signals') out.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="#e0a400"/>`);
    else if (p.kind === 'stop') out.push(`<circle cx="${cx}" cy="${cy}" r="4.5" fill="#4c5bd4" stroke="#fff"/>`);
    else out.push(`<path d="M${cx} ${cy - 5}v10" stroke="#8b4a9c" stroke-width="1.6"/>`);
  }
  // masofa shkalasi
  const stepT = S.len > 1500 ? 500 : S.len > 600 ? 200 : 100;
  for (let s = 0; s <= S.len; s += stepT) out.push(`<text x="${x(s)}" y="${H - 2}" class="ax" text-anchor="middle">${s} m</text>`);
  el.replaceChildren(
    h('div', { class: 'joy-st-sh' }, h('b', {}, tr('Koʻcha boʻylab')), h('span', { class: 't-small' }, tf('A → B · ${n} boʻlak × 20 m · ustiga olib boring', { n: sl.length }))),
    h('div', { class: 'joy-st-svg', html: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(tr('Koʻcha boʻylab koʻrsatkichlar'))}">${out.join('')}</svg>` }));
  const svg = el.querySelector('svg')!;
  svg.addEventListener('mouseover', e => { const g = (e.target as Element).closest('[data-i]'); const i = g ? Number(g.getAttribute('data-i')) : -1; if (i !== hover) { hover = i; svg.querySelectorAll('.sl.on').forEach(n => n.classList.remove('on')); g?.classList.add('on'); streetPaint(); } });
  svg.addEventListener('mouseleave', () => { hover = -1; svg.querySelectorAll('.sl.on').forEach(n => n.classList.remove('on')); streetPaint(); });
}
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Test va sinov uchun: oxirgi natija */
export const streetResult = () => R;
void toast;
