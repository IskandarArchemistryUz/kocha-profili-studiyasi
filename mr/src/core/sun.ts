/**
 * Quyosh holati (NOAA soddalashtirilgan algoritmi, aniqligi ~0,5°) va insolyatsiya hisobi.
 * Insolyatsiya: har bir nuqtadan quyoshga qarab nur — binolar prizmalari bilan kesishmasa, nuqta quyoshda.
 */
import type { XY } from './geo';
import { placeOf, tzOffsetH } from './place';

const RAD = Math.PI / 180;

/** UTC vaqt, kenglik/uzunlik (°) → balandlik va azimut (° , shimoldan soat yoʻnalishida) */
export function sunPosition(utc: Date, lat: number, lng: number): { alt: number; az: number } {
  const jd = utc.getTime() / 86400000 + 2440587.5, n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD, eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)), dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24, lst = (gmst * 15 + lng) * RAD;
  const ha = lst - ra, phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  return { alt: alt / RAD, az: ((az / RAD) + 360) % 360 };
}

/** Mahalliy vaqt → UTC Date. tz — soat farqi (sukut: Toshkent UTC+5) yoki IANA nomi (yozgi vaqt bilan; placeOf().tz) */
export function localToUtc(year: number, month: number, day: number, hours: number, tz: number | string = 5): Date {
  const base = Date.UTC(year, month - 1, day, 0, 0, 0) + hours * 3600000;
  if (typeof tz === 'number') return new Date(base - tz * 3600000);
  // ikki qadam: taxminiy farq → shu paytdagi aniq farq (yozgi vaqt chegarasi uchun)
  const o1 = tzOffsetH(tz, base), o2 = tzOffsetH(tz, base - o1 * 3600000);
  return new Date(base - o2 * 3600000);
}
/** Joy koordinatasi boʻyicha mahalliy vaqt → UTC */
export const localToUtcAt = (year: number, month: number, day: number, hours: number, lat: number, lng: number): Date => localToUtc(year, month, day, hours, placeOf(lng, lat).tz);

export interface Prism { ring: XY[]; top: number }
export interface SunStep { alt: number; az: number; dt: number }

/** Kun davomidagi quyosh qadamlari (balandlik > minAlt), dt soatda */
export function daySteps(year: number, month: number, day: number, lat: number, lng: number, stepMin = 15, minAlt = 3): SunStep[] {
  const out: SunStep[] = [], tz = placeOf(lng, lat).tz;
  // mahalliy vaqt 00:00–24:00 (qutb yaqinida kun uzun); quyosh minAlt dan past qadamlar tashlanadi
  for (let m = 0; m < 24 * 60; m += stepMin) {
    const p = sunPosition(localToUtc(year, month, day, m / 60, tz), lat, lng);
    if (p.alt > minAlt) out.push({ alt: p.alt, az: p.az, dt: stepMin / 60 });
  }
  return out;
}

/** Nuqta (2D) + yoʻnalish → koʻpburchakka kirish masofasi (ichida boʻlsa 0), kesmasa Infinity */
function rayEnter(p: XY, d: XY, r: XY[]): number {
  let best = Infinity, inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t >= 0 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return inside ? 0 : best;
}

/**
 * Har nuqta uchun quyoshli soatlar. Prizmalar 20 m katakli indeksda; nur boʻylab faqat yaqin kataklar tekshiriladi.
 * z — nuqta balandligi (prizma top bilan bir xil sath tizimida).
 */
export function insolation(pts: XY[], z: number[], prisms: Prism[], steps: SunStep[], maxDist = 400): Float32Array {
  const C = 20, grid = new Map<string, number[]>(), bb: number[][] = [];
  prisms.forEach((pr, k) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pr.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    bb.push([x0, y0, x1, y1]);
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); }
  });
  const out = new Float32Array(pts.length), stamp = new Int32Array(prisms.length).fill(-1);
  let tick = 0;
  for (const st of steps) {
    const tanA = Math.tan(st.alt * RAD), d: XY = [Math.sin(st.az * RAD), Math.cos(st.az * RAD)];
    for (let n = 0; n < pts.length; n++) {
      const p = pts[n], zp = z[n]; tick++;
      let lit = true;
      for (let s = 0; s <= maxDist && lit; s += C * 0.7) {
        const qx = p[0] + d[0] * s, qy = p[1] + d[1] * s;
        // shu masofadan keyin hech bir bino nurdan baland emas — toʻxtash (eng baland 200 m deb)
        if (s * tanA > 200) break;
        for (let di = -1; di <= 1 && lit; di++) for (let dj = -1; dj <= 1 && lit; dj++) {
          const ids = grid.get(`${Math.floor(qx / C) + di},${Math.floor(qy / C) + dj}`); if (!ids) continue;
          for (const k of ids) {
            if (stamp[k] === tick) continue; stamp[k] = tick;
            const pr = prisms[k], dh = pr.top - zp; if (dh <= 0) continue;
            const t = rayEnter(p, d, pr.ring);
            if (t < Infinity && t * tanA < dh && t > 0.01) { lit = false; break; }
          }
        }
      }
      if (lit) out[n] += st.dt;
    }
  }
  return out;
}
