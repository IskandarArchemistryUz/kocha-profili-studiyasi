/**
 * Koʻchasoz B: kiosk va savdo pavilyonlari joylari (12.11, egasi: «trotuarda, promenad va alleyalarda kiosk qoʻyadigan joylarni
 * koʻzda tutish kerak — Dizayn-kodga moslab»).
 *
 * Manba — Toshkent Dizayn-kodi, Toshkent shahar Kengashining 17.02.2026 yildagi VII-19-17-14-0-K/26-son qarori, 2-ilova (asl PDF):
 *  - P2.2, 11.4.1–11.4.5 — koʻcha turi boʻyicha: ruxsat etilgan turlar, eng kichik oraliq, bufer zona, chekinish:
 *      U1: faqat kichik; oraliq ≥ 50 m; B2 da; yoʻl chetidan ≥ 1,5 m.
 *      U2: kichik va oʻrta; ≥ 50 m; B3 da; fasaddan ≥ 2 m.
 *      U3, U4, U7, M1–M5: kichik, oʻrta, norasmiy; ≥ 50 m; B3 da; fasaddan ≥ 1 m.
 *      U5, U6: kichik, oʻrta, norasmiy (bir uslubda); ≥ 5 m; faqat maxsus bufer zonada; fasaddan ≥ 5 m.
 *    Hammasida: «piyodalar yoʻlagining piyodalar qismiga joylashtirish taqiqlanadi — faqat buferda».
 *  - P2.3, 4.4.1 jadvali — buferga joylashtirilganda piyodalar zonasi eni: U1, U2 — 4 m; U3, U4, U7 — 2,5 m; U5, U6 — 6 m;
 *    ochiq koʻchma savdo: U1, U2 — taqiqlangan; U3, U4 — faqat vaqtinchalik tadbirlar uchun.
 *    Umumiy: obyekt oldida ≥ 1,5 m maydon; savdo obyekti va infratuzilma orasida ≥ 1,5 m; chorrahalar, metro chiqishlari,
 *    gidrantlar yaqinida — taqiqlanadi.
 *  - P2.3 4.4.2: kichik — eni ≤ 3000 mm, balandligi ≤ 3400 mm, ≤ 10 m²; 4.4.3: oʻrta — ≤ 3600 × 6600 mm, ≤ 25 m²;
 *    4.4.5: ochiq peshtaxta — eni ≤ 2100 mm, balandligi ≤ 3000 mm.
 *  - ShNQ 2.07.06-24, 110-band: ajratuvchi tasma ≥ 5 m boʻlsa, xavfsizlikka aloqasi yoʻq inshootlar qoʻyish mumkin (alleya, bulvar).
 * ZIDDIYAT: P2.3 4.4.1 jadvalida U1–U2 uchun «joylashtirish bosqichi 30 (50) metrdan oshmaydi» deyilgan, P2.2 11.4 da esa
 * «eng kichik bosqich 50 m». Koʻchasoz P2.2 ni oladi (koʻcha elementlarini joylashtirish qoidasi); farq izohda koʻrsatiladi.
 * TALQIN: kiosk joy olishi uchun eng kichik chuqurlik — kiosk 2,0 m, pavilyon 3,0 m, peshtaxta 1,2 m (DK faqat yuqori chegarani beradi).
 */
type El = [string, number, Record<string, unknown>?];
export interface KPl { t: string; z: number; y: number; l: number }
export interface KChk { st: 'ok' | 'warn' | 'bad'; n: string; src: string; v: string }

export const KIOSK_T = ['kiosk', 'pavilyon', 'peshtaxta'];
/** [eng katta chuqurlik (koʻcha kesimida), balandlik, eng kichik chuqurlik (TALQIN)], m */
export const KSZ: Record<string, [number, number, number]> = { kiosk: [3.0, 3.4, 2.0], pavilyon: [3.6, 3.4, 3.0], peshtaxta: [1.2, 3.0, 1.2] };

interface Rule { ok: string[]; zone: 'yash' | 'front' | 'any'; step: number; curb?: number; facade?: number; ped: number; ref: string; open: 'bad' | 'warn' | 'ok' }
const R: Record<string, Rule> = {
  U1: { ok: ['kiosk'], zone: 'yash', step: 50, curb: 1.5, ped: 4, ref: '11.4.1', open: 'bad' },
  U2: { ok: ['kiosk', 'pavilyon'], zone: 'front', step: 50, facade: 2, ped: 4, ref: '11.4.2', open: 'bad' },
  U3: { ok: ['kiosk', 'pavilyon'], zone: 'front', step: 50, facade: 1, ped: 2.5, ref: '11.4.3', open: 'warn' },
  U4: { ok: ['kiosk', 'pavilyon'], zone: 'front', step: 50, facade: 1, ped: 2.5, ref: '11.4.3', open: 'warn' },
  U5: { ok: ['kiosk', 'pavilyon'], zone: 'any', step: 5, facade: 5, ped: 6, ref: '11.4.4', open: 'bad' },
  M1: { ok: ['kiosk', 'pavilyon'], zone: 'front', step: 50, facade: 1, ped: 2.5, ref: '11.4.3', open: 'warn' },
};
const ROAD = new Set(['qat', 'bus', 'tram', 'park', 'velo']);
const BUF = new Set(['yash', 'front', 'med']);
const fm = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const NAME: Record<string, string> = { kiosk: 'Kiosk', pavilyon: 'Pavilyon', peshtaxta: 'Peshtaxta' };

export const kioskRule = (uk: string): Rule => R[uk] ?? R.U3;

export function KIOSK_NOTE(uk: string): string {
  const r = kioskRule(uk), z = r.zone === 'yash' ? 'B2 (yashil bufer)' : r.zone === 'front' ? 'B3 (fasad oldi)' : 'maxsus bufer (alleya, yashil zona)';
  return `${uk}: ${r.ok.map(t => NAME[t].toLowerCase()).join(', ')} · ${z} · oraliq ≥ ${r.step} m${r.curb ? ` · yoʻl chetidan ≥ ${fm(r.curb)} m` : ''}${r.facade ? ` · fasaddan ≥ ${fm(r.facade)} m` : ''} · piyodalar zonasi ≥ ${fm(r.ped)} m (Dizayn-kod 2-ilova, P2.2 ${r.ref}; P2.3 4.4.1)`;
}

/** Zona qaysi tomonda (0 — chap, 1 — oʻng) va undan yoʻl chetiga / fasadga qadar boshqa zonalar eni */
function geom(els: El[], i: number, firstR: number, lastR: number): { side: number; toCurb: number; toFacade: number } {
  const left = firstR < 0 ? i < els.length / 2 : i < firstR;
  let toCurb = 0, toFacade = 0;
  if (left) { for (let j = i + 1; j < (firstR < 0 ? els.length : firstR); j++) toCurb += els[j][1]; for (let j = 0; j < i; j++) toFacade += els[j][1]; }
  else { for (let j = (lastR < 0 ? 0 : lastR + 1); j < i; j++) toCurb += els[j][1]; for (let j = i + 1; j < els.length; j++) toFacade += els[j][1]; }
  return { side: left ? 0 : 1, toCurb, toFacade };
}
const roads = (els: El[]) => { let a = -1, b = -1; els.forEach((e, i) => { if (ROAD.has(e[0])) { if (a < 0) a = i; b = i; } }); return [a, b]; };

/** Kiosk joylashadigan chuqurlik: zona enidan talab qilingan chekinish ayrilgach (yoʻl chetidan yoki fasaddan) */
function avail(els: El[], i: number, r: Rule, firstR: number, lastR: number): number {
  const g = geom(els, i, firstR, lastR), w = els[i][1];
  const needCurb = r.curb ? Math.max(0, r.curb - g.toCurb) : 0, needFac = r.facade ? Math.max(0, r.facade - g.toFacade) : 0;
  return w - needCurb - needFac;
}
const zoneOk = (els: El[], i: number, r: Rule) => (els[i][0] === 'med' ? els[i][1] >= 5 : r.zone === 'any' ? BUF.has(els[i][0]) : els[i][0] === r.zone);

/** «Kiosk joylarini taklif qilish»: har tomonda mos bufer zonaga, oraliq bilan (mavjud elementlar bilan ustma-ust tushmaydi) */
export function kioskPropose(els: El[], PL: KPl[], uk: string, LM: number): KPl[] {
  const r = kioskRule(uk), [a, b] = roads(els), out: KPl[] = [], l = KSZ.kiosk[0];
  for (const side of [0, 1]) {
    const cand = els.map((_e, i) => i).filter(i => geom(els, i, a, b).side === side && zoneOk(els, i, r) && avail(els, i, r, a, b) >= KSZ.kiosk[2] - 1e-6);
    if (!cand.length) continue;
    const z = cand.sort((p, q) => avail(els, q, r, a, b) - avail(els, p, r, a, b))[0];
    const busy = [...PL, ...out].filter(p => p.z === z);
    const have = [...PL, ...out].filter(p => KIOSK_T.includes(p.t) && geom(els, p.z, a, b).side === side);
    for (let y = 4; y + l <= LM - 1; y += 0.5) {
      if (busy.some(p => p.y < y + l + 1.5 && p.y + p.l + 1.5 > y)) continue;   // infratuzilmagacha ≥ 1,5 m (P2.3 4.4.1)
      if (have.some(p => (p.y > y ? p.y - (y + l) : y - (p.y + p.l)) < r.step)) continue;
      const k = { t: 'kiosk', z, y, l }; out.push(k); busy.push(k); have.push(k);
      y += l + r.step - 0.5;
    }
  }
  return out;
}

/** Tekshiruv qatorlari (B «Tekshiruv» roʻyxatiga) */
export function kioskChecks(els: El[], PL: KPl[], uk: string, firstR: number, lastR: number): KChk[] {
  const ks = PL.filter(p => KIOSK_T.includes(p.t) && p.z < els.length); if (!ks.length) return [];
  const r = kioskRule(uk), out: KChk[] = [], src = `Dizayn-kod P2.2 ${r.ref} · ${uk}`;
  // turi
  for (const t of KIOSK_T) {
    const n = ks.filter(p => p.t === t).length; if (!n) continue;
    if (t === 'peshtaxta') out.push({ st: r.open, n: r.open === 'bad' ? `Ochiq peshtaxta: ${uk} da taqiqlangan` : 'Ochiq peshtaxta: faqat vaqtinchalik tadbirlar uchun', src: 'Dizayn-kod P2.3 4.4.1 jadval', v: String(n) });
    else out.push({ st: r.ok.includes(t) ? 'ok' : 'bad', n: `${NAME[t]}: ${uk} da ${r.ok.includes(t) ? 'ruxsat etiladi' : 'ruxsat etilmaydi'}`, src, v: String(n) });
  }
  // zona, chuqurlik va chekinish
  let badZone = 0, badFit = 0, noFront = 0;
  for (const p of ks) {
    if (!zoneOk(els, p.z, r)) badZone++;
    const av = avail(els, p.z, r, firstR, lastR);
    if (av < KSZ[p.t][2] - 1e-6) badFit++;
    else if (els[p.z][1] - Math.min(KSZ[p.t][0], av) < 1.5 - 1e-6) noFront++;
  }
  const zn = r.zone === 'yash' ? 'B2 bufer' : r.zone === 'front' ? 'B3 fasad oldi' : 'maxsus bufer (ajratuvchi ≥ 5 m)';
  out.push({ st: badZone ? 'warn' : 'ok', n: `Kiosk faqat ${zn} zonasida, piyodalar qismida emas`, src, v: badZone ? `${badZone} / ${ks.length}` : '✓' });
  out.push({ st: badFit ? 'bad' : 'ok', n: `Zona enida kiosk sigʻadi${r.curb ? `, yoʻl chetidan ≥ ${fm(r.curb)} m` : ''}${r.facade ? `, fasaddan ≥ ${fm(r.facade)} m` : ''}`, src: `${src} · chuqurlik — TALQIN`, v: badFit ? `${badFit} / ${ks.length}` : '✓' });
  out.push({ st: noFront ? 'warn' : 'ok', n: 'Kiosk oldida ≥ 1,5 m maydon (bufer ichida)', src: 'Dizayn-kod P2.3 4.4.1', v: noFront ? `${noFront} / ${ks.length}` : '✓' });
  // oraliq (har tomonda)
  let minGap = Infinity;
  for (const side of [0, 1]) {
    const xs = ks.filter(p => geom(els, p.z, firstR, lastR).side === side).sort((p, q) => p.y - q.y);
    for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i].y - (xs[i - 1].y + xs[i - 1].l));
  }
  if (Number.isFinite(minGap)) out.push({ st: minGap >= r.step - 1e-6 ? 'ok' : 'bad', n: `Kiosklar orasidagi masofa ≥ ${r.step} m`, src, v: fm(Math.max(0, minGap)) });
  // piyodalar zonasi eni (kiosk boʻlgan tomonda)
  const sides = [...new Set(ks.map(p => geom(els, p.z, firstR, lastR).side))];
  let pedMin = Infinity;
  for (const side of sides) { let w = 0; els.forEach((e, i) => { if (e[0] === 'piy' && geom(els, i, firstR, lastR).side === side) w += e[1]; }); pedMin = Math.min(pedMin, w); }
  out.push({ st: pedMin >= r.ped - 1e-6 ? 'ok' : 'bad', n: `Kiosk boʻlgan tomonda piyodalar zonasi ≥ ${fm(r.ped)} m`, src: `Dizayn-kod P2.3 4.4.1 jadval · ${uk}`, v: fm(pedMin) });
  return out;
}
