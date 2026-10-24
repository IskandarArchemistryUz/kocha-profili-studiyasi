/**
 * Hudud joylashuvi: koordinatadan vaqt mintaqasi (IANA), mamlakat va yarimshar — oflayn, tashqi soʻrovsiz.
 * Quyosh va soya hisoblari shu vaqt mintaqasida (yozgi vaqt bilan), «yoz» — janubiy yarimsharda dekabr–yanvar.
 * Kutubxonalar: @photostructure/tz-lookup (CC0-1.0), countries-and-timezones (MIT).
 * Me'yorlar profili: hozircha faqat Oʻzbekiston (ShNQ); boshqa joyda — xalqaro andozalar (arxitektura hujjati, 24.10.2026).
 */
import tzlookup from '@photostructure/tz-lookup';
import ct from 'countries-and-timezones';

export interface Place {
  /** IANA vaqt mintaqasi, masalan «Europe/Paris» */
  tz: string;
  /** ISO 3166-1 alfa-2 (masalan «UZ»), aniqlanmasa null (dengiz va h.k.) */
  country: string | null;
  countryName: string | null;
  /** janubiy yarimshar — fasllar 6 oyga siljiydi */
  south: boolean;
  /** meʼyorlar profili: 'UZ' — ShNQ/QMQ; 'intl' — xalqaro andozalar */
  norms: 'UZ' | 'intl';
}

const cache = new Map<string, Place>();
/** Koordinata (uzunlik, kenglik) → joy. Xatoda — Toshkent (eski xatti-harakat) */
export function placeOf(lng: number, lat: number): Place {
  const k = `${lng.toFixed(2)},${lat.toFixed(2)}`, hit = cache.get(k); if (hit) return hit;
  let tz = 'Asia/Tashkent';
  try { if (Number.isFinite(lat) && Number.isFinite(lng)) tz = tzlookup(lat, lng); } catch { /* chegaradan tashqari */ }
  let country: string | null = null, countryName: string | null = null;
  try {
    const z = ct.getTimezone(tz), id = z?.countries?.[0] ?? null;
    if (id) { country = id; countryName = ct.getCountry(id)?.name ?? null; }
  } catch { /* */ }
  const p: Place = { tz, country, countryName, south: lat < 0, norms: country === 'UZ' ? 'UZ' : 'intl' };
  cache.set(k, p); return p;
}

/** Berilgan UTC paytda vaqt mintaqasining UTC dan farqi, soatda (yozgi vaqt bilan) */
export function tzOffsetH(tz: string, utcMs: number): number {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const q: Record<string, number> = {}; for (const x of f.formatToParts(new Date(utcMs))) if (x.type !== 'literal') q[x.type] = Number(x.value);
    const asUtc = Date.UTC(q.year, q.month - 1, q.day, q.hour % 24, q.minute, q.second);
    return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000) / 60;
  } catch { return 5; }
}
/** «UTC+5», «UTC+5:30», «UTC−3» */
export function utcLabel(h: number): string {
  const s = h < 0 ? '−' : '+', a = Math.abs(h), hh = Math.floor(a), mm = Math.round((a - hh) * 60);
  return `UTC${s}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
}
/** Yoz oyi (shimol — iyul, janub — yanvar) va boshqa oylarni yarimsharga moslash: shimoliy oy → mahalliy oy */
export const seasonMonth = (m: number, south: boolean): number => south ? ((m + 5) % 12) + 1 : m;
/** Shimoliy sana (oy, kun) → shu fasldagi mahalliy sana. Kun saqlanadi (21 iyun → 21 dekabr) */
export const seasonDate = (m: number, d: number, south: boolean): [number, number] => [seasonMonth(m, south), d];
/** «15 iyul» li tarjima kaliti → janubiy yarimsharda «15 yanvar» li kaliti (ikkalasi strings.json da) */
export const summerKey = (k: string, south: boolean): string => south ? k.replace('15 iyul', '15 yanvar') : k;
/** OʻzbekistonShNQ qiymati boshqa davlatda — meʼyor emas, andoza */
export const SHNQ_ABROAD = 'andoza: Oʻzbekiston ShNQ qiymati — bu hududda meʼyor emas';
/** Joyning qisqa yozuvi: «Fransiya · Europe/Paris · UTC+2» */
export function placeLabel(p: Place, lang = 'en', utcMs = Date.UTC(2026, 6, 15, 12)): string {
  let nm = p.countryName;
  try {
    // oʻzbekcha — lotin yozuvida; brauzerda uz-Latn maʼlumoti boʻlmasa (kirill yoki boshqa til qaytsa) — inglizcha nom
    const loc = lang === 'uz' ? 'uz-Latn' : lang;
    if (p.country) { const v = new Intl.DisplayNames([loc, 'en'], { type: 'region' }).of(p.country); if (v && !(lang === 'uz' && /[\u0400-\u04FF]/.test(v))) nm = v; }
  } catch { /* eski brauzer */ }
  return [nm, p.tz, utcLabel(tzOffsetH(p.tz, utcMs))].filter(Boolean).join(' · ');
}
