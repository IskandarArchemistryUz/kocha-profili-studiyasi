/**
 * Bogʻshunos — loyiha tekshiruvi (23.11.2026): tanlangan variant (qoʻlda tahrirlar bilan) qoidalarga solishtiriladi.
 * Har qator: nima tekshirildi, natija, holat (ok / ogoh — eʼtibor bering / xato — tuzatish kerak) va manba tegi.
 * Normalar (asl matndan, N): ShNQ 2.07.01-23, 491-band — koʻkalamzor ≥ 70 %; 481/490 — minimal maydon; 501 — bir vaqtdagi tashrif;
 * 480 — mavjud daraxtlar saqlanadi; ShNQ 2.07.02-24 — MGN yoʻllari nishabi ≤ 5 %. 4-jadval masofalari (bolalar 10 m, sport 10–40 m,
 * it maydoni 40 m) turar joy hududi uchun — bogʻ chegarasiga nisbatan oʻxshashlik boʻyicha qoʻllanadi (P). Qolganlari — loyiha qoidasi (T).
 */
import type { XY, Tag } from './types';
import type { Ctx, Analysis } from './analyze';
import type { DesignOut } from './design';
import { distance, fillPoly } from './grid';
import { ELEM, blockRing, bearing, fitout, bldNeed, bldDist } from './dastur';

export interface QcRow { k: string; v: string; s: 'ok' | 'ogoh' | 'xato'; t: Tag; n?: string }

export function qc(C: Ctx, A: Analysis, DO: DesignOut): QcRow[] {
  const G = C.G, V = DO.V, R: QcRow[] = [], B = V.blocks ?? [];
  const add = (k: string, v: string, s: QcRow['s'], t: Tag, n?: string) => R.push({ k, v, s, t, n });
  const nm = (els: string[]) => [...new Set(els.map(e => ELEM[e as keyof typeof ELEM]?.n ?? e))].join(', ');
  // 1. normalar
  add('Koʻkalamzor ulushi', `${V.m.greenPct.toFixed(1)} %`, V.m.greenPct >= 70 ? 'ok' : 'xato', 'N', 'ShNQ 2.07.01-23, 491-band: ≥ 70 %');
  add('Bogʻ maydoni', `${A.areaHa.toFixed(2)} ga`, A.minOk ? 'ok' : 'ogoh', 'N', `ShNQ 2.07.01-23, 490-band: ≥ ${A.minHa} ga`);
  if (A.visitors.N1 > 0) add('Bir vaqtdagi tashrifchilar zichligi', `${Math.round(A.visitors.perHa)} kishi/ga`, A.visitors.perHa <= A.visitors.q ? 'ok' : 'ogoh', 'N', `ShNQ 2.07.01-23, 501-band: ≤ ${A.visitors.q} kishi/ga`);
  else add('Xizmat radiusidagi aholi', 'maʼlumot yoʻq', 'ogoh', 'T', 'aholi soni olinmadi — tashrifchilar, hojatxona va sport ehtiyoji hisoblanmadi; 3-qadamda qayta yuklang');
  add('Yirik daraxtlar (≥ 40 sm) bilan ziddiyat', `${V.m.conflictBig} ta`, V.m.conflictBig === 0 ? 'ok' : 'xato', 'N', 'ShNQ 2.07.01-23, 480-band: mavjud daraxtlar saqlanadi');
  add('Koʻchiriladigan daraxtlar (< 40 sm)', `${Math.max(0, V.m.conflict - V.m.conflictBig)} ta`, V.m.conflict - V.m.conflictBig <= 10 ? 'ok' : 'ogoh', 'T', 'iloji boricha kam; har biri uchun koʻchirish joyi');
  add('Nishabi 5 % dan katta yoʻllar (zina va rampasiz)', `${Math.round(V.m.mgnOver)} m`, V.m.mgnOver === 0 ? 'ok' : 'ogoh', 'N', 'ShNQ 2.07.02-24: MGN yoʻllari ≤ 5 %' + (C.rough ? '. Relyef umumiy modeldan (aniqligi past) — geodezik syomka bilan tekshirilsin' : ''));
  if (V.m.zina > 0) add('Zinalar', `${Math.round(V.m.zina)} m`, V.m.rampa > 0 ? 'ok' : 'ogoh', 'T', 'har zina yonida muqobil rampa yoki aylanma yoʻl boʻlsin');
  // 2. dastur
  const miss = V.miss ?? [];
  add('Dastur bajarilishi', miss.length ? `joylanmadi: ${nm(miss.map(m => m.el))}` : `${B.length} element joylandi`, miss.length ? 'ogoh' : 'ok', 'T', miss[0]?.why);
  const wc = B.filter(b => b.el === 'wc').length;
  const wcNeed = A.areaHa < 1 ? 0 : Math.max(1, Math.min(6, Math.ceil(A.areaHa / 3), A.toilets));
  if (wcNeed || wc) add('Hojatxonalar', `${wc} / ${wcNeed}`, wc >= wcNeed ? 'ok' : 'ogoh', 'T', '1 ta / 500 bir vaqtdagi tashrifchi; 1 ga dan katta bogʻda kamida 1 ta, har 3 ga ga bittadan oshmaydi');
  // 3. geometriya: element — yoʻl, suv, chegara, bir-biri, saqlanadigan obyektlar
  const dHard = distance(G, DO.masks.hard);
  const at = (p: XY) => G.idx(p[0], p[1]);
  const noPath = B.filter(b => { const k = at(b.p); return k < 0 || dHard[k] > ELEM[b.el].d / 2 + ELEM[b.el].w / 2 + 6; });
  add('Yoʻlga ulanmagan elementlar', noPath.length ? nm(noPath.map(b => b.el)) : 'yoʻq', noPath.length ? 'xato' : 'ok', 'T', 'har element yoʻl tarmogʻiga ulanadi');
  const bad: string[] = [], over: string[] = [];
  const masks = B.map(b => { const m = G.u8(); fillPoly(G, m, [blockRing(b)]); return m; });
  B.forEach((b, i) => { let w = 0, o = 0, n = 0; for (let k = 0; k < G.n; k++) if (masks[i][k]) { n++; if (!C.site[k] || C.water[k] || C.bld[k]) w++; for (let j = i + 1; j < B.length; j++) if (masks[j][k]) o++; }
    const tol = Math.max(1, Math.round(n * 0.05));   // rastr chegarasidagi 1–2 katak — xato emas
    if (w > tol) bad.push(b.el); if (o > tol) over.push(b.el); });
  add('Chegaradan chiqqan, suv yoki bino ustidagi elementlar', bad.length ? nm(bad) : 'yoʻq', bad.length ? 'xato' : 'ok', 'T');
  add('Bir-birining ustiga tushgan elementlar', over.length ? nm(over) : 'yoʻq', over.length ? 'xato' : 'ok', 'T');
  const fx = V.fixed ?? [], hit = fx.filter(f => B.some((b, i) => { void b; const k = at(f.p); return k >= 0 && masks[i][k] === 1; }) || B.some(b => Math.hypot(b.p[0] - f.p[0], b.p[1] - f.p[1]) < Math.min(f.r, 8)));
  if (fx.length) add('Saqlanadigan obyektlar (haykal, favvora)', hit.length ? `band qilingan: ${hit.map(f => f.name).join(', ')}` : `${fx.length} ta — tegilmagan`, hit.length ? 'xato' : 'ok', 'T', 'joyi oʻzgarmaydi, atrofi boʻsh qoladi');
  // 4. qulaylik va xavfsizlik
  const loud = B.filter(b => ELEM[b.el].noise === 2), quiet = B.filter(b => ELEM[b.el].noise === 0 && ELEM[b.el].grp === 'sokin');
  const clash = quiet.filter(q => loud.some(l => Math.hypot(l.p[0] - q.p[0], l.p[1] - q.p[1]) < 35));
  if (loud.length && quiet.length) add('Shovqinli va sokin elementlar orasi', clash.length ? `${clash.length} ta sokin element 35 m dan yaqin` : '≥ 35 m', clash.length ? 'ogoh' : 'ok', 'T');
  const ns = B.filter(b => ELEM[b.el].ns), off = ns.filter(b => { const x = bearing(b.a) > 90 ? bearing(b.a) - 180 : bearing(b.a); return x < -75 || x > 20; });
  if (ns.length) add('Sport maydonlari oʻqi', off.length ? `${nm(off.map(b => b.el))} — shimol–janubdan ogʻgan` : 'shimol–janub oraligʻida', off.length ? 'ogoh' : 'ok', 'A', 'xalqaro qoʻllanmalar: 285°–20°');
  const dBld = bldDist(C), edge = B.filter(b => { const k = at(b.p), need = bldNeed(b.el); return need > 0 && k >= 0 && dBld[k] - ELEM[b.el].d / 2 < need; });
  if (B.some(b => bldNeed(b.el) > 0)) add('Atrofdagi binolargacha masofa', edge.length ? `${nm(edge.map(b => b.el))} — binoga yaqin` : 'yetarli', edge.length ? 'ogoh' : 'ok', 'P', 'ShNQ 2.07.01-23, 89-band, 4-jadval (turar joy hududi, oʻxshashlik boʻyicha): bolalar 10 m, sport 10–40 m, it maydoni 40 m; joyida oʻlchansin');
  const S = B.flatMap(b => fitout(b).safe); let sOver = 0, sPath = 0;
  for (let i = 0; i < S.length; i++) { const k = at(S[i].p); if (k >= 0 && dHard[k] < S[i].r - 0.5) sPath++; for (let j = i + 1; j < S.length; j++) if (Math.hypot(S[i].p[0] - S[j].p[0], S[i].p[1] - S[j].p[1]) < S[i].r + S[j].r - 0.05) sOver++; }
  if (S.length) add('Oʻyin jihozlari xavfsizlik zonalari', sOver || sPath ? `${sOver} kesishish, ${sPath} ta yoʻlga chiqqan` : `${S.length} zona — toza`, sOver || sPath ? 'xato' : 'ok', 'A', 'EN 1176: zonalar kesishmaydi, ichidan yoʻl oʻtmaydi');
  return R;
}
