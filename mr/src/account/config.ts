/**
 * Hisob (api.archemistry.uz) sozlamasi.
 * AUTH_REQUIRED — server ishga tushib, pochta va Google tekshirilgach yoqiladi (server/deploy/README.md, 7-band).
 * Sinov uchun brauzerda: localStorage.kps_auth = '1' (yoqish) yoki '0' (oʻchirish); kps_api — boshqa API manzili.
 */
export const AUTH_REQUIRED = false;
export const API_BASE = 'https://api.archemistry.uz';

const ls = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
export const authRequired = (): boolean => { const v = ls('kps_auth'); return v === '1' ? true : v === '0' ? false : AUTH_REQUIRED; };
export const apiBase = (): string => ls('kps_api') || API_BASE;
/** Qaysi qadamdan boshlab kirish kerak (1-qadam Hudud va 2-qadam Uchastka — kirishsiz) */
export const FREE_STEPS = ['hudud', 'uchastka'];
