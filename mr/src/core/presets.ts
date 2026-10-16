/**
 * Koʻcha profillari shablonlari (Koʻcha studiyasi «Koʻcha modullari» toʻplamidan, js/app.js PRESETS → gen()).
 * Studiya elementlari Master reja tasmalariga keltiriladi: piyoda/jihozlar → trotuar; maysa, yomgʻir bogʻi, orolcha,
 * shtrixli ajratuvchi → yashil yoki ajratuvchi; boʻlaklar → qatnov (qatorlar soni bilan); avtobus/BRT → avtobus; tramvay → tramvay.
 * Toifa (ShNQ 20-jadval) qatorlar soni va kenglikka koʻra taxminan aniqlanadi; har shablon reyestrda tekshiriladi.
 */
import type { Cat, Part, PartKind, Profile } from './profiles';

type S = [string, number];
interface O { f?: number; b?: number; lw?: number; oneway?: number; contra?: number; park?: string; pw?: number; pang?: number; bike?: string; bus?: string; tram?: string; service?: number; spark?: number; sep?: number; rain?: number; rw?: number; green?: number; furn?: number; walk?: number; med?: string; mw?: number }
const PKW: Record<string, number> = { park: 2.3, park30: 4.7, park45: 5.3, park90: 5 };

function gen(o: O): S[] {
  const lw = o.lw || 3.5;
  const side = (dir: number, n: number): S[] => {
    const a: S[] = [];
    if (o.tram === 'center') a.push(['tram', 3.2]);
    if (o.bus === 'center') a.push(['bus', 3.5]);
    for (let i = 0; i < n; i++) a.push(['lane', lw]);
    if (o.bus === 'curb') a.push(['bus', 3.5]);
    if (o.tram === 'side') a.push(['tram', 3.2]);
    if (o.park === 'both' || (o.park === 'right' && dir > 0)) { const pk = o.pang ? 'park' + o.pang : 'park'; a.push(['park', o.pang ? PKW[pk] : (o.pw || 2.3)]); }
    if (o.bike === 'lane') a.push(['bike', 1.8]);
    if (o.bike === 'prot') { a.push(['buffer', 0.8]); a.push(['bike', 2]); }
    if (o.service) { a.push(['green', o.sep || 4]); for (let i = 0; i < o.service; i++) a.push(['lane', 3.5]); if (o.spark) a.push(['park', 2.3]); }
    if (o.bike === 'track') { a.push(['green', 1.2]); a.push(['bike', 2]); }
    if (o.bike === 'track2' && dir > 0) { a.push(['green', 1.2]); a.push(['bike', 3]); }
    if (o.rain) a.push(['green', o.rw || 2]);
    if ((o.green ?? 2) > 0) a.push(['green', o.green ?? 2]);
    if (o.furn) a.push(['walk', 1.2]);
    if ((o.walk ?? 3) > 0) a.push(['walk', o.walk ?? 3]);
    return a;
  };
  let left: S[];
  if (o.oneway) { left = []; if (o.contra) left.push(['bus', 3.5]); if (o.bike === 'track2') left.push(['green', 1.2], ['bike', 3]); if ((o.green ?? 2) > 0) left.push(['green', o.green ?? 2]); if ((o.walk ?? 3) > 0) left.push(['walk', o.walk ?? 3]); }
  else left = side(-1, o.b ?? 2);
  const right = side(1, o.f ?? 2), med: S[] = [];
  if (o.med === 'green') med.push(['median', o.mw || 3]);
  if (o.med === 'hatch') med.push(['median', o.mw || 1.5]);
  if (o.med === 'island') med.push(['median', o.mw || 2]);
  if (o.med === 'rain') med.push(['median', o.mw || 3]);
  if (o.med === 'turn') med.push(['lane', o.mw || 3.25]);
  if (o.med === 'brt') med.push(['median', 1], ['bus', 3.5], ['bus', 3.5], ['median', 1]);
  if (o.med === 'brtst') med.push(['median', 0.8], ['bus', 3.5], ['walk', o.mw || 4], ['bus', 3.5], ['median', 0.8]);
  if (o.med === 'boul') med.push(['median', 2], ['walk', o.mw || 8], ['median', 2]);
  if (o.med === 'tram') med.push(['median', 1], ['tram', 3.2], ['tram', 3.2], ['median', 1]);
  return [...left.slice().reverse(), ...med, ...right];
}

const FIXED: Record<string, S[]> = {
  shared: [['walk', 2], ['lane', 6], ['walk', 2]], ped: [['walk', 8]], pedT: [['green', 2], ['walk', 8], ['green', 2]],
  greenway: [['green', 1.5], ['walk', 3], ['green', 1], ['bike', 3], ['green', 1.5]], bikep: [['green', 1], ['bike', 3], ['green', 1]], bike1: [['green', 1], ['bike', 2], ['green', 1]],
};
const MAP: Record<string, PartKind> = { walk: 'trotuar', green: 'yashil', buffer: 'yashil', median: 'ajratuvchi', lane: 'qatnov', park: 'parkovka', bike: 'velo', bus: 'avtobus', tram: 'tramvay' };

const P = (g: string, n: string, o: O | null): { g: string; n: string; o: O | null } => ({ g, n, o });
export const PRESET_DEFS: Record<string, { g: string; n: string; o: O | null }> = {
  shared: P('Mahalla va turar joy', 'Yashash koʻchasi — umumiy sirt', null),
  res1: P('Mahalla va turar joy', 'Mahalla koʻchasi 1+1, ariqli', { f: 1, b: 1, lw: 3, green: 1.2, walk: 2 }),
  res: P('Mahalla va turar joy', 'Mahalla koʻchasi + avtoturargoh (2 tomon)', { f: 1, b: 1, lw: 3, park: 'both', pw: 2.2, green: 1.2, walk: 2 }),
  resp1: P('Mahalla va turar joy', 'Mahalla koʻchasi + avtoturargoh (1 tomon)', { f: 1, b: 1, lw: 3, park: 'right', pw: 2.2, green: 1.2, walk: 2 }),
  res45: P('Mahalla va turar joy', 'Mahalla koʻchasi + 45° avtoturargoh', { f: 1, b: 1, lw: 3, park: 'both', pang: 45, green: 1.2, walk: 2 }),
  res90: P('Mahalla va turar joy', 'Bir tomonlama + perpendikulyar avtoturargoh', { oneway: 1, f: 1, lw: 3.5, park: 'right', pang: 90, green: 1.2, walk: 2 }),
  resOne: P('Mahalla va turar joy', 'Bir tomonlama mahalla koʻchasi + avtoturargoh', { oneway: 1, f: 1, lw: 3.5, park: 'right', pw: 2.2, green: 1, walk: 2 }),
  school: P('Mahalla va turar joy', 'Maktab oldi (tor boʻlak, keng trotuar)', { f: 1, b: 1, lw: 3, green: 1.5, walk: 4 }),
  r2: P('Shahar koʻchalari', '2 boʻlak (1+1)', { f: 1, b: 1, green: 1.5, walk: 2.5 }),
  r2b: P('Shahar koʻchalari', '2 boʻlak + velo boʻlaklar', { f: 1, b: 1, lw: 3.25, bike: 'lane', green: 1.5, walk: 2.5 }),
  r2pb: P('Shahar koʻchalari', '2 boʻlak + avtoturargoh + velo', { f: 1, b: 1, lw: 3.25, park: 'both', bike: 'lane', green: 1.2, walk: 2.5 }),
  r2rain: P('Shahar koʻchalari', '2 boʻlak + yomgʻir bogʻlari', { f: 1, b: 1, lw: 3.25, rain: 1, green: 0, walk: 2.5 }),
  r2t: P('Shahar koʻchalari', '2+1: markaziy burilish boʻlagi', { f: 1, b: 1, lw: 3.25, med: 'turn', green: 1.5, walk: 2.5 }),
  r4: P('Shahar koʻchalari', '4 boʻlak (2+2)', { f: 2, b: 2, green: 2, walk: 3 }),
  r4rain: P('Shahar koʻchalari', '4 boʻlak + yomgʻir bogʻlari + velo', { f: 2, b: 2, lw: 3.25, rain: 1, bike: 'prot', green: 0, walk: 2.5 }),
  r4isl: P('Shahar koʻchalari', '4 boʻlak + markaziy xavfsizlik orolchasi', { f: 2, b: 2, lw: 3.25, med: 'island', mw: 2, green: 1.5, walk: 3 }),
  r4h: P('Shahar koʻchalari', '4 boʻlak + chiziqli ajratuvchi', { f: 2, b: 2, lw: 3.25, med: 'hatch', mw: 1.5, green: 2, walk: 3 }),
  r4p: P('Shahar koʻchalari', '4 boʻlak + avtoturargoh', { f: 2, b: 2, lw: 3.25, park: 'both', green: 1.5, walk: 3 }),
  r4p30: P('Shahar koʻchalari', '4 boʻlak + 30° avtoturargoh', { f: 2, b: 2, lw: 3.25, park: 'both', pang: 30, green: 1.5, walk: 3 }),
  r4b: P('Shahar koʻchalari', '4 boʻlak + velo boʻlaklar', { f: 2, b: 2, lw: 3.25, bike: 'lane', green: 1.5, walk: 2.5 }),
  r4pb: P('Shahar koʻchalari', '4 boʻlak + himoyalangan velo', { f: 2, b: 2, lw: 3.25, bike: 'prot', green: 1.5, walk: 2.5 }),
  r4m: P('Shahar koʻchalari', '4 boʻlak + ajratuvchi polosa', { f: 2, b: 2, med: 'green', mw: 3, green: 2, walk: 3 }),
  r4t: P('Shahar koʻchalari', '4+1: markaziy burilish boʻlagi', { f: 2, b: 2, lw: 3.25, med: 'turn', green: 2, walk: 3 }),
  r6: P('Magistral koʻchalar', '6 boʻlak (3+3)', { f: 3, b: 3, med: 'hatch', mw: 1, green: 2.5, walk: 3.5 }),
  r6m: P('Magistral koʻchalar', '6 boʻlak + ajratuvchi', { f: 3, b: 3, med: 'green', mw: 4, green: 2.5, walk: 3.5 }),
  r6tr: P('Magistral koʻchalar', '6 boʻlak + velo trek', { f: 3, b: 3, med: 'green', mw: 4, bike: 'track', green: 2, walk: 3 }),
  r6d: P('Magistral koʻchalar', '6 boʻlak + dublyorlar (Toshkent tipi)', { f: 3, b: 3, med: 'green', mw: 4, service: 1, spark: 1, sep: 4, green: 2, walk: 3 }),
  r8d: P('Magistral koʻchalar', '8 boʻlak + ajratuvchi + dublyorlar', { f: 4, b: 4, med: 'green', mw: 5, service: 2, sep: 5, green: 2.5, walk: 4 }),
  r8: P('Magistral koʻchalar', '8 boʻlak + keng ajratuvchi', { f: 4, b: 4, med: 'green', mw: 8, green: 3, walk: 4 }),
  r4bus: P('Jamoat transporti', '4 boʻlak, chetda avtobus boʻlagi', { f: 1, b: 1, lw: 3.25, bus: 'curb', green: 1.5, walk: 3 }),
  r6bus: P('Jamoat transporti', '6 boʻlak, chetda avtobus boʻlagi', { f: 2, b: 2, lw: 3.25, bus: 'curb', med: 'green', mw: 2, green: 2, walk: 3 }),
  r4brt: P('Jamoat transporti', '4 boʻlak + markazda BRT', { f: 2, b: 2, lw: 3.25, med: 'brt', green: 2, walk: 3 }),
  r6brt: P('Jamoat transporti', '6 boʻlak + markazda BRT', { f: 3, b: 3, lw: 3.25, med: 'brt', green: 2, walk: 3.5 }),
  brtst: P('Jamoat transporti', 'BRT bekati kesimi (markaziy platforma)', { f: 2, b: 2, lw: 3.25, med: 'brtst', mw: 4, green: 1.5, walk: 3 }),
  tram: P('Jamoat transporti', '2+2 + markazda tramvay', { f: 2, b: 2, lw: 3.25, tram: 'center', green: 2, walk: 3 }),
  tramm: P('Jamoat transporti', '2+2 + ajratilgan tramvay polosasi', { f: 2, b: 2, lw: 3.25, med: 'tram', green: 2, walk: 3 }),
  tram1: P('Jamoat transporti', '1+1 + markazda tramvay', { f: 1, b: 1, lw: 3.25, tram: 'center', green: 1.5, walk: 3 }),
  transit: P('Jamoat transporti', 'Faqat jamoat transporti koʻchasi', { f: 0, b: 0, bus: 'curb', green: 2, walk: 5 }),
  one1: P('Bir tomonlama', 'Bir tomonlama, 1 boʻlak', { oneway: 1, f: 1, green: 1.5, walk: 2.5 }),
  one2: P('Bir tomonlama', 'Bir tomonlama, 2 boʻlak', { oneway: 1, f: 2, green: 1.5, walk: 2.5 }),
  one3: P('Bir tomonlama', 'Bir tomonlama, 3 boʻlak', { oneway: 1, f: 3, lw: 3.25, green: 2, walk: 3 }),
  one2b: P('Bir tomonlama', 'Bir tomonlama 2 + ikki yoʻnalishli velo trek', { oneway: 1, f: 2, lw: 3.25, bike: 'track2', green: 1.5, walk: 2.5 }),
  one2c: P('Bir tomonlama', 'Bir tomonlama 2 + qarshi avtobus boʻlagi', { oneway: 1, contra: 1, f: 2, lw: 3.25, green: 1.5, walk: 3 }),
  ped: P('Piyoda va velo', 'Piyoda koʻchasi', null),
  pedT: P('Piyoda va velo', 'Piyoda koʻchasi + daraxt qatorlari', null),
  boul: P('Piyoda va velo', 'Bulvar (2+2, markaziy xiyobon)', { f: 2, b: 2, lw: 3.25, med: 'boul', mw: 10, green: 2, walk: 3 }),
  greenway: P('Piyoda va velo', 'Yashil yoʻlak (piyoda + velo)', null),
  bikep: P('Piyoda va velo', 'Alohida velo yoʻlak (2 yoʻnalish)', null),
  bike1: P('Piyoda va velo', 'Alohida velo yoʻlak (1 yoʻnalish)', null),
};

/** Studiya kesimi → tasmalar: qoʻshni bir xil boʻlaklar birlashtiriladi (qatnov — qatorlar soni bilan) */
export function toParts(strips: S[]): Part[] {
  const out: Part[] = [];
  for (const [k0, w] of strips) {
    const k = MAP[k0] ?? 'trotuar', last = out[out.length - 1];
    if (last && last.k === k && (k === 'qatnov' || k === 'avtobus' || k === 'tramvay' || k === 'yashil' || k === 'trotuar')) { last.w = Math.round((last.w + w) * 100) / 100; if (k === 'qatnov') last.lanes = (last.lanes ?? 1) + 1; continue; }
    out.push(k === 'qatnov' ? { k, w, lanes: 1 } : { k, w });
  }
  return out;
}

function catOf(parts: Part[]): Cat {
  const lanes = parts.filter(p => p.k === 'qatnov').reduce((s, p) => s + (p.lanes ?? 1), 0), W = parts.reduce((s, p) => s + p.w, 0);
  if (!parts.some(p => p.k === 'qatnov' || p.k === 'avtobus' || p.k === 'tramvay')) return 'piyoda';
  if (lanes >= 6 || W >= 45) return 'shahar-magistral-3';
  if (lanes >= 4 || W >= 30) return 'tuman-magistral';
  return 'mahalliy';
}

export const PRESET_PROFILES: (Profile & { group: string })[] = Object.entries(PRESET_DEFS).map(([id, d]) => {
  const parts = toParts(d.o ? gen(d.o) : FIXED[id]);
  return { id: `s-${id}`, name: d.n, note: `shablon · ${d.g}`, cat: catOf(parts), parts, group: d.g };
});
