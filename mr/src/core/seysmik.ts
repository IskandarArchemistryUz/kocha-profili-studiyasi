/**
 * Seysmik boʻlmalar — QMQ 2.01.03-19 «Seysmik hududlarda qurilish» (egasi, 30.10).
 * 3.1.3: bino 3.1.1 talablariga javob bermasa yoki tarhdagi oʻlchamlari 3.1-jadvaldan katta boʻlsa — antiseysmik choklar bilan
 * boʻlmalarga ajratiladi. 3.7.2: choklar orasidagi masofa 3.1-jadvaldan oshmaydi.
 * 3.1.1: bino tarhda geometrik toʻgʻri shakllardan iborat; chiqib turgan qism — tosh/gʻisht 2 m, monolit/panel/karkas 6 m gacha;
 * bir boʻlmada qavatlar farqi 6 m (ikki qavat) gacha. 3.2.3: bikrlik yadroli bino/boʻlma 24 m dan uzun boʻlsa — kamida 2 yadro.
 * 3.1-jadval, «Bino (boʻlma) uzunligi, m» ustuni (7 / 8 / 9 ball) — asl matndan (33-bet):
 *   2-qator — yaxlit temirbeton, yirik panelli devorlar: 60 / 45 / 36;
 *   1.2.2 б — bogʻlamli yoki rama-bogʻlamli yaxlit temirbeton karkas: 100 / 80 / 60;
 *   1.2.2 е/ж — toʻldiruvchili (tosh, blok, gʻisht) karkas: 80 / 60 / 40;
 *   4 — qoʻlda terilgan kompleks konstruksiyali devorlar, oliy va I toifa: 80 / 60 / 40;
 *   5 — qoʻlda terilgan sopol/beton tosh, gʻisht, oliy va I toifa: 40 / 30 / 20.
 */
import { area, obb2, signedArea, type XY } from './geo';
import { splitAtReflex } from './roof';
import type { ConstructSys } from './doc';

export interface SysDef { id: ConstructSys; name: string; /** 3.1-jadval qatori */ row: string; /** boʻlma uzunligi, m: 7 / 8 / 9 ball */ len: [number, number, number]; /** chiqib turgan qism, m (3.1.1) */ proj: number; /** bikrlik yadrosi qoidasi (3.2.3) tegishli */ core: boolean }
export const SYS: Record<ConstructSys, SysDef> = {
  monolit: { id: 'monolit', name: 'Monolit temirbeton devorlar / yirik panel', row: '2-qator', len: [60, 45, 36], proj: 6, core: false },
  karkas: { id: 'karkas', name: 'Monolit karkas (bogʻlamli, rama-bogʻlamli)', row: '1.2.2 б', len: [100, 80, 60], proj: 6, core: true },
  toldirgich: { id: 'toldirgich', name: 'Toʻldiruvchili karkas (gʻisht, blok)', row: '1.2.2 е/ж', len: [80, 60, 40], proj: 6, core: true },
  gisht: { id: 'gisht', name: 'Gʻisht devorlar (qoʻlda terilgan, I toifa)', row: '5-qator', len: [40, 30, 20], proj: 2, core: false },
};
/** Boʻlma uzunligi chegarasi, m (ball 7–9; 9 dan katta — 9 ustuni, 7 dan kichik — NSTT: cheklanmagan) */
export function lenLimit(sys: ConstructSys, ball: number): number | null {
  const d = SYS[sys] ?? SYS.monolit; if (ball < 7) return null;
  return d.len[Math.max(0, Math.min(2, Math.round(ball) - 7))];
}

export interface BlockShape { /** eng katta oʻlcham (OBB), m */ len: number; /** chiqib turgan qismlar, m (toʻrtburchakda boʻsh) */ proj: number[]; /** toʻgʻri toʻrtburchakmi (OBB toʻldirilishi ≥ 92 %) */ rect: boolean }
/** Kontur shakli: uzunligi va chiqib turgan qismlari (L, T, U qanotlari — asosiy qanotdan tashqariga qancha chiqadi) */
export function blockShape(r0: XY[]): BlockShape {
  const r = signedArea(r0) < 0 ? [...r0].reverse() : r0, o = obb2(r), fill = area(r) / Math.max(1e-6, o.L * o.S);
  if (fill >= 0.92 || r.length < 5) return { len: o.L, proj: [], rect: fill >= 0.92 };
  const wings = splitAtReflex(r); if (!wings || wings.length < 2) return { len: o.L, proj: [], rect: false };
  const main = wings.reduce((a, b) => area(b) > area(a) ? b : a), proj: number[] = [];
  for (const w of wings) {
    if (w === main) continue;
    // asosiy qanotning har qirrasi: qanot shu qirraga tegsa — undan tashqariga eng uzoq nuqtasi
    let best = Infinity;
    for (let i = 0; i < main.length; i++) {
      const a = main[i], b = main[(i + 1) % main.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;   // tashqi normal (CCW)
      const ds = w.map(p => (p[0] - a[0]) * nx + (p[1] - a[1]) * ny);
      if (Math.min(...ds.map(Math.abs)) > 0.3) continue;   // tegmaydi
      const out = Math.max(...ds); if (out > 0.3 && out < best) best = out;
    }
    if (best < Infinity) proj.push(Math.round(best * 10) / 10);
  }
  return { len: o.L, proj, rect: false };
}

export interface BlockCheck { len: number; limit: number | null; lenOk: boolean; proj: number; projLim: number; projOk: boolean; rect: boolean }
export function checkBlock(ring: XY[], sys: ConstructSys, ball: number): BlockCheck {
  const sh = blockShape(ring), d = SYS[sys] ?? SYS.monolit, limit = lenLimit(sys, ball), proj = sh.proj.length ? Math.max(...sh.proj) : 0;
  return { len: Math.round(sh.len * 10) / 10, limit, lenOk: limit == null || sh.len <= limit + 0.05, proj, projLim: d.proj, projOk: proj <= d.proj + 0.05, rect: sh.rect };
}
