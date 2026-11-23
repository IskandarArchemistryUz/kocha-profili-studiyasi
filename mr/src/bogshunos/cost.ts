/**
 * Bogʻshunos — narx kitobi va yiriklashtirilgan smeta (14.11.2026).
 *
 * Usul: hajm × birlik narxi. Hajmlar — loyihadan (variant, ekish, tarmoqlar moduli) avtomatik; birlik narxi — narx kitobidan.
 * Narx kitobi ochiq: har bandda narx, manba, sana va teg. Narxi kiritilmagan band smetada «—» boʻlib qoladi va jami
 * «toʻliq emas» deb belgilanadi (raqam oʻylab topilmaydi).
 *
 * Boshlangʻich bozor kuzatuvi (P — eʼlon narxi, ishlab chiqaruvchi yoki pudratchi taklifi bilan almashtirilsin):
 *  · rulonli maysa — 40 000–45 000 soʻm/m² (prom.uz eʼloni, 2026), urugʻ ekish — 40 000 soʻm/m² (shu eʼlon);
 *  · tratuar plitkasi / bruschatka — 22 000–98 500 soʻm (olx.uz eʼlonlari, iyul 2026; birligi — m² mi, dona mi — tekshirilsin);
 *  · koʻchat — eʼlon narxi topilmadi; chinor koʻchati topish qiyin va qimmat (anhor.uz) — narx pitomnikdan soʻraladi.
 * Rasmiy smeta (resurs usuli, joriy ShNQ smeta meʼyorlari) — ishchi loyiha bosqichida; bu yerda — konsepsiya bahosi.
 */
import type { Variant } from './types';
import type { Planting } from './planting';
import type { Nets } from './nets';
import { TIERS, ZONES, type Tier } from './catalog';
import { FURN } from './library';

export interface Price { k: string; n: string; u: string; p: number | null; lo?: number; hi?: number; src: string; at: string; t: 'P' | 'N' | 'A' | 'T' }
export interface Line { k: string; grp: string; n: string; u: string; q: number; p: number | null; sum: number | null; src: string; t: string }
export interface Smeta { lines: Line[]; tot: number; priced: number; unpriced: number; byGrp: { grp: string; sum: number; n: number; un: number }[] }

/** Narx kitobi (boshlangʻich). Foydalanuvchi UI da oʻzgartiradi; saqlanadi (IndexedDB). */
export const PRICE0: Price[] = [
  { k: 'yol_asosiy', n: 'Asosiy yoʻl qoplamasi (bruschatka, asos bilan)', u: 'm²', p: null, lo: 22000, hi: 98500, src: 'olx.uz eʼlonlari, iyul 2026 — faqat material, birligi tekshirilsin', at: '2026-07', t: 'P' },
  { k: 'yol_ikkinchi', n: 'Ikkinchi darajali yoʻl (bruschatka / plitka)', u: 'm²', p: null, lo: 22000, hi: 98500, src: 'olx.uz eʼlonlari, iyul 2026', at: '2026-07', t: 'P' },
  { k: 'yol_soqmoq', n: 'Soʻqmoq (shagʻal / mulch, chegarali)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yol_sohil', n: 'Sohil yoʻli (yogʻoch / kompozit pastil)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yol_promenada', n: 'Promenada (tabiiy tosh)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yol_velo', n: 'Velo yoʻlak (rangli asfalt, asos bilan)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yol_yugurish', n: 'Yugurish yoʻlagi (rezina qoplama)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yol_servis', n: 'Yongʻin-qutqaruv oʻtish yoʻli (gazon panjara / avto yukli plitka)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_maydon', n: 'Maydon qoplamasi (tosh plitka)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_workout', n: 'Workout maydoni (jihoz, rezina qoplama)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_skeyt', n: 'Skeyt-park (beton)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_suv_oyin', n: 'Suv oʻyin maydoni (favvora, drenaj)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_piknik', n: 'Piknik joyi (stol, oʻchoq, maysa)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_it', n: 'It sayr maydoni (toʻsiq, qoplama)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_gulzor', n: 'Gulzor (koʻp yillik oʻsimliklar)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_jamoat', n: 'Jamoat bogʻi (ekin pushtalari, sugʻorish)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_mevazor', n: 'Mevazor (koʻchatlar bilan)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_avto', n: 'Avtoturargoh (asfalt, belgilash)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_xizmat', n: 'Xizmat hovlisi', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_suv_maydon', n: 'Suv bosadigan maydon (qoplama, drenaj, infiltratsiya)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_tozalash', n: 'Tozalash hovuzi (qazish, gil ekran, suv oʻsimliklari)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_qumlik', n: 'Qumli / shagʻalli sohil', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_ormoncha', n: 'Zich oʻrmoncha (koʻchatlar, mulcha)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_tepalik', n: 'Manzara tepaligi (tuproq toʻkish, maysa)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_yovvoyi', n: 'Qoplamani kesish va tuproq qoʻshish (yovvoyi tiklanish)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'z_pogona', n: 'Suvga tushuvchi pogʻonalar (beton / tosh)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'zina_rampa', n: 'Zina va rampalar (beton, tosh)', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'koprik', n: 'Piyoda koʻprigi', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'maysa', n: 'Maysa (rulonli)', u: 'm²', p: 42500, lo: 40000, hi: 45000, src: 'prom.uz eʼloni «Газон рулонный», 2026 — 40–45 ming soʻm/m²', at: '2026', t: 'P' },
  { k: 'otloq', n: 'Oʻtloq (urugʻ ekish)', u: 'm²', p: 40000, src: 'prom.uz eʼloni — urugʻ ekish 40 ming soʻm/m² (maysa uchun; oʻtloq aralashmasi boshqacha boʻlishi mumkin)', at: '2026', t: 'P' },
  { k: 'botqoq', n: 'Botqoq qirgʻoq (qamish, gil, tosh)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yomgir', n: 'Yomgʻir bogʻi (drenaj qatlami, oʻsimlik)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'daraxt_yirik', n: 'Daraxt koʻchati, I–II kattalik (balandligi 3–4 m, tuproq boʻlagi bilan)', u: 'dona', p: null, src: 'eʼlon narxi topilmadi — pitomnikdan soʻralsin', at: '', t: 'P' },
  { k: 'daraxt_kichik', n: 'Daraxt koʻchati, III–IV kattalik', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'igna', n: 'Igna bargli koʻchat', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'buta', n: 'Buta koʻchati', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'kochirish', n: 'Daraxtni koʻchirib oʻtqazish', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'kesish', n: 'Daraxt kesish (invaziv) va toʻnka olish', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'sport', n: 'Sport maydoni (qoplama bilan)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'bolalar', n: 'Bolalar maydoni (jihoz, rezina qoplama)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'amfiteatr', n: 'Amfiteatr (beton / tosh pogʻonalar)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'terrasa', n: 'Kafe terrasasi (yogʻoch pol)', u: 'm²', p: null, src: '', at: '', t: 'P' },
  { k: 'yer', n: 'Yer ishlari (qazish va toʻkish)', u: 'm³', p: null, src: '', at: '', t: 'P' },
  { k: 'suv', n: 'Suv quvuri (PE, transheya bilan)', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'kanal', n: 'Kanalizatsiya (PVX, quduqlar bilan)', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'sugorish', n: 'Sugʻorish magistrali va avtomatika', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'kabel', n: 'Elektr kabeli 0,4 kV (transheyada)', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'aloqa', n: 'Optik kabel (aloqa)', u: 'm', p: null, src: '', at: '', t: 'P' },
  { k: 'ustun', n: 'Yoritish ustuni 4 m, LED', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'past', n: 'Past yoritkich (bollard) 1 m, LED', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'wc', n: 'Hojatxona (modul)', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'favvora', n: 'Ichimlik favvorasi', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'kamera', n: 'Kamera va Wi-Fi nuqtasi', u: 'dona', p: null, src: '', at: '', t: 'P' },
  { k: 'uya', n: 'Uya qutisi (qush / koʻrshapalak)', u: 'dona', p: null, src: '', at: '', t: 'P' },
];
// jihozlar kutubxonasidan har bir element uchun narx bandi (narx — bozor kuzatuvi yoki taklif, P)
PRICE0.push(...FURN.map(f => ({ k: `f_${f.id}`, n: f.n, u: 'dona', p: null, src: '', at: '', t: 'P' as const })));
export const GRP: Record<string, string> = { yol: 'Yoʻllar va maydonlar', yashil: 'Koʻkalamzorlashtirish', dastur: 'Dastur elementlari', tarmoq: 'Muhandislik tarmoqlari', jihoz: 'Jihozlar' };

export interface CostSrc { V: Variant; PL: Planting | null; N: Nets | null; uya?: number; prog: Record<string, number>; earth?: number }
export function quantities(S: CostSrc): { k: string; grp: string; q: number }[] {
  const V = S.V, w = (t: string) => V.paths.filter(p => p.tier === t).reduce((s, p) => s + p.w * p.g.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p.g[i - 1][0], q[1] - p.g[i - 1][1]) : 0), 0), 0);
  const big = (S.PL?.trees ?? []).filter(t => t.sp.g !== 'igna' && (t.sp.size.startsWith('Д1') || t.sp.size.startsWith('Д2'))).length;
  const small = (S.PL?.trees ?? []).filter(t => t.sp.g !== 'igna' && !(t.sp.size.startsWith('Д1') || t.sp.size.startsWith('Д2'))).length;
  const igna = (S.PL?.trees ?? []).filter(t => t.sp.g === 'igna').length;
  const R = (k: string) => S.N?.routes.find(r => r.kind === k)?.len ?? 0;
  const L = S.N?.lamps ?? [];
  const brM2 = V.bridges.reduce((s, b) => s + b.w * b.g.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - b.g[i - 1][0], q[1] - b.g[i - 1][1]) : 0), 0), 0);
  const q: [string, string, number][] = [
    // yoʻllar: katalogdagi narx kaliti boʻyicha yigʻiladi (zina va rampa — uzunlik)
    ...Object.entries((Object.keys(TIERS) as Tier[]).filter(t => t !== 'zina' && t !== 'rampa').reduce((acc, t) => { acc[TIERS[t].price] = (acc[TIERS[t].price] ?? 0) + w(t); return acc; }, {} as Record<string, number>)).map(([k, v]) => [k, 'yol', v] as [string, string, number]),
    ['zina_rampa', 'yol', V.m.zina + V.m.rampa], ['koprik', 'yol', brM2],
    ['maysa', 'yashil', V.m.lawn], ['otloq', 'yashil', V.m.meadow], ['botqoq', 'yashil', V.m.wetland], ['yomgir', 'yashil', V.m.rain],
    ['daraxt_yirik', 'yashil', big], ['daraxt_kichik', 'yashil', small], ['igna', 'yashil', igna], ['buta', 'yashil', (S.PL?.shrubs ?? []).reduce((s, b) => s + b.n, 0)],
    ['kochirish', 'yashil', S.PL?.counts.kochiriladi ?? 0], ['kesish', 'yashil', S.PL?.counts.kesiladi ?? 0],
    ['sport', 'dastur', S.prog.sport_yangi ?? 0], ['bolalar', 'dastur', S.prog.bolalar ?? 0], ...Object.entries(ZONES).filter(([k, d]) => d.price.startsWith('z_') && S.prog[k]).map(([k, d]) => [d.price, 'dastur', S.prog[k]] as [string, string, number]), ['amfiteatr', 'dastur', S.prog.amfiteatr ?? 0], ['terrasa', 'dastur', S.prog.terrasa ?? 0], ['yer', 'dastur', V.m.earth + (S.earth ?? 0)],
    ['suv', 'tarmoq', R('suv')], ['kanal', 'tarmoq', R('kanal')], ['sugorish', 'tarmoq', R('sugorish')], ['kabel', 'tarmoq', R('elektr')], ['aloqa', 'tarmoq', R('aloqa')],
    ['ustun', 'jihoz', L.filter(l => l.kind === 'ustun').length], ['past', 'jihoz', L.filter(l => l.kind === 'past').length],
    ['wc', 'jihoz', S.N?.cons.filter(c => c.id.startsWith('wc')).length ?? 0], ['favvora', 'jihoz', S.N?.cons.filter(c => /fav/.test(c.id)).length ?? 0], ['kamera', 'jihoz', S.N?.cons.filter(c => c.id.startsWith('cam')).length ?? 0], ['uya', 'jihoz', S.uya ?? 0], ...Object.entries((V.furn ?? []).reduce((acc, f) => { acc[f.id] = (acc[f.id] ?? 0) + 1; return acc; }, {} as Record<string, number>)).map(([id, n]) => [`f_${id}`, 'jihoz', n] as [string, string, number]),
  ];
  return q.filter(x => x[2] > 0).map(([k, grp, v]) => ({ k, grp, q: Math.round(v) }));
}

export function smeta(S: CostSrc, book: Price[] = PRICE0): Smeta {
  const by = new Map(book.map(p => [p.k, p]));
  // narx kitobida bandi boʻlmagan hajm ham smetaga kiradi — narxsiz («—»), raqam oʻylab topilmaydi
  const lines: Line[] = quantities(S).map(x => { const p = by.get(x.k) ?? PRICE0.find(q => q.k === x.k) ?? { k: x.k, n: x.k, u: '', p: null, src: '', at: '', t: 'P' as const }; const sum = p.p != null ? p.p * x.q : null; return { k: x.k, grp: x.grp, n: p.n, u: p.u, q: x.q, p: p.p, sum, src: p.src, t: p.t }; });
  const byGrp = Object.keys(GRP).map(g => { const ls = lines.filter(l => l.grp === g); return { grp: g, sum: ls.reduce((s, l) => s + (l.sum ?? 0), 0), n: ls.length, un: ls.filter(l => l.sum == null).length }; }).filter(g => g.n);
  return { lines, tot: lines.reduce((s, l) => s + (l.sum ?? 0), 0), priced: lines.filter(l => l.sum != null).length, unpriced: lines.filter(l => l.sum == null).length, byGrp };
}
