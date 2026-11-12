/**
 * 12.11 (egasi: «meʼyorga mos emas» ogohlantirishi va yoʻlak eni jadvalini saytda koʻrsatish shart emas — ichki muhitda tuzatamiz):
 * ichki tekshiruv rejimi. Yoqish: manzilga `?dev=1` yoki konsolda `localStorage.setItem('mr-dev', '1')`.
 * Rejim oʻchiq boʻlsa — kvartira rejasida «!» belgilari, «… ta xonadon rejasi meʼyorga toʻliq mos emas» va 40-band jadvali koʻrinmaydi.
 */
export const devMode = (): boolean => {
  try { return /[?&]dev=1\b/.test(location.search) || localStorage.getItem('mr-dev') === '1'; } catch { return false; }
};
