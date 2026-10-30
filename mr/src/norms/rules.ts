/**
 * Meʼyorlar dvigateli: har bir band — maʼlumot yozuvi (manba, tahrir, chegara) + baholash funksiyasi.
 * Qoida qoʻshish yoki tahririni almashtirish ilovaning qolgan qismini oʻzgartirmaydi.
 * Qiymatlar loyihaning tekshirilgan hujjatlaridan (claude/archemistry-bloklar-va-normalar.md,
 * claude/abdurauf-fitrat-kz-normativ-audit.md); asl matn bilan solishtirilmaganlari `verified: false`.
 */
import type { Derived } from '../core/derive';
import type { Project } from '../core/doc';
import { CATS, checkProfile, profileById } from '../core/profiles';
import { DEMO, demoRow, perThousand, mtmNeedPerThousand } from '../core/demography';
import { spacingIssues } from '../core/spacing';
import { landscape } from '../core/landscape';
import { frame } from '../core/geo';
import { checkBlock, lenLimit, SYS } from '../core/seysmik';

/** Xonadonlar soni manbasi (izoh boʻlagi; alohida kalit — tarjima uchun) */
function aptSrc(d: Derived, doc: Project): string {
  if (d.aptSource === 'sxema') { const mix = doc.settings.aptMix.join('/'); return `Kvartiralar soni — seksiyalarning kvartira sxemasidan (miks ${mix} %; yakka uy va taunhaus — 1 xonadon).`; }
  const net = doc.settings.aptNet; return `Kvartiralar soni oʻrtacha ${net} m² (netto) boʻyicha taxmin (sxema yoʻq).`;
}
const badList = (bad: { use: string; d: number }[]) => bad.map(x => `${x.use === 'mtm' ? 'MTM' : 'maktab'} ${Math.round(x.d * 10) / 10} m`).join(', ') || '—';
/** stat.uz boʻyicha haqiqiy yosh tarkibidan ehtiyoj (izoh uchun) */
function demoNote(doc: Project, pop: number, kind: 'school' | 'mtm'): string {
  const r = demoRow(doc.settings.district); if (!r) return '';
  if (kind === 'school') { const k = perThousand(r).school; return ` Haqiqiy yosh tarkibi (stat.uz, ${r.name}, ${DEMO.year}): 7–17 yoshlilar 1000 kishiga ${Math.round(k)} → loyiha aholisi uchun ≈ ${Math.round(pop * k / 1000)} oʻquvchi (100 % qamrov).`; }
  const k = mtmNeedPerThousand(r);
  return ` Haqiqiy yosh tarkibi (stat.uz, ${r.name}, ${DEMO.year}) va 542-band qamrovi (1–5 yosh — 85 %, 5 yoshdan katta — 100 %): 1000 kishiga ${Math.round(k)} oʻrin → loyiha aholisi uchun ≈ ${Math.round(pop * k / 1000)} oʻrin.`;
}

export type Status = 'pass' | 'fail' | 'review' | 'na';

export interface Source { doc: string; clause: string; edition: string; verified: boolean }

export interface Result {
  id: string; title: string; status: Status;
  value?: number; limit?: string; unit?: string;
  /** chegaradan chetlanish, % (musbat — oshib ketgan) */
  delta?: number;
  note?: string; source: Source;
}

export interface Rule {
  id: string; title: string; source: Source;
  evaluate(d: Derived, doc: Project): Omit<Result, 'id' | 'title' | 'source'>;
}

const SHNQ_2_07_01: Omit<Source, 'clause'> = { doc: 'ShNQ 2.07.01-23', edition: '2023', verified: true };

export const RULES: Rule[] = [
  {
    id: 'density-84',
    title: 'Aholi zichligi',
    source: { ...SHNQ_2_07_01, clause: '84-band' },
    evaluate(d) {
      if (d.siteHa <= 0 || d.population <= 0) return { status: 'na', unit: 'kishi/ga', limit: '≤ 400', note: 'Uchastka yoki turar joy binolari yoʻq' };
      const lim = 400, v = d.density;
      return {
        status: v <= lim ? 'pass' : 'fail', value: v, unit: 'kishi/ga', limit: '≤ 400',
        delta: v > lim ? (v / lim - 1) * 100 : undefined,
        note: 'Uchastka (netto) boʻyicha hisoblandi; meʼyor brutto yoki netto ekani band matnidan tekshirilsin.',
      };
    },
  },
  {
    id: 'housing-82',
    title: 'Uy-joy fondi zichligi',
    source: { ...SHNQ_2_07_01, clause: '82-band, 3-jadval' },
    evaluate(d) {
      if (d.siteHa <= 0 || d.resNet <= 0) return { status: 'na', unit: 'm²/ga', limit: '2 200–7 500' };
      const lo = 2200, hi = 7500, v = d.housingDensity;
      return {
        status: v > hi ? 'fail' : v < lo ? 'review' : 'pass', value: v, unit: 'm²/ga', limit: '2 200–7 500',
        delta: v > hi ? (v / hi - 1) * 100 : undefined,
        note: v < lo ? 'Pastki chegaradan kam — yer samarasiz ishlatilmoqdami?' : 'Hududiy birlik (mavze, kvartal) band matnidan tekshirilsin.',
      };
    },
  },
  {
    id: 'street-profiles',
    title: 'Koʻcha profillari (kenglik, tasmalar, piyoda yoʻlagi)',
    source: { ...SHNQ_2_07_01, clause: '310-band, 20-jadval va 1-izoh; 338, 404-bandlar' },
    evaluate(_d, doc) {
      if (!doc.streets.length) return { status: 'na', note: 'Loyiha koʻchalari yoʻq' };
      const bad: string[] = [];
      doc.streets.forEach((s, i) => { const p = profileById(s.profile); checkProfile(p).forEach(x => bad.push(`${i + 1}. ${p.name} (${CATS[p.cat].name}): ${x.what} ${x.value}, meʼyor ${x.norm}`)); });
      return { status: bad.length ? 'fail' : 'pass', value: doc.streets.length - new Set(bad.map(b => b.split('.')[0])).size, unit: `/ ${doc.streets.length} mos`, note: bad.length ? bad.join('; ') : 'Barcha koʻchalar oʻz toifasi meʼyoriga mos.' };
    },
  },
  {
    id: 'school',
    title: 'Maktab oʻrinlari',
    source: { ...SHNQ_2_07_01, clause: '5-ilova (165–280 oʻrin / 1000 kishi); 549-band, 41-jadval (uchastka)' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'oʻrin', note: 'Aholi yoʻq' };
      const lo = Math.ceil(d.population * 0.165), hi = Math.ceil(d.population * 0.28);
      return { status: d.schoolCap >= lo ? 'pass' : 'fail', value: d.schoolCap, unit: 'oʻrin', limit: `≥ ${lo}`, delta: d.schoolCap < lo ? (1 - d.schoolCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin (1-navbat 165–280 / 1000). Sigʻim «Maktab» parsellari maydonidan 41-jadval boʻyicha (20/15/10 m² oʻquvchiga). Yaqin atrofdagi mavjud maktablar hisobga olinmagan.${demoNote(doc, d.population, 'school')}` };
    },
  },
  {
    id: 'mtm',
    title: 'MTM (bogʻcha) oʻrinlari',
    source: { ...SHNQ_2_07_01, clause: '5-ilova (70–125 oʻrin / 1000 kishi); 543-band (uchastka)' },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'oʻrin', note: 'Aholi yoʻq' };
      const lo = Math.ceil(d.population * 0.07), hi = Math.ceil(d.population * 0.125);
      return { status: d.mtmCap >= lo ? 'pass' : 'fail', value: d.mtmCap, unit: 'oʻrin', limit: `≥ ${lo}`, delta: d.mtmCap < lo ? (1 - d.mtmCap / lo) * -100 : undefined,
        note: `Talab ${lo}–${hi} oʻrin. Sigʻim «MTM» parsellari maydonidan (40 m² — 100 oʻringacha, 35 m² — undan ortiq).${demoNote(doc, d.population, 'mtm')}` };
    },
  },
  {
    id: 'parking',
    title: 'Avtoturargoh joylari',
    source: { ...SHNQ_2_07_01, clause: '416-band, 29-jadval; 413-band (ochiq — 25 m²/joy)' },
    evaluate(d, doc) {
      if (d.parkingReq <= 0) return { status: 'na', unit: 'joy', note: 'Talab yoʻq (binolar yoʻq)' };
      const parts = Object.entries(d.parkingParts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ');
      return { status: d.parkingProv >= d.parkingReq ? 'pass' : 'fail', value: d.parkingProv, unit: 'joy', limit: `≥ ${d.parkingReq}`,
        // tarjima kaliti: ichma-ich shablonsiz (i18n ${…} namunasi bilan mos kelsin)
        note: `Talab: ${parts} (Toshkent: kvartiraga 1). Taʼminot: «Avtoturargoh» parsellari (ochiq, 25 m²/joy, 413-band) + generator parkovkalari (yer osti/stilobat — 30 m²/joy brutto, taxmin). ${aptSrc(d, doc)}` };
    },
  },
  {
    id: 'red-line-39',
    title: 'Maktab va MTM binosidan qizil chiziqqacha',
    source: { ...SHNQ_2_07_01, clause: '539-band, 39-jadval (shahar: 25 m)' },
    evaluate(d) {
      if (!d.redLineSocial.length) return { status: 'na', unit: 'm', limit: '≥ 25', note: 'Loyiha koʻchalari yonida maktab yoki MTM binosi yoʻq. Mavjud (OSM) koʻchalar qizil chizigʻi hisobga olinmaydi.' };
      const min = Math.min(...d.redLineSocial.map(x => x.d)), bad = d.redLineSocial.filter(x => x.d < 25);
      return { status: bad.length ? 'fail' : 'pass', value: min, unit: 'm', limit: '≥ 25',
        note: `${d.redLineSocial.length} ta bino tekshirildi, ${bad.length} tasi 25 m dan yaqin (${badList(bad)}). Masofa bino devoridan loyiha koʻchasi qizil chizigʻigacha; turar joy binolarigacha — insolyatsiya va yoritish meʼyorlari boʻyicha (39-jadval).` };
    },
  },
  {
    id: 'west-facing',
    title: 'Yashash xonalari yoʻnalishi (gʻarb 200–290°)',
    source: { doc: 'SanQvaN 0331-16', edition: '2016', clause: '9.2, 9.4-bandlar', verified: true },
    evaluate(d) {
      if (!d.resSections) return { status: 'na', note: 'Choʻziq turar joy seksiyalari yoʻq' };
      return { status: d.westFacing ? 'review' : 'pass', value: d.westFacing, unit: `/ ${d.resSections} seksiya`, limit: '0',
        note: d.westFacing ? 'Bu seksiyalarning bir uzun fasadi gʻarbga qaraydi: yashash xonalari derazalari u tomonga qaratilmasligi kerak (istisno: 2 xonalida — 1 xona, 3 xonalida — ≤ 2 xona). Kvartira rejasida tekshiriladi (4-bosqich). Eng qulay — kenglik boʻylab joylashuv (9.4).' : 'Uzun fasadlar gʻarbiy sektorga qaramaydi.' };
    },
  },
  {
    id: 'renov-green-7',
    title: 'Renovatsiya hududida yashil zona (≥ 1/4)',
    source: { doc: 'OʻRQ-1149 «Shaharsozlik renovatsiyasi toʻgʻrisida»', edition: '10.06.2026 (kuchga kirishi 12.12.2026)', clause: '7-modda', verified: true },
    evaluate(d, doc) {
      if (doc.settings.comp.regime !== 'orq1149') return { status: 'na', note: 'Koʻchirish rejimi — OʻRQ-781 (jamoat ehtiyojlari uchun olib qoʻyish). Renovatsiya rejimida tekshiriladi.' };
      if (d.siteHa <= 0) return { status: 'na', unit: '%', limit: '≥ 25' };
      const v = d.greenShareTotal * 100;
      return { status: v >= 25 ? 'pass' : 'fail', value: v, unit: '%', limit: '≥ 25', delta: v < 25 ? (v / 25 - 1) * 100 : undefined,
        note: 'Renovatsiya loyihasida qamrab olingan hududning kamida toʻrtdan bir qismi yashil zonalardan iborat boʻlishi kerak. Hisob: yashil kvartallar, hovli maysasi va (87-band) maydonchalar ÷ hudud.' };
    },
  },
  {
    id: 'green-86',
    title: 'Turar joy zonasining yashil hududi (≥ 25 %)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '86, 87, 474-bandlar', verified: true },
    evaluate(d, doc) {
      if (d.greenBase <= 0) return { status: 'na', unit: '%', limit: '≥ 25' };
      const v = d.greenShareTotal * 100;
      // hovli obodonlashtirish oʻchiq — hovli maysasi hisobga kirmagan: «mos emas» emas, «koʻrib chiqish» (hisob toʻliq emas)
      const noYards = !doc.settings.yards && doc.buildings.length > 0;
      return { status: v >= 25 ? 'pass' : noYards ? 'review' : 'fail', value: v, unit: '%', limit: '≥ 25', delta: v < 25 ? (v / 25 - 1) * 100 : undefined,
        note: (noYards ? 'Hovli maysasi hisobga olinmadi — «Hovlilarni avtomatik obodonlashtirish» oʻchiq (Yashil qadami).\n' : '') + `Hisob: yashil kvartallar ${Math.round(d.greenArea)} m² + hovli maysasi ${Math.round(d.yardGreen)} m² + maydoncha va yoʻlaklar ${Math.round(d.yardPlay)} m² (87-band: uchastkaning 30 % idan oshmasa) ÷ mavze maydoni (maktab va MTM uchastkalarisiz, 86-band) ${Math.round(d.greenBase)} m².` };
    },
  },
  {
    id: 'spacing-79',
    title: 'Binolar orasidagi masofa va ustma-ust tushish',
    source: { ...SHNQ_2_07_01, clause: '79-band, 2-jadval, 7–8-izohlar' },
    evaluate(_d, doc) {
      if (doc.buildings.length < 2) return { status: 'na', note: 'Binolar yoʻq' };
      const { pairs } = spacingIssues(doc);
      const ov = pairs.filter(p => p.kind === 'ustma-ust').length, lng = pairs.filter(p => p.kind === 'uzun'), lt = pairs.filter(p => p.kind === 'uzun-torets' && !p.red), hard = pairs.filter(p => p.kind === 'torets' && !p.red && p.d < p.need - 0.5), red = pairs.filter(p => p.red), soft = pairs.filter(p => p.kind === 'torets' && p.d >= p.need - 0.5), pass = pairs.filter(p => p.kind === 'otish').length;
      const parts: string[] = [];
      if (ov) parts.push(`Ustma-ust tushgan binolar: ${ov} juft — qayta generatsiya qiling yoki ortiqchasini oʻchiring.`);
      if (lng.length) { const w = lng.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Uzun tomonlar orasi 2·Hmax dan kam (8-izoh, seysmik 8+ ball): ${lng.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (lt.length) { const w = lt.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Uzun tomon va torets orasi 2·Hmax·0,3 dan va 6 m dan kam: ${lt.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (hard.length) { const w = hard.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Toretslar orasi yetmaydi (derazali — (H1+H2)·0,3, biri derazasiz — 0,25, ikkalasi — 0,15; ≥ 6 m): ${hard.length} juft, eng yomoni ${Math.round(w.d)} m, talab ${Math.round(w.need)} m.`); }
      if (soft.length) parts.push(`Toretslar orasi (H1+H2)·0,3 dan kam: ${soft.length} juft — toretslar derazali boʻlsa yetmaydi.`);
      if (red.length) { const w = red.reduce((a, b) => (b.d / b.need < a.d / a.need ? b : a)); parts.push(`Rekonstruksiya rejimi (7-izoh): ${red.length} juft jadval masofasidan kam, lekin yarmidan va 6 m dan koʻp (eng yaqini ${Math.round(w.d)} m, jadval ${Math.round(w.need)} m) — SanQvaN 0102-25 boʻyicha insolyatsiya hisobi bilan asoslansin (94–95-bandlar: kvartiralarda 1–2 xona, 22.03–22.09 da ≥ 2 soat). 2·Hmax va yongʻin masofalari qisqarmaydi.`); }
      if (pass) parts.push(`Hovliga oʻtishlar (≤ 7,5 m): ${pass} ta — arka sifatida loyihalansin, aks holda toretslar orasi talab qilinadi.`);
      const bad = ov + lng.length + lt.length + hard.length;
      return { status: bad ? 'fail' : (soft.length || pass || red.length) ? 'review' : 'pass', value: bad, unit: 'juft', limit: '0',
        note: parts.length ? parts.join(' ') : 'Ustma-ust tushgan va yaqin joylashgan binolar yoʻq. Avtomatik binolarda torets derazalari generatsiyada belgilangan; qoʻlda chizilganlarda — eng qatʼiy holat.' };
    },
  },
  {
    id: 'green-36',
    title: 'Mavzedagi umumiy foydalanishdagi yashil hudud, kishi boshiga',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '486-band, 36-jadval (eng yirik va katta shaharlar)', verified: true },
    evaluate(d) {
      if (d.population <= 0) return { status: 'na', unit: 'm²/kishi', limit: '3–4', note: 'Turar joy binolari yoʻq' };
      const v = d.greenPerPerson;
      return { status: v >= 3 ? 'pass' : 'fail', value: v, unit: 'm²/kishi', limit: '≥ 3', delta: v < 3 ? (v / 3 - 1) * 100 : undefined,
        note: '36-jadval: mavzelardagi yashil hududlar 3–4 m²/kishi (shu jumladan xiyobonlar 1, uy guruhlari va mahalla markazlari bogʻlari 1–1,5). Hisob: «Park / bogʻ» kvartal va parsellari ÷ aholi; hovlilar bu yerga kirmaydi.' };
    },
  },
  {
    id: 'play-89',
    title: 'Hovli maydonchalari (bolalar, kattalar, sport, xoʻjalik)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '89-band, 4-jadval; 90–92-bandlar', verified: true },
    evaluate(d, doc) {
      if (d.population <= 0) return { status: 'na', unit: 'm²', limit: '3,1 m²/kishi' };
      if (!doc.settings.yards) return { status: 'na', note: 'Hovli obodonlashtirish oʻchirilgan (4-qadam, Yashil).' };
      const v = d.playNeed > 0 ? d.playGot / d.playNeed * 100 : 0;
      return { status: v >= 99 ? 'pass' : v >= 50 ? 'review' : 'fail', value: d.playGot, unit: 'm²', limit: `${Math.round(d.playNeed)} (3,1 m²/kishi)`,
        note: `Talab: bolalar 0,7 + kattalar 0,1 + sport 2,0 + xoʻjalik 0,3 m²/kishi; joylashtirilgan ${Math.round(v)} %. 90-band: chang boʻronli hududlarda yoki mavze sport majmuasi boʻlsa — ikki baravargacha qisqartirish mumkin; 92-band: zichlik > 7000 m²/ga — tomlarga joylashtirish.` };
    },
  },
  {
    id: 'seismic-blocks',
    title: 'Seysmik boʻlmalar: uzunlik va chiqib turgan qism',
    source: { doc: 'QMQ 2.01.03-19', edition: '2019', clause: '3.1-jadval, 3.1.1, 3.1.3, 3.7.2-bandlar', verified: true },
    evaluate(_d, doc) {
      const s = doc.settings, sys = s.construct ?? 'monolit', ball = s.seismic, lim = lenLimit(sys, ball), def = SYS[sys];
      const bl = doc.buildings;
      if (!bl.length) return { status: 'na', limit: lim == null ? 'NSTT' : `≤ ${lim} m`, unit: 'bino', note: `Binolar yoʻq. ${def.name} (${def.row}), ${ball} ball.` };
      const fr = frame(doc.origin), res = bl.map(b => ({ b, c: checkBlock(b.footprint.map(fr.toLocal), sys, ball) }));
      const longs = res.filter(x => !x.c.lenOk), projs = res.filter(x => !x.c.projOk), worst = res.reduce((a, x) => x.c.len > a.c.len ? x : a);
      const n = new Set([...longs, ...projs].map(x => x.b.id)).size;
      const parts = [`${def.name} (3.1-jadval, ${def.row}), ${ball} ball: boʻlma uzunligi ${lim == null ? 'cheklanmagan (NSTT)' : `≤ ${lim} m`}, chiqib turgan qism ≤ ${def.proj} m (3.1.1). Har bino alohida boʻlma deb olindi — tegib turgan binolar orasida antiseysmik chok boʻlishi kerak (3.1.3; eng kichik kengligi 3.1.4).`];
      if (longs.length) parts.push(`Uzun: ${longs.length} ta (eng uzuni ${worst.c.len} m) — chok bilan boʻlmalarga ajrating yoki seksiya uzunligini kamaytiring.`);
      if (projs.length) parts.push(`Chiqib turgan qism ${def.proj} m dan katta: ${projs.length} ta (${projs.slice(0, 3).map(x => `${x.c.proj} m`).join(', ')}${projs.length > 3 ? ' …' : ''}) — burchak binosini chok bilan toʻgʻri toʻrtburchak boʻlmalarga ajrating (3.1.1) yoki 1.1-band boʻyicha asoslang.`);
      return { status: n ? 'fail' : 'pass', value: n, unit: `/ ${bl.length} bino`, limit: lim == null ? 'NSTT' : `≤ ${lim} m, ≤ ${def.proj} m`, delta: longs.length ? (worst.c.len / (lim ?? worst.c.len) - 1) * 100 : undefined, note: parts.join(' ') };
    },
  },
  {
    id: 'fire-666',
    title: 'Yongʻin-qutqaruv texnikasi yoʻlagi (hovlida, H ≥ 28 m)',
    source: { doc: 'ShNQ 2.07.01-23', edition: '2023', clause: '666, 667, 675, 676-bandlar', verified: true },
    evaluate(_d, doc) {
      if (!doc.buildings.some(b => (b.floors + (b.z0 ?? 0)) * doc.settings.floorHeight >= 28)) return { status: 'na', note: 'Balandligi 28 m va undan yuqori turar joy binolari yoʻq — bitta uzun tomondan (koʻchadan) yetib kelish yetarli (666-band).' };
      if (!doc.settings.yards) return { status: 'review', note: 'Hovli obodonlashtirish oʻchiq — hovlidagi yoʻlak tekshirilmadi (Yashil qadami).' };
      const ys = landscape(doc).filter(y => y.fire), bad = ys.filter(y => !y.fire!.area), noIn = ys.filter(y => y.fire!.area && !(y.entries ?? []).some(e => e.kind === 'arka' || (e.kind === 'oraliq' && (e.w ?? 0) >= y.fire!.w)));
      const w = Math.max(0, ...ys.map(y => y.fire!.w));
      return { status: bad.length ? 'fail' : noIn.length ? 'review' : 'pass', value: ys.length - bad.length, unit: 'kvartal', limit: `${ys.length}`,
        note: `Binoning ikkala uzun tomonidan yetib kelish (666-band, F1.3, H ≥ 28 m): hovlida eni ${w} m yoʻlak (667-band), ichki chetidan devorgacha 9 m (675-band: 8–10 m), yoʻlak va bino orasida daraxt qatori yoʻq (676-band).` + (bad.length ? ` Hovlida yoʻlak sigʻmadi: ${bad.length} kvartal — hovlini kengaytiring yoki qavatlarni kamaytiring.` : '') + (noIn.length ? ` Hovliga mashina kirishi (arka yoki ≥ ${w} m oraliq) topilmadi: ${noIn.length} kvartal.` : '') };
    },
  },
];

/** Oʻzbekiston meʼyoriy hujjati (ShNQ, QMQ, SanQvaN, OʻRQ, Toshkent dizayn-kodi …) */
export const isUzDoc = (doc: string): boolean => /ShNQ|QMQ|SanQvaN|KMK|OʻRQ|O'RQ|Toshkent|Oʻz|Vazirlar Mahkamasi/i.test(doc);
/**
 * 33-band (egasi, 24.10: «hududga qarab»): loyiha Oʻzbekistondan tashqarida boʻlsa, Oʻzbekiston meʼyori u yerda
 * majburiy emas — «mos emas» natijasi «andoza (koʻrib chiqish)» ga aylanadi, izohda aytiladi; qiymat va chegara saqlanadi.
 * Mahalliy meʼyorlar profili ulanganda (xalqaro → NYC/NL → RU/KZ) shu yerda almashtiriladi.
 */
export function abroadRules(rs: Result[], norms: 'UZ' | 'intl'): Result[] {
  if (norms === 'UZ') return rs;
  return rs.map(r => !isUzDoc(r.source.doc) ? r : { ...r, status: r.status === 'fail' ? 'review' : r.status, note: `${ABROAD_NOTE}${r.note ? '\n' + r.note : ''}` });
}
export const ABROAD_NOTE = 'Andoza: Oʻzbekiston meʼyori — bu hududda majburiy emas.';

export function evaluateAll(d: Derived, doc: Project, rules: Rule[] = RULES): Result[] {
  return rules.map(r => ({ id: r.id, title: r.title, source: r.source, ...r.evaluate(d, doc) }));
}
