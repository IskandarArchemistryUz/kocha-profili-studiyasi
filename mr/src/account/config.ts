/**
 * Hisob (api.archemistry.uz) sozlamasi.
 * AUTH_REQUIRED — yoqilgan (21.10.2026: pochta kodi va Google ishlaydi). Brauzerda oʻchirish — localStorage kps_auth=0.
 * Sinov uchun brauzerda: localStorage.kps_auth = '1' (yoqish) yoki '0' (oʻchirish); kps_api — boshqa API manzili.
 */
export const AUTH_REQUIRED = true;
export const API_BASE = 'https://api.archemistry.uz';

const ls = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
export const authRequired = (): boolean => { const v = ls('kps_auth'); return v === '1' ? true : v === '0' ? false : AUTH_REQUIRED; };
export const apiBase = (): string => ls('kps_api') || API_BASE;
/** Kirishsiz ochiq qadamlar: 1–5 (Joy va uchastka … Hajmlar). 16.11.2026: egasi paneli — 1-qadamdan keyin
 *  kirish talabida 64 % ketardi; kirish endi 6-qadamdan va server amallarida (variant taklif, ogʻir hisob, toza fayl,
 *  bulut, Chizmadon, agent — har biri oʻz ensureLogin bilan). 'hudud' — eski loyihalar marshruti uchun. */
export const FREE_STEPS = ['hudud', 'uchastka', 'kocha', 'parsel', 'yashil', 'hajm'];
