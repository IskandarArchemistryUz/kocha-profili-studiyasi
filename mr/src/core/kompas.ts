/**
 * Insolyatsiya kompasi (egasi, 30.10): koʻcha toʻri burchagini tanlashda fasadlar quyoshni qanday olishini oldindan koʻrsatish.
 * Toʻr burchagi θ (matematik, sharqdan CCW) → kvartal binolari fasadlari θ+90·k yoʻnalishlarga qaraydi. Har fasad uchun
 * 22 mart (SanQvaN 0102-25, 95-band davrining boshi) kuni ikkinchi qavat derazasiga uzluksiz quyosh soatlari hisoblanadi —
 * qarshisida 2·H masofada (ShNQ 2.07.01-23, 79-band 8-izoh, seysmik 8+) shunday balandlikdagi qator turadi.
 * Qoʻshimcha: 15-band — gʻarb 200–290° taqiqi; 16-band — 90–290° (ortiqcha isish) matn boʻyicha.
 */
import { daySteps } from './sun';
import { windowSun } from './apartments';
import type { XY } from './geo';

export interface FacadeSun { /** kompas azimuti, ° (0 — shimol, 90 — sharq) */ az: number; /** uzluksiz quyosh, soat */ run: number; /** 15-band: 200–290° */ west: boolean; /** 16-band: 90–290° */ hot: boolean }
export interface CompassRow { /** toʻr burchagi, ° matematik (0 — sharq, CCW), 0 ≤ θ < 90 */ deg: number; facades: FacadeSun[]; /** ≥ 2 soat olgan fasadlar soni (0–4) */ ok: number; /** eng yomon fasad, soat */ min: number; /** gʻarbga (200–290°) qaragan fasadlar */ west: number }
export interface Compass { rows: CompassRow[]; /** eng maqbul burchak(lar): ok eng koʻp, keyin min eng katta */ best: number[]; H: number; D: number; /** har 5° azimut uchun uzluksiz soat (kompas halqasi) */ ring: { az: number; run: number }[] }

/** Matematik burchak (sharqdan CCW) → kompas azimuti */
export const toAz = (mathDeg: number) => ((90 - mathDeg) % 360 + 360) % 360;
const inArc = (az: number, a: number, b: number) => az >= a && az <= b;

export function insolCompass(lat: number, lng: number, o: { H?: number; D?: number; z?: number; step?: number; year?: number } = {}): Compass {
  const H = o.H ?? 27, D = o.D ?? 2 * H, z = o.z ?? 4.5, step = o.step ?? 5, year = o.year ?? new Date().getFullYear();
  const steps = daySteps(year, 3, 22, lat, lng, 10);
  const cache = new Map<number, number>();
  /** fasad azimuti → uzluksiz soat (qarshida 2·H da H balandlikdagi 200 m qator) */
  const runAt = (az: number): number => {
    const k = Math.round(az * 10) / 10; const c = cache.get(k); if (c != null) return c;
    const r = az * Math.PI / 180, n: XY = [Math.sin(r), Math.cos(r)], t: XY = [Math.cos(r), -Math.sin(r)];
    const ring: XY[] = [[n[0] * D - t[0] * 100, n[1] * D - t[1] * 100], [n[0] * D + t[0] * 100, n[1] * D + t[1] * 100], [n[0] * (D + 15) + t[0] * 100, n[1] * (D + 15) + t[1] * 100], [n[0] * (D + 15) - t[0] * 100, n[1] * (D + 15) - t[1] * 100]];
    const v = windowSun([[0, 0]], [z], [az], [{ ring, top: H }], steps).run[0];
    cache.set(k, v); return v;
  };
  const rows: CompassRow[] = [];
  for (let deg = 0; deg < 90; deg += step) {
    const facades: FacadeSun[] = [0, 1, 2, 3].map(k => { const az = toAz(deg + 90 * k), run = runAt(az); return { az, run, west: inArc(az, 200, 290), hot: inArc(az, 90, 290) }; });
    rows.push({ deg, facades, ok: facades.filter(f => f.run >= 2 - 1e-6).length, min: Math.min(...facades.map(f => f.run)), west: facades.filter(f => f.west).length });
  }
  const top = [...rows].sort((a, b) => b.ok - a.ok || b.min - a.min || a.west - b.west)[0];
  const best = rows.filter(r => r.ok === top.ok && Math.abs(r.min - top.min) < 0.1).map(r => r.deg);
  const ring: { az: number; run: number }[] = []; for (let az = 0; az < 360; az += 5) ring.push({ az, run: runAt(az) });
  return { rows, best, H, D, ring };
}
